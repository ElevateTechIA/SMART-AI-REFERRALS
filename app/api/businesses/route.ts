import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Business } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ownerUserId,
      name,
      category,
      description,
      address,
      phone,
      website,
      images,
    } = body

    if (!ownerUserId || !name || !category || !address || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already has a business
    const existingBusinessQuery = await adminDb
      .collection('businesses')
      .where('ownerUserId', '==', ownerUserId)
      .get()

    if (!existingBusinessQuery.empty) {
      return NextResponse.json(
        { error: 'User already has a business registered' },
        { status: 400 }
      )
    }

    // Create business
    const businessData = {
      ownerUserId,
      name,
      category,
      description: description || '',
      address,
      phone,
      website: website || null,
      images: images || [],
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const businessRef = await adminDb.collection('businesses').add(businessData)

    // Add business role to user
    await adminDb.collection('users').doc(ownerUserId).update({
      roles: FieldValue.arrayUnion('business'),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      data: {
        id: businessRef.id,
        ...businessData,
      },
    })
  } catch (error) {
    console.error('Error creating business:', error)
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerUserId = searchParams.get('ownerUserId')
    const status = searchParams.get('status')

    let query = adminDb.collection('businesses').orderBy('createdAt', 'desc')

    if (ownerUserId) {
      query = query.where('ownerUserId', '==', ownerUserId)
    }
    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.limit(100).get()
    const businesses: Business[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      businesses.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Business)
    })

    return NextResponse.json({ success: true, data: businesses })
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, ownerUserId, ...updateData } = body

    if (!businessId || !ownerUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify ownership
    const businessRef = adminDb.collection('businesses').doc(businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (businessDoc.data()?.ownerUserId !== ownerUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Don't allow updating certain fields
    delete updateData.ownerUserId
    delete updateData.createdAt
    delete updateData.status // Status can only be changed by admin

    await businessRef.update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Business updated successfully',
    })
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    )
  }
}
