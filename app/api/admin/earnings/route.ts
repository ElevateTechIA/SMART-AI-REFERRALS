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
      .orderBy('createdAt', 'desc')

    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.limit(limit).get()

    const earnings = []
    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Get user info
      let userName = 'Unknown'
      if (data.userId) {
        try {
          const userDoc = await db.collection('users').doc(data.userId).get()
          if (userDoc.exists) {
            userName = userDoc.data()?.name || userDoc.data()?.email || userName
          }
        } catch { /* ignore */ }
      }

      // Get business info
      let businessName = 'Unknown'
      if (data.businessId) {
        try {
          const businessDoc = await db.collection('businesses').doc(data.businessId).get()
          if (businessDoc.exists) {
            businessName = businessDoc.data()?.name || businessName
          }
        } catch { /* ignore */ }
      }

      earnings.push({
        id: doc.id,
        userId: data.userId,
        userName,
        businessId: data.businessId,
        businessName,
        visitId: data.visitId,
        offerId: data.offerId,
        amount: data.amount || 0,
        type: data.type,
        status: data.status,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate()?.toISOString() || null,
        paidAt: data.paidAt?.toDate()?.toISOString() || null,
      })
    }

    return NextResponse.json({
      success: true,
      data: earnings,
    })
  } catch (error) {
    console.error('Error fetching admin earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
