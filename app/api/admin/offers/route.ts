import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getCommissionSplit } from '@/lib/commission-config.server'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to create or fully update an offer for a business.
 * Unlike the regular /api/offers POST (owner-only), this allows admins
 * to create offers on behalf of businesses that don't have one yet,
 * and to edit pricePerNewCustomer + commission settings in one save.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request, 'businesses')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const {
      businessId,
      pricePerNewCustomer,
      referrerCommissionAmount,
      consumerRewardType,
      consumerRewardValue,
    } = body

    if (!businessId || !pricePerNewCustomer || pricePerNewCustomer <= 0) {
      return NextResponse.json(
        { error: 'businessId and a valid pricePerNewCustomer are required' },
        { status: 400 }
      )
    }

    // Verify business exists
    const businessDoc = await getAdminDb().collection('businesses').doc(businessId).get()
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const price = Number(pricePerNewCustomer)
    if (isNaN(price) || price < 1 || price > 10000) {
      return NextResponse.json(
        { error: 'Price per customer must be between $1 and $10,000' },
        { status: 400 }
      )
    }

    const commissionSplit = await getCommissionSplit()

    const referrerAmount = referrerCommissionAmount !== undefined
      ? Math.max(0, Math.min(Number(referrerCommissionAmount), price))
      : Math.floor(price * commissionSplit.promoterPercent / 100)

    const rewardType = consumerRewardType || 'cash'
    const rewardVal = consumerRewardValue !== undefined
      ? Math.max(0, Math.min(Number(consumerRewardValue), price))
      : Math.floor(price * commissionSplit.consumerPercent / 100)

    // Check if offer already exists
    const offerRef = getAdminDb().collection('offers').doc(businessId)
    const existingOffer = await offerRef.get()

    const offerData: Record<string, unknown> = {
      businessId,
      pricePerNewCustomer: price,
      referrerCommissionAmount: referrerAmount,
      referrerCommissionPercentage: commissionSplit.promoterPercent,
      consumerRewardType: rewardType,
      consumerRewardValue: rewardVal,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (!existingOffer.exists) {
      // Creating new offer — set defaults for fields the admin doesn't control here
      offerData.promotionType = 'none'
      offerData.promotionValue = 0
      offerData.promotionDescription = ''
      offerData.allowPlatformAttribution = true
      offerData.active = true
      offerData.createdAt = FieldValue.serverTimestamp()
    }

    await offerRef.set(offerData, { merge: true })

    return NextResponse.json({
      success: true,
      data: {
        id: businessId,
        ...offerData,
        // Return computed values for local state update
        isNew: !existingOffer.exists,
      },
    })
  } catch (error) {
    console.error('Error in admin offer create/update:', error)
    return NextResponse.json(
      { error: 'Failed to save offer' },
      { status: 500 }
    )
  }
}
