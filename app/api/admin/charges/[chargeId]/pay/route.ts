import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(
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
    const body = await request.json()
    const { amount, method, note } = body

    if (!chargeId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'chargeId and a positive amount are required' },
        { status: 400 }
      )
    }

    const validMethods = ['TRANSFER', 'ZELLE', 'CASH', 'CHECK', 'OTHER']
    if (!method || !validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const chargeRef = db.collection('charges').doc(chargeId)
    const chargeDoc = await chargeRef.get()

    if (!chargeDoc.exists) {
      return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
    }

    const chargeData = chargeDoc.data()!
    const platformAmount = chargeData.platformAmount || 0
    const currentPaidAmount = chargeData.paidAmount || 0
    const remaining = platformAmount - currentPaidAmount

    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { error: `Amount exceeds remaining balance of $${remaining.toFixed(2)}` },
        { status: 400 }
      )
    }

    if (chargeData.status === 'PAID') {
      return NextResponse.json(
        { error: 'Charge is already fully paid' },
        { status: 400 }
      )
    }

    if (chargeData.status === 'VOID') {
      return NextResponse.json(
        { error: 'Cannot pay a voided charge' },
        { status: 400 }
      )
    }

    const newPaidAmount = currentPaidAmount + amount
    const isFullyPaid = newPaidAmount >= platformAmount - 0.01

    // Create payment record
    const paymentRef = db.collection('charge_payments').doc()
    const paymentData = {
      chargeId,
      businessId: chargeData.businessId,
      amount,
      method,
      note: note || null,
      registeredBy: authResult.uid,
      status: 'ACTIVE',
      voidedAt: null,
      voidedBy: null,
      createdAt: FieldValue.serverTimestamp(),
    }

    // Update charge
    const chargeUpdate: Record<string, unknown> = {
      paidAmount: newPaidAmount,
      status: isFullyPaid ? 'PAID' : 'PARTIAL',
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (isFullyPaid) {
      chargeUpdate.paidAt = FieldValue.serverTimestamp()
    }

    // Batch write
    const batch = db.batch()
    batch.create(paymentRef, paymentData)
    batch.update(chargeRef, chargeUpdate)
    await batch.commit()

    return NextResponse.json({
      success: true,
      data: {
        paymentId: paymentRef.id,
        newPaidAmount,
        newStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
        remaining: platformAmount - newPaidAmount,
      },
    })
  } catch (error) {
    console.error('Error registering payment:', error)
    return NextResponse.json(
      { error: 'Failed to register payment' },
      { status: 500 }
    )
  }
}
