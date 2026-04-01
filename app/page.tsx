'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DollarSign, Store, Share2, CheckCircle2, QrCode, ArrowRight, X } from 'lucide-react'
import { ElivBrand } from '@/components/eliv-logo'
import QRCode from 'qrcode'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
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
      const qr = await QRCode.toDataURL(process.env.NEXT_PUBLIC_APP_URL || 'https://elivapp.com', {
        width: 300,
        margin: 2,
        color: {
          dark: themes[theme].colors.accent,
          light: '#ffffff',
        },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-gray-950">
      <div className="relative z-10">
        {/* Brand gradient bar */}
        <div className="eliv-gradient-bar h-1" />

        {/* Navigation */}
        <nav className="px-4 sm:px-6 py-3 sm:py-4 md:py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a
              onClick={() => setShowQR(true)}
              className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <ElivBrand responsive="sm/lg" forceDark />
            </a>

            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 text-sm md:text-base">
                  {t('auth.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section - Hook + Immediate CTAs */}
        <div className="flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 grid lg:grid-cols-2 gap-6 lg:gap-16 items-center w-full">
            <div className="space-y-6 md:space-y-8 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 md:mb-6 leading-tight text-gray-900 dark:text-white">
                  {t('landing.heroTitle')} <span className="text-theme-highlight">{t('landing.heroTitleHighlight')}</span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-gray-600 dark:text-gray-300">
                  {t('landing.heroSubtitle')}
                </p>
              </div>

              {/* Primary CTAs right in the hero */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center lg:items-start">
                <Link href="/promoters">
                  <Button
                    size="lg"
                    className="text-gray-900 hover:opacity-90 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                    style={{ background: 'var(--theme-primary)' }}
                  >
                    {t('landing.startEarningFree')}
                  </Button>
                </Link>
                <Link href="/businesses">
                  <Button
                    size="lg"
                    className="bg-white dark:bg-transparent border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl w-full sm:w-auto"
                  >
                    {t('landing.listYourBusiness')}
                  </Button>
                </Link>
              </div>

              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {t('landing.noCardRequired')}
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[200px] sm:max-w-[220px] lg:max-w-[260px]">
                <Image
                  src="/dashboard/assets/device.png"
                  alt="iPhone Frame"
                  width={956}
                  height={1936}
                  className="w-full h-auto relative z-0"
                />
                <Image
                  src="/dashboard/assets/referrals.png"
                  alt="Eliv App"
                  width={400}
                  height={800}
                  className="absolute top-[1.5%] left-[4.2%] w-[91.5%] h-[97%] object-fill rounded-[2rem] z-10"
                />
                <div className="absolute -top-2 md:-top-4 -right-2 md:-right-4 w-12 md:w-20 h-12 md:h-20 rounded-full blur-2xl animate-pulse z-0" style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}></div>
                <div className="absolute -bottom-2 md:-bottom-4 -left-2 md:-left-4 w-16 md:w-32 h-16 md:h-32 rounded-full blur-2xl animate-pulse delay-1000 z-0" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works - Build Trust */}
        <div className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-gray-900 dark:text-white">
              {t('landing.howItWorksTitle')}
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="text-center">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 bg-theme-highlight-subtle">
                  <Share2 className="w-6 md:w-8 h-6 md:h-8 text-theme-highlight" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-2 text-gray-900 dark:text-white">{t('landing.step1Title')}</h3>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">{t('landing.step1Desc')}</p>
              </div>

              <div className="text-center">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 bg-theme-highlight-subtle">
                  <QrCode className="w-6 md:w-8 h-6 md:h-8 text-theme-highlight" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-2 text-gray-900 dark:text-white">{t('landing.step2Title')}</h3>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">{t('landing.step2Desc')}</p>
              </div>

              <div className="text-center sm:col-span-2 lg:col-span-1">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 bg-theme-highlight-subtle">
                  <DollarSign className="w-6 md:w-8 h-6 md:h-8 text-theme-highlight" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-2 text-gray-900 dark:text-white">{t('landing.step3Title')}</h3>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">{t('landing.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Choose Your Path - Detailed reinforcement */}
        <div className="eliv-gradient-bar h-0.5 opacity-40" />
        <div className="py-12 md:py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
                {t('landing.choosePathTitle')}
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">
                {t('landing.choosePathSubtitle')}
              </p>
            </div>

            <div className="grid gap-6 md:gap-8">
              {/* Promoter Card */}
              <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 dark:backdrop-blur-sm shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all flex flex-col">
                <div className="eliv-gradient-bar h-1" />
                <div className="p-6 md:p-8 flex flex-col flex-1">
                <div className="w-12 md:w-14 h-12 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-6 bg-theme-highlight-subtle">
                  <DollarSign className="w-6 md:w-7 h-6 md:h-7 text-theme-highlight" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('landing.promoterCardTitle')}</h3>
                <p className="mb-4 md:mb-6 flex-1 text-sm md:text-base text-gray-600 dark:text-gray-300">{t('landing.promoterCardDesc')}</p>
                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0 text-theme-highlight" />
                    <span className="text-sm md:text-base">{t('landing.promoterBenefit1')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0 text-theme-highlight" />
                    <span className="text-sm md:text-base">{t('landing.promoterBenefit2')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0 text-theme-highlight" />
                    <span className="text-sm md:text-base">{t('landing.promoterBenefit3')}</span>
                  </li>
                </ul>
                <Link href="/promoters">
                  <Button
                    size="lg"
                    className="w-full text-gray-900 hover:opacity-90 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl shadow-lg"
                    style={{ background: 'var(--theme-primary)' }}
                  >
                    {t('landing.startEarningFree')}
                    <ArrowRight className="w-4 md:w-5 h-4 md:h-5 ml-2" />
                  </Button>
                </Link>
                </div>
              </div>

              {/* Business Card */}
              <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 dark:backdrop-blur-sm shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all flex flex-col">
                <div className="h-1" style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }} />
                <div className="p-6 md:p-8 flex flex-col flex-1">
                <div className="w-12 md:w-14 h-12 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-6 bg-theme-highlight-subtle">
                  <Store className="w-6 md:w-7 h-6 md:h-7 text-theme-highlight" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('landing.businessCardTitle')}</h3>
                <p className="mb-4 md:mb-6 flex-1 text-sm md:text-base text-gray-600 dark:text-gray-300">{t('landing.businessCardDesc')}</p>
                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0 text-theme-highlight" />
                    <span className="text-sm md:text-base">{t('landing.businessBenefit1')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0 text-theme-highlight" />
                    <span className="text-sm md:text-base">{t('landing.businessBenefit2')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0 text-theme-highlight" />
                    <span className="text-sm md:text-base">{t('landing.businessBenefit3')}</span>
                  </li>
                </ul>
                <Link href="/businesses">
                  <Button
                    size="lg"
                    className="w-full bg-white dark:bg-transparent border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl"
                  >
                    {t('landing.listYourBusiness')}
                    <ArrowRight className="w-4 md:w-5 h-4 md:h-5 ml-2" />
                  </Button>
                </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* App Preview */}
        <div className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('landing.notJustWebsite')} <span className="text-theme-highlight">{t('landing.notJustWebsiteHighlight')}</span>
            </h2>
            <p className="text-base md:text-xl mb-6 md:mb-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t('landing.appDescription')}
              <br className="hidden sm:block" />
              {t('landing.appDescriptionLine2')}
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="text-gray-900 hover:opacity-90 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl shadow-lg"
                style={{ background: 'var(--theme-primary)' }}
              >
                {t('landing.previewDashboard')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Final CTA - Catch users who scrolled all the way */}
        <div className="eliv-gradient-bar h-0.5 opacity-40" />
        <div className="py-12 md:py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('landing.finalCtaTitle')}
            </h2>
            <p className="text-base md:text-lg mb-6 md:mb-8 text-gray-600 dark:text-gray-300">
              {t('landing.finalCtaSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link href="/promoters">
                <Button
                  size="lg"
                  className="text-gray-900 hover:opacity-90 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                  style={{ background: 'var(--theme-primary)' }}
                >
                  {t('landing.startEarningFree')}
                </Button>
              </Link>
              <Link href="/businesses">
                <Button
                  size="lg"
                  className="bg-white dark:bg-transparent border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl w-full sm:w-auto"
                >
                  {t('landing.listYourBusiness')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="eliv-gradient-bar h-0.5 opacity-40" />
        <footer className="py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm md:text-base text-gray-400 dark:text-gray-500">
              {t('landing.allRightsReserved')}
            </p>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 underline mt-1 inline-block">
              {t('auth.termsOfService')}
            </Link>
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
            className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 md:top-4 right-2 md:right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 md:h-5 w-4 md:w-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="text-center mb-4 md:mb-6">
              <div className="w-12 md:w-16 h-12 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4" style={{ background: 'var(--theme-primary)' }}>
                <Share2 className="h-6 md:h-8 w-6 md:w-8 text-white" />
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('landing.shareTheApp')}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">{t('landing.scanQR')}</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 md:p-4 border-2 border-gray-200 dark:border-gray-600 mb-4 md:mb-6">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-full h-auto" />
              )}
            </div>

            <div className="rounded-xl p-3 md:p-4 mb-3 md:mb-4 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs md:text-sm mb-1 text-center text-gray-600 dark:text-gray-300">{t('landing.orVisit')}</p>
              <p className="text-sm md:text-base font-semibold text-center break-all text-theme-highlight">
                elivapp.com
              </p>
            </div>

            <div className="flex gap-2 md:gap-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(process.env.NEXT_PUBLIC_APP_URL || 'https://elivapp.com')
                }}
                className="flex-1 text-gray-900 hover:opacity-90 rounded-xl text-sm md:text-base"
                style={{ background: 'var(--theme-primary)' }}
              >
                {t('landing.copyLink')}
              </Button>
              {navigator.share && (
                <Button
                  onClick={() => {
                    navigator.share({
                      title: 'Eliv',
                      text: 'Turn your network into real income!',
                      url: process.env.NEXT_PUBLIC_APP_URL || 'https://elivapp.com',
                    })
                  }}
                  variant="outline"
                  className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm md:text-base"
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
