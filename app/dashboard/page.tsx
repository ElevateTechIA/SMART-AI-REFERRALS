'use client'

import { useAuth } from '@/lib/auth/context'
import { PromoterDashboard } from '@/components/dashboard/promoter-dashboard'
import { BusinessDashboard } from '@/components/dashboard/business-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { Loader2 } from 'lucide-react'
import type { UserRole } from '@/lib/types'

function getPrimaryDashboardRole(roles: UserRole[]): 'admin' | 'business' | 'referrer' {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('business')) return 'business'
  return 'referrer'
}

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const primaryRole = getPrimaryDashboardRole(user.roles)

  if (primaryRole === 'admin') {
    return <AdminDashboard />
  }

  if (primaryRole === 'business') {
    return <BusinessDashboard />
  }

  return <PromoterDashboard />
}
