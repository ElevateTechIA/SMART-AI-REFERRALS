'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import { Loader2, Users } from 'lucide-react'
import QRCode from 'qrcode'
import { ShareAppModal } from '@/components/share-app-modal'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'
import { WelcomeBanner } from './shared/welcome-banner'
import { PromoLinkCard } from './shared/promo-link-card'

interface Promoter {
  id: string
  name: string
  photoURL: string | null
  createdAt: string | null
}

export function BusinessDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [promoters, setPromoters] = useState<Promoter[]>([])
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  const appUrl = 'https://smart-ai-referrals.vercel.app/'

  useEffect(() => {
    if (user) fetchDashboardData()
  }, [user])

  useEffect(() => {
    generateQRCode()
  }, [theme])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const result = await apiGet<{ promoters: Promoter[] }>('/api/promoters')
      if (result.ok && result.data) {
        setPromoters(result.data.promoters || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(appUrl, {
        width: 200,
        margin: 2,
        color: { dark: themes[theme].colors.primaryDark, light: '#ffffff' },
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
        await navigator.share({ title: 'Smart AI Referrals', url: appUrl })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }
  }

  const shareApp = () => setShowShareModal(true)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <WelcomeBanner
        userName={user?.name?.split(' ')[0] || ''}
        subtitle={t('dashboard.subtitleBusiness')}
      />

      {/* Desktop Content */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr] gap-4 min-w-0">
          {/* Column 1: How It Works (Business) */}
          <div className="min-w-0">
            <div className="rounded-2xl p-5 shadow-xl h-full flex flex-col" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
              <h2 className="text-base font-bold text-white mb-4">{t('dashboard.howItWorks')}</h2>
              <div className="flex-1 flex flex-col justify-evenly">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t('dashboard.howStep1TitleBiz')}</p>
                    <p className="text-white/70 text-xs">{t('dashboard.howStep1DescBiz')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t('dashboard.howStep2TitleBiz')}</p>
                    <p className="text-white/70 text-xs">{t('dashboard.howStep2DescBiz')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t('dashboard.howStep3TitleBiz')}</p>
                    <p className="text-white/70 text-xs">{t('dashboard.howStep3DescBiz')}</p>
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

          {/* Column 3: Latest Promoters */}
          <div className="min-w-0">
            <div className="rounded-2xl p-5 shadow-xl overflow-hidden h-full flex flex-col" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
              <h2 className="text-base font-bold text-white mb-4">{t('dashboard.latestPromoters')}</h2>

              {promoters.length > 0 ? (
                <div className="flex-1 flex flex-col justify-evenly">
                  {promoters.map((promoter) => (
                    <div
                      key={promoter.id}
                      className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
                        {promoter.photoURL ? (
                          <img src={promoter.photoURL} alt={promoter.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">{promoter.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">{promoter.name}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Users className="h-10 w-10 text-white/40 mb-3" />
                  <p className="text-white/60 text-sm">{t('admin.noPromoters')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden">
        <div className="space-y-2">
          {/* How It Works (Business) */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <h2 className="text-sm font-bold text-white mb-2">{t('dashboard.howItWorks')}</h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">1</div>
                <div>
                  <p className="text-white font-semibold text-xs">{t('dashboard.howStep1TitleBiz')}</p>
                  <p className="text-white/70 text-[10px]">{t('dashboard.howStep1DescBiz')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">2</div>
                <div>
                  <p className="text-white font-semibold text-xs">{t('dashboard.howStep2TitleBiz')}</p>
                  <p className="text-white/70 text-[10px]">{t('dashboard.howStep2DescBiz')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">3</div>
                <div>
                  <p className="text-white font-semibold text-xs">{t('dashboard.howStep3TitleBiz')}</p>
                  <p className="text-white/70 text-[10px]">{t('dashboard.howStep3DescBiz')}</p>
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

          {/* Latest Promoters */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <h2 className="text-sm font-bold text-white mb-2">{t('dashboard.latestPromoters')}</h2>
            {promoters.length > 0 ? (
              <div className="space-y-1.5">
                {promoters.map((promoter) => (
                  <div
                    key={promoter.id}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
                      {promoter.photoURL ? (
                        <img src={promoter.photoURL} alt={promoter.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-[10px]">{promoter.name?.charAt(0)?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-xs truncate">{promoter.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <Users className="h-8 w-8 text-white/40 mb-2" />
                <p className="text-white/50 text-[10px]">{t('admin.noPromoters')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  )
}
