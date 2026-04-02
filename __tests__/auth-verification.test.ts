import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin before importing the module under test
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  cert: vi.fn(),
}))

const mockVerifyIdToken = vi.fn()
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}))

const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockGet = vi.fn()
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
    doc: vi.fn(),
  })),
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({})),
}))

import { verifyAuth, verifyAdmin } from '@/lib/firebase/admin'
import { NextRequest } from 'next/server'

function createRequest(authHeader?: string): NextRequest {
  const headers = new Headers()
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }
  return new NextRequest('http://localhost:3000/api/test', { headers })
}

describe('Auth Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({ get: mockGet })
  })

  describe('verifyAuth', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = createRequest()
      const result = await verifyAuth(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(401)
        expect(result.error).toContain('Missing')
      }
    })

    it('returns 401 when Authorization header does not start with Bearer', async () => {
      const req = createRequest('Basic abc123')
      const result = await verifyAuth(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(401)
      }
    })

    it('returns 401 when Bearer token is empty', async () => {
      const req = createRequest('Bearer ')
      const result = await verifyAuth(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(401)
      }
    })

    it('returns success with decoded token for valid token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-123',
        email: 'test@example.com',
      })

      const req = createRequest('Bearer valid-token-here')
      const result = await verifyAuth(req)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.uid).toBe('user-123')
        expect(result.user.email).toBe('test@example.com')
      }
    })

    it('returns 401 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'))

      const req = createRequest('Bearer expired-token')
      const result = await verifyAuth(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(401)
        expect(result.error).toContain('Invalid or expired')
      }
    })
  })

  describe('verifyAdmin', () => {
    it('returns 401 when not authenticated', async () => {
      const req = createRequest()
      const result = await verifyAdmin(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(401)
      }
    })

    it('returns 403 when user does not have admin role', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['referrer', 'consumer'] }),
      })

      const req = createRequest('Bearer valid-token')
      const result = await verifyAdmin(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(403)
        expect(result.error).toContain('Admin access required')
      }
    })

    it('returns 403 when user doc does not exist', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' })
      mockGet.mockResolvedValue({ exists: false })

      const req = createRequest('Bearer valid-token')
      const result = await verifyAdmin(req)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(403)
      }
    })

    it('returns success when user has admin role', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-user' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['admin', 'referrer'] }),
      })

      const req = createRequest('Bearer valid-admin-token')
      const result = await verifyAdmin(req)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.uid).toBe('admin-user')
      }
    })
  })
})
