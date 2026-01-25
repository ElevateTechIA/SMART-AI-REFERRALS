import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    // Verify admin authentication from token
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { businessId } = params
    const body = await request.json()
    const { action } = body // action: 'approve' | 'suspend'

    if (!businessId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and action' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'suspend') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "suspend"' },
        { status: 400 }
      )
    }

    // Get business
    const businessRef = getAdminDb().collection('businesses').doc(businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const newStatus = action === 'approve' ? 'active' : 'suspended'

    await businessRef.update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: `Business ${action}d successfully`,
    })
  } catch (error) {
    console.error('Error updating business status:', error)
    return NextResponse.json(
      { error: 'Failed to update business status' },
      { status: 500 }
    )
  }
}
