import { describe, it, expect } from 'vitest'
import { hasAdminPermission } from '@/lib/firebase/admin'

describe('hasAdminPermission', () => {
  describe('non-admin users', () => {
    it('rejects users with no roles', () => {
      expect(hasAdminPermission(undefined)).toBe(false)
      expect(hasAdminPermission({})).toBe(false)
      expect(hasAdminPermission({ roles: [] })).toBe(false)
    })

    it('rejects users without admin role', () => {
      expect(hasAdminPermission({ roles: ['business'] }, 'businesses')).toBe(false)
      expect(hasAdminPermission({ roles: ['referrer', 'consumer'] })).toBe(false)
    })
  })

  describe('full admins (no adminPermissions set)', () => {
    it('is granted any permission when adminPermissions is undefined', () => {
      expect(hasAdminPermission({ roles: ['admin'] }, 'businesses')).toBe(true)
      expect(hasAdminPermission({ roles: ['admin'] }, 'revenue')).toBe(true)
      expect(hasAdminPermission({ roles: ['admin'] })).toBe(true)
    })

    it('is granted any permission when adminPermissions is an empty array', () => {
      expect(hasAdminPermission({ roles: ['admin'], adminPermissions: [] }, 'businesses')).toBe(true)
      expect(hasAdminPermission({ roles: ['admin'], adminPermissions: [] }, 'payouts')).toBe(true)
    })
  })

  describe('limited admins', () => {
    const limited = { roles: ['admin'], adminPermissions: ['businesses'] }

    it('is granted the permissions they hold', () => {
      expect(hasAdminPermission(limited, 'businesses')).toBe(true)
    })

    it('is denied permissions they do not hold', () => {
      expect(hasAdminPermission(limited, 'payouts')).toBe(false)
      expect(hasAdminPermission(limited, 'revenue')).toBe(false)
      expect(hasAdminPermission(limited, 'users')).toBe(false)
    })

    it('passes calls with no required permission (still authenticated admin)', () => {
      // A limited admin is still an admin — the presence check w/o a required
      // permission is about "is this user an admin at all", which they are.
      expect(hasAdminPermission(limited)).toBe(true)
    })

    it('handles multiple granted permissions', () => {
      const multi = { roles: ['admin'], adminPermissions: ['businesses', 'support'] }
      expect(hasAdminPermission(multi, 'businesses')).toBe(true)
      expect(hasAdminPermission(multi, 'support')).toBe(true)
      expect(hasAdminPermission(multi, 'payouts')).toBe(false)
    })
  })

  describe('business-edit authorization (real-world scenario)', () => {
    it('a super-admin can edit businesses', () => {
      const superAdmin = { roles: ['admin'] }
      expect(hasAdminPermission(superAdmin, 'businesses')).toBe(true)
    })

    it('a limited admin granted businesses can edit businesses', () => {
      const user = { roles: ['admin'], adminPermissions: ['businesses'] }
      expect(hasAdminPermission(user, 'businesses')).toBe(true)
    })

    it('a limited admin with only support permission cannot edit businesses', () => {
      const user = { roles: ['admin'], adminPermissions: ['support'] }
      expect(hasAdminPermission(user, 'businesses')).toBe(false)
    })

    it('a business owner who is not admin cannot edit businesses via this path', () => {
      const owner = { roles: ['business'] }
      expect(hasAdminPermission(owner, 'businesses')).toBe(false)
    })
  })
})
