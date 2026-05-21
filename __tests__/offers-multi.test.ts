import { describe, it, expect } from 'vitest'
import {
  MAX_ACTIVE_OFFERS_PER_BUSINESS,
  isOfferActive,
  type OfferStatus,
} from '@/lib/offers-config'
import { generateReferralUrl } from '@/lib/utils'

describe('offers-config', () => {
  describe('MAX_ACTIVE_OFFERS_PER_BUSINESS', () => {
    it('is the configured cap (currently 2, expected to be raisable)', () => {
      // This test guards against accidental changes that would silently
      // relax the cap. If the product decision changes, update the test
      // and the constant together.
      expect(MAX_ACTIVE_OFFERS_PER_BUSINESS).toBeGreaterThanOrEqual(1)
      expect(MAX_ACTIVE_OFFERS_PER_BUSINESS).toBe(2)
    })
  })

  describe('isOfferActive', () => {
    it('uses status when present (active)', () => {
      expect(isOfferActive({ status: 'active' as OfferStatus, active: false })).toBe(true)
    })

    it('uses status when present (archived)', () => {
      // status wins over active=true if both disagree
      expect(isOfferActive({ status: 'archived' as OfferStatus, active: true })).toBe(false)
    })

    it('falls back to active boolean for legacy docs without status', () => {
      expect(isOfferActive({ active: true })).toBe(true)
      expect(isOfferActive({ active: false })).toBe(false)
    })

    it('treats legacy docs with neither field set as active (legacy default)', () => {
      // Some very old docs simply omit `active`. The historical behavior
      // was to treat them as visible to consumers.
      expect(isOfferActive({})).toBe(true)
    })
  })
})

describe('visit attribution offer-id resolution', () => {
  // Mirrors the logic in components/referral-page-content.tsx's
  // handleCreateVisit: prefer the explicitly-selected offer, fall back to
  // the first active offer, finally null. This guards against a regression
  // where a multi-offer business could record visits without attribution.
  function resolveOfferIdForVisit(
    selected: { id: string } | null | undefined,
    activeOffers: ReadonlyArray<{ id: string }>,
  ): string | null {
    return selected?.id ?? activeOffers[0]?.id ?? null
  }

  it('uses the selected offer when present', () => {
    const active = [{ id: 'A' }, { id: 'B' }]
    expect(resolveOfferIdForVisit({ id: 'B' }, active)).toBe('B')
  })

  it('falls back to the first active offer when none selected', () => {
    const active = [{ id: 'A' }, { id: 'B' }]
    expect(resolveOfferIdForVisit(null, active)).toBe('A')
  })

  it('returns null when there are no active offers', () => {
    expect(resolveOfferIdForVisit(null, [])).toBeNull()
  })

  it('returns null when undefined is passed (defensive)', () => {
    expect(resolveOfferIdForVisit(undefined, [])).toBeNull()
  })
})

describe('generateReferralUrl', () => {
  it('builds a bare link when no offer or referrer is passed (legacy compat)', () => {
    const url = generateReferralUrl('biz123')
    expect(url).toContain('/r/biz123')
    expect(url).not.toContain('?ref=')
    expect(url).not.toContain('biz123/')
  })

  it('appends ?ref when a referrerUserId is given', () => {
    const url = generateReferralUrl('biz123', 'userABC')
    expect(url).toContain('/r/biz123?ref=userABC')
  })

  it('puts the offerId in the path when given', () => {
    const url = generateReferralUrl('biz123', undefined, 'offerXYZ')
    expect(url).toContain('/r/biz123/offerXYZ')
  })

  it('combines offer + referrer correctly', () => {
    const url = generateReferralUrl('biz123', 'userABC', 'offerXYZ')
    expect(url).toContain('/r/biz123/offerXYZ?ref=userABC')
  })
})
