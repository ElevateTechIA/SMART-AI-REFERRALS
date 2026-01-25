import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Offer } from '@/lib/types'

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

const VALID_REWARD_TYPES = ['none', 'cash', 'discount', 'points'] as const

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
      pricePerNewCustomer,
      referrerCommissionAmount,
      referrerCommissionPercentage,
      consumerRewardType,
      consumerRewardValue,
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

    // Build offer data
    const offerData = {
      businessId,
      pricePerNewCustomer: validatedPrice,
      referrerCommissionAmount: validatedCommissionAmount || 0,
      referrerCommissionPercentage: validatedCommissionPercentage,
      consumerRewardType: rewardType,
      consumerRewardValue: validatedRewardValue || 0,
      allowPlatformAttribution: allowPlatformAttribution !== false,
      active: active !== false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Use set with merge to create or update
    await getAdminDb().collection('offers').doc(businessId).set(offerData, { merge: true })

    return NextResponse.json({
      success: true,
      data: {
        id: businessId,
        ...offerData,
      },
    })
  } catch (error) {
    console.error('Error creating/updating offer:', error)
    return NextResponse.json(
      { error: 'Failed to save offer' },
      { status: 500 }
    )
  }
}

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
      // Get specific offer
      const offerDoc = await getAdminDb().collection('offers').doc(businessId).get()
      if (!offerDoc.exists) {
        return NextResponse.json({ success: true, data: null })
      }

      const offerData = offerDoc.data()!

      // Check if user can view this offer
      const businessDoc = await getAdminDb().collection('businesses').doc(businessId).get()
      const isOwner = businessDoc.data()?.ownerUserId === userId
      const isActive = offerData.active === true

      // Only allow viewing if: admin, owner, or offer is active
      if (!isAdmin && !isOwner && !isActive) {
        return NextResponse.json(
          { error: 'Offer not found' },
          { status: 404 }
        )
      }

      const offer: Offer = {
        id: offerDoc.id,
        ...offerData,
        createdAt: offerData.createdAt?.toDate(),
        updatedAt: offerData.updatedAt?.toDate(),
      } as Offer

      return NextResponse.json({ success: true, data: offer })
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
