import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { MIN_CASHOUT_AMOUNT } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET - Fetch user's payout requests
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const db = getAdminDb()
    const snapshot = await db.collection('payout_requests')
      .where('userId', '==', authResult.uid)
      .get()

    const payouts = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        amount: data.amount,
        status: data.status,
        paymentMethod: data.paymentMethod || null,
        adminNote: data.adminNote || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      }
    })

    // Sort by createdAt descending
    payouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: payouts })
  } catch (error) {
    console.error('Error fetching payout requests:', error)
    return NextResponse.json({ error: 'Failed to fetch payout requests' }, { status: 500 })
  }
}

// POST - Create a cashout request
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const userId = authResult.uid
    const db = getAdminDb()

    // Check user has bank info
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userData = userDoc.data()!
    const bankInfo = userData.bankInfo
    if (!bankInfo?.bankName || !bankInfo?.accountNumber) {
      return NextResponse.json({ error: 'Please add bank information first' }, { status: 400 })
    }

    // Check for existing pending payout
    const existingSnapshot = await db.collection('payout_requests')
      .where('userId', '==', userId)
      .get()
    const hasPending = existingSnapshot.docs.some(d => {
      const s = d.data().status
      return s === 'REQUESTED' || s === 'PROCESSING'
    })
    if (hasPending) {
      return NextResponse.json({ error: 'You already have a pending cashout request' }, { status: 400 })
    }

    // Get APPROVED earnings
    const earningsSnapshot = await db.collection('earnings')
      .where('userId', '==', userId)
      .get()

    const approvedEarnings = earningsSnapshot.docs.filter(d => d.data().status === 'APPROVED')
    const totalApproved = approvedEarnings.reduce((sum, d) => sum + (d.data().amount || 0), 0)

    if (totalApproved < MIN_CASHOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum cashout amount is $${MIN_CASHOUT_AMOUNT}` },
        { status: 400 }
      )
    }

    // Create payout request
    const now = new Date()
    const payoutRef = db.collection('payout_requests').doc()
    await payoutRef.set({
      userId,
      amount: Math.round(totalApproved * 100) / 100,
      earningIds: approvedEarnings.map(d => d.id),
      status: 'REQUESTED',
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      data: {
        payoutRequestId: payoutRef.id,
        amount: Math.round(totalApproved * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Error creating cashout request:', error)
    return NextResponse.json({ error: 'Failed to create cashout request' }, { status: 500 })
  }
}
