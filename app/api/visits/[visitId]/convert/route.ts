import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { isTokenExpired } from '@/lib/qr-checkin'
import type { Offer } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { visitId } = params
    const businessUserId = authResult.uid

    // Token is optional - required when converting directly from CREATED via QR scan
    let token: string | undefined
    try {
      const body = await request.json()
      token = body.token
    } catch {
      // Empty body is fine for legacy CHECKED_IN conversions
    }

    if (!visitId) {
      return NextResponse.json(
        { error: 'Missing visitId' },
        { status: 400 }
      )
    }

    // Get the visit
    const visitRef = getAdminDb().collection('visits').doc(visitId)
    const visitDoc = await visitRef.get()

    if (!visitDoc.exists) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    const visit = visitDoc.data()!

    // Verify the business owner matches authenticated user
    const businessRef = getAdminDb().collection('businesses').doc(visit.businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const businessData = businessDoc.data()!

    if (businessData.ownerUserId !== businessUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the business owner can confirm conversions' },
        { status: 403 }
      )
    }

    // Verify business is active
    if (businessData.status !== 'active') {
      return NextResponse.json(
        { error: 'Business is not active' },
        { status: 400 }
      )
    }

    // Check if already converted
    if (visit.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'Visit has already been converted' },
        { status: 400 }
      )
    }

    if (visit.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Visit was rejected' },
        { status: 400 }
      )
    }

    // Direct conversion from CREATED with QR token
    if (visit.status === 'CREATED' && visit.checkInToken) {
      if (!token) {
        return NextResponse.json(
          { error: 'Token required for direct conversion. Scan the customer QR code.' },
          { status: 400 }
        )
      }
      if (token !== visit.checkInToken) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 403 }
        )
      }
      const expiryDate = visit.checkInTokenExpiry?.toDate()
      if (!expiryDate || isTokenExpired(expiryDate)) {
        return NextResponse.json(
          { error: 'QR code has expired' },
          { status: 400 }
        )
      }
      if (visit.checkInTokenUsed) {
        return NextResponse.json(
          { error: 'This QR code has already been used' },
          { status: 400 }
        )
      }
    }

    // Allow conversion from CREATED (with token above) or CHECKED_IN (legacy)
    if (visit.status !== 'CREATED' && visit.status !== 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'Visit cannot be converted from current status' },
        { status: 400 }
      )
    }

    // Check if it's a new customer (anti-fraud)
    if (!visit.isNewCustomer) {
      return NextResponse.json(
        { error: 'This is a repeat customer - conversion not eligible for rewards' },
        { status: 400 }
      )
    }

    // Get the offer (do reads before transaction)
    let offer: Offer | null = null
    if (visit.offerId) {
      const offerDoc = await getAdminDb().collection('offers').doc(visit.offerId).get()
      if (offerDoc.exists) {
        offer = { id: offerDoc.id, ...offerDoc.data() } as Offer
      }
    }

    // If no specific offer, try to get the default offer for the business
    if (!offer) {
      const offerDoc = await getAdminDb().collection('offers').doc(visit.businessId).get()
      if (offerDoc.exists) {
        offer = { id: offerDoc.id, ...offerDoc.data() } as Offer
      }
    }

    // Get referrer data before transaction if needed
    let referrerNeedsRoleUpdate = false
    if (visit.referrerUserId) {
      const referrerDoc = await getAdminDb().collection('users').doc(visit.referrerUserId).get()
      if (referrerDoc.exists) {
        const referrerData = referrerDoc.data()
        referrerNeedsRoleUpdate = !referrerData?.roles?.includes('referrer')
      }
    }

    // Use transaction to update all records atomically
    await getAdminDb().runTransaction(async (transaction) => {
      // Update visit status (and mark token used if direct conversion from CREATED)
      transaction.update(visitRef, {
        status: 'CONVERTED',
        convertedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(visit.status === 'CREATED' && visit.checkInToken && {
          checkInTokenUsed: true,
          checkedInAt: FieldValue.serverTimestamp(),
          checkInByUserId: businessUserId,
        }),
      })

      if (offer) {
        const pricePerCustomer = offer.pricePerNewCustomer || 100
        let referrerAmount = 0
        let consumerRewardAmount = 0
        let platformAmount = pricePerCustomer

        // Calculate referrer commission
        if (visit.referrerUserId && visit.attributionType === 'REFERRER') {
          referrerAmount = offer.referrerCommissionAmount || 0
          if (!referrerAmount && offer.referrerCommissionPercentage) {
            referrerAmount = (pricePerCustomer * offer.referrerCommissionPercentage) / 100
          }

          // Create earning for referrer
          if (referrerAmount > 0) {
            const referrerEarningRef = getAdminDb().collection('earnings').doc()
            transaction.set(referrerEarningRef, {
              userId: visit.referrerUserId,
              businessId: visit.businessId,
              visitId,
              offerId: offer.id,
              amount: referrerAmount,
              type: 'REFERRER_COMMISSION',
              status: 'PENDING',
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            })

            platformAmount -= referrerAmount

            // Update referrer role if needed
            if (referrerNeedsRoleUpdate) {
              const referrerRef = getAdminDb().collection('users').doc(visit.referrerUserId)
              transaction.update(referrerRef, {
                roles: FieldValue.arrayUnion('referrer'),
                updatedAt: FieldValue.serverTimestamp(),
              })
            }
          }
        }

        // Calculate consumer reward
        if (offer.consumerRewardType !== 'none' && offer.consumerRewardValue > 0) {
          consumerRewardAmount = offer.consumerRewardValue

          // Create earning for consumer
          const consumerEarningRef = getAdminDb().collection('earnings').doc()
          transaction.set(consumerEarningRef, {
            userId: visit.consumerUserId,
            businessId: visit.businessId,
            visitId,
            offerId: offer.id,
            amount: consumerRewardAmount,
            type: 'CONSUMER_REWARD',
            status: 'PENDING',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })

          if (offer.consumerRewardType === 'cash') {
            platformAmount -= consumerRewardAmount
          }
        }

        // Create charge for business
        const chargeRef = getAdminDb().collection('charges').doc()
        transaction.set(chargeRef, {
          businessId: visit.businessId,
          visitId,
          offerId: offer.id,
          amount: pricePerCustomer,
          platformAmount: Math.max(0, platformAmount),
          referrerAmount,
          consumerRewardAmount,
          status: 'OWED',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Conversion confirmed successfully',
    })
  } catch (error) {
    console.error('Error confirming conversion:', error)
    return NextResponse.json(
      { error: 'Failed to confirm conversion' },
      { status: 500 }
    )
  }
}
