import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { chargeId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { chargeId } = params
    const body = await request.json()
    const { paymentId } = body

    if (!chargeId || !paymentId) {
      return NextResponse.json(
        { error: 'chargeId and paymentId are required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const paymentRef = db.collection('charge_payments').doc(paymentId)
    const paymentDoc = await paymentRef.get()

    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const paymentData = paymentDoc.data()!

    if (paymentData.chargeId !== chargeId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this charge' },
        { status: 400 }
      )
    }

    if (paymentData.status === 'VOIDED') {
      return NextResponse.json(
        { error: 'Payment is already voided' },
        { status: 400 }
      )
    }

    // Get charge to recalculate
    const chargeRef = db.collection('charges').doc(chargeId)
    const chargeDoc = await chargeRef.get()

    if (!chargeDoc.exists) {
      return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
    }

    const chargeData = chargeDoc.data()!
    const newPaidAmount = Math.max(0, (chargeData.paidAmount || 0) - paymentData.amount)
    const newStatus = newPaidAmount <= 0.01 ? 'OWED' : 'PARTIAL'

    // Batch update
    const batch = db.batch()

    batch.update(paymentRef, {
      status: 'VOIDED',
      voidedAt: FieldValue.serverTimestamp(),
      voidedBy: authResult.uid,
    })

    batch.update(chargeRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
      paidAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await batch.commit()

    return NextResponse.json({
      success: true,
      data: {
        newPaidAmount,
        newStatus,
        remaining: chargeData.platformAmount - newPaidAmount,
      },
    })
  } catch (error) {
    console.error('Error voiding payment:', error)
    return NextResponse.json(
      { error: 'Failed to void payment' },
      { status: 500 }
    )
  }
}
