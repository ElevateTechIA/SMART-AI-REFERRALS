import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---- Firebase Admin Mocks ----

const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockCollectionDoc = vi.fn()
const mockWhereGet = vi.fn()
const mockWhere = vi.fn()
const mockCollection = vi.fn()

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

import { GET, POST } from '@/app/api/cashout/route'

function createRequest(method: string = 'GET'): NextRequest {
  const headers = new Headers()
  headers.set('Authorization', 'Bearer valid-token')
  return new NextRequest('http://localhost:3000/api/cashout', {
    method,
    headers,
  })
}

describe('Cashout API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockWhere.mockReturnValue({ get: mockWhereGet })
    mockCollectionDoc.mockReturnValue({
      get: mockDocGet,
      set: mockDocSet,
      id: 'payout-new-id',
    })
    mockCollection.mockReturnValue({
      doc: mockCollectionDoc,
      where: mockWhere,
    })
  })

  describe('GET - Fetch payout requests', () => {
    it('returns empty list when no payouts exist', async () => {
      mockWhereGet.mockResolvedValue({ docs: [] })

      const req = createRequest()
      const res = await GET(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('returns payouts sorted by date descending', async () => {
      mockWhereGet.mockResolvedValue({
        docs: [
          {
            id: 'p1',
            data: () => ({
              amount: 50,
              status: 'COMPLETED',
              createdAt: { toDate: () => new Date('2026-01-01') },
            }),
          },
          {
            id: 'p2',
            data: () => ({
              amount: 75,
              status: 'REQUESTED',
              createdAt: { toDate: () => new Date('2026-03-01') },
            }),
          },
        ],
      })

      const req = createRequest()
      const res = await GET(req)
      const body = await res.json()

      expect(body.data[0].id).toBe('p2') // newer first
      expect(body.data[1].id).toBe('p1')
    })
  })

  describe('POST - Create cashout request', () => {
    // Helper to set up mocks for POST
    function setupPostMocks(overrides: {
      userExists?: boolean
      bankInfo?: { bankName?: string; accountNumber?: string } | null
      hasPendingPayout?: boolean
      approvedTotal?: number
      approvedEarnings?: Array<{ id: string; amount: number }>
    } = {}) {
      const {
        userExists = true,
        bankInfo = { bankName: 'Chase', accountNumber: '12345' },
        hasPendingPayout = false,
        approvedTotal,
        approvedEarnings = [
          { id: 'e1', amount: 30 },
          { id: 'e2', amount: 25 },
        ],
      } = overrides

      // Mock collection routing based on collection name
      mockCollection.mockImplementation((name: string) => {
        if (name === 'users') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                exists: userExists,
                data: () => ({ bankInfo }),
              }),
            }),
          }
        }
        if (name === 'payout_requests') {
          return {
            doc: vi.fn().mockReturnValue({
              set: mockDocSet,
              id: 'payout-new-id',
            }),
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: hasPendingPayout
                  ? [{ data: () => ({ status: 'REQUESTED' }) }]
                  : [],
              }),
            }),
          }
        }
        if (name === 'earnings') {
          return {
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: approvedEarnings.map((e) => ({
                  id: e.id,
                  data: () => ({
                    amount: e.amount,
                    status: 'APPROVED',
                  }),
                })),
              }),
            }),
          }
        }
        return { doc: vi.fn(), where: vi.fn() }
      })
    }

    it('rejects when user has no bank info', async () => {
      setupPostMocks({ bankInfo: null })

      const req = createRequest('POST')
      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toContain('bank information')
    })

    it('rejects when bank info is incomplete (no account number)', async () => {
      setupPostMocks({ bankInfo: { bankName: 'Chase', accountNumber: undefined as any } })

      const req = createRequest('POST')
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('rejects when user already has a pending payout', async () => {
      setupPostMocks({ hasPendingPayout: true })

      const req = createRequest('POST')
      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toContain('pending cashout')
    })

    it('rejects when approved earnings are below minimum ($50)', async () => {
      setupPostMocks({
        approvedEarnings: [
          { id: 'e1', amount: 20 },
          { id: 'e2', amount: 15 },
        ],
      })

      const req = createRequest('POST')
      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toContain('Minimum cashout')
      expect(body.error).toContain('$50')
    })

    it('creates payout request when all conditions are met', async () => {
      setupPostMocks({
        approvedEarnings: [
          { id: 'e1', amount: 30 },
          { id: 'e2', amount: 25 },
        ],
      })

      const req = createRequest('POST')
      const res = await POST(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.amount).toBe(55) // 30 + 25
      expect(body.data.payoutRequestId).toBe('payout-new-id')
    })

    it('correctly sums approved earnings and rounds to 2 decimals', async () => {
      setupPostMocks({
        approvedEarnings: [
          { id: 'e1', amount: 33.333 },
          { id: 'e2', amount: 16.667 },
        ],
      })

      const req = createRequest('POST')
      const res = await POST(req)
      const body = await res.json()

      expect(body.success).toBe(true)
      // Math.round(50 * 100) / 100 = 50
      expect(body.data.amount).toBe(50)
    })

    it('stores earning IDs in the payout request', async () => {
      setupPostMocks({
        approvedEarnings: [
          { id: 'earn-aaa', amount: 30 },
          { id: 'earn-bbb', amount: 30 },
        ],
      })

      const req = createRequest('POST')
      await POST(req)

      expect(mockDocSet).toHaveBeenCalledOnce()
      const setData = mockDocSet.mock.calls[0][0]
      expect(setData.earningIds).toEqual(['earn-aaa', 'earn-bbb'])
      expect(setData.status).toBe('REQUESTED')
      expect(setData.userId).toBe('user-123')
    })

    it('rejects when user does not exist', async () => {
      setupPostMocks({ userExists: false })

      const req = createRequest('POST')
      const res = await POST(req)
      expect(res.status).toBe(404)
    })
  })
})
