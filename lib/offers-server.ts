/**
 * Server-side helpers for the multi-offer model.
 *
 * The `offers` collection holds a mix of two document shapes during the
 * transition period:
 *   - **Legacy**: `offers/{businessId}` — one offer per business, written
 *     before multi-offer support landed. These docs already carry a
 *     `businessId` field, so the new query path (`where businessId == X`)
 *     finds them just like any other offer.
 *   - **New**: `offers/{autoId}` — `businessId` is a plain field; multiple
 *     docs can exist for the same business.
 *
 * Keeping both shapes alive (no destructive migration) preserves
 * `visit.offerId` references created before this change.
 */

import { getAdminDb } from '@/lib/firebase/admin'
import type { Offer } from '@/lib/types'
import { isOfferActive, MAX_ACTIVE_OFFERS_PER_BUSINESS } from '@/lib/offers-config'

function mapOfferDoc(doc: FirebaseFirestore.DocumentSnapshot): Offer {
  const data = doc.data() || {}
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    startDate: data.startDate?.toDate?.() ?? data.startDate,
    endDate: data.endDate?.toDate?.() ?? data.endDate,
  } as Offer
}

/** Fetch all offers for a business (active + archived). Ordered by createdAt desc. */
export async function listOffersByBusiness(businessId: string): Promise<Offer[]> {
  const snapshot = await getAdminDb()
    .collection('offers')
    .where('businessId', '==', businessId)
    .get()

  const offers = snapshot.docs.map(mapOfferDoc)
  // Sort in-memory: avoids a composite index requirement on (businessId, createdAt).
  offers.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
  return offers
}

/** Fetch only active offers for a business. */
export async function listActiveOffersByBusiness(businessId: string): Promise<Offer[]> {
  const all = await listOffersByBusiness(businessId)
  return all.filter(isOfferActive)
}

/** Count active offers (used for the create-cap check). */
export async function countActiveOffersByBusiness(businessId: string): Promise<number> {
  const active = await listActiveOffersByBusiness(businessId)
  return active.length
}

/** True when creating a new active offer would exceed the configured cap. */
export async function isAtActiveOfferLimit(businessId: string): Promise<boolean> {
  const count = await countActiveOffersByBusiness(businessId)
  return count >= MAX_ACTIVE_OFFERS_PER_BUSINESS
}

/** Single offer by its document id (works for both legacy and new docs). */
export async function getOfferById(offerId: string): Promise<Offer | null> {
  const doc = await getAdminDb().collection('offers').doc(offerId).get()
  if (!doc.exists) return null
  return mapOfferDoc(doc)
}

/**
 * Resolve the offer for a visit:
 *   1. Try `visit.offerId` (the normal path).
 *   2. Fall back to the legacy doc at `offers/{visit.businessId}` to support
 *      visits created before multi-offer (where `offerId` may be `null`).
 *
 * The fallback is intentionally kept until backfill is verified — see
 * `docs/MULTI_OFFERS_MIGRATION.md`.
 */
export async function resolveOfferForVisit(visit: {
  offerId?: string | null
  businessId: string
}): Promise<Offer | null> {
  if (visit.offerId) {
    const direct = await getOfferById(visit.offerId)
    if (direct) return direct
  }
  // Legacy fallback: visits with null offerId from before multi-offer.
  const legacy = await getOfferById(visit.businessId)
  return legacy
}
