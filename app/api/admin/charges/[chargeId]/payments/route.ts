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
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { chargeId } = context.params

    if (!chargeId) {
      return NextResponse.json(
        { error: 'chargeId is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const paymentsSnapshot = await db
      .collection('charge_payments')
      .where('chargeId', '==', chargeId)
      .get()

    const payments = paymentsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        chargeId: data.chargeId,
        businessId: data.businessId,
        amount: data.amount,
        method: data.method,
        note: data.note,
        registeredBy: data.registeredBy,
        status: data.status,
        voidedAt: data.voidedAt?.toDate?.() || null,
        voidedBy: data.voidedBy,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      }
    })

    // Sort by createdAt descending (avoids needing a composite index)
    payments.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      data: { payments },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
