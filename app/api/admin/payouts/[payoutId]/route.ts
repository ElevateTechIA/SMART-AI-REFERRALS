import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { logAdminAction } from '@/lib/admin-log'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  context: { params: { payoutId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { payoutId } = context.params
    const body = await request.json()
    const { status, paymentMethod, adminNote } = body as {
      status: 'COMPLETED' | 'REJECTED'
      paymentMethod?: string
      adminNote?: string
    }

    if (!['COMPLETED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be COMPLETED or REJECTED' }, { status: 400 })
    }

    const db = getAdminDb()
    const payoutRef = db.collection('payout_requests').doc(payoutId)
    const payoutDoc = await payoutRef.get()

    if (!payoutDoc.exists) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 })
    }

    const payoutData = payoutDoc.data()!
    if (payoutData.status === 'COMPLETED' || payoutData.status === 'REJECTED') {
      return NextResponse.json({ error: 'Payout already processed' }, { status: 400 })
    }

    const now = new Date()
    const batch = db.batch()

    if (status === 'COMPLETED') {
      // Update payout request
      batch.update(payoutRef, {
        status: 'COMPLETED',
        paymentMethod: paymentMethod || 'TRANSFER',
        adminNote: adminNote || '',
        processedBy: authResult.uid,
        completedAt: now,
        updatedAt: now,
      })

      // Mark all associated earnings as PAID
      const earningIds = payoutData.earningIds || []
      for (const earningId of earningIds) {
        const earningRef = db.collection('earnings').doc(earningId)
        batch.update(earningRef, {
          status: 'PAID',
          paidAt: now,
          updatedAt: now,
        })
      }
    } else {
      // REJECTED - don't change earnings status
      batch.update(payoutRef, {
        status: 'REJECTED',
        adminNote: adminNote || '',
        processedBy: authResult.uid,
        updatedAt: now,
      })
    }

    await batch.commit()

    await logAdminAction({
      action: status === 'COMPLETED' ? 'PAYOUT_COMPLETED' : 'PAYOUT_REJECTED',
      adminUid: authResult.uid,
      details: { payoutId, userId: payoutData.userId, amount: payoutData.amount, paymentMethod, adminNote },
    })

    return NextResponse.json({
      success: true,
      data: { status, payoutId },
    })
  } catch (error) {
    console.error('Error processing payout:', error)
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 })
  }
}
