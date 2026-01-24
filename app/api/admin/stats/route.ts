import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Missing adminUserId' },
        { status: 400 }
      )
    }

    // Verify admin role
    const adminDoc = await adminDb.collection('users').doc(adminUserId).get()
    if (!adminDoc.exists || !adminDoc.data()?.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Get counts in parallel
    const [
      usersSnapshot,
      businessesSnapshot,
      pendingBusinessesSnapshot,
      visitsSnapshot,
      conversionsSnapshot,
      chargesSnapshot,
      fraudFlagsSnapshot,
    ] = await Promise.all([
      adminDb.collection('users').count().get(),
      adminDb.collection('businesses').count().get(),
      adminDb.collection('businesses').where('status', '==', 'pending').count().get(),
      adminDb.collection('visits').count().get(),
      adminDb.collection('visits').where('status', '==', 'CONVERTED').count().get(),
      adminDb.collection('charges').get(),
      adminDb.collection('fraudFlags').where('resolved', '==', false).count().get(),
    ])

    // Calculate total revenue
    let totalRevenue = 0
    chargesSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.status === 'PAID') {
        totalRevenue += data.amount || 0
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersSnapshot.data().count,
        totalBusinesses: businessesSnapshot.data().count,
        pendingBusinesses: pendingBusinessesSnapshot.data().count,
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
