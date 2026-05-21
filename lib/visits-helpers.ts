/**
 * Pure helpers for the visit duplicate-check logic.
 *
 * Multi-offer rule:
 *   A consumer may participate in multiple offers of the same business, but
 *   cannot repeat the SAME offer. The duplicate check therefore keys on
 *   (businessId, consumerId, offerId).
 *
 * Legacy compatibility:
 *   Visits created before multi-offer either carry `offerId === businessId`
 *   (because the offer doc id used to equal the businessId) or `offerId ===
 *   null` (very early visits). Both shapes are folded into a single
 *   `__LEGACY__` bucket: a legacy visit collides with another legacy attempt,
 *   but does NOT block a brand-new auto-id offer.
 */

const LEGACY_KEY = '__LEGACY__'

/**
 * Normalize an offer reference into the key used for duplicate detection.
 * `null`, `undefined`, and `offerId === businessId` all collapse to
 * `__LEGACY__`; everything else is treated as its own distinct offer.
 */
export function normalizeOfferKey(
  offerId: string | null | undefined,
  businessId: string,
): string {
  if (!offerId || offerId === businessId) return LEGACY_KEY
  return offerId
}

/**
 * True when the incoming visit (consumer + business + offer) would duplicate
 * an existing visit per the multi-offer rule above.
 */
export function isDuplicateVisit(
  existingVisits: ReadonlyArray<{ offerId?: string | null }>,
  incomingOfferId: string | null | undefined,
  businessId: string,
): boolean {
  const incomingKey = normalizeOfferKey(incomingOfferId, businessId)
  return existingVisits.some(
    (v) => normalizeOfferKey(v.offerId, businessId) === incomingKey,
  )
}
