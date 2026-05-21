import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getCommissionSplit } from '@/lib/commission-config.server'
import { getOfferById, countActiveOffersByBusiness } from '@/lib/offers-server'
import { MAX_ACTIVE_OFFERS_PER_BUSINESS, isOfferActive } from '@/lib/offers-config'

export const dynamic = 'force-dynamic'

const MIN_PRICE = 1
const MAX_PRICE = 10000
const MAX_COMMISSION_PERCENTAGE = 100

function validateMonetaryValue(value: unknown, min = 0, max = MAX_PRICE): number | null {
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return null
  if (num < min || num > max) return null
  return Math.round(num * 100) / 100
}

function validatePercentage(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return null
  if (num < 0 || num > MAX_COMMISSION_PERCENTAGE) return null
  return Math.round(num * 100) / 100
}

const VALID_REWARD_TYPES = ['none', 'cash'] as const
const VALID_PROMOTION_TYPES = ['none', 'discount_percent', 'discount_fixed', 'free_item'] as const

async function authorizeOfferAccess(request: NextRequest, offerId: string) {
  const authResult = await verifyAuth(request)
  if (!authResult.success) {
    return { ok: false as const, response: NextResponse.json({ error: authResult.error }, { status: authResult.status }) }
  }
  const userId = authResult.uid

  const offer = await getOfferById(offerId)
  if (!offer) {
    return { ok: false as const, response: NextResponse.json({ error: 'Offer not found' }, { status: 404 }) }
  }

  const businessDoc = await getAdminDb().collection('businesses').doc(offer.businessId).get()
  if (!businessDoc.exists) {
    return { ok: false as const, response: NextResponse.json({ error: 'Business not found' }, { status: 404 }) }
  }
  const isOwner = businessDoc.data()?.ownerUserId === userId

  const userDoc = await getAdminDb().collection('users').doc(userId).get()
  const isAdmin = !!userDoc.data()?.roles?.includes('admin')

  return { ok: true as const, userId, offer, isOwner, isAdmin, businessData: businessDoc.data() }
}

/** GET /api/offers/[offerId] — read a single offer (active for anyone, archived only for owner/admin). */
export async function GET(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const auth = await authorizeOfferAccess(request, params.offerId)
    if (!auth.ok) return auth.response

    if (!isOfferActive(auth.offer) && !auth.isOwner && !auth.isAdmin) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: auth.offer })
  } catch (error) {
    console.error('Error fetching offer:', error)
    return NextResponse.json({ error: 'Failed to fetch offer' }, { status: 500 })
  }
}

