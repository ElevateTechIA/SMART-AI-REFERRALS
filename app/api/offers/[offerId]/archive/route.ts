import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getOfferById, countActiveOffersByBusiness } from '@/lib/offers-server'
import { MAX_ACTIVE_OFFERS_PER_BUSINESS, isOfferActive } from '@/lib/offers-config'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/offers/[offerId]/archive
 *
 * Body: `{ archived: boolean }` (default: true).
 * - `archived: true` flips the offer to `status: 'archived'` (and `active: false`
 *   for backwards compat with legacy readers).
 * - `archived: false` un-archives, re-checking the active-offer cap.
 *
 * Physical deletion is intentionally not exposed — visits, charges and
 * earnings still reference the offerId.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const userId = authResult.uid

    const offer = await getOfferById(params.offerId)
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const businessDoc = await getAdminDb().collection('businesses').doc(offer.businessId).get()
    const isOwner = businessDoc.exists && businessDoc.data()?.ownerUserId === userId
    const userDoc = await getAdminDb().collection('users').doc(userId).get()
    const isAdmin = !!userDoc.data()?.roles?.includes('admin')

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const archived: boolean = body.archived !== false // default true

    // Un-archive re-introduces an active offer — enforce the cap.
    if (!archived && !isOfferActive(offer)) {
      const activeCount = await countActiveOffersByBusiness(offer.businessId)
      if (activeCount >= MAX_ACTIVE_OFFERS_PER_BUSINESS) {
        return NextResponse.json(
          {
            error: `Active offer limit reached (${MAX_ACTIVE_OFFERS_PER_BUSINESS}). Archive an existing active offer first.`,
            code: 'ACTIVE_OFFER_LIMIT_REACHED',
            limit: MAX_ACTIVE_OFFERS_PER_BUSINESS,
            activeCount,
          },
          { status: 409 }
        )
      }
    }

    await getAdminDb().collection('offers').doc(params.offerId).update({
      status: archived ? 'archived' : 'active',
      active: !archived,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      data: { id: params.offerId, status: archived ? 'archived' : 'active' },
    })
  } catch (error) {
    console.error('Error archiving offer:', error)
    return NextResponse.json({ error: 'Failed to update offer status' }, { status: 500 })
  }
}
