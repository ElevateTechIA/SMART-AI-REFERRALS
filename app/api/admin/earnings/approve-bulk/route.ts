import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { logAdminAction } from '@/lib/admin-log'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { earningIds } = body as { earningIds: string[] }

    if (!earningIds || earningIds.length === 0) {
      return NextResponse.json({ error: 'earningIds required' }, { status: 400 })
    }

    const db = getAdminDb()
    const now = new Date()
    let approved = 0

    // Process in batches of 400 (Firestore limit is 500)
    for (let i = 0; i < earningIds.length; i += 400) {
      const batch = db.batch()
      const slice = earningIds.slice(i, i + 400)

      for (const id of slice) {
        const ref = db.collection('earnings').doc(id)
        batch.update(ref, {
          status: 'APPROVED',
          approvedAt: now,
          updatedAt: now,
        })
        approved++
      }

      await batch.commit()
    }

    await logAdminAction({
      action: 'EARNINGS_APPROVED',
      adminUid: authResult.uid,
      details: { earningIds, count: approved },
    })

    return NextResponse.json({
      success: true,
      data: { approved },
    })
  } catch (error) {
    console.error('Error bulk approving earnings:', error)
    return NextResponse.json({ error: 'Failed to approve earnings' }, { status: 500 })
  }
}
