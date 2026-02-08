import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { userId } = params
    const body = await request.json()
    const { action } = body // action: 'approve' | 'suspend'

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and action' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'suspend') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "suspend"' },
        { status: 400 }
      )
    }

    const userRef = getAdminDb().collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    if (!userData?.roles?.includes('referrer')) {
      return NextResponse.json(
        { error: 'User is not a referrer' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'active' : 'suspended'

    await userRef.update({
      referrerStatus: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: `Referrer ${action}d successfully`,
    })
  } catch (error) {
    console.error('Error updating referrer status:', error)
    return NextResponse.json(
      { error: 'Failed to update referrer status' },
      { status: 500 }
    )
  }
}
