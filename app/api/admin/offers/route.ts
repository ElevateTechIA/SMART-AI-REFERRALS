import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getCommissionSplit } from '@/lib/commission-config.server'
import {
  countActiveOffersByBusiness,
  listActiveOffersByBusiness,
} from '@/lib/offers-server'
import { MAX_ACTIVE_OFFERS_PER_BUSINESS } from '@/lib/offers-config'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to create or update an offer for a business.
 *
 * Resolution order for which offer to update:
 *   1. Explicit `offerId` in the request body (preferred).
 *   2. If absent, pick the first active offer for the business as a
 *      compatibility shim (matches the old "one offer per business"
 *      behavior of the legacy admin UI).
 *   3. If the business has no active offers, create a new one (subject to
 *      `MAX_ACTIVE_OFFERS_PER_BUSINESS`).
 *
 * Note: this is a focused admin endpoint that edits price + commission only.
 * Full offer editing (promotion, image, etc.) lives in `PUT /api/offers/[offerId]`.
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
      offerId,
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

    // Resolve target offer document
    let offerRef: FirebaseFirestore.DocumentReference
    let isNew = false
    if (offerId) {
      offerRef = getAdminDb().collection('offers').doc(offerId)
      const existing = await offerRef.get()
      if (!existing.exists) {
        return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
      }
      if (existing.data()?.businessId !== businessId) {
        return NextResponse.json(
          { error: "Offer does not belong to the given business" },
          { status: 400 }
        )
      }
    } else {
      // Backwards-compat path: act on the first active offer; otherwise create
      // a new one (subject to the active cap).
      const active = await listActiveOffersByBusiness(businessId)
      if (active.length > 0) {
        offerRef = getAdminDb().collection('offers').doc(active[0].id)
      } else {
        const activeCount = await countActiveOffersByBusiness(businessId)
        if (activeCount >= MAX_ACTIVE_OFFERS_PER_BUSINESS) {
          return NextResponse.json(
            {
              error: `Active offer limit reached (${MAX_ACTIVE_OFFERS_PER_BUSINESS})`,
              code: 'ACTIVE_OFFER_LIMIT_REACHED',
            },
            { status: 409 }
          )
        }
        offerRef = getAdminDb().collection('offers').doc()
        isNew = true
      }
    }

    const offerData: Record<string, unknown> = {
      businessId,
      pricePerNewCustomer: price,
      referrerCommissionAmount: referrerAmount,
      referrerCommissionPercentage: commissionSplit.promoterPercent,
      consumerRewardType: rewardType,
      consumerRewardValue: rewardVal,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (isNew) {
      // Creating new offer — set defaults for fields the admin doesn't control here
      offerData.promotionType = 'none'
      offerData.promotionValue = 0
      offerData.promotionDescription = ''
      offerData.allowPlatformAttribution = true
      offerData.active = true
      offerData.status = 'active'
      offerData.createdAt = FieldValue.serverTimestamp()
    }

    await offerRef.set(offerData, { merge: true })

    return NextResponse.json({
      success: true,
      data: {
        id: offerRef.id,
        ...offerData,
        isNew,
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
