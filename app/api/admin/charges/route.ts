import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication from token (not URL parameter)
    const authResult = await verifyAdmin(request)
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
        { error: 'businessId query parameter is required' },
        { status: 400 }
      )
    }

    // Fetch charges and business details in parallel
    const [chargesSnapshot, businessDoc] = await Promise.all([
      getAdminDb()
        .collection('charges')
        .where('businessId', '==', businessId)
        .get(),
      getAdminDb().collection('businesses').doc(businessId).get(),
    ])

    // Build business info
    const businessData = businessDoc.exists ? businessDoc.data() : null
    const images = businessData?.images as string[] | undefined
    const business = {
      id: businessId,
      name: businessData?.name || 'Unknown Business',
      logo: images && images.length > 0 ? images[images.length - 1] : null,
    }

    // Collect all unique visitIds from the charges
    const visitIds = new Set<string>()
    const chargesRaw: Array<{ id: string; data: FirebaseFirestore.DocumentData }> = []

    chargesSnapshot.forEach((doc) => {
      const data = doc.data()
      chargesRaw.push({ id: doc.id, data })
      if (data.visitId) {
        visitIds.add(data.visitId)
      }
    })

    // Fetch all related visits in batches of 10 (Firestore in-query limit)
    const visitsMap = new Map<string, FirebaseFirestore.DocumentData>()
    const visitIdArray = Array.from(visitIds)

    for (let i = 0; i < visitIdArray.length; i += 10) {
      const batch = visitIdArray.slice(i, i + 10)
      const visitsSnapshot = await getAdminDb()
        .collection('visits')
        .where('__name__', 'in', batch)
        .get()
      visitsSnapshot.forEach((doc) => {
        visitsMap.set(doc.id, doc.data())
      })
    }

    // Build the charges array with visit info
    const charges = chargesRaw.map(({ id, data }) => {
      const visit = data.visitId ? visitsMap.get(data.visitId) : null
      return {
        id,
        businessId: data.businessId,
        visitId: data.visitId,
        offerId: data.offerId,
        amount: data.amount,
        platformAmount: data.platformAmount,
        referrerAmount: data.referrerAmount,
        consumerRewardAmount: data.consumerRewardAmount,
        paidAmount: data.paidAmount || 0,
        status: data.status,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        paidAt: data.paidAt?.toDate?.() || data.paidAt || null,
        visit: visit
          ? {
              consumerUserId: visit.consumerUserId,
              referrerUserId: visit.referrerUserId,
              status: visit.status,
              attributionType: visit.attributionType,
              isNewCustomer: visit.isNewCustomer,
              receiptId: visit.receiptId,
              createdAt: visit.createdAt?.toDate?.() || visit.createdAt,
              updatedAt: visit.updatedAt?.toDate?.() || visit.updatedAt,
            }
          : null,
      }
    })

    // Sort by createdAt descending
    charges.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      data: {
        business,
        charges,
      },
    })
  } catch (error) {
    console.error('Error fetching charges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch charges' },
      { status: 500 }
    )
  }
}
