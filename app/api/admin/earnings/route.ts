import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, APPROVED, PAID, CANCELLED
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    const db = getAdminDb()

    let query: FirebaseFirestore.Query = db.collection('earnings')

    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.get()

    // Batch fetch all unique users and businesses to avoid N+1 queries
    const userIds = new Set<string>()
    const businessIds = new Set<string>()
    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (data.userId) userIds.add(data.userId)
      if (data.businessId) businessIds.add(data.businessId)
    }

    const userMap = new Map<string, string>()
    const businessMap = new Map<string, string>()

    // Firestore getAll supports up to 100 refs at once
    if (userIds.size > 0) {
      const userRefs = Array.from(userIds).map(id => db.collection('users').doc(id))
      const userDocs = await db.getAll(...userRefs)
      for (const doc of userDocs) {
        if (doc.exists) {
          const data = doc.data()!
          userMap.set(doc.id, data.name || data.email || 'Unknown')
        }
      }
    }

    if (businessIds.size > 0) {
      const bizRefs = Array.from(businessIds).map(id => db.collection('businesses').doc(id))
      const bizDocs = await db.getAll(...bizRefs)
      for (const doc of bizDocs) {
        if (doc.exists) {
          businessMap.set(doc.id, doc.data()!.name || 'Unknown')
        }
      }
    }

    // If fetching PENDING, check which charges are PAID to filter
    // Only show earnings for approval if the business has paid the related charge
    let paidChargeVisitIds: Set<string> | null = null
    if (status === 'PENDING') {
      const visitIds = new Set<string>()
      for (const doc of snapshot.docs) {
        const data = doc.data()
        if (data.visitId) visitIds.add(data.visitId)
      }

      if (visitIds.size > 0) {
        paidChargeVisitIds = new Set<string>()
        // Fetch charges for these visits in batches of 10
        const visitIdArray = Array.from(visitIds)
        for (let i = 0; i < visitIdArray.length; i += 10) {
          const batch = visitIdArray.slice(i, i + 10)
          const chargesSnap = await db.collection('charges')
            .where('visitId', 'in', batch)
            .get()
          for (const cDoc of chargesSnap.docs) {
            const cData = cDoc.data()
            if (cData.status === 'PAID') {
              paidChargeVisitIds.add(cData.visitId)
            }
          }
        }
      }
    }

    let earnings = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        userName: userMap.get(data.userId) || 'Unknown',
        businessId: data.businessId,
        businessName: businessMap.get(data.businessId) || 'Unknown',
        visitId: data.visitId,
        offerId: data.offerId,
        amount: data.amount || 0,
        type: data.type,
        status: data.status,
        businessPaid: paidChargeVisitIds ? (data.visitId ? paidChargeVisitIds.has(data.visitId) : false) : true,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate()?.toISOString() || null,
        paidAt: data.paidAt?.toDate()?.toISOString() || null,
      }
    })

    // For PENDING status, only return earnings where business has paid
    if (status === 'PENDING' && paidChargeVisitIds) {
      earnings = earnings.filter(e => e.businessPaid)
    }

    // Sort by createdAt descending in memory and apply limit
    earnings.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db2 = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db2 - da
    })

    return NextResponse.json({
      success: true,
      data: earnings.slice(0, limit),
    })
  } catch (error) {
    console.error('Error fetching admin earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
