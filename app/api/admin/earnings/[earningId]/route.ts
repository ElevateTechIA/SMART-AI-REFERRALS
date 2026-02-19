import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PAID', 'CANCELLED'],
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { earningId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { earningId } = params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    const earningRef = getAdminDb().collection('earnings').doc(earningId)
    const earningDoc = await earningRef.get()

    if (!earningDoc.exists) {
      return NextResponse.json(
        { error: 'Earning not found' },
        { status: 404 }
      )
    }

    const earningData = earningDoc.data()!
    const currentStatus = earningData.status

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus]
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowedTransitions?.join(', ') || 'none'}` },
        { status: 400 }
      )
    }

    await earningRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      ...(status === 'APPROVED' && { approvedAt: FieldValue.serverTimestamp() }),
      ...(status === 'PAID' && { paidAt: FieldValue.serverTimestamp() }),
      ...(status === 'CANCELLED' && { cancelledAt: FieldValue.serverTimestamp() }),
    })

    return NextResponse.json({
      success: true,
      message: `Earning status updated to ${status}`,
    })
  } catch (error) {
    console.error('Error updating earning status:', error)
    return NextResponse.json(
      { error: 'Failed to update earning status' },
      { status: 500 }
    )
  }
}
