import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const db = getAdminDb()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // Fetch payout requests
    const snapshot = await db.collection('payout_requests').get()

    // Collect unique userIds
    const userIds = new Set<string>()
    const payoutsRaw: Array<{ id: string; data: FirebaseFirestore.DocumentData }> = []

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (statusFilter && data.status !== statusFilter) return
      payoutsRaw.push({ id: doc.id, data })
      userIds.add(data.userId)
    })

    // Batch-fetch user docs
    const usersMap = new Map<string, FirebaseFirestore.DocumentData>()
    const userIdArray = Array.from(userIds)
    for (let i = 0; i < userIdArray.length; i += 10) {
      const batch = userIdArray.slice(i, i + 10)
      const usersSnapshot = await db.collection('users')
        .where('__name__', 'in', batch)
        .get()
      usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()))
    }

    const payouts = payoutsRaw.map(({ id, data }) => {
      const user = usersMap.get(data.userId)
      const bankInfo = user?.bankInfo
      return {
        id,
        userId: data.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        amount: data.amount,
        earningIds: data.earningIds || [],
        status: data.status,
        paymentMethod: data.paymentMethod || null,
        adminNote: data.adminNote || null,
        processedBy: data.processedBy || null,
        hasBankInfo: !!(bankInfo?.bankName && bankInfo?.accountNumber),
        bankLast4: bankInfo?.accountNumber ? bankInfo.accountNumber.slice(-4) : null,
        bankName: bankInfo?.bankName || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      }
    })

    // Sort by createdAt descending
    payouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: payouts })
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}
