import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { isValidPhoneNumber } from 'libphonenumber-js'
import type { Business } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Input validation helpers
function validateBusinessName(name: string): boolean {
  return typeof name === 'string' && name.length >= 2 && name.length <= 100
}

function validatePhone(phone: string): boolean {
  if (typeof phone !== 'string' || phone.length < 7 || phone.length > 20) return false
  return isValidPhoneNumber(phone, 'US')
}

function validateAddress(address: string): boolean {
  return typeof address === 'string' && address.length >= 5 && address.length <= 500
}

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

    // Use authenticated user as owner (prevent impersonation)
    const ownerUserId = authResult.uid

    const body = await request.json()
    const {
      name,
      category,
      description,
      address,
      phone,
      website,
      images,
    } = body

    // Validate required fields
    if (!name || !category || !address || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, address, phone' },
        { status: 400 }
      )
    }

    // Input validation
    if (!validateBusinessName(name)) {
      return NextResponse.json(
        { error: 'Business name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    if (!validateAddress(address)) {
      return NextResponse.json(
        { error: 'Address must be between 5 and 500 characters' },
        { status: 400 }
      )
    }

    // Check if user already has a business
    const existingBusinessQuery = await getAdminDb()
      .collection('businesses')
      .where('ownerUserId', '==', ownerUserId)
      .limit(1)
      .get()

    if (!existingBusinessQuery.empty) {
      return NextResponse.json(
        { error: 'You already have a business registered' },
        { status: 400 }
      )
    }

    // Create business
    const businessData = {
      ownerUserId,
      name: name.trim(),
      category,
      description: (description || '').trim().slice(0, 1000),
      address: address.trim(),
      phone: phone.trim(),
      website: website ? website.trim() : null,
      images: Array.isArray(images) ? images.slice(0, 10) : [],
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const businessRef = await getAdminDb().collection('businesses').add(businessData)

    // Add business role to user
    await getAdminDb().collection('users').doc(ownerUserId).update({
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
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Check if user is admin
    const userDoc = await getAdminDb().collection('users').doc(userId).get()
    const isAdmin = userDoc.data()?.roles?.includes('admin')

    let query = getAdminDb().collection('businesses').orderBy('createdAt', 'desc')

    if (!isAdmin) {
      // Non-admins can only see their own businesses or active businesses
      const ownBusinesses = await getAdminDb()
        .collection('businesses')
        .where('ownerUserId', '==', userId)
        .get()

      const activeBusinesses = await getAdminDb()
        .collection('businesses')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

      const businessMap = new Map<string, Business>()

      const processDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data()
        businessMap.set(doc.id, {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Business)
      }

      ownBusinesses.forEach(processDoc)
      activeBusinesses.forEach(processDoc)

      const businesses = Array.from(businessMap.values())
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, limit)

      return NextResponse.json({
        success: true,
        data: businesses,
        pagination: { page: 1, limit, hasMore: false }
      })
    }

    // Admin can filter by status
    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.limit(limit + 1).get()
    const hasMore = snapshot.size > limit
    const businesses: Business[] = []

    snapshot.docs.slice(0, limit).forEach((doc) => {
      const data = doc.data()
      businesses.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Business)
    })

    return NextResponse.json({
      success: true,
      data: businesses,
      pagination: { page, limit, hasMore }
    })
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
    const { businessId, ...updateData } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId' },
        { status: 400 }
      )
    }

    // Verify ownership
    const businessRef = getAdminDb().collection('businesses').doc(businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Only owner can update their business
    if (businessDoc.data()?.ownerUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own business' },
        { status: 403 }
      )
    }

    // Don't allow updating protected fields
    delete updateData.ownerUserId
    delete updateData.createdAt
    delete updateData.status // Status can only be changed by admin

    // Validate update fields if provided
    if (updateData.name && !validateBusinessName(updateData.name)) {
      return NextResponse.json(
        { error: 'Business name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    if (updateData.phone && !validatePhone(updateData.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    if (updateData.address && !validateAddress(updateData.address)) {
      return NextResponse.json(
        { error: 'Address must be between 5 and 500 characters' },
        { status: 400 }
      )
    }

    // Sanitize string fields
    if (updateData.name) updateData.name = updateData.name.trim()
    if (updateData.description) updateData.description = updateData.description.trim().slice(0, 1000)
    if (updateData.address) updateData.address = updateData.address.trim()
    if (updateData.phone) updateData.phone = updateData.phone.trim()
    if (updateData.website) updateData.website = updateData.website.trim()
    if (updateData.images) updateData.images = updateData.images.slice(0, 10)

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
