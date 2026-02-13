import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const VALID_REWARD_TYPES = ['none', 'cash', 'discount', 'points'] as const

export async function PUT(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { offerId } = params
    const body = await request.json()
    const {
      referrerCommissionAmount,
      consumerRewardType,
      consumerRewardValue,
    } = body

    // Verify offer exists
    const offerRef = getAdminDb().collection('offers').doc(offerId)
    const offerDoc = await offerRef.get()

    if (!offerDoc.exists) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    const offerData = offerDoc.data()!

    // Validate commission amount
    const commission = Number(referrerCommissionAmount)
    if (isNaN(commission) || commission < 0 || commission > offerData.pricePerNewCustomer) {
      return NextResponse.json(
        { error: 'Commission must be between 0 and the price per customer' },
        { status: 400 }
      )
    }

    // Validate reward type
    const rewardType = consumerRewardType || 'none'
    if (!VALID_REWARD_TYPES.includes(rewardType)) {
      return NextResponse.json(
        { error: 'Invalid consumer reward type' },
        { status: 400 }
      )
    }

    // Validate reward value
    const rewardValue = Number(consumerRewardValue) || 0
    if (rewardType !== 'none' && (isNaN(rewardValue) || rewardValue < 0 || rewardValue > offerData.pricePerNewCustomer)) {
      return NextResponse.json(
        { error: 'Reward value must be between 0 and the price per customer' },
        { status: 400 }
      )
    }

    await offerRef.update({
      referrerCommissionAmount: Math.round(commission * 100) / 100,
      consumerRewardType: rewardType,
      consumerRewardValue: rewardType === 'none' ? 0 : Math.round(rewardValue * 100) / 100,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Offer commission settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating offer commission:', error)
    return NextResponse.json(
      { error: 'Failed to update offer commission' },
      { status: 500 }
    )
  }
}
