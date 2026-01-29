'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'

interface AuthPageLayoutProps {
  children: React.ReactNode
  showSignInLink?: boolean
}

export function AuthPageLayout({ children, showSignInLink = false }: AuthPageLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/dashboard/assets/landing-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-purple-800/30 to-purple-900/50"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                <svg className="w-full h-full text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-white font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </Link>

            {/* Language Switcher & Sign In Button */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              {showSignInLink && (
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-white hover:bg-white/20">
                    {t('auth.signIn')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-white/20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-white/90 text-sm">
              {t('landing.allRightsReserved')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
