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

    // Fetch user's referrerStatus from server (authoritative source)
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const referrerStatus = userData?.referrerStatus || null

    // Fetch active businesses with active offers
    // Note: Avoiding orderBy to prevent needing composite indexes
    const businessesSnapshot = await db
      .collection('businesses')
      .where('status', '==', 'active')
      .get()

    const businesses: Array<{
      id: string
      name: string
      category: string
      description?: string
      address: string
      phone: string
      website?: string
      images: string[]
      status: string
      createdAt: Date | null
      offer?: {
        id: string
        referrerCommissionAmount: number
        consumerRewardType: string
        consumerRewardValue: number
        active: boolean
      }
    }> = []

    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data()

      // Check if business has an active offer
      const offerDoc = await db.collection('offers').doc(businessDoc.id).get()

      if (offerDoc.exists && offerDoc.data()?.active) {
        const offerData = offerDoc.data()!
        businesses.push({
          id: businessDoc.id,
          name: businessData.name,
          category: businessData.category,
          description: businessData.description,
          address: businessData.address,
          phone: businessData.phone,
          website: businessData.website,
          images: businessData.images || [],
          status: businessData.status,
          createdAt: businessData.createdAt?.toDate() || null,
          offer: {
            id: offerDoc.id,
            referrerCommissionAmount: offerData.referrerCommissionAmount,
            consumerRewardType: offerData.consumerRewardType,
            consumerRewardValue: offerData.consumerRewardValue,
            active: offerData.active,
          },
        })
      }
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
      .filter((e) => e.type === 'REFERRER_COMMISSION')
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
    })
  } catch (error) {
    console.error('Error fetching referrals data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotions data' },
      { status: 500 }
    )
  }
}
