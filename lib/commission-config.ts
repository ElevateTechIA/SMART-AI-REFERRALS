export interface CommissionSplit {
  promoterPercent: number
  consumerPercent: number
  platformPercent: number
}

/** Default values (used as fallback if Firestore config doesn't exist) */
export const DEFAULT_COMMISSION_SPLIT: CommissionSplit = {
  promoterPercent: 30,
  consumerPercent: 30,
  platformPercent: 40,
}

/**
 * Calculate the split amounts from a given price.
 * Rounds DOWN promoter and consumer to whole dollars (no cents).
 * Platform gets the remainder so the total always matches exactly.
 *
 * Examples with 30/30/40 split:
 *   $100 → promoter $30, consumer $30, platform $40
 *   $50  → promoter $15, consumer $15, platform $20
 *   $25  → promoter $7,  consumer $7,  platform $11
 */
export function calculateSplit(pricePerCustomer: number, split: CommissionSplit = DEFAULT_COMMISSION_SPLIT) {
  const promoterAmount = Math.floor(pricePerCustomer * split.promoterPercent / 100)
  const consumerAmount = Math.floor(pricePerCustomer * split.consumerPercent / 100)
  // Platform gets the remainder (absorbs rounding leftover)
  const platformAmount = pricePerCustomer - promoterAmount - consumerAmount
  return { promoterAmount, consumerAmount, platformAmount }
}
