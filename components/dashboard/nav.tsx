'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import {
  QrCode,
  LayoutDashboard,
  Building2,
  Users,
  Gift,
  Settings,
  LogOut,
  Shield,
  Share2,
} from 'lucide-react'

export function DashboardNav() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const navItems = [
    {
      label: t('nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['consumer', 'referrer', 'business', 'admin'],
    },
    {
      label: t('nav.business'),
      href: '/dashboard/business',
      icon: Building2,
      roles: ['business', 'admin'],
    },
    {
      label: t('nav.referrals'),
      href: '/dashboard/referrals',
      icon: Share2,
      roles: ['referrer', 'admin'],
    },
    {
      label: t('nav.myVisits'),
      href: '/dashboard/visits',
      icon: Gift,
      roles: ['consumer', 'referrer'],
    },
    {
      label: t('nav.admin'),
      href: '/dashboard/admin',
      icon: Shield,
      roles: ['admin'],
    },
  ]

  const filteredNavItems = navItems.filter((item) =>
    item.roles.some((role) => user?.roles.includes(role as never))
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-theme-cardBorder glass-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center glow">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold hidden md:inline-block text-theme-textPrimary">Smart AI Referrals</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn('gap-2', isActive && 'bg-secondary')}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL} alt={user?.name} />
                  <AvatarFallback>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user?.roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('nav.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                {t('nav.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    </header>
  )
}
