import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Visit, AttributionType } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, offerId, consumerUserId, referrerUserId } = body

    if (!businessId || !consumerUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and consumerUserId' },
        { status: 400 }
      )
    }

    // Check if consumer already has a visit to this business (anti-fraud)
    const existingVisitsQuery = await adminDb
      .collection('visits')
      .where('businessId', '==', businessId)
      .where('consumerUserId', '==', consumerUserId)
      .get()

    const isNewCustomer = existingVisitsQuery.empty

    // Determine attribution type
    const attributionType: AttributionType = referrerUserId ? 'REFERRER' : 'PLATFORM'

    // Create visit record
    const visitData: Omit<Visit, 'id'> = {
      businessId,
      offerId: offerId || null,
      consumerUserId,
      referrerUserId: referrerUserId || null,
      attributionType,
      status: 'CREATED',
      isNewCustomer,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Get user's request metadata
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || undefined

    const visitRef = await adminDb.collection('visits').add({
      ...visitData,
      userAgent,
      ipAddress,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // If not a new customer, create fraud flag
    if (!isNewCustomer) {
      await adminDb.collection('fraudFlags').add({
        visitId: visitRef.id,
        consumerUserId,
        businessId,
        reason: 'Repeat visit from same consumer',
        createdAt: FieldValue.serverTimestamp(),
        resolved: false,
      })
    }

    // Ensure consumer has the consumer role
    const userRef = adminDb.collection('users').doc(consumerUserId)
    const userDoc = await userRef.get()
    if (userDoc.exists) {
      const userData = userDoc.data()
      if (!userData?.roles?.includes('consumer')) {
        await userRef.update({
          roles: FieldValue.arrayUnion('consumer'),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: visitRef.id,
        ...visitData,
        isNewCustomer,
      },
    })
  } catch (error) {
    console.error('Error creating visit:', error)
    return NextResponse.json(
      { error: 'Failed to create visit' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const consumerUserId = searchParams.get('consumerUserId')
    const referrerUserId = searchParams.get('referrerUserId')
    const status = searchParams.get('status')

    let query = adminDb.collection('visits').orderBy('createdAt', 'desc')

    if (businessId) {
      query = query.where('businessId', '==', businessId)
    }
    if (consumerUserId) {
      query = query.where('consumerUserId', '==', consumerUserId)
    }
    if (referrerUserId) {
      query = query.where('referrerUserId', '==', referrerUserId)
    }
    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.limit(100).get()
    const visits: Visit[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      visits.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        convertedAt: data.convertedAt?.toDate(),
      } as Visit)
    })

    return NextResponse.json({ success: true, data: visits })
  } catch (error) {
    console.error('Error fetching visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    )
  }
}
