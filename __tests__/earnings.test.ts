import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---- Firebase Admin Mocks ----
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockWhereGet = vi.fn()

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  cert: vi.fn(),
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123' }),
  })),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({})),
}))

import { GET } from '@/app/api/earnings/route'

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/earnings')
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val)
  }
  const headers = new Headers()
  headers.set('Authorization', 'Bearer valid-token')
  return new NextRequest(url, { headers })
}

function makeEarningDoc(overrides: Record<string, any> = {}) {
  const defaults = {
    id: 'e-' + Math.random().toString(36).slice(2, 8),
    amount: 30,
    status: 'PENDING',
    type: 'REFERRER_COMMISSION',
    businessId: 'biz-1',
    visitId: 'visit-1',
    createdAt: { toDate: () => new Date('2026-03-15T10:00:00Z') },
  }
  const merged = { ...defaults, ...overrides }
  return {
    id: merged.id,
    data: () => merged,
  }
}

describe('Earnings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockImplementation((name: string) => {
      if (name === 'earnings') {
        return {
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
        }
      }
      if (name === 'businesses') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ name: 'Test Business', images: ['logo.png'] }),
            }),
          }),
        }
      }
      if (name === 'visits') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ consumerUserId: 'consumer-1' }),
            }),
          }),
        }
      }
      if (name === 'users') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ name: 'John Consumer', email: 'john@test.com' }),
            }),
          }),
        }
      }
      if (name === 'payout_requests') {
        return {
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
        }
      }
      return {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false }),
        }),
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }),
      }
    })
  })

  describe('Authentication', () => {
    it('rejects unauthenticated requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/earnings', {
        headers: new Headers(),
      })
      const res = await GET(req)
      expect(res.status).toBe(401)
    })
  })

  describe('Stats calculation', () => {
    it('returns zero stats when no earnings exist', async () => {
      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.stats.totalEarnings).toBe(0)
      expect(body.stats.pendingEarnings).toBe(0)
      expect(body.stats.approvedEarnings).toBe(0)
      expect(body.stats.paidEarnings).toBe(0)
      expect(body.transactions).toEqual([])
    })

    it('correctly sums PENDING earnings', async () => {
      mockCollection.mockImplementation((name: string) => {
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [
                  makeEarningDoc({ amount: 30, status: 'PENDING' }),
                  makeEarningDoc({ amount: 20, status: 'PENDING' }),
                ],
              }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.stats.totalEarnings).toBe(50)
      expect(body.stats.pendingEarnings).toBe(50)
      expect(body.stats.pendingCount).toBe(2)
    })

    it('correctly categorizes APPROVED and PAID earnings', async () => {
      mockCollection.mockImplementation((name: string) => {
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [
                  makeEarningDoc({ amount: 30, status: 'PENDING' }),
                  makeEarningDoc({ amount: 25, status: 'APPROVED' }),
                  makeEarningDoc({ amount: 40, status: 'PAID' }),
                ],
              }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.stats.totalEarnings).toBe(95)
      expect(body.stats.pendingEarnings).toBe(30)
      expect(body.stats.approvedEarnings).toBe(25)
      expect(body.stats.paidEarnings).toBe(40)
      expect(body.stats.completedEarnings).toBe(65) // approved + paid
      expect(body.stats.completedCount).toBe(2)
    })

    it('detects pending payout request', async () => {
      mockCollection.mockImplementation((name: string) => {
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [{ data: () => ({ status: 'REQUESTED' }) }],
              }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.stats.hasPendingPayout).toBe(true)
    })
  })

  describe('Transaction formatting', () => {
    it('maps REFERRER_COMMISSION to referral type', async () => {
      mockCollection.mockImplementation((name: string) => {
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [makeEarningDoc({ type: 'REFERRER_COMMISSION' })],
              }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.transactions[0].type).toBe('referral')
    })

    it('maps CONSUMER_REWARD to bonus type with special customer name', async () => {
      mockCollection.mockImplementation((name: string) => {
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [makeEarningDoc({ type: 'CONSUMER_REWARD' })],
              }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.transactions[0].type).toBe('bonus')
      expect(body.transactions[0].customer).toBe('You (Consumer Reward)')
    })

    it('maps earning status to frontend format correctly', async () => {
      mockCollection.mockImplementation((name: string) => {
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [
                  makeEarningDoc({ id: 'e1', status: 'PENDING' }),
                  makeEarningDoc({ id: 'e2', status: 'APPROVED' }),
                  makeEarningDoc({ id: 'e3', status: 'PAID' }),
                ],
              }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      const findTx = (id: string) => body.transactions.find((t: any) => t.id === id)
      expect(findTx('e1').status).toBe('pending')
      expect(findTx('e2').status).toBe('processing')
      expect(findTx('e3').status).toBe('completed')
    })
  })
})
