'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DollarSign, Store, Share2, CheckCircle2, QrCode, ArrowRight, X } from 'lucide-react'
import QRCode from 'qrcode'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'

export default function LandingPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [showQR, setShowQR] = useState(false)
  const [qrCode, setQrCode] = useState('')

  useEffect(() => {
    generateQRCode()
  }, [theme])

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL('https://smart-ai-referrals.vercel.app/', {
        width: 300,
        margin: 2,
        color: {
          dark: themes[theme].colors.primaryDark,
          light: '#ffffff',
        },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="px-6 py-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a
              onClick={() => setShowQR(true)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-theme-primary rounded-lg flex items-center justify-center p-2">
                <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-gray-900 font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-gray-900 font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </a>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-700 hover:bg-gray-100">
                  {t('auth.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section - Hook + Immediate CTAs */}
        <div className="min-h-[min(calc(100vh-5rem),56rem)] flex items-center">
          <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
            <div className="space-y-8 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                  {t('landing.heroTitle')} <span className="text-theme-primary">{t('landing.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                  {t('landing.heroSubtitle')}
                </p>
              </div>

              {/* Primary CTAs right in the hero */}
              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Link href="/promotores">
                  <Button
                    size="lg"
                    className="bg-theme-primary hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                  >
                    {t('landing.startEarningFree')}
                  </Button>
                </Link>
                <Link href="/negocios">
                  <Button
                    size="lg"
                    className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl w-full sm:w-auto"
                  >
                    {t('landing.listYourBusiness')}
                  </Button>
                </Link>
              </div>

              <p className="text-gray-500 text-sm">
                {t('landing.noCardRequired')}
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px]">
                <Image
                  src="/dashboard/assets/mobile-smart-ref.png"
                  alt="Smart AI Referrals App"
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

        {/* How It Works - Build Trust */}
        <div className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              {t('landing.howItWorksTitle')}
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-100 mx-auto mb-5">
                  <Share2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('landing.step1Title')}</h3>
                <p className="text-gray-500 text-sm">{t('landing.step1Desc')}</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-green-100 mx-auto mb-5">
                  <QrCode className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('landing.step2Title')}</h3>
                <p className="text-gray-500 text-sm">{t('landing.step2Desc')}</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-100 mx-auto mb-5">
                  <DollarSign className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('landing.step3Title')}</h3>
                <p className="text-gray-500 text-sm">{t('landing.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Choose Your Path - Detailed reinforcement */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {t('landing.choosePathTitle')}
              </h2>
              <p className="text-lg text-gray-600">
                {t('landing.choosePathSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Promoter Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-green-100 mb-6">
                  <DollarSign className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.promoterCardTitle')}</h3>
                <p className="text-gray-600 mb-6 flex-1">{t('landing.promoterCardDesc')}</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{t('landing.promoterBenefit1')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{t('landing.promoterBenefit2')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{t('landing.promoterBenefit3')}</span>
                  </li>
                </ul>
                <Link href="/promotores">
                  <Button
                    size="lg"
                    className="w-full bg-theme-primary hover:opacity-90 text-white py-6 text-lg font-semibold rounded-xl shadow-lg"
                  >
                    {t('landing.startEarningFree')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Business Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-100 mb-6">
                  <Store className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.businessCardTitle')}</h3>
                <p className="text-gray-600 mb-6 flex-1">{t('landing.businessCardDesc')}</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm">{t('landing.businessBenefit1')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm">{t('landing.businessBenefit2')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm">{t('landing.businessBenefit3')}</span>
                  </li>
                </ul>
                <Link href="/negocios">
                  <Button
                    size="lg"
                    className="w-full bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-6 text-lg font-semibold rounded-xl"
                  >
                    {t('landing.listYourBusiness')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* App Preview */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('landing.notJustWebsite')} <span className="text-theme-primary">{t('landing.notJustWebsiteHighlight')}</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t('landing.appDescription')}
              <br />
              {t('landing.appDescriptionLine2')}
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-theme-primary hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
              >
                {t('landing.previewDashboard')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Final CTA - Catch users who scrolled all the way */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.finalCtaTitle')}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {t('landing.finalCtaSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/promotores">
                <Button
                  size="lg"
                  className="bg-theme-primary hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                >
                  {t('landing.startEarningFree')}
                </Button>
              </Link>
              <Link href="/negocios">
                <Button
                  size="lg"
                  className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl w-full sm:w-auto"
                >
                  {t('landing.listYourBusiness')}
                </Button>
              </Link>
            </div>
          </div>
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

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-theme-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.shareTheApp')}</h3>
              <p className="text-sm text-gray-600">{t('landing.scanQR')}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-theme-primaryBorder mb-6">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-full h-auto" />
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-600 mb-1 text-center">{t('landing.orVisit')}</p>
              <p className="text-sm font-semibold text-theme-primary text-center break-all">
                smart-ai-referrals.vercel.app
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText('https://smart-ai-referrals.vercel.app/')
                }}
                className="flex-1 bg-theme-primary hover:opacity-90 text-white rounded-xl"
              >
                {t('landing.copyLink')}
              </Button>
              {navigator.share && (
                <Button
                  onClick={() => {
                    navigator.share({
                      title: 'Smart AI Referrals',
                      text: 'Turn your network into real income!',
                      url: 'https://smart-ai-referrals.vercel.app/',
                    })
                  }}
                  variant="outline"
                  className="flex-1 border-theme-primary text-theme-primary hover:bg-theme-primaryBg rounded-xl"
                >
                  {t('landing.share')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
