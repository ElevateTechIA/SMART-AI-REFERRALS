import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'business', 'referrer', 'consumer'] as const

export async function PUT(
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
    const { roles, adminPermissions } = body

    // If only updating adminPermissions (not roles)
    if (adminPermissions !== undefined && roles === undefined) {
      const VALID_PERMISSIONS = ['businesses', 'referrers', 'users', 'visits', 'support', 'payouts', 'revenue']
      if (!Array.isArray(adminPermissions) || adminPermissions.some((p: string) => !VALID_PERMISSIONS.includes(p))) {
        return NextResponse.json({ error: 'Invalid admin permissions' }, { status: 400 })
      }
      const userRef = getAdminDb().collection('users').doc(userId)
      await userRef.update({
        adminPermissions,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, message: 'Admin permissions updated', adminPermissions })
    }

    if (!userId || !Array.isArray(roles)) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and roles (array)' },
        { status: 400 }
      )
    }

    // Validate all roles
    const invalidRoles = roles.filter((r: string) => !VALID_ROLES.includes(r as typeof VALID_ROLES[number]))
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      )
    }

    if (roles.length === 0) {
      return NextResponse.json(
        { error: 'User must have at least one role' },
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

    const updateData: Record<string, unknown> = {
      roles,
      updatedAt: FieldValue.serverTimestamp(),
    }

    // If referrer role was removed, clear referrerStatus
    if (!roles.includes('referrer')) {
      updateData.referrerStatus = FieldValue.delete()
    }

    // If referrer role was added and no status exists, set to pending
    const userData = userDoc.data()
    if (roles.includes('referrer') && !userData?.referrerStatus) {
      updateData.referrerStatus = 'active'
    }

    await userRef.update(updateData)

    return NextResponse.json({
      success: true,
      message: 'User roles updated successfully',
      roles,
    })
  } catch (error) {
    console.error('Error updating user roles:', error)
    return NextResponse.json(
      { error: 'Failed to update user roles' },
      { status: 500 }
    )
  }
}
