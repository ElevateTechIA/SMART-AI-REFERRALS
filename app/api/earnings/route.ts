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
    const periodParam = searchParams.get('period') || 'all'
    const period = ['all', 'month', 'year'].includes(periodParam) ? periodParam : 'all'

    // Fetch all earnings for the user (date filtering done in JS to avoid composite index)
    const earningsSnapshot = await db.collection('earnings')
      .where('userId', '==', userId)
      .get()

    // Build date cutoff for period filter
    let periodCutoff: Date | null = null
    if (period === 'month') {
      periodCutoff = new Date()
      periodCutoff.setDate(1)
      periodCutoff.setHours(0, 0, 0, 0)
    } else if (period === 'year') {
      periodCutoff = new Date()
      periodCutoff.setMonth(0, 1)
      periodCutoff.setHours(0, 0, 0, 0)
    }

    // Calculate stats
    let totalEarnings = 0
    let pendingEarnings = 0
    let approvedEarnings = 0
    let paidEarnings = 0
    let completedEarnings = 0
    let thisMonthEarnings = 0
    let totalCount = 0
    let pendingCount = 0
    let completedCount = 0

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const transactions = []

    // Process each earning
    for (const doc of earningsSnapshot.docs) {
      const data = doc.data()
      const amount = data.amount || 0
      const createdAt = data.createdAt?.toDate() as Date | undefined

      // Skip if outside period filter
      if (periodCutoff && (!createdAt || createdAt < periodCutoff)) {
        continue
      }

      // Calculate stats
      totalEarnings += amount
      totalCount++

      if (data.status === 'PENDING') {
        pendingEarnings += amount
        pendingCount++
      } else if (data.status === 'APPROVED') {
        approvedEarnings += amount
        completedEarnings += amount
        completedCount++
      } else if (data.status === 'PAID') {
        paidEarnings += amount
        completedEarnings += amount
        completedCount++
      }

      // This month earnings
      if (createdAt && createdAt >= startOfMonth) {
        thisMonthEarnings += amount
      }

      // Get business info
      let businessName = 'Unknown Business'
      let businessLogo: string | null = null
      if (data.businessId) {
        try {
          const businessDoc = await db.collection('businesses').doc(data.businessId).get()
          if (businessDoc.exists) {
            const bizData = businessDoc.data()
            businessName = bizData?.name || businessName
            const images = bizData?.images as string[] | undefined
            if (images && images.length > 0) {
              businessLogo = images[images.length - 1]
            }
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
        businessLogo: businessLogo,
        businessId: data.businessId || null,
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

    // Check if user has a pending payout request
    const payoutSnapshot = await db.collection('payout_requests')
      .where('userId', '==', userId)
      .get()
    const hasPendingPayout = payoutSnapshot.docs.some(d => {
      const s = d.data().status
      return s === 'REQUESTED' || s === 'PROCESSING'
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        pendingEarnings: Math.round(pendingEarnings * 100) / 100,
        approvedEarnings: Math.round(approvedEarnings * 100) / 100,
        paidEarnings: Math.round(paidEarnings * 100) / 100,
        completedEarnings: Math.round(completedEarnings * 100) / 100,
        thisMonth: Math.round(thisMonthEarnings * 100) / 100,
        totalCount,
        pendingCount,
        completedCount,
        hasPendingPayout,
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
