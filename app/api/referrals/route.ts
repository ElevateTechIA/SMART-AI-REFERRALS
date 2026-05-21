import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { listActiveOffersByBusiness } from '@/lib/offers-server'

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

    // Fetch user's referrerStatus from server (authoritative source)
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const referrerStatus = userData?.referrerStatus || null
    const favoriteBusinessIds: string[] = userData?.favoriteBusinessIds || []

    // Fetch active businesses with active offers
    // Note: Avoiding orderBy to prevent needing composite indexes
    const businessesSnapshot = await db
      .collection('businesses')
      .where('status', '==', 'active')
      .get()

    type OfferSummary = {
      id: string
      image: string | null
      title?: string
      referrerCommissionAmount: number
      consumerRewardType: string
      consumerRewardValue: number
      active: boolean
    }

    const businesses: Array<{
      id: string
      name: string
      category: string
      description?: string
      address: string
      phone: string
      website?: string
      email: string | null
      images: string[]
      status: string
      createdAt: Date | null
      // `offer` is kept for backwards compat with the existing carousel/grid
      // (it points at the first active offer). `offers` is the new array;
      // consumers that support multi-offer should read from it.
      offer?: OfferSummary
      offers: OfferSummary[]
    }> = []

    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data()

      // Pull all active offers for this business (1..N)
      const activeOffers = await listActiveOffersByBusiness(businessDoc.id)
      if (activeOffers.length === 0) continue

      // Look up owner email from users collection
      let ownerEmail: string | null = null
      if (businessData.ownerUserId) {
        const ownerDoc = await db.collection('users').doc(businessData.ownerUserId).get()
        if (ownerDoc.exists) {
          ownerEmail = ownerDoc.data()?.email || null
        }
      }

      const offerSummaries: OfferSummary[] = activeOffers.map((o) => ({
        id: o.id,
        image: o.image || null,
        title: o.title,
        referrerCommissionAmount: o.referrerCommissionAmount,
        consumerRewardType: o.consumerRewardType,
        consumerRewardValue: o.consumerRewardValue,
        active: true,
      }))

      businesses.push({
        id: businessDoc.id,
        name: businessData.name,
        category: businessData.category,
        description: businessData.description,
        address: businessData.address,
        phone: businessData.phone,
        website: businessData.website,
        email: ownerEmail,
        images: businessData.images || [],
        status: businessData.status,
        createdAt: businessData.createdAt?.toDate() || null,
        offer: offerSummaries[0],
        offers: offerSummaries,
      })
    }

    // Fetch user's referrals (visits where they are the referrer)
    // Note: Avoiding orderBy to prevent needing composite indexes, sort in JS
    const referralsSnapshot = await db
      .collection('visits')
      .where('referrerUserId', '==', userId)
      .get()

    const referrals = referralsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          businessId: data.businessId,
          offerId: data.offerId || null,
          consumerUserId: data.consumerUserId,
          referrerUserId: data.referrerUserId,
          status: data.status,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    // Fetch user's earnings
    // Note: Single where clause to avoid composite indexes, filter type in JS
    const earningsSnapshot = await db
      .collection('earnings')
      .where('userId', '==', userId)
      .get()

    const earnings = earningsSnapshot.docs
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
      .filter((e) => e.type === 'REFERRER_COMMISSION' || e.type === 'CONSUMER_REWARD')
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    // Sort businesses by createdAt desc
    businesses.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return NextResponse.json({
      businesses,
      referrals,
      earnings,
      referrerStatus,
      favoriteBusinessIds,
    })
  } catch (error) {
    console.error('Error fetching referrals data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotions data' },
      { status: 500 }
    )
  }
}
