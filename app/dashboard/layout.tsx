'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { DashboardNav } from '@/components/dashboard/nav'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isMainDashboard = pathname === '/dashboard'

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {!isMainDashboard && <DashboardNav />}
      <main className={`container mx-auto px-4 ${isMainDashboard ? 'py-0' : 'py-8 pb-20 md:pb-8'}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
