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
    const { amount, method, note } = body as { amount: number; method: string; note?: string }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    if (!method) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    const db = getAdminDb()
    const chargeRef = db.collection('charges').doc(chargeId)
    const chargeDoc = await chargeRef.get()

    if (!chargeDoc.exists) {
      return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
    }

    const chargeData = chargeDoc.data()!
    const currentPaid = chargeData.paidAmount || 0
    const platformAmount = chargeData.platformAmount || chargeData.amount
    const remaining = platformAmount - currentPaid

    if (amount > remaining + 0.01) {
      return NextResponse.json({ error: 'Amount exceeds remaining balance' }, { status: 400 })
    }

    const newPaidAmount = Math.min(currentPaid + amount, platformAmount)
    const newStatus = newPaidAmount >= platformAmount ? 'PAID' : 'PARTIAL'
    const now = new Date()

    const batch = db.batch()

    // Create payment record
    const paymentRef = db.collection('charge_payments').doc()
    batch.set(paymentRef, {
      chargeId,
      businessId: chargeData.businessId,
      amount,
      method,
      note: note || '',
      status: 'COMPLETED',
      createdAt: now,
      createdBy: authResult.uid,
    })

    // Update charge
    const chargeUpdate: Record<string, unknown> = {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: now,
    }
    if (newStatus === 'PAID') {
      chargeUpdate.paidAt = now
    }
    batch.update(chargeRef, chargeUpdate)

    await batch.commit()

    // Auto-approve PENDING earnings when charge is fully PAID
    let earningsApproved = 0
    if (newStatus === 'PAID' && chargeData.visitId) {
      const earningsSnap = await db.collection('earnings')
        .where('visitId', '==', chargeData.visitId)
        .get()
      if (earningsSnap.size > 0) {
        const earningsBatch = db.batch()
        for (const eDoc of earningsSnap.docs) {
          if (eDoc.data().status === 'PENDING') {
            earningsBatch.update(eDoc.ref, { status: 'APPROVED', approvedAt: now, updatedAt: now })
            earningsApproved++
          }
        }
        if (earningsApproved > 0) await earningsBatch.commit()
      }
    }

    // Log admin action
    await logAdminAction({
      action: 'CHARGE_PAYMENT',
      adminUid: authResult.uid,
      details: { chargeId, amount, method, newStatus, earningsApproved },
    })

    return NextResponse.json({
      success: true,
      data: {
        paymentId: paymentRef.id,
        newPaidAmount,
        newStatus,
        paidAt: newStatus === 'PAID' ? now.toISOString() : null,
        earningsApproved,
      },
    })
  } catch (error) {
    console.error('Error registering payment:', error)
    return NextResponse.json({ error: 'Failed to register payment' }, { status: 500 })
  }
}
