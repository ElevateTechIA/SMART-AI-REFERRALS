import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { isTokenExpired } from '@/lib/qr-checkin'
import { getCommissionSplit } from '@/lib/commission-config.server'
import { calculateSplit } from '@/lib/commission-config'
import { resolveOfferForVisit } from '@/lib/offers-server'

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

    // Pre-flight checks (non-atomic, fast-fail for obvious issues)
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

    if (visit.status !== 'CREATED' && visit.status !== 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'Visit cannot be converted from current status' },
        { status: 400 }
      )
    }

    // Token validation for direct conversion from CREATED
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

    // Check if it's a new customer (anti-fraud)
    if (!visit.isNewCustomer) {
      return NextResponse.json(
        { error: 'This is a repeat customer - conversion not eligible for rewards' },
        { status: 400 }
      )
    }

    // Resolve the offer: prefer `visit.offerId`, fall back to the legacy
    // `offers/{businessId}` doc for visits created before multi-offer rolled
    // out. The fallback is kept until backfill is verified — see
    // `docs/MULTI_OFFERS_MIGRATION.md`.
    const offer = await resolveOfferForVisit({
      offerId: visit.offerId,
      businessId: visit.businessId,
    })

    // Offer is required to create financial records
    if (!offer) {
      return NextResponse.json(
        { error: 'No offer configured for this business. Please create an offer before converting visits.' },
        { status: 400 }
      )
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

    // Fetch commission split config from Firestore
    const commissionSplit = await getCommissionSplit()

    // Use transaction to update all records atomically
    await getAdminDb().runTransaction(async (transaction) => {
      // Re-read visit inside transaction to prevent race conditions (double conversion)
      const freshVisitDoc = await transaction.get(visitRef)
      if (!freshVisitDoc.exists) {
        throw new Error('VISIT_NOT_FOUND')
      }
      const freshVisit = freshVisitDoc.data()!
      if (freshVisit.status === 'CONVERTED') {
        throw new Error('ALREADY_CONVERTED')
      }
      if (freshVisit.status !== 'CREATED' && freshVisit.status !== 'CHECKED_IN') {
        throw new Error('INVALID_STATUS')
      }

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

      const pricePerCustomer = offer.pricePerNewCustomer || 100
      const split = calculateSplit(pricePerCustomer, commissionSplit)
      let referrerAmount = 0
      let consumerRewardAmount = split.consumerAmount
      let platformAmount = split.platformAmount

      // Calculate referrer commission from config split
      if (visit.referrerUserId && visit.attributionType === 'REFERRER') {
        referrerAmount = split.promoterAmount

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

          // Update referrer role if needed
          if (referrerNeedsRoleUpdate) {
            const referrerRef = getAdminDb().collection('users').doc(visit.referrerUserId)
            transaction.update(referrerRef, {
              roles: FieldValue.arrayUnion('referrer'),
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
        }
      } else {
        // No referrer: promoter share goes to platform
        platformAmount += split.promoterAmount
      }

      // Consumer always gets their cash reward share
      if (consumerRewardAmount > 0) {
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
      }

      // Create charge for business
      const chargeRef = getAdminDb().collection('charges').doc()
      transaction.set(chargeRef, {
        businessId: visit.businessId,
        visitId,
        offerId: offer.id,
        amount: pricePerCustomer,
        platformAmount,
        referrerAmount,
        consumerRewardAmount,
        status: 'OWED',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Conversion confirmed successfully',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ALREADY_CONVERTED') {
        return NextResponse.json(
          { error: 'Visit has already been converted' },
          { status: 400 }
        )
      }
      if (error.message === 'INVALID_STATUS') {
        return NextResponse.json(
          { error: 'Visit cannot be converted from current status' },
          { status: 400 }
        )
      }
      if (error.message === 'VISIT_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Visit not found' },
          { status: 404 }
        )
      }
    }
    console.error('Error confirming conversion:', error)
    return NextResponse.json(
      { error: 'Failed to confirm conversion' },
      { status: 500 }
    )
  }
}
