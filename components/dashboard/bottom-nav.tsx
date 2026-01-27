'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth/context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  QrCode,
  LayoutDashboard,
  Building2,
  DollarSign,
  Share2,
  Gift,
  Shield,
  User,
  Languages,
} from 'lucide-react'

export function BottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()
  const { t, i18n } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ]

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

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

  const isAdmin = user?.roles.includes('admin')

  const navItems = [
    {
      label: t('nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['consumer', 'referrer', 'business', 'admin'],
    },
    {
      label: t('nav.referrals'),
      href: '/dashboard/referrals',
      icon: Share2,
      roles: ['referrer', 'admin'],
    },
    {
      label: t('nav.earnings'),
      href: '/dashboard/earnings',
      icon: DollarSign,
      roles: ['referrer', 'business', 'admin'],
    },
    {
      label: t('nav.business'),
      href: '/dashboard/business',
      icon: Building2,
      roles: ['business', 'admin'],
    },
    {
      label: t('nav.visits'),
      href: '/dashboard/visits',
      icon: Gift,
      roles: ['consumer', 'referrer'],
    },
  ]

  // Filter nav items by user roles, take first 3 items to leave room for admin + language
  const filteredNavItems = navItems.filter((item) =>
    item.roles.some((role) => user?.roles.includes(role as never))
  ).slice(0, isAdmin ? 3 : 4)

  const isAdminActive = pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-r from-indigo-900 to-purple-800 shadow-lg border-t border-white/10 z-50 transition-transform duration-300",
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="grid grid-cols-5 h-16 px-1">
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
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Admin Link - only for admin users */}
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={cn(
              'flex flex-col items-center justify-center gap-1 transition-colors',
              isAdminActive ? 'text-white' : 'text-white/60 hover:text-white'
            )}
          >
            <Shield className="h-5 w-5" />
            <span className="text-[9px] font-medium">{t('nav.admin')}</span>
          </Link>
        )}

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors text-white/60 hover:text-white'
              )}
            >
              <Languages className="h-5 w-5" />
              <span className="text-[9px] font-medium">{currentLanguage.flag}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={i18n.language === language.code ? 'bg-accent' : ''}
              >
                <span className="mr-2">{language.flag}</span>
                {language.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
