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

    for (const visitDoc of visitsSnapshot.docs) {
      const data = visitDoc.data()

      // Fetch business details
      const businessDoc = await db.collection('businesses').doc(data.businessId).get()
      const businessData = businessDoc.exists ? businessDoc.data() : null

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
              id: businessDoc.id,
              name: businessData.name,
              category: businessData.category,
              address: businessData.address,
              phone: businessData.phone,
              website: businessData.website,
              status: businessData.status,
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

    return NextResponse.json({
      visits,
      rewards,
    })
  } catch (error) {
    console.error('Error fetching consumer visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visit data' },
      { status: 500 }
    )
  }
}
