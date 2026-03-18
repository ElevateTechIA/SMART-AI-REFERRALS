import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { getAppSettings } from '@/lib/app-settings.server'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/auto-approve
 * Called after user registration to auto-approve if the flag is active.
 * Only approves users with 'pending' status.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const settings = await getAppSettings()
    if (!settings.autoApproveUsers) {
      return NextResponse.json({ success: true, autoApproved: false })
    }

    const userId = authResult.uid
    const userRef = getAdminDb().collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()!

    // Auto-approve referrers with pending status
    if (userData.roles?.includes('referrer') && userData.referrerStatus === 'pending') {
      await userRef.update({
        referrerStatus: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // Auto-approve businesses owned by this user
    const businessesSnapshot = await getAdminDb()
      .collection('businesses')
      .where('ownerUserId', '==', userId)
      .where('status', '==', 'pending')
      .get()

    const batch = getAdminDb().batch()
    businessesSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      })
    })
    if (!businessesSnapshot.empty) {
      await batch.commit()
    }

    return NextResponse.json({ success: true, autoApproved: true })
  } catch (error) {
    console.error('Error in auto-approve:', error)
    return NextResponse.json(
      { error: 'Failed to auto-approve' },
      { status: 500 }
    )
  }
}
