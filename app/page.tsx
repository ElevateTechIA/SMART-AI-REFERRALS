'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Users, Shield, X, Share2, MessageCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { LanguageSwitcher } from '@/components/language-switcher'
import { RegisterShareModal } from '@/components/register-share-modal'
import { RegistrationChatbot } from '@/components/chatbot/RegistrationChatbot'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'

export default function LandingPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [showQR, setShowQR] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [showReferrerModal, setShowReferrerModal] = useState(false)
  const [showBusinessModal, setShowBusinessModal] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)

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
        <div className="absolute inset-0 auth-overlay"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                <svg className="w-full h-full text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-white font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </button>

            {/* Language Switcher & Sign In Button */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-white hover:bg-white/20">
                  {t('auth.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Column - Text Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                  {t('landing.heroTitle')} <span className="text-theme-primaryLight">{t('landing.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
                  {t('landing.heroSubtitle')}
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Button
                  size="lg"
                  onClick={() => setShowReferrerModal(true)}
                  className="bg-theme-primary hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl w-full sm:w-auto"
                >
                  {t('landing.startEarningFree')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowBusinessModal(true)}
                  className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 px-8 py-6 text-lg font-semibold rounded-xl w-full sm:w-auto"
                >
                  {t('landing.listYourBusiness')}
                </Button>
              </div>

              <p className="text-white/80 text-sm">
                {t('landing.noCardRequired')}
              </p>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                {/* Phone Image */}
                <Image
                  src="/dashboard/assets/mobile-smart-ref.png"
                  alt="Smart AI Referrals App"
                  width={400}
                  height={800}
                  className="w-full h-auto rounded-[2.5rem] shadow-2xl"
                />

                {/* Floating Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl animate-pulse" style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges Section */}
        <div className="pb-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {t('landing.trustedBy')} <span className="text-theme-primaryLight">{t('landing.trustedByHighlight')}</span>
              </h2>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Pay per real customer */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}>
                    <CheckCircle2 className="w-6 h-6 text-theme-primaryLight" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t('landing.payPerCustomer')}</h3>
                    <h3 className="text-white font-bold text-lg">{t('landing.payPerCustomerLine2')}</h3>
                  </div>
                </div>
              </div>

              {/* AI-verified visits */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)' }}>
                    <Users className="w-6 h-6 text-theme-accent" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t('landing.aiVerifiedVisits')}</h3>
                    <p className="text-white/70 text-sm">{t('landing.aiVerifiedSubtext')}</p>
                  </div>
                </div>
              </div>

              {/* Secure payouts */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-secondaryLight) 20%, transparent)' }}>
                    <Shield className="w-6 h-6 text-theme-secondaryLight" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t('landing.securePayouts')}</h3>
                    <p className="text-white/70 text-sm">{t('landing.securePayoutsSubtext')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* App Section */}
        <div className="py-16 bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {t('landing.notJustWebsite')} <span className="text-theme-primaryLight">{t('landing.notJustWebsiteHighlight')}</span>
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {t('landing.appDescription')}
              <br />
              {t('landing.appDescriptionLine2')}
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-theme-primary hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl"
              >
                {t('landing.previewDashboard')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Built For Everyone Section */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-white/20">
              <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-4 md:mb-6">
                {t('landing.builtForEveryone')}
              </h2>
              <p className="text-lg md:text-xl text-white/90 text-center mb-8 md:mb-12">
                {t('landing.builtDescription')}
              </p>

              {/* Earnings Preview */}
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                {/* Image - Show first on mobile */}
                <div className="flex justify-center order-1 md:order-2">
                  <div className="relative w-full max-w-[280px] md:max-w-xs">
                    <Image
                      src="/dashboard/assets/mobile-smart-ref.png"
                      alt="App Preview"
                      width={300}
                      height={600}
                      className="w-full h-auto rounded-[2rem] shadow-2xl"
                    />
                  </div>
                </div>

                {/* Earnings Card - Show second on mobile */}
                <div className="backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20 order-2 md:order-1" style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--theme-primary) 40%, transparent), color-mix(in srgb, var(--theme-accent) 40%, transparent))' }}>
                  <div className="mb-4 md:mb-6">
                    <p className="text-white/80 text-base md:text-lg mb-2">{t('landing.passiveIncome')}</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl md:text-5xl font-bold text-white">$350</span>
                    </div>
                    <p className="text-white/70 text-sm md:text-base">44 {t('landing.verifiedVisits')}</p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-theme-primary hover:opacity-90 text-white font-semibold rounded-xl text-sm md:text-base"
                  >
                    {t('landing.seeHowMuch')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-white/60">
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
            {/* Close Button */}
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-theme-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing.shareTheApp')}</h3>
              <p className="text-sm text-gray-600">{t('landing.scanQR')}</p>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl p-4 border-2 border-theme-primaryBorder mb-6">
              {qrCode && (
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-full h-auto"
                />
              )}
            </div>

            {/* URL */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-600 mb-1 text-center">{t('landing.orVisit')}</p>
              <p className="text-sm font-semibold text-theme-primary text-center break-all">
                smart-ai-referrals.vercel.app
              </p>
            </div>

            {/* Action Buttons */}
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

      {/* Register Share Modals */}
      <RegisterShareModal
        isOpen={showReferrerModal}
        onClose={() => setShowReferrerModal(false)}
        type="referrer"
      />
      <RegisterShareModal
        isOpen={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        type="business"
      />

      {/* Registration Chatbot */}
      {showChatbot ? (
        <RegistrationChatbot
          language={t('app.name') === 'Smart AI Referrals' ? 'en' : 'es'}
          onClose={() => setShowChatbot(false)}
          onComplete={() => setShowChatbot(false)}
        />
      ) : (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-all hover:scale-105 z-50 group"
          aria-label={t('landing.chatWithUs')}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {t('landing.chatWithUs')}
          </span>
        </button>
      )}
    </div>
  )
}
