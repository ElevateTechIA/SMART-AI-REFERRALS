'use client'

import { useState } from 'react'
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
import { useTheme, type Mode } from '@/lib/theme/theme-provider'
import { useAuth } from '@/lib/auth/context'
import { ShareAppModal } from '@/components/share-app-modal'
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
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
} from 'lucide-react'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

const modeOptions: { value: Mode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
]

export function DashboardNav() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const { theme, setTheme, mode, setMode, availableThemes } = useTheme()
  const [showShareModal, setShowShareModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    router.push('/')
  }

  const handleShareApp = () => {
    setMenuOpen(false)
    setShowShareModal(true)
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
    <>
      <header className="sticky top-0 z-50 w-full border-b border-theme-cardBorder glass-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => { setMenuOpen(false); setShowShareModal(true) }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={t('share.shareApp', 'Share App')}
            >
              <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center glow">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold hidden md:inline-block text-theme-textPrimary">Smart AI Referrals</span>
            </button>
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

          {/* Desktop: show all controls */}
          <div className="hidden md:flex items-center gap-4">
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
                          {role === 'referrer' ? 'promoter' : role}
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

          {/* Mobile: hamburger button */}
          <button
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-6 w-6 text-theme-textPrimary" />
          </button>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Panel */}
          <div className="absolute top-0 right-0 h-full w-[85%] max-w-sm shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto border-l" style={{ background: 'var(--theme-cardBg)', borderColor: 'var(--theme-cardBorder)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-2xl font-black italic text-theme-textPrimary tracking-wide">MENU</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center hover:bg-theme-primary/20 transition-colors"
              >
                <X className="h-5 w-5 text-theme-textPrimary" />
              </button>
            </div>

            {/* User profile */}
            <div className="px-6 py-4 flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2" style={{ '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties}>
                <AvatarImage src={user?.photoURL} alt={user?.name} />
                <AvatarFallback className="text-lg">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-theme-textPrimary font-semibold text-lg truncate">{user?.name}</p>
                <p className="text-theme-textMuted text-sm truncate">{user?.email}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {user?.roles.map((role) => (
                    <span
                      key={role}
                      className="text-[10px] bg-theme-primary/10 text-theme-textSecondary px-2 py-0.5 rounded-full capitalize"
                    >
                      {role === 'referrer' ? 'promoter' : role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-6 border-t border-theme-cardBorder" />

            {/* Menu items */}
            <div className="px-4 py-4 space-y-1">
              <Link
                href="/dashboard/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-theme-textSecondary hover:bg-theme-primary/10 transition-colors"
              >
                <Settings className="h-5 w-5 text-theme-primary" />
                <span className="font-medium">{t('nav.settings')}</span>
              </Link>

              <button
                onClick={handleShareApp}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-theme-textSecondary hover:bg-theme-primary/10 transition-colors"
              >
                <Share2 className="h-5 w-5 text-theme-primary" />
                <span className="font-medium">{t('share.shareApp', 'Share App')}</span>
              </button>
            </div>

            <div className="mx-6 border-t border-theme-cardBorder" />

            {/* Theme mode */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-theme-textMuted" />
                <span className="text-xs font-semibold text-theme-textMuted uppercase tracking-wider">
                  {t('nav.theme', 'Theme')}
                </span>
              </div>
              <div className="flex gap-2">
                {modeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      mode === value
                        ? 'bg-theme-primary text-white'
                        : 'bg-theme-primary/10 text-theme-textMuted hover:bg-theme-primary/20'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Color themes */}
              <div className="mt-3 grid grid-cols-5 gap-2">
                {Object.entries(availableThemes).map(([key, themeData]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key as keyof typeof availableThemes)}
                    className={cn(
                      'relative h-10 w-full rounded-xl border-2 transition-all',
                      theme === key ? 'border-theme-textPrimary scale-105' : 'border-transparent'
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${themeData.colors.gradientFrom}, ${themeData.colors.primary})`
                    }}
                    title={themeData.name}
                  >
                    {theme === key && (
                      <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-6 border-t border-theme-cardBorder" />

            {/* Language */}
            <div className="px-6 py-4">
              <span className="text-xs font-semibold text-theme-textMuted uppercase tracking-wider">
                {t('nav.language', 'Idioma')}
              </span>
              <div className="flex gap-3 mt-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                      i18n.language === lang.code
                        ? 'bg-theme-primary text-white shadow-lg'
                        : 'bg-theme-primary/10 text-theme-textMuted hover:bg-theme-primary/20'
                    )}
                  >
                    <span>{lang.flag}</span>
                    {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-6 border-t border-theme-cardBorder" />

            {/* Sign out */}
            <div className="px-4 py-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">{t('nav.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share App Modal */}
      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  )
}
