'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Share2,
  Gift,
  Shield,
} from 'lucide-react'

export function BottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlNavbar)

    return () => {
      window.removeEventListener('scroll', controlNavbar)
    }
  }, [lastScrollY])

  const navItems = [
    {
      label: t('nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['consumer', 'referrer', 'business', 'admin'],
    },
    {
      label: t('nav.admin'),
      href: '/dashboard/admin',
      icon: Shield,
      roles: ['admin'],
    },
    {
      label: t('nav.referrals'),
      href: '/dashboard/referrals',
      icon: Share2,
      roles: ['referrer', 'admin'],
    },
    {
      label: t('nav.business'),
      href: '/dashboard/business',
      icon: Building2,
      roles: ['business', 'admin'],
    },
    {
      label: t('nav.earnings'),
      href: '/dashboard/earnings',
      icon: DollarSign,
      roles: ['referrer', 'business', 'admin'],
    },
    {
      label: t('nav.visits'),
      href: '/dashboard/visits',
      icon: Gift,
      roles: ['consumer', 'referrer'],
    },
  ]

  // Filter nav items by user roles
  const filteredNavItems = navItems.filter((item) =>
    item.roles.some((role) => user?.roles.includes(role as never))
  )

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-r from-indigo-900 to-purple-800 shadow-lg border-t border-white/10 z-50 transition-transform duration-300",
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="grid h-16 px-1" style={{ gridTemplateColumns: `repeat(${filteredNavItems.length}, minmax(0, 1fr))` }}>
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-white' : 'text-white/60 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn("font-medium truncate max-w-full", filteredNavItems.length > 4 ? "text-[8px]" : "text-[9px]")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
