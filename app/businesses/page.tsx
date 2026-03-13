'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tag, Users, QrCode, TrendingDown, UserCheck, Heart, Target, LayoutDashboard } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ElivBrand } from '@/components/eliv-logo'
import { RegisterShareModal } from '@/components/register-share-modal'

export default function BusinessLandingPage() {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* Content */}
      <div className="relative z-10">
        {/* Brand gradient bar */}
        <div className="eliv-gradient-bar-reverse h-1" />

        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ElivBrand responsive="md/lg" forceDark />
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/promoters">
                <Button variant="ghost" className="hidden sm:inline-flex text-gray-600 hover:bg-gray-100">
                  {t('promotersLanding.cta')}
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-600 hover:bg-gray-100">
                  {t('auth.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="min-h-[min(calc(100vh-5rem),56rem)] flex items-center">
          <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
            <div className="space-y-8 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900">
                  {t('businessLanding.heroTitle')}{' '}
                  <span style={{ color: 'var(--theme-secondary)' }}>{t('businessLanding.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl md:text-2xl leading-relaxed text-gray-600">
                  {t('businessLanding.heroSubtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Button
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                  style={{ background: 'var(--theme-secondary)' }}
                >
                  {t('businessLanding.cta')}
                </Button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px]">
                <Image
                  src="/dashboard/assets/mobile-smart-ref.png"
                  alt="Eliv App"
                  width={400}
                  height={800}
                  className="w-full h-auto rounded-[2.5rem] shadow-2xl"
                />
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl animate-pulse" style={{ background: 'color-mix(in srgb, var(--theme-secondary) 20%, transparent)' }}></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
              {t('businessLanding.howItWorks')}
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-secondary) 15%, transparent)' }}>
                  <Tag className="w-8 h-8" style={{ color: 'var(--theme-secondary)' }} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{t('businessLanding.step1Title')}</h3>
                <p className="text-sm text-gray-500">{t('businessLanding.step1Desc')}</p>
              </div>

              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-success) 15%, transparent)' }}>
                  <Users className="w-8 h-8" style={{ color: 'var(--theme-success)' }} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{t('businessLanding.step2Title')}</h3>
                <p className="text-sm text-gray-500">{t('businessLanding.step2Desc')}</p>
              </div>

              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-accent) 15%, transparent)' }}>
                  <QrCode className="w-8 h-8" style={{ color: 'var(--theme-accent)' }} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{t('businessLanding.step3Title')}</h3>
                <p className="text-sm text-gray-500">{t('businessLanding.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Why Better Than Traditional Advertising */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
              {t('businessLanding.whyBetterTitle')}
            </h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="rounded-2xl p-6 border border-gray-200 bg-white flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--theme-secondary) 15%, transparent)' }}>
                  <TrendingDown className="w-5 h-5" style={{ color: 'var(--theme-secondary)' }} />
                </div>
                <p className="font-medium text-gray-600">{t('businessLanding.benefit1')}</p>
              </div>

              <div className="rounded-2xl p-6 border border-gray-200 bg-white flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--theme-success) 15%, transparent)' }}>
                  <UserCheck className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
                </div>
                <p className="font-medium text-gray-600">{t('businessLanding.benefit2')}</p>
              </div>

              <div className="rounded-2xl p-6 border border-gray-200 bg-white flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--theme-error) 15%, transparent)' }}>
                  <Heart className="w-5 h-5" style={{ color: 'var(--theme-error)' }} />
                </div>
                <p className="font-medium text-gray-600">{t('businessLanding.benefit3')}</p>
              </div>

              <div className="rounded-2xl p-6 border border-gray-200 bg-white flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--theme-warning) 15%, transparent)' }}>
                  <Target className="w-5 h-5" style={{ color: 'var(--theme-warning)' }} />
                </div>
                <p className="font-medium text-gray-600">{t('businessLanding.benefit4')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'color-mix(in srgb, var(--theme-secondary) 15%, transparent)' }}>
              <LayoutDashboard className="w-8 h-8" style={{ color: 'var(--theme-secondary)' }} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              {t('businessLanding.dashboardTitle')}
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto text-gray-600">
              {t('businessLanding.dashboardDesc')}
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl"
              >
                {t('landing.previewDashboard')}
              </Button>
            </Link>
          </div>
        </div>

        {/* CTA Final */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <Button
              size="lg"
              onClick={() => setShowModal(true)}
              className="text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-lg"
              style={{ background: 'var(--theme-secondary)' }}
            >
              {t('businessLanding.ctaFinal')}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-gray-400">{t('landing.allRightsReserved')}</p>
          </div>
        </footer>
      </div>

      <RegisterShareModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type="business"
      />
    </div>
  )
}
