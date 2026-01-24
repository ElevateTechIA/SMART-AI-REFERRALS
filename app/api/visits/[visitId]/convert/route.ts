import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Earning, Charge, Offer } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params
    const body = await request.json()
    const { businessUserId } = body // The business owner confirming the conversion

    if (!visitId || !businessUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the visit
    const visitRef = adminDb.collection('visits').doc(visitId)
    const visitDoc = await visitRef.get()

    if (!visitDoc.exists) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    const visit = visitDoc.data()!

    // Verify the business owner
    const businessRef = adminDb.collection('businesses').doc(visit.businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists || businessDoc.data()?.ownerUserId !== businessUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the business owner can confirm conversions' },
        { status: 403 }
      )
    }

    // Check if already converted
    if (visit.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'Visit has already been converted' },
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

    // Get the offer
    let offer: Offer | null = null
    if (visit.offerId) {
      const offerDoc = await adminDb.collection('offers').doc(visit.offerId).get()
      if (offerDoc.exists) {
        offer = { id: offerDoc.id, ...offerDoc.data() } as Offer
      }
    }

    // If no specific offer, try to get the default offer for the business
    if (!offer) {
      const offerDoc = await adminDb.collection('offers').doc(visit.businessId).get()
      if (offerDoc.exists) {
        offer = { id: offerDoc.id, ...offerDoc.data() } as Offer
      }
    }

    // Use transaction to update all records atomically
    await adminDb.runTransaction(async (transaction) => {
      // Update visit status
      transaction.update(visitRef, {
        status: 'CONVERTED',
        convertedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
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
            const referrerEarningRef = adminDb.collection('earnings').doc()
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

            // Ensure referrer has the referrer role
            const referrerRef = adminDb.collection('users').doc(visit.referrerUserId)
            const referrerDoc = await referrerRef.get()
            if (referrerDoc.exists) {
              const referrerData = referrerDoc.data()
              if (!referrerData?.roles?.includes('referrer')) {
                transaction.update(referrerRef, {
                  roles: FieldValue.arrayUnion('referrer'),
                  updatedAt: FieldValue.serverTimestamp(),
                })
              }
            }
          }
        }

        // Calculate consumer reward
        if (offer.consumerRewardType !== 'none' && offer.consumerRewardValue > 0) {
          consumerRewardAmount = offer.consumerRewardValue

          // Create earning for consumer
          const consumerEarningRef = adminDb.collection('earnings').doc()
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
        const chargeRef = adminDb.collection('charges').doc()
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
