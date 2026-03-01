import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

// GET — fetch latest active promoters (any authenticated user)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const db = getAdminDb()

    const snapshot = await db
      .collection('users')
      .where('roles', 'array-contains', 'referrer')
      .where('referrerStatus', '==', 'active')
      .get()

    const promoters = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          photoURL: data.photoURL || null,
          createdAt: data.createdAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
      .slice(0, 5)

    return NextResponse.json({ promoters })
  } catch (error) {
    console.error('Error fetching promoters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promoters' },
      { status: 500 }
    )
  }
}
