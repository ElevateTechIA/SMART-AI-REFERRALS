'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'

interface AuthPageLayoutProps {
  children: React.ReactNode
  showSignInLink?: boolean
  loginHref?: string
}

export function AuthPageLayout({ children, showSignInLink = false, loginHref = '/auth/login' }: AuthPageLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-white">
      {/* Content Container */}
      <div className="min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="px-6 py-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 bg-theme-primary rounded-lg flex items-center justify-center p-2">
                <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-gray-900 font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-gray-900 font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </Link>

            {/* Language Switcher & Sign In Button */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              {showSignInLink && (
                <Link href={loginHref}>
                  <Button variant="ghost" className="text-gray-700 hover:bg-gray-100">
                    {t('auth.signIn')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gray-50">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-gray-400">
              {t('landing.allRightsReserved')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
