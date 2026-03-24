import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { logAdminAction } from '@/lib/admin-log'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: { chargeId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { chargeId } = context.params
    const body = await request.json()
    const { paymentId } = body as { paymentId: string }

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const db = getAdminDb()
    const paymentRef = db.collection('charge_payments').doc(paymentId)
    const paymentDoc = await paymentRef.get()

    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const paymentData = paymentDoc.data()!
    if (paymentData.status === 'VOIDED') {
      return NextResponse.json({ error: 'Payment already voided' }, { status: 400 })
    }

    // Recalculate charge paid amount excluding this payment
    const allPaymentsSnapshot = await db
      .collection('charge_payments')
      .where('chargeId', '==', chargeId)
      .get()

    let newPaidAmount = 0
    allPaymentsSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (doc.id !== paymentId && data.status !== 'VOIDED') {
        newPaidAmount += data.amount
      }
    })

    const chargeRef = db.collection('charges').doc(chargeId)
    const chargeDoc = await chargeRef.get()
    if (!chargeDoc.exists) {
      return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
    }
    const chargeData = chargeDoc.data()!
    const platformAmount = chargeData.platformAmount || chargeData.amount

    const newStatus = newPaidAmount <= 0 ? 'OWED' : newPaidAmount >= platformAmount ? 'PAID' : 'PARTIAL'
    const now = new Date()

    const batch = db.batch()
    batch.update(paymentRef, { status: 'VOIDED', voidedAt: now, voidedBy: authResult.uid })
    batch.update(chargeRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: now,
      ...(newStatus !== 'PAID' ? { paidAt: null } : {}),
    })
    await batch.commit()

    await logAdminAction({
      action: 'CHARGE_VOID',
      adminUid: authResult.uid,
      details: { chargeId, paymentId, newPaidAmount, newStatus },
    })

    return NextResponse.json({
      success: true,
      data: { newPaidAmount, newStatus },
    })
  } catch (error) {
    console.error('Error voiding payment:', error)
    return NextResponse.json({ error: 'Failed to void payment' }, { status: 500 })
  }
}
