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
      unreadSupportSnapshot,
      adminsSnapshot,
      businessUsersSnapshot,
      referrerUsersSnapshot,
      activeBusinessesSnapshot,
      suspendedBusinessesSnapshot,
    ] = await Promise.all([
      getAdminDb().collection('users').count().get(),
      getAdminDb().collection('businesses').count().get(),
      getAdminDb().collection('businesses').where('status', '==', 'pending').count().get(),
      getAdminDb().collection('users').where('referrerStatus', '==', 'pending').where('roles', 'array-contains', 'referrer').count().get(),
      getAdminDb().collection('visits').count().get(),
      getAdminDb().collection('visits').where('status', '==', 'CONVERTED').count().get(),
      getAdminDb().collection('charges').get(),
      getAdminDb().collection('fraudFlags').where('resolved', '==', false).count().get(),
      getAdminDb().collection('support_tickets').where('read', '==', false).count().get(),
      getAdminDb().collection('users').where('roles', 'array-contains', 'admin').count().get(),
      getAdminDb().collection('users').where('roles', 'array-contains', 'business').count().get(),
      getAdminDb().collection('users').where('roles', 'array-contains', 'referrer').count().get(),
      getAdminDb().collection('businesses').where('status', '==', 'active').count().get(),
      getAdminDb().collection('businesses').where('status', '==', 'suspended').count().get(),
    ])

    // Calculate revenue breakdown from all charges
    let totalRevenue = 0
    let totalPaid = 0
    let totalOwed = 0
    chargesSnapshot.forEach((doc) => {
      const data = doc.data()
      const platformAmount = data.platformAmount || 0
      totalRevenue += platformAmount
      if (data.status === 'PAID') {
        totalPaid += platformAmount
      } else {
        totalOwed += platformAmount
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersSnapshot.data().count,
        roleCounts: {
          admins: adminsSnapshot.data().count,
          businesses: businessUsersSnapshot.data().count,
          promoters: referrerUsersSnapshot.data().count,
        },
        totalBusinesses: businessesSnapshot.data().count,
        businessCounts: {
          active: activeBusinessesSnapshot.data().count,
          pending: pendingBusinessesSnapshot.data().count,
          suspended: suspendedBusinessesSnapshot.data().count,
        },
        pendingBusinesses: pendingBusinessesSnapshot.data().count,
        pendingReferrers: pendingReferrersSnapshot.data().count,
        totalVisits: visitsSnapshot.data().count,
        totalConversions: conversionsSnapshot.data().count,
        totalRevenue,
        totalPaid,
        totalOwed,
        unresolvedFraudFlags: fraudFlagsSnapshot.data().count,
        unreadSupportTickets: unreadSupportSnapshot.data().count,
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
