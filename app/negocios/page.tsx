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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="px-6 py-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ElivBrand responsive="md/lg" />
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/promotores">
                <Button variant="ghost" className="text-gray-700 hover:bg-gray-100 hidden sm:inline-flex">
                  {t('promotersLanding.cta')}
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
                  {t('businessLanding.heroTitle')}{' '}
                  <span className="text-green-600">{t('businessLanding.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                  {t('businessLanding.heroSubtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Button
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
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
              {t('businessLanding.howItWorks')}
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-blue-100">
                  <Tag className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('businessLanding.step1Title')}</h3>
                <p className="text-gray-500 text-sm">{t('businessLanding.step1Desc')}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-green-100">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('businessLanding.step2Title')}</h3>
                <p className="text-gray-500 text-sm">{t('businessLanding.step2Desc')}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-purple-100">
                  <QrCode className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('businessLanding.step3Title')}</h3>
                <p className="text-gray-500 text-sm">{t('businessLanding.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Why Better Than Traditional Advertising */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              {t('businessLanding.whyBetterTitle')}
            </h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-gray-700 font-medium">{t('businessLanding.benefit1')}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-gray-700 font-medium">{t('businessLanding.benefit2')}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-100">
                  <Heart className="w-5 h-5 text-rose-600" />
                </div>
                <p className="text-gray-700 font-medium">{t('businessLanding.benefit3')}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-gray-700 font-medium">{t('businessLanding.benefit4')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-100">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('businessLanding.dashboardTitle')}
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
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
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-lg"
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
