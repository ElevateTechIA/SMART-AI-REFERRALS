import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: { chargeId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { chargeId } = context.params
    const snapshot = await getAdminDb()
      .collection('charge_payments')
      .where('chargeId', '==', chargeId)
      .get()

    const payments = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        chargeId: data.chargeId,
        businessId: data.businessId,
        amount: data.amount,
        method: data.method,
        note: data.note || '',
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        createdBy: data.createdBy,
      }
    })

    // Sort by createdAt descending in memory (avoids composite index)
    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}
