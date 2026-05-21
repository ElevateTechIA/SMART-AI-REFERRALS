import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getCommissionSplit } from '@/lib/commission-config.server'
import {
  listOffersByBusiness,
  countActiveOffersByBusiness,
} from '@/lib/offers-server'
import {
  MAX_ACTIVE_OFFERS_PER_BUSINESS,
  isOfferActive,
} from '@/lib/offers-config'
import type { Offer } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Validation constants
const MIN_PRICE = 1 // Minimum price per customer
const MAX_PRICE = 10000 // Maximum price per customer
const MAX_COMMISSION_PERCENTAGE = 100

// Validate and sanitize monetary value
function validateMonetaryValue(value: unknown, min = 0, max = MAX_PRICE): number | null {
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) {
    return null
  }
  if (num < min || num > max) {
    return null
  }
  // Round to 2 decimal places
  return Math.round(num * 100) / 100
}

// Validate percentage
function validatePercentage(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) {
    return null
  }
  if (num < 0 || num > MAX_COMMISSION_PERCENTAGE) {
    return null
  }
  return Math.round(num * 100) / 100
}

const VALID_REWARD_TYPES = ['none', 'cash'] as const
const VALID_PROMOTION_TYPES = ['none', 'discount_percent', 'discount_fixed', 'free_item'] as const

/**
 * POST /api/offers
 *
 * Creates a NEW offer for the authenticated user's business under an
 * auto-generated document id. Enforces `MAX_ACTIVE_OFFERS_PER_BUSINESS`.
 *
 * To EDIT an existing offer, use `PUT /api/offers/[offerId]` instead — this
 * route used to do upsert-by-businessId but no longer does so safely with
 * multiple offers per business.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.uid

    const body = await request.json()
    const {
      businessId,
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

    if (!businessId || pricePerNewCustomer === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and pricePerNewCustomer' },
        { status: 400 }
      )
    }

    // Verify business ownership using authenticated user
    const businessDoc = await getAdminDb().collection('businesses').doc(businessId).get()
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (businessDoc.data()?.ownerUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only create offers for your own business' },
        { status: 403 }
      )
    }

    // Verify business is active
    if (businessDoc.data()?.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot create offers for inactive businesses' },
        { status: 400 }
      )
    }

    // Validate monetary values
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

    // Validate consumer reward type
    const rewardType = consumerRewardType || 'none'
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

    // Validate that referrer commission + consumer reward (cash only) don't exceed price
    const effectiveCommission = validatedCommissionAmount || 0
    const effectiveReward = rewardType === 'cash' ? (validatedRewardValue || 0) : 0
    if (effectiveCommission + effectiveReward > validatedPrice) {
      return NextResponse.json(
        { error: `Referrer commission ($${effectiveCommission}) + consumer cash reward ($${effectiveReward}) cannot exceed the price per customer ($${validatedPrice})` },
        { status: 400 }
      )
    }

    // Validate promotion type
    const promoType = promotionType || 'none'
    if (!VALID_PROMOTION_TYPES.includes(promoType)) {
      return NextResponse.json(
        { error: 'Invalid promotion type' },
        { status: 400 }
      )
    }

    // Validate promotion value
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

    // Sanitize promotion description / title
    const promoDescription = typeof promotionDescription === 'string'
      ? promotionDescription.trim().slice(0, 500)
      : ''
    const offerTitle = typeof title === 'string' ? title.trim().slice(0, 120) : ''

    // Enforce active-offer cap for this business. We only block when the new
    // doc would itself be active — letting users create archived drafts later
    // is fine and doesn't count against the cap.
    const willBeActive = active !== false
    if (willBeActive) {
      const activeCount = await countActiveOffersByBusiness(businessId)
      if (activeCount >= MAX_ACTIVE_OFFERS_PER_BUSINESS) {
        return NextResponse.json(
          {
            error: `Active offer limit reached (${MAX_ACTIVE_OFFERS_PER_BUSINESS}). Archive an existing active offer before creating another.`,
            code: 'ACTIVE_OFFER_LIMIT_REACHED',
            limit: MAX_ACTIVE_OFFERS_PER_BUSINESS,
            activeCount,
          },
          { status: 409 }
        )
      }
    }

    // Fetch commission split config from Firestore
    const commissionSplit = await getCommissionSplit()

    // Build offer data
    const offerData: Record<string, unknown> = {
      businessId,
      ...(offerTitle && { title: offerTitle }),
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
      ...(image !== undefined && { image: image || null }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Create with auto-generated doc id (no longer using businessId as doc id).
    const newRef = getAdminDb().collection('offers').doc()
    await newRef.set(offerData)

    return NextResponse.json({
      success: true,
      data: {
        id: newRef.id,
        ...offerData,
      },
    })
  } catch (error) {
    console.error('Error creating offer:', error)
    return NextResponse.json(
      { error: 'Failed to save offer' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/offers
 *
 * - `?businessId=X`: returns ALL offers for that business as an array
 *   (active + archived for owner/admin; only active for everyone else).
 * - no filter: list of offers visible to the caller (admins see everything,
 *   others see only active offers).
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.uid
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const activeOnly = searchParams.get('active') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Check if user is admin
    const userDoc = await getAdminDb().collection('users').doc(userId).get()
    const isAdmin = userDoc.data()?.roles?.includes('admin')

    if (businessId) {
      // List offers for a specific business. Owners and admins see archived
      // too; everyone else only gets active ones.
      const businessDoc = await getAdminDb().collection('businesses').doc(businessId).get()
      const isOwner = businessDoc.exists && businessDoc.data()?.ownerUserId === userId

      const offers = await listOffersByBusiness(businessId)
      const filtered = (isAdmin || isOwner)
        ? offers
        : offers.filter(isOfferActive)

      return NextResponse.json({ success: true, data: filtered })
    }

    // Get offers based on permissions
    let query = getAdminDb().collection('offers').orderBy('createdAt', 'desc')

    if (!isAdmin) {
      // Non-admins can only see active offers
      query = query.where('active', '==', true)
    } else if (activeOnly) {
      query = query.where('active', '==', true)
    }

    const snapshot = await query.limit(limit + 1).get()
    const hasMore = snapshot.size > limit
    const offers: Offer[] = []

    snapshot.docs.slice(0, limit).forEach((doc) => {
      const data = doc.data()
      offers.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Offer)
    })

    return NextResponse.json({
      success: true,
      data: offers,
      pagination: { limit, hasMore }
    })
  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    )
  }
}
