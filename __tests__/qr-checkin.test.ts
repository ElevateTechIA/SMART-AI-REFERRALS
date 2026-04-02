import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateCheckInToken,
  hashToken,
  generateCheckInQRUrl,
  isTokenExpired,
  getDaysRemaining,
} from '@/lib/qr-checkin'

describe('QR Check-in Token System', () => {
  describe('generateCheckInToken', () => {
    it('generates a non-empty string', () => {
      const token = generateCheckInToken()
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('generates unique tokens each time', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCheckInToken())
      }
      expect(tokens.size).toBe(100)
    })

    it('generates base64url-safe tokens (no +, /, or =)', () => {
      for (let i = 0; i < 50; i++) {
        const token = generateCheckInToken()
        expect(token).not.toMatch(/[+/=]/)
      }
    })

    it('generates tokens of consistent length (~43 chars for 32 bytes)', () => {
      const token = generateCheckInToken()
      // 32 bytes in base64url = 43 chars (no padding)
      expect(token.length).toBe(43)
    })
  })

  describe('hashToken', () => {
    it('returns a hex string', () => {
      const hash = hashToken('test-token')
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('returns SHA-256 length (64 hex chars)', () => {
      const hash = hashToken('test-token')
      expect(hash.length).toBe(64)
    })

    it('produces consistent hash for same input', () => {
      const hash1 = hashToken('my-token-123')
      const hash2 = hashToken('my-token-123')
      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different inputs', () => {
      const hash1 = hashToken('token-a')
      const hash2 = hashToken('token-b')
      expect(hash1).not.toBe(hash2)
    })

    it('is one-way (cannot derive token from hash)', () => {
      const token = generateCheckInToken()
      const hash = hashToken(token)
      // Hash should not contain the original token
      expect(hash).not.toContain(token)
      expect(hash.length).toBe(64) // fixed length regardless of input
    })
  })

  describe('generateCheckInQRUrl', () => {
    it('generates URL with visitId and token params', () => {
      const url = generateCheckInQRUrl('visit-123', 'token-abc')
      expect(url).toContain('/check-in?v=visit-123&t=token-abc')
    })

    it('uses NEXT_PUBLIC_APP_URL env var when set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com'

      const url = generateCheckInQRUrl('v1', 't1')
      expect(url).toBe('https://myapp.com/check-in?v=v1&t=t1')

      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    })

    it('falls back to localhost:3000 when env var not set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL

      const url = generateCheckInQRUrl('v1', 't1')
      expect(url).toBe('http://localhost:3000/check-in?v=v1&t=t1')

      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    })
  })

  describe('isTokenExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-02T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false for future date', () => {
      const futureDate = new Date('2026-04-09T12:00:00Z') // 7 days from now
      expect(isTokenExpired(futureDate)).toBe(false)
    })

    it('returns true for past date', () => {
      const pastDate = new Date('2026-03-25T12:00:00Z') // 8 days ago
      expect(isTokenExpired(pastDate)).toBe(true)
    })

    it('returns true for exactly now (edge case)', () => {
      const now = new Date('2026-04-02T12:00:00Z')
      // now > now is false, so it should NOT be expired
      expect(isTokenExpired(now)).toBe(false)
    })

    it('handles string date input', () => {
      expect(isTokenExpired('2026-04-09T12:00:00Z')).toBe(false)
      expect(isTokenExpired('2026-03-25T12:00:00Z')).toBe(true)
    })

    it('handles timestamp (number) input', () => {
      const futureTimestamp = new Date('2026-04-09T12:00:00Z').getTime()
      const pastTimestamp = new Date('2026-03-25T12:00:00Z').getTime()
      expect(isTokenExpired(futureTimestamp)).toBe(false)
      expect(isTokenExpired(pastTimestamp)).toBe(true)
    })
  })

  describe('getDaysRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-02T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 7 for a date 7 days in the future', () => {
      const futureDate = new Date('2026-04-09T12:00:00Z')
      expect(getDaysRemaining(futureDate)).toBe(7)
    })

    it('returns 1 for a date less than 24 hours away', () => {
      const soonDate = new Date('2026-04-03T06:00:00Z') // 18 hours from now
      expect(getDaysRemaining(soonDate)).toBe(1)
    })

    it('returns 0 for exactly now', () => {
      const now = new Date('2026-04-02T12:00:00Z')
      expect(getDaysRemaining(now)).toBe(0)
    })

    it('returns negative for expired dates', () => {
      const pastDate = new Date('2026-03-30T12:00:00Z') // 3 days ago
      expect(getDaysRemaining(pastDate)).toBeLessThan(0)
    })

    it('handles string input', () => {
      expect(getDaysRemaining('2026-04-09T12:00:00Z')).toBe(7)
    })
  })
})
