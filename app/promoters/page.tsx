'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Store, Share2, DollarSign, BadgeCheck, QrCode, Wallet } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ElivBrand } from '@/components/eliv-logo'
import { RegisterShareModal } from '@/components/register-share-modal'

export default function PromotersLandingPage() {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(false)
  const [referrals, setReferrals] = useState(10)

  const earningsPerVisit = 15
  const estimatedEarnings = referrals * earningsPerVisit

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* Content */}
      <div className="relative z-10">
        {/* Brand gradient bar */}
        <div className="eliv-gradient-bar h-1" />

        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ElivBrand responsive="md/lg" forceDark />
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/businesses">
                <Button variant="ghost" className="hidden sm:inline-flex text-gray-600 hover:bg-gray-100">
                  {t('businessLanding.cta')}
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
                  {t('promotersLanding.heroTitle')}{' '}
                  <span style={{ color: 'var(--theme-primary)' }}>{t('promotersLanding.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl md:text-2xl leading-relaxed text-gray-600">
                  {t('promotersLanding.heroSubtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Button
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="text-white hover:opacity-90 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                  style={{ background: 'var(--theme-primary)' }}
                >
                  {t('promotersLanding.cta')}
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
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl animate-pulse" style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
              {t('promotersLanding.howItWorks')}
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
                  <Store className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{t('promotersLanding.step1Title')}</h3>
                <p className="text-sm text-gray-500">{t('promotersLanding.step1Desc')}</p>
              </div>

              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-success) 15%, transparent)' }}>
                  <Share2 className="w-8 h-8" style={{ color: 'var(--theme-success)' }} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{t('promotersLanding.step2Title')}</h3>
                <p className="text-sm text-gray-500">{t('promotersLanding.step2Desc')}</p>
              </div>

              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-warning) 15%, transparent)' }}>
                  <DollarSign className="w-8 h-8" style={{ color: 'var(--theme-warning)' }} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{t('promotersLanding.step3Title')}</h3>
                <p className="text-sm text-gray-500">{t('promotersLanding.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Calculator */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
              {t('promotersLanding.calculatorTitle')}
            </h2>

            <div className="rounded-3xl p-8 border border-gray-200 bg-white shadow-sm">
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block text-gray-600">
                  {t('promotersLanding.friendsReferred')}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={referrals}
                  onChange={(e) => setReferrals(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, var(--theme-primary) ${(referrals / 50) * 100}%, #e5e7eb ${(referrals / 50) * 100}%)` }}
                />
                <div className="flex justify-between text-xs mt-2 text-gray-500">
                  <span>1</span>
                  <span className="font-bold text-lg text-gray-900">{referrals}</span>
                  <span>50</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl p-6 bg-gray-50">
                <div>
                  <p className="text-sm text-gray-500">{t('promotersLanding.estimated')}</p>
                  <p className="text-xs text-gray-500">${earningsPerVisit} {t('promotersLanding.perVisit')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-4xl md:text-5xl font-bold text-gray-900">${estimatedEarnings}</span>
                  <DollarSign className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
                </div>
              </div>

              <p className="text-xs text-center mt-4 text-gray-500">
                {t('promotersLanding.calculatorDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
              {t('promotersLanding.trustTitle')}
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
                  <BadgeCheck className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <h3 className="font-bold text-lg mb-1 text-gray-900">{t('promotersLanding.trustVerified')}</h3>
                <p className="text-sm text-gray-500">{t('promotersLanding.trustVerifiedDesc')}</p>
              </div>

              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-success) 15%, transparent)' }}>
                  <QrCode className="w-8 h-8" style={{ color: 'var(--theme-success)' }} />
                </div>
                <h3 className="font-bold text-lg mb-1 text-gray-900">{t('promotersLanding.trustQR')}</h3>
                <p className="text-sm text-gray-500">{t('promotersLanding.trustQRDesc')}</p>
              </div>

              <div className="rounded-2xl p-8 border border-gray-200 bg-white text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--theme-warning) 15%, transparent)' }}>
                  <Wallet className="w-8 h-8" style={{ color: 'var(--theme-warning)' }} />
                </div>
                <h3 className="font-bold text-lg mb-1 text-gray-900">{t('promotersLanding.trustReal')}</h3>
                <p className="text-sm text-gray-500">{t('promotersLanding.trustRealDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <Button
              size="lg"
              onClick={() => setShowModal(true)}
              className="text-white hover:opacity-90 px-10 py-6 text-lg font-semibold rounded-xl shadow-lg"
              style={{ background: 'var(--theme-primary)' }}
            >
              {t('promotersLanding.ctaFinal')}
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
        type="referrer"
      />
    </div>
  )
}
