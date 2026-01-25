import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const db = getAdminDb()

    // Fetch businesses (no composite index needed, sort in JS)
    const businessesSnapshot = await db.collection('businesses').get()
    const businesses = businessesSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          address: data.address,
          phone: data.phone,
          website: data.website,
          status: data.status,
          ownerUserId: data.ownerUserId,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    // Fetch users (no composite index needed, sort in JS)
    const usersSnapshot = await db.collection('users').get()
    const users = usersSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          roles: data.roles || ['consumer'],
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    // Fetch visits (no composite index needed, sort in JS)
    const visitsSnapshot = await db.collection('visits').get()
    const visits = visitsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          businessId: data.businessId,
          consumerUserId: data.consumerUserId,
          referrerUserId: data.referrerUserId,
          status: data.status,
          attributionType: data.attributionType,
          isNewCustomer: data.isNewCustomer,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    // Fetch fraud flags (filter in JS to avoid composite index)
    const fraudFlagsSnapshot = await db.collection('fraudFlags').get()
    const fraudFlags = fraudFlagsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          visitId: data.visitId,
          reason: data.reason,
          resolved: data.resolved,
          createdAt: data.createdAt?.toDate() || null,
        }
      })
      .filter((flag) => flag.resolved === false)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    return NextResponse.json({
      businesses,
      users,
      visits,
      fraudFlags,
    })
  } catch (error) {
    console.error('Error fetching admin data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin data' },
      { status: 500 }
    )
  }
}
