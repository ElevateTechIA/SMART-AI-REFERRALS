import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Offer } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      businessId,
      ownerUserId, // For verification
      pricePerNewCustomer,
      referrerCommissionAmount,
      referrerCommissionPercentage,
      consumerRewardType,
      consumerRewardValue,
      allowPlatformAttribution,
      active,
    } = body

    if (!businessId || !ownerUserId || pricePerNewCustomer === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify business ownership
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get()
    if (!businessDoc.exists || businessDoc.data()?.ownerUserId !== ownerUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Use businessId as the offer ID (one active offer per business for MVP)
    const offerData = {
      businessId,
      pricePerNewCustomer: Number(pricePerNewCustomer),
      referrerCommissionAmount: Number(referrerCommissionAmount) || 0,
      referrerCommissionPercentage: referrerCommissionPercentage ? Number(referrerCommissionPercentage) : null,
      consumerRewardType: consumerRewardType || 'none',
      consumerRewardValue: Number(consumerRewardValue) || 0,
      allowPlatformAttribution: allowPlatformAttribution !== false,
      active: active !== false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Use set with merge to create or update
    await adminDb.collection('offers').doc(businessId).set(offerData, { merge: true })

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
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const activeOnly = searchParams.get('active') === 'true'

    if (businessId) {
      // Get specific offer
      const offerDoc = await adminDb.collection('offers').doc(businessId).get()
      if (!offerDoc.exists) {
        return NextResponse.json({ success: true, data: null })
      }

      const data = offerDoc.data()!
      const offer: Offer = {
        id: offerDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Offer

      return NextResponse.json({ success: true, data: offer })
    }

    // Get all offers
    let query = adminDb.collection('offers').orderBy('createdAt', 'desc')

    if (activeOnly) {
      query = query.where('active', '==', true)
    }

    const snapshot = await query.limit(100).get()
    const offers: Offer[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      offers.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Offer)
    })

    return NextResponse.json({ success: true, data: offers })
  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    )
  }
}