/**
 * PUT /api/offers/[offerId] — edit an existing offer.
 *
 * Only the business owner (or admin) may edit. The offer's `businessId` is
 * immutable: a payload that attempts to move the offer to another business
 * is rejected.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const auth = await authorizeOfferAccess(request, params.offerId)
    if (!auth.ok) return auth.response
    if (!auth.isOwner && !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      businessId: incomingBusinessId,
      title,
      image,
      pricePerNewCustomer,
      referrerCommissionAmount,
      referrerCommissionPercentage,
      consumerRewardType,
      consumerRewardValue,
      promotionType,
      promotionValue,
      promotionDescription,
      allowPlatformAttribution,
      active,
    } = body

    if (incomingBusinessId && incomingBusinessId !== auth.offer.businessId) {
      return NextResponse.json(
        { error: "Cannot change an offer's businessId" },
        { status: 400 }
      )
    }

    if (pricePerNewCustomer === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: pricePerNewCustomer' },
        { status: 400 }
      )
    }

    if (auth.businessData?.status !== 'active' && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Cannot edit offers for inactive businesses' },
        { status: 400 }
      )
    }

    const validatedPrice = validateMonetaryValue(pricePerNewCustomer, MIN_PRICE, MAX_PRICE)
    if (validatedPrice === null) {
      return NextResponse.json(
        { error: `Price per new customer must be between ${MIN_PRICE} and ${MAX_PRICE}` },
        { status: 400 }
      )
    }

    const validatedCommissionAmount = validateMonetaryValue(referrerCommissionAmount, 0, validatedPrice)
    if (referrerCommissionAmount !== undefined && referrerCommissionAmount !== '' && validatedCommissionAmount === null) {
      return NextResponse.json(
        { error: 'Referrer commission amount must be a valid number between 0 and the price per customer' },
        { status: 400 }
      )
    }

    const validatedCommissionPercentage = validatePercentage(referrerCommissionPercentage)
    if (referrerCommissionPercentage !== undefined && referrerCommissionPercentage !== null && referrerCommissionPercentage !== '' && validatedCommissionPercentage === null) {
      return NextResponse.json(
        { error: 'Referrer commission percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    const rewardType = consumerRewardType || 'cash'
    if (!VALID_REWARD_TYPES.includes(rewardType)) {
      return NextResponse.json(
        { error: 'Invalid consumer reward type' },
        { status: 400 }
      )
    }

    const validatedRewardValue = validateMonetaryValue(consumerRewardValue, 0, validatedPrice)
    if (consumerRewardValue !== undefined && consumerRewardValue !== '' && validatedRewardValue === null) {
      return NextResponse.json(
        { error: 'Consumer reward value must be a valid number between 0 and the price per customer' },
        { status: 400 }
      )
    }

    const effectiveCommission = validatedCommissionAmount || 0
    const effectiveReward = rewardType === 'cash' ? (validatedRewardValue || 0) : 0
    if (effectiveCommission + effectiveReward > validatedPrice) {
      return NextResponse.json(
        { error: `Referrer commission ($${effectiveCommission}) + consumer cash reward ($${effectiveReward}) cannot exceed the price per customer ($${validatedPrice})` },
        { status: 400 }
      )
    }

    const promoType = promotionType || 'none'
    if (!VALID_PROMOTION_TYPES.includes(promoType)) {
      return NextResponse.json(
        { error: 'Invalid promotion type' },
        { status: 400 }
      )
    }

    let validatedPromoValue = 0
    if (promoType === 'discount_percent') {
      const pct = validatePercentage(promotionValue)
      if (promotionValue !== undefined && promotionValue !== '' && pct === null) {
        return NextResponse.json(
          { error: 'Promotion discount percentage must be between 0 and 100' },
          { status: 400 }
        )
      }
      validatedPromoValue = pct || 0
    } else if (promoType === 'discount_fixed') {
      const val = validateMonetaryValue(promotionValue, 0, MAX_PRICE)
      if (promotionValue !== undefined && promotionValue !== '' && val === null) {
        return NextResponse.json(
          { error: 'Promotion discount amount must be a valid positive number' },
          { status: 400 }
        )
      }
      validatedPromoValue = val || 0
    }

    const promoDescription = typeof promotionDescription === 'string'
      ? promotionDescription.trim().slice(0, 500)
      : ''
    const offerTitle = typeof title === 'string' ? title.trim().slice(0, 120) : undefined

    // If the edit re-activates a previously archived offer, enforce the cap.
    const willBeActive = active !== false
    if (willBeActive && !isOfferActive(auth.offer)) {
      const activeCount = await countActiveOffersByBusiness(auth.offer.businessId)
      if (activeCount >= MAX_ACTIVE_OFFERS_PER_BUSINESS) {
        return NextResponse.json(
          {
            error: `Active offer limit reached (${MAX_ACTIVE_OFFERS_PER_BUSINESS}). Archive an existing active offer before re-activating this one.`,
            code: 'ACTIVE_OFFER_LIMIT_REACHED',
            limit: MAX_ACTIVE_OFFERS_PER_BUSINESS,
            activeCount,
          },
          { status: 409 }
        )
      }
    }

    const commissionSplit = await getCommissionSplit()

    const updateData: Record<string, unknown> = {
      pricePerNewCustomer: validatedPrice,
      referrerCommissionAmount: validatedCommissionAmount || Math.floor(validatedPrice * commissionSplit.promoterPercent / 100),
      referrerCommissionPercentage: validatedCommissionPercentage || commissionSplit.promoterPercent,
      consumerRewardType: 'cash' as const,
      consumerRewardValue: validatedRewardValue || Math.floor(validatedPrice * commissionSplit.consumerPercent / 100),
      promotionType: promoType,
      promotionValue: validatedPromoValue,
      promotionDescription: promoDescription,
      allowPlatformAttribution: allowPlatformAttribution !== false,
      active: willBeActive,
      status: willBeActive ? 'active' : 'archived',
      ...(offerTitle !== undefined && { title: offerTitle }),
      ...(image !== undefined && { image: image || null }),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await getAdminDb().collection('offers').doc(params.offerId).update(updateData)

    return NextResponse.json({
      success: true,
      data: { id: params.offerId, ...updateData },
    })
  } catch (error) {
    console.error('Error updating offer:', error)
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }
}
