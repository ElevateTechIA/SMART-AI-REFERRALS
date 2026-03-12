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
    <div className="min-h-screen bg-white relative overflow-hidden">
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
              <LanguageSwitcher forceDark />
              <Link href="/negocios">
                <Button variant="ghost" className="text-gray-700 hover:bg-gray-100 hidden sm:inline-flex">
                  {t('businessLanding.cta')}
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-700 hover:bg-gray-100">
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
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                  {t('promotersLanding.heroTitle')}{' '}
                  <span className="text-theme-accent">{t('promotersLanding.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                  {t('promotersLanding.heroSubtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Button
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="bg-theme-primary hover:opacity-90 text-gray-900 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              {t('promotersLanding.howItWorks')}
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-blue-100">
                  <Store className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('promotersLanding.step1Title')}</h3>
                <p className="text-gray-500 text-sm">{t('promotersLanding.step1Desc')}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-green-100">
                  <Share2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('promotersLanding.step2Title')}</h3>
                <p className="text-gray-500 text-sm">{t('promotersLanding.step2Desc')}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-amber-100">
                  <DollarSign className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('promotersLanding.step3Title')}</h3>
                <p className="text-gray-500 text-sm">{t('promotersLanding.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Calculator */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-10">
              {t('promotersLanding.calculatorTitle')}
            </h2>

            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <div className="mb-6">
                <label className="text-gray-600 text-sm font-medium mb-3 block">
                  {t('promotersLanding.friendsReferred')}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={referrals}
                  onChange={(e) => setReferrals(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                  style={{ background: `linear-gradient(to right, var(--theme-primary) ${(referrals / 50) * 100}%, #e5e7eb ${(referrals / 50) * 100}%)` }}
                />
                <div className="flex justify-between text-gray-400 text-xs mt-2">
                  <span>1</span>
                  <span className="text-gray-900 font-bold text-lg">{referrals}</span>
                  <span>50</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-6">
                <div>
                  <p className="text-gray-500 text-sm">{t('promotersLanding.estimated')}</p>
                  <p className="text-gray-400 text-xs">${earningsPerVisit} {t('promotersLanding.perVisit')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-4xl md:text-5xl font-bold text-gray-900">${estimatedEarnings}</span>
                  <DollarSign className="w-8 h-8 text-theme-secondary" />
                </div>
              </div>

              <p className="text-gray-400 text-xs text-center mt-4">
                {t('promotersLanding.calculatorDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              {t('promotersLanding.trustTitle')}
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-blue-100">
                  <BadgeCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">{t('promotersLanding.trustVerified')}</h3>
                <p className="text-gray-500 text-sm">{t('promotersLanding.trustVerifiedDesc')}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-green-100">
                  <QrCode className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">{t('promotersLanding.trustQR')}</h3>
                <p className="text-gray-500 text-sm">{t('promotersLanding.trustQRDesc')}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-amber-100">
                  <Wallet className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">{t('promotersLanding.trustReal')}</h3>
                <p className="text-gray-500 text-sm">{t('promotersLanding.trustRealDesc')}</p>
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
              className="bg-theme-primary hover:opacity-90 text-gray-900 px-10 py-6 text-lg font-semibold rounded-xl shadow-lg"
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
