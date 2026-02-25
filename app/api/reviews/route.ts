import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// GET — fetch reviews for a business
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId parameter' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const snapshot = await db
      .collection('reviews')
      .where('businessId', '==', businessId)
      .get()

    const reviews = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          rating: data.rating,
          text: data.text,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST — create a review
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.uid
    const body = await request.json()
    const { businessId, rating, text } = body

    // Validate required fields
    if (!businessId || !rating || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, rating, text' },
        { status: 400 }
      )
    }

    // Validate rating range
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate text length
    const trimmedText = String(text).trim()
    if (trimmedText.length < 3 || trimmedText.length > 500) {
      return NextResponse.json(
        { error: 'Review text must be between 3 and 500 characters' },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Check user has a checked-in or converted visit to this business
    const visitsSnapshot = await db
      .collection('visits')
      .where('consumerUserId', '==', userId)
      .where('businessId', '==', businessId)
      .get()

    const hasValidVisit = visitsSnapshot.docs.some((doc) => {
      const status = doc.data().status
      return status === 'CHECKED_IN' || status === 'CONVERTED'
    })

    if (!hasValidVisit) {
      return NextResponse.json(
        { error: 'You must have a completed check-in to review this business' },
        { status: 403 }
      )
    }

    // Check one review per user per business
    const existingSnapshot = await db
      .collection('reviews')
      .where('userId', '==', userId)
      .where('businessId', '==', businessId)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'You already have a review for this business. Use PUT to update it.' },
        { status: 409 }
      )
    }

    // Get user name for denormalized display
    const userDoc = await db.collection('users').doc(userId).get()
    const userName = userDoc.data()?.name || 'Anonymous'

    const reviewData = {
      businessId,
      userId,
      userName,
      rating: ratingNum,
      text: trimmedText,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection('reviews').add(reviewData)

    return NextResponse.json({
      success: true,
      review: {
        id: docRef.id,
        businessId,
        userId,
        userName,
        rating: ratingNum,
        text: trimmedText,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// PUT — update own review
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.uid
    const body = await request.json()
    const { reviewId, rating, text } = body

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Missing reviewId' },
        { status: 400 }
      )
    }

    // Validate rating
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate text
    const trimmedText = String(text).trim()
    if (trimmedText.length < 3 || trimmedText.length > 500) {
      return NextResponse.json(
        { error: 'Review text must be between 3 and 500 characters' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const reviewRef = db.collection('reviews').doc(reviewId)
    const reviewDoc = await reviewRef.get()

    if (!reviewDoc.exists) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (reviewDoc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews' },
        { status: 403 }
      )
    }

    await reviewRef.update({
      rating: ratingNum,
      text: trimmedText,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      review: {
        id: reviewId,
        businessId: reviewDoc.data()?.businessId,
        userId,
        userName: reviewDoc.data()?.userName,
        rating: ratingNum,
        text: trimmedText,
        createdAt: reviewDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}
