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

    // Get counts in parallel
    const [
      usersSnapshot,
      businessesSnapshot,
      pendingBusinessesSnapshot,
      pendingReferrersSnapshot,
      visitsSnapshot,
      conversionsSnapshot,
      chargesSnapshot,
      fraudFlagsSnapshot,
    ] = await Promise.all([
      getAdminDb().collection('users').count().get(),
      getAdminDb().collection('businesses').count().get(),
      getAdminDb().collection('businesses').where('status', '==', 'pending').count().get(),
      getAdminDb().collection('users').where('referrerStatus', '==', 'pending').count().get(),
      getAdminDb().collection('visits').count().get(),
      getAdminDb().collection('visits').where('status', '==', 'CONVERTED').count().get(),
      getAdminDb().collection('charges').where('status', '==', 'PAID').get(),
      getAdminDb().collection('fraudFlags').where('resolved', '==', false).count().get(),
    ])

    // Calculate total revenue (only from PAID charges)
    let totalRevenue = 0
    chargesSnapshot.forEach((doc) => {
      const data = doc.data()
      totalRevenue += data.amount || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersSnapshot.data().count,
        totalBusinesses: businessesSnapshot.data().count,
        pendingBusinesses: pendingBusinessesSnapshot.data().count,
        pendingReferrers: pendingReferrersSnapshot.data().count,
        totalVisits: visitsSnapshot.data().count,
        totalConversions: conversionsSnapshot.data().count,
        totalRevenue,
        unresolvedFraudFlags: fraudFlagsSnapshot.data().count,
      },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
