'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiPost } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { ShareAppModal } from '@/components/share-app-modal'
import { QRScanner } from '@/components/business/qr-scanner'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes, getQRColor } from '@/lib/theme/colors'
import { WelcomeBanner } from './shared/welcome-banner'
import { PromoLinkCard } from './shared/promo-link-card'

export function BusinessDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [qrCode, setQrCode] = useState<string>('')
  const [showShareModal, setShowShareModal] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://elivapp.com')

  useEffect(() => {
    generateQRCode()
  }, [theme])

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(appUrl, {
        width: 200,
        margin: 2,
        color: { dark: getQRColor(theme), light: '#ffffff' },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl)
    toast({ title: t('cards.linkCopied'), description: t('cards.linkCopiedDesc') })
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Eliv', url: appUrl })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }
  }

  const shareApp = () => setShowShareModal(true)

  const handleScanConvert = async (scanResult: { visitId: string; token: string }) => {
    const result = await apiPost<{ success: boolean; error?: string }>(
      `/api/visits/${scanResult.visitId}/convert`,
      { token: scanResult.token }
    )
    if (!result.ok) {
      throw new Error(result.error || 'Conversion failed')
    }
    toast({
      title: t('businessDashboard.conversionConfirmed'),
      description: t('businessDashboard.conversionConfirmedDesc'),
    })
  }

  return (
    <div>
      <WelcomeBanner
        userName={user?.name?.split(' ')[0] || ''}
        subtitle={t('dashboard.subtitleBusiness')}
      />

      {/* Desktop Content */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
          {/* Column 1: How It Works (Business) */}
          <div className="min-w-0">
            <div className="rounded-2xl p-5 shadow-xl h-full flex flex-col" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
              <h2 className="text-base font-bold text-theme-textPrimary mb-4">{t('dashboard.howItWorks')}</h2>
              <div className="flex-1 flex flex-col justify-evenly">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-theme-textPrimary/15 flex items-center justify-center flex-shrink-0 text-theme-textPrimary font-bold text-sm">1</div>
                  <div>
                    <p className="text-theme-textPrimary font-semibold text-sm">{t('dashboard.howStep1TitleBiz')}</p>
                    <p className="text-theme-textSecondary text-xs">{t('dashboard.howStep1DescBiz')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-theme-textPrimary/15 flex items-center justify-center flex-shrink-0 text-theme-textPrimary font-bold text-sm">2</div>
                  <div>
                    <p className="text-theme-textPrimary font-semibold text-sm">{t('dashboard.howStep2TitleBiz')}</p>
                    <p className="text-theme-textSecondary text-xs">{t('dashboard.howStep2DescBiz')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-theme-textPrimary/15 flex items-center justify-center flex-shrink-0 text-theme-textPrimary font-bold text-sm">3</div>
                  <div>
                    <p className="text-theme-textPrimary font-semibold text-sm">{t('dashboard.howStep3TitleBiz')}</p>
                    <p className="text-theme-textSecondary text-xs">{t('dashboard.howStep3DescBiz')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: My Referral Link */}
          <div className="min-w-0">
            <PromoLinkCard
              qrCode={qrCode}
              appUrl={appUrl}
              onCopyLink={copyLink}
              onShare={share}
              onShareApp={shareApp}
            />
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden">
        <div className="space-y-2">
          {/* How It Works (Business) */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <h2 className="text-sm font-bold text-theme-textPrimary mb-2">{t('dashboard.howItWorks')}</h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-theme-textPrimary/15 flex items-center justify-center flex-shrink-0 text-theme-textPrimary font-bold text-[10px]">1</div>
                <div>
                  <p className="text-theme-textPrimary font-semibold text-xs">{t('dashboard.howStep1TitleBiz')}</p>
                  <p className="text-theme-textSecondary text-[10px]">{t('dashboard.howStep1DescBiz')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-theme-textPrimary/15 flex items-center justify-center flex-shrink-0 text-theme-textPrimary font-bold text-[10px]">2</div>
                <div>
                  <p className="text-theme-textPrimary font-semibold text-xs">{t('dashboard.howStep2TitleBiz')}</p>
                  <p className="text-theme-textSecondary text-[10px]">{t('dashboard.howStep2DescBiz')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-theme-textPrimary/15 flex items-center justify-center flex-shrink-0 text-theme-textPrimary font-bold text-[10px]">3</div>
                <div>
                  <p className="text-theme-textPrimary font-semibold text-xs">{t('dashboard.howStep3TitleBiz')}</p>
                  <p className="text-theme-textSecondary text-[10px]">{t('dashboard.howStep3DescBiz')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* My Promo Link */}
          <PromoLinkCard
            qrCode={qrCode}
            appUrl={appUrl}
            onCopyLink={copyLink}
            onShare={share}
            onShareApp={shareApp}
          />
        </div>
      </div>

      {/* QR Scanner */}
      <div className="mt-4">
        <QRScanner onScanSuccess={handleScanConvert} />
      </div>

      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  )
}
