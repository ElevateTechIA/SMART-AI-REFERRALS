import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const db = getAdminDb()

    // Fetch all charges with business info
    const [chargesSnap, paymentsSnap] = await Promise.all([
      db.collection('charges').get(),
      db.collection('charge_payments').get(),
    ])

    // Build business map
    const businessIds = new Set<string>()
    chargesSnap.docs.forEach(d => { if (d.data().businessId) businessIds.add(d.data().businessId) })
    const businessMap = new Map<string, string>()
    if (businessIds.size > 0) {
      const bizRefs = Array.from(businessIds).map(id => db.collection('businesses').doc(id))
      const bizDocs = await db.getAll(...bizRefs)
      bizDocs.forEach(doc => { if (doc.exists) businessMap.set(doc.id, doc.data()!.name || 'Unknown') })
    }

    // Build charges map
    const chargesMap = new Map<string, { businessId: string; businessName: string; amount: number; platformAmount: number; status: string }>()
    chargesSnap.docs.forEach(doc => {
      const d = doc.data()
      chargesMap.set(doc.id, {
        businessId: d.businessId,
        businessName: businessMap.get(d.businessId) || 'Unknown',
        amount: d.amount,
        platformAmount: d.platformAmount,
        status: d.status,
      })
    })

    // Build CSV rows
    const rows: string[] = ['Date,Business,Charge ID,Charge Amount,Platform Amount,Payment Amount,Method,Note,Status']

    const payments = paymentsSnap.docs.map(doc => {
      const d = doc.data()
      const charge = chargesMap.get(d.chargeId)
      return {
        date: d.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || '',
        businessName: charge?.businessName || 'Unknown',
        chargeId: d.chargeId,
        chargeAmount: charge?.amount || 0,
        platformAmount: charge?.platformAmount || 0,
        amount: d.amount,
        method: d.method,
        note: (d.note || '').replace(/,/g, ';'),
        status: d.status,
      }
    })

    payments.sort((a, b) => b.date.localeCompare(a.date))

    for (const p of payments) {
      rows.push(`${p.date},${p.businessName},${p.chargeId},${p.chargeAmount},${p.platformAmount},${p.amount},${p.method},${p.note},${p.status}`)
    }

    const csv = rows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting payments:', error)
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
  }
}
