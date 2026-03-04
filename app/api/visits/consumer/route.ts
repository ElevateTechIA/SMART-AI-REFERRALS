import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

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
    const db = getAdminDb()

    // Fetch visits as consumer (no orderBy to avoid composite index requirement)
    const visitsSnapshot = await db
      .collection('visits')
      .where('consumerUserId', '==', userId)
      .get()

    const visits = []

    // Batch-fetch businesses and offers to avoid N+1 queries
    const businessIds = Array.from(new Set(visitsSnapshot.docs.map((d) => d.data().businessId)))
    const businessRefs = businessIds.map((id) => db.collection('businesses').doc(id))
    const offerRefs = businessIds.map((id) => db.collection('offers').doc(id))

    const [businessDocs, offerDocs] = await Promise.all([
      businessRefs.length > 0 ? db.getAll(...businessRefs) : Promise.resolve([]),
      offerRefs.length > 0 ? db.getAll(...offerRefs) : Promise.resolve([]),
    ])

    const businessMap = new Map<string, FirebaseFirestore.DocumentData>()
    for (const doc of businessDocs) {
      if (doc.exists) businessMap.set(doc.id, { id: doc.id, ...doc.data() })
    }
    const offerMap = new Map<string, FirebaseFirestore.DocumentData>()
    for (const doc of offerDocs) {
      if (doc.exists && doc.data()?.active) offerMap.set(doc.id, { id: doc.id, ...doc.data() })
    }

    // Batch-fetch owner emails
    const ownerUserIds = Array.from(new Set(
      Array.from(businessMap.values()).map((b) => b.ownerUserId).filter(Boolean)
    ))
    const ownerRefs = ownerUserIds.map((id: string) => db.collection('users').doc(id))
    const ownerDocs = ownerRefs.length > 0 ? await db.getAll(...ownerRefs) : []
    const ownerEmailMap = new Map<string, string | null>()
    for (const doc of ownerDocs) {
      ownerEmailMap.set(doc.id, doc.exists ? doc.data()?.email || null : null)
    }

    for (const visitDoc of visitsSnapshot.docs) {
      const data = visitDoc.data()
      const businessData = businessMap.get(data.businessId)
      const offerData = offerMap.get(data.businessId)

      visits.push({
        id: visitDoc.id,
        businessId: data.businessId,
        consumerUserId: data.consumerUserId,
        referrerUserId: data.referrerUserId,
        offerId: data.offerId,
        status: data.status,
        attributionType: data.attributionType,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
        checkInToken: data.checkInToken || null,
        checkInTokenExpiry: data.checkInTokenExpiry?.toDate() || null,
        checkInTokenUsed: data.checkInTokenUsed || false,
        checkedInAt: data.checkedInAt?.toDate() || null,
        business: businessData
          ? {
              id: businessData.id,
              name: businessData.name,
              category: businessData.category,
              description: businessData.description || '',
              address: businessData.address,
              phone: businessData.phone,
              website: businessData.website,
              email: businessData.ownerUserId ? ownerEmailMap.get(businessData.ownerUserId) || null : null,
              images: businessData.images || [],
              status: businessData.status,
            }
          : null,
        offer: offerData
          ? {
              consumerRewardValue: offerData.consumerRewardValue || 0,
              consumerRewardType: offerData.consumerRewardType || 'none',
              referrerCommissionAmount: offerData.referrerCommissionAmount || 0,
            }
          : null,
      })
    }

    // Sort by createdAt desc in JavaScript
    visits.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    // Fetch consumer rewards (single where, filter type in JS)
    const rewardsSnapshot = await db
      .collection('earnings')
      .where('userId', '==', userId)
      .get()

    const rewards = rewardsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          userId: data.userId,
          businessId: data.businessId,
          visitId: data.visitId,
          type: data.type,
          amount: data.amount,
          status: data.status,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .filter((r) => r.type === 'CONSUMER_REWARD')
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    // Fetch user's reviews for visited businesses
    const reviewsSnapshot = await db
      .collection('reviews')
      .where('userId', '==', userId)
      .get()

    const reviews = reviewsSnapshot.docs.map((doc) => {
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

    return NextResponse.json({
      visits,
      rewards,
      reviews,
    })
  } catch (error) {
    console.error('Error fetching consumer visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visit data' },
      { status: 500 }
    )
  }
}
