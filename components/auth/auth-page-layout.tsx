'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ElivBrand } from '@/components/eliv-logo'

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
        <nav className="px-6 py-6 border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ElivBrand responsive="md/lg" forceDark />
            </Link>

            {/* Language Switcher & Sign In Button */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              {showSignInLink && (
                <Link href={loginHref}>
                  <Button variant="ghost" className="text-gray-600 hover:bg-gray-100">
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
