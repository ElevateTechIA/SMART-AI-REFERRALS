import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const userId = authResult.uid

    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')

    if (!visitId) {
      return NextResponse.json({ error: 'Missing visitId parameter' }, { status: 400 })
    }

    const db = getAdminDb()

    // Verify user has access to this visit
    const visitDoc = await db.collection('visits').doc(visitId).get()
    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const visitData = visitDoc.data()!
    const isConsumer = visitData.consumerUserId === userId

    // Check if user is the business owner
    let isBusinessOwner = false
    if (!isConsumer) {
      const businessDoc = await db.collection('businesses').doc(visitData.businessId).get()
      isBusinessOwner = businessDoc.exists && businessDoc.data()?.ownerUserId === userId
    }

    // Check if admin
    const userDoc = await db.collection('users').doc(userId).get()
    const isAdmin = userDoc.exists && userDoc.data()?.roles?.includes('admin')

    if (!isConsumer && !isBusinessOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch receipt
    const receiptSnapshot = await db
      .collection('receipts')
      .where('visitId', '==', visitId)
      .limit(1)
      .get()

    if (receiptSnapshot.empty) {
      return NextResponse.json({ success: true, receipt: null })
    }

    const receiptDoc = receiptSnapshot.docs[0]
    const receiptData = receiptDoc.data()

    return NextResponse.json({
      success: true,
      receipt: {
        id: receiptDoc.id,
        ...receiptData,
        createdAt: receiptData.createdAt?.toDate(),
        updatedAt: receiptData.updatedAt?.toDate(),
      },
    })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}
