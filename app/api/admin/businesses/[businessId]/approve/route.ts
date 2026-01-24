import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params
    const body = await request.json()
    const { adminUserId, action } = body // action: 'approve' | 'suspend'

    if (!businessId || !adminUserId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Get business
    const businessRef = adminDb.collection('businesses').doc(businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const newStatus = action === 'approve' ? 'active' : action === 'suspend' ? 'suspended' : 'pending'

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
