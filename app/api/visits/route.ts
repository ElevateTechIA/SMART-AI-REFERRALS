import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Visit, AttributionType } from '@/lib/types'
import { generateCheckInToken } from '@/lib/qr-checkin'
import { isDuplicateVisit } from '@/lib/visits-helpers'

export const dynamic = 'force-dynamic'

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

    const body = await request.json()
    const { businessId, offerId, referrerUserId } = body

    // Use authenticated user as consumer (prevent impersonation)
    const consumerUserId = authResult.uid

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required field: businessId' },
        { status: 400 }
      )
    }

    // Verify business exists and is active
    const businessDoc = await getAdminDb().collection('businesses').doc(businessId).get()
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }
    if (businessDoc.data()?.status !== 'active') {
      return NextResponse.json(
        { error: 'Business is not accepting visits' },
        { status: 400 }
      )
    }

    // Prevent self-referral
    if (referrerUserId && referrerUserId === consumerUserId) {
      return NextResponse.json(
        { error: 'Cannot refer yourself' },
        { status: 400 }
      )
    }

    // Prevent business owner from visiting their own business
    const businessOwnerUserId = businessDoc.data()?.ownerUserId
    if (businessOwnerUserId === consumerUserId) {
      return NextResponse.json(
        { error: 'Business owners cannot create visits to their own business' },
        { status: 400 }
      )
    }

    // Verify referrer is approved before allowing referral attribution
    if (referrerUserId) {
      const referrerDoc = await getAdminDb().collection('users').doc(referrerUserId).get()
      if (!referrerDoc.exists) {
        return NextResponse.json(
          { error: 'Referrer not found' },
          { status: 404 }
        )
      }
      const referrerData = referrerDoc.data()
      const isReferrerAdmin = referrerData?.roles?.includes('admin')
      if (!isReferrerAdmin && referrerData?.referrerStatus !== 'active') {
        return NextResponse.json(
          { error: 'Referrer is not approved to make referrals' },
          { status: 403 }
        )
      }
    }

    // Get user's request metadata
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || undefined

    // Determine attribution type
    const attributionType: AttributionType = referrerUserId ? 'REFERRER' : 'PLATFORM'

    // Generate check-in token (storing plain token, protected by Firestore rules)
    const plainToken = generateCheckInToken()
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Use transaction for atomic visit creation (duplicate check inside to prevent race conditions)
    const result = await getAdminDb().runTransaction(async (transaction) => {
      // Multi-offer duplicate check: a consumer can claim DIFFERENT offers
      // from the same business, but cannot repeat the SAME offer. We fetch
      // every visit this consumer has for this business (typically 0–2 rows
      // since the active-offer cap is small) and let `isDuplicateVisit`
      // collapse legacy shapes (offerId == null OR offerId == businessId)
      // into one bucket so historic visits don't gate new auto-id offers.
      //
      // Note: no .limit() because we need to inspect offerIds. With the
      // active-offer cap of 2 the result set is bounded.
      const existingVisitsQuery = await getAdminDb()
        .collection('visits')
        .where('businessId', '==', businessId)
        .where('consumerUserId', '==', consumerUserId)
        .get()

      const existingVisits = existingVisitsQuery.docs.map((d) => ({
        offerId: (d.data().offerId ?? null) as string | null,
      }))

      if (isDuplicateVisit(existingVisits, offerId ?? null, businessId)) {
        throw new Error('DUPLICATE_VISIT')
      }

      // Create visit record
      const visitRef = getAdminDb().collection('visits').doc()
      const visitData = {
        businessId,
        offerId: offerId || null,
        consumerUserId,
        referrerUserId: referrerUserId || null,
        attributionType,
        status: 'CREATED',
        isNewCustomer: true,
        userAgent,
        ipAddress,
        checkInToken: plainToken, // Store plain token (protected by Firestore rules)
        checkInTokenExpiry: tokenExpiry,
        checkInTokenUsed: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      transaction.set(visitRef, visitData)

      // Ensure visiting user has the referrer (promoter) role
      const userRef = getAdminDb().collection('users').doc(consumerUserId)
      const userDoc = await userRef.get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        const updateFields: Record<string, unknown> = {}
        if (!userData?.roles?.includes('referrer')) {
          updateFields.roles = FieldValue.arrayUnion('referrer')
        }
        if (!userData?.referrerStatus) {
          updateFields.referrerStatus = 'pending'
        }
        if (Object.keys(updateFields).length > 0) {
          updateFields.updatedAt = FieldValue.serverTimestamp()
          transaction.update(userRef, updateFields)
        }
      }

      return {
        id: visitRef.id,
        businessId,
        offerId: offerId || null,
        consumerUserId,
        referrerUserId: referrerUserId || null,
        attributionType,
        status: 'CREATED',
        isNewCustomer: true,
        checkInToken: plainToken, // Plain token sent only once!
        checkInTokenExpiry: tokenExpiry,
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_VISIT') {
      return NextResponse.json(
        { error: 'You have already claimed this offer' },
        { status: 409 }
      )
    }
    console.error('Error creating visit:', error)
    return NextResponse.json(
      { error: 'Failed to create visit' },
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

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    const userId = authResult.uid

    // Check if user is admin
    const userDoc = await getAdminDb().collection('users').doc(userId).get()
    const isAdmin = userDoc.data()?.roles?.includes('admin')

    // Check if user owns the requested business
    let isBusinessOwner = false
    if (businessId) {
      const businessDoc = await getAdminDb().collection('businesses').doc(businessId).get()
      isBusinessOwner = businessDoc.data()?.ownerUserId === userId
    }

    // Build query based on user permissions
    let query = getAdminDb().collection('visits').orderBy('createdAt', 'desc')

    if (businessId) {
      // If requesting business visits, must be admin or business owner
      if (!isAdmin && !isBusinessOwner) {
        return NextResponse.json(
          { error: 'Unauthorized to view these visits' },
          { status: 403 }
        )
      }
      query = query.where('businessId', '==', businessId)
    } else if (!isAdmin) {
      // Non-admins without businessId filter can only see their own visits
      // as consumer or referrer
      const consumerVisits = await getAdminDb()
        .collection('visits')
        .where('consumerUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

      const referrerVisits = await getAdminDb()
        .collection('visits')
        .where('referrerUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

      const visitMap = new Map<string, Visit>()

      const processDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data()
        visitMap.set(doc.id, {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          convertedAt: data.convertedAt?.toDate(),
        } as Visit)
      }

      consumerVisits.forEach(processDoc)
      referrerVisits.forEach(processDoc)

      const visits = Array.from(visitMap.values())
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, limit)

      return NextResponse.json({
        success: true,
        data: visits,
        pagination: { page: 1, limit, hasMore: false }
      })
    }

    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.limit(limit + 1).get()
    const hasMore = snapshot.size > limit
    const visits: Visit[] = []

    snapshot.docs.slice(0, limit).forEach((doc) => {
      const data = doc.data()
      visits.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        convertedAt: data.convertedAt?.toDate(),
      } as Visit)
    })

    return NextResponse.json({
      success: true,
      data: visits,
      pagination: { page, limit, hasMore }
    })
  } catch (error) {
    console.error('Error fetching visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    )
  }
}
