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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // all, month, year

    // Fetch all earnings for the user
    let query = db.collection('earnings')
      .where('userId', '==', userId)

    // Add date filter if needed
    if (period === 'month') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      query = query.where('createdAt', '>=', startOfMonth)
    } else if (period === 'year') {
      const startOfYear = new Date()
      startOfYear.setMonth(0, 1)
      startOfYear.setHours(0, 0, 0, 0)
      query = query.where('createdAt', '>=', startOfYear)
    }

    const earningsSnapshot = await query.get()

    // Calculate stats
    let totalEarnings = 0
    let pendingEarnings = 0
    let completedEarnings = 0
    let thisMonthEarnings = 0

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const transactions = []

    // Process each earning
    for (const doc of earningsSnapshot.docs) {
      const data = doc.data()
      const amount = data.amount || 0

      // Calculate stats
      totalEarnings += amount

      if (data.status === 'PENDING') {
        pendingEarnings += amount
      } else if (data.status === 'APPROVED' || data.status === 'PAID') {
        completedEarnings += amount
      }

      // This month earnings
      const createdAt = data.createdAt?.toDate()
      if (createdAt && createdAt >= startOfMonth) {
        thisMonthEarnings += amount
      }

      // Get business info
      let businessName = 'Unknown Business'
      if (data.businessId) {
        try {
          const businessDoc = await db.collection('businesses').doc(data.businessId).get()
          if (businessDoc.exists) {
            businessName = businessDoc.data()?.name || businessName
          }
        } catch (error) {
          console.error('Error fetching business:', error)
        }
      }

      // Get visit/consumer info
      let customerName = 'Unknown Customer'
      if (data.visitId) {
        try {
          const visitDoc = await db.collection('visits').doc(data.visitId).get()
          if (visitDoc.exists) {
            const visitData = visitDoc.data()
            const consumerUserId = visitData?.consumerUserId

            if (consumerUserId) {
              const consumerDoc = await db.collection('users').doc(consumerUserId).get()
              if (consumerDoc.exists) {
                customerName = consumerDoc.data()?.name || consumerDoc.data()?.email || customerName
              }
            }
          }
        } catch (error) {
          console.error('Error fetching visit/consumer:', error)
        }
      }

      // For bonus or rewards without visit
      if (data.type === 'CONSUMER_REWARD') {
        customerName = 'You (Consumer Reward)'
      } else if (data.type === 'REFERRER_COMMISSION' && !data.visitId) {
        customerName = 'Referral Bonus'
      }

      // Map status to frontend format
      let status: 'completed' | 'pending' | 'processing' = 'pending'
      if (data.status === 'PAID') {
        status = 'completed'
      } else if (data.status === 'APPROVED') {
        status = 'processing'
      } else if (data.status === 'PENDING') {
        status = 'pending'
      }

      transactions.push({
        id: doc.id,
        date: createdAt ? createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        business: businessName,
        customer: customerName,
        amount: amount,
        status: status,
        type: data.type === 'REFERRER_COMMISSION' ? 'referral' : 'bonus',
        earningType: data.type,
        earningStatus: data.status,
        visitId: data.visitId || null,
        createdAt: createdAt ? createdAt.toISOString() : null,
      })
    }

    // Sort by date descending
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        pendingEarnings: Math.round(pendingEarnings * 100) / 100,
        completedEarnings: Math.round(completedEarnings * 100) / 100,
        thisMonth: Math.round(thisMonthEarnings * 100) / 100,
      },
      transactions,
    })
  } catch (error) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
