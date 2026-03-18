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

    // Calculate revenue breakdown from all charges, grouped by business
    let totalRevenue = 0
    let totalPaid = 0
    let totalOwed = 0
    const businessCharges = new Map<string, { owed: number; paid: number; total: number; chargeCount: number }>()

    chargesSnapshot.forEach((doc) => {
      const data = doc.data()
      const platformAmount = data.platformAmount || 0
      const businessId = data.businessId as string
      totalRevenue += platformAmount

      if (!businessCharges.has(businessId)) {
        businessCharges.set(businessId, { owed: 0, paid: 0, total: 0, chargeCount: 0 })
      }
      const entry = businessCharges.get(businessId)!
      entry.total += platformAmount
      entry.chargeCount += 1

      if (data.status === 'PAID') {
        totalPaid += platformAmount
        entry.paid += platformAmount
      } else {
        totalOwed += platformAmount
        entry.owed += platformAmount
      }
    })

    // Fetch business details (name, logo) for businesses with charges
    const businessIds = Array.from(businessCharges.keys())
    const revenueByBusiness: Array<{
      businessId: string
      businessName: string
      businessLogo: string | null
      owed: number
      paid: number
      total: number
      chargeCount: number
    }> = []

    // Fetch in batches of 10 (Firestore in-query limit)
    for (let i = 0; i < businessIds.length; i += 10) {
      const batch = businessIds.slice(i, i + 10)
      const bizSnapshot = await getAdminDb().collection('businesses').where('__name__', 'in', batch).get()
      bizSnapshot.forEach((doc) => {
        const bizData = doc.data()
        const charges = businessCharges.get(doc.id)!
        const images = bizData.images as string[] | undefined
        revenueByBusiness.push({
          businessId: doc.id,
          businessName: bizData.name || 'Unknown',
          businessLogo: images && images.length > 0 ? images[images.length - 1] : null,
          ...charges,
        })
      })
      // Handle any businessIds not found in Firestore
      for (const id of batch) {
        if (!revenueByBusiness.find((r) => r.businessId === id)) {
          const charges = businessCharges.get(id)!
          revenueByBusiness.push({
            businessId: id,
            businessName: 'Unknown Business',
            businessLogo: null,
            ...charges,
          })
        }
      }
    }

    // Sort by total owed descending (businesses that owe the most first)
    revenueByBusiness.sort((a, b) => b.owed - a.owed || b.total - a.total)

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
        revenueByBusiness,
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
