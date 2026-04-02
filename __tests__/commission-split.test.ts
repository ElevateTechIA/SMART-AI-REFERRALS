import { describe, it, expect } from 'vitest'
import {
  calculateSplit,
  DEFAULT_COMMISSION_SPLIT,
  type CommissionSplit,
} from '@/lib/commission-config'

describe('Commission Split Calculation', () => {
  describe('calculateSplit with default 30/30/40 split', () => {
    it('splits $100 correctly: promoter $30, consumer $30, platform $40', () => {
      const result = calculateSplit(100)
      expect(result.promoterAmount).toBe(30)
      expect(result.consumerAmount).toBe(30)
      expect(result.platformAmount).toBe(40)
    })

    it('splits $50 correctly: promoter $15, consumer $15, platform $20', () => {
      const result = calculateSplit(50)
      expect(result.promoterAmount).toBe(15)
      expect(result.consumerAmount).toBe(15)
      expect(result.platformAmount).toBe(20)
    })

    it('splits $25 with rounding: promoter $7, consumer $7, platform $11', () => {
      const result = calculateSplit(25)
      expect(result.promoterAmount).toBe(7)
      expect(result.consumerAmount).toBe(7)
      // Platform absorbs rounding remainder: 25 - 7 - 7 = 11
      expect(result.platformAmount).toBe(11)
    })

    it('total always equals the original price (no money lost)', () => {
      for (let price = 1; price <= 500; price++) {
        const result = calculateSplit(price)
        const total = result.promoterAmount + result.consumerAmount + result.platformAmount
        expect(total).toBe(price)
      }
    })

    it('promoter and consumer amounts are always rounded down (no cents)', () => {
      for (let price = 1; price <= 200; price++) {
        const result = calculateSplit(price)
        expect(Number.isInteger(result.promoterAmount)).toBe(true)
        expect(Number.isInteger(result.consumerAmount)).toBe(true)
        expect(Number.isInteger(result.platformAmount)).toBe(true)
      }
    })

    it('handles $0 price', () => {
      const result = calculateSplit(0)
      expect(result.promoterAmount).toBe(0)
      expect(result.consumerAmount).toBe(0)
      expect(result.platformAmount).toBe(0)
    })

    it('handles $1 price (extreme rounding case)', () => {
      const result = calculateSplit(1)
      // 30% of 1 = 0.3 → floor = 0
      expect(result.promoterAmount).toBe(0)
      expect(result.consumerAmount).toBe(0)
      // Platform gets everything: 1 - 0 - 0 = 1
      expect(result.platformAmount).toBe(1)
    })

    it('platform always gets at least as much as its percentage (absorbs rounding)', () => {
      for (let price = 1; price <= 500; price++) {
        const result = calculateSplit(price)
        const expectedPlatformMin = Math.floor(price * 40 / 100)
        expect(result.platformAmount).toBeGreaterThanOrEqual(expectedPlatformMin)
      }
    })
  })

  describe('calculateSplit with custom splits', () => {
    it('handles 50/25/25 split on $100', () => {
      const split: CommissionSplit = {
        promoterPercent: 50,
        consumerPercent: 25,
        platformPercent: 25,
      }
      const result = calculateSplit(100, split)
      expect(result.promoterAmount).toBe(50)
      expect(result.consumerAmount).toBe(25)
      expect(result.platformAmount).toBe(25)
    })

    it('handles 0/0/100 split (platform takes all)', () => {
      const split: CommissionSplit = {
        promoterPercent: 0,
        consumerPercent: 0,
        platformPercent: 100,
      }
      const result = calculateSplit(100, split)
      expect(result.promoterAmount).toBe(0)
      expect(result.consumerAmount).toBe(0)
      expect(result.platformAmount).toBe(100)
    })

    it('handles 33/33/34 split with rounding on $10', () => {
      const split: CommissionSplit = {
        promoterPercent: 33,
        consumerPercent: 33,
        platformPercent: 34,
      }
      const result = calculateSplit(10, split)
      // 33% of 10 = 3.3 → floor = 3
      expect(result.promoterAmount).toBe(3)
      expect(result.consumerAmount).toBe(3)
      // Platform absorbs remainder: 10 - 3 - 3 = 4
      expect(result.platformAmount).toBe(4)
    })

    it('total always equals price with any valid split', () => {
      const splits: CommissionSplit[] = [
        { promoterPercent: 10, consumerPercent: 10, platformPercent: 80 },
        { promoterPercent: 45, consumerPercent: 45, platformPercent: 10 },
        { promoterPercent: 1, consumerPercent: 1, platformPercent: 98 },
        { promoterPercent: 33, consumerPercent: 33, platformPercent: 34 },
      ]

      for (const split of splits) {
        for (let price = 1; price <= 100; price++) {
          const result = calculateSplit(price, split)
          const total = result.promoterAmount + result.consumerAmount + result.platformAmount
          expect(total).toBe(price)
        }
      }
    })
  })

  describe('DEFAULT_COMMISSION_SPLIT', () => {
    it('sums to 100%', () => {
      const total =
        DEFAULT_COMMISSION_SPLIT.promoterPercent +
        DEFAULT_COMMISSION_SPLIT.consumerPercent +
        DEFAULT_COMMISSION_SPLIT.platformPercent
      expect(total).toBe(100)
    })

    it('has expected default values', () => {
      expect(DEFAULT_COMMISSION_SPLIT.promoterPercent).toBe(30)
      expect(DEFAULT_COMMISSION_SPLIT.consumerPercent).toBe(30)
      expect(DEFAULT_COMMISSION_SPLIT.platformPercent).toBe(40)
    })
  })
})
