/**
 * Multi-offer configuration.
 *
 * Centralizes the rules that govern how many offers a business may publish
 * and what state an offer can be in. Designed so the active-offer cap can be
 * raised in the future without touching call sites.
 */

/** Maximum number of *active* (non-archived) offers a single business may have. */
export const MAX_ACTIVE_OFFERS_PER_BUSINESS = 2

/** Persisted lifecycle state for an offer document. */
export type OfferStatus = 'active' | 'archived'

/**
 * Treat an offer as active when:
 *  - `status === 'active'` (new docs), OR
 *  - `status` is missing AND `active !== false` (legacy docs migrated from
 *    the `offers/{businessId}` pattern, which only used a boolean `active`).
 *
 * This lets legacy and new documents coexist without a destructive migration.
 */
export function isOfferActive(offer: { status?: OfferStatus | string; active?: boolean }): boolean {
  if (offer.status) return offer.status === 'active'
  return offer.active !== false
}
