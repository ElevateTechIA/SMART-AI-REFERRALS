'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'
import { ChevronRight, Building2, Loader2, Share2 } from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'
import QRCode from 'qrcode'
import { ShareAppModal } from '@/components/share-app-modal'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'
import { WelcomeBanner } from './shared/welcome-banner'
import { PromoLinkCard } from './shared/promo-link-card'

interface BusinessWithOffer {
  id: string
  name: string
  category: string
  description?: string
  address: string
  phone: string
  website?: string
  images: string[]
  status: string
  offer?: {
    id: string
    image: string | null
    referrerCommissionAmount: number
    consumerRewardType: string
    consumerRewardValue: number
    active: boolean
  }
}

interface ReferralsResponse {
  businesses: BusinessWithOffer[]
  referrals: Array<{
    id: string
    businessId: string
    consumerUserId: string
    referrerUserId: string
    status: string
    createdAt: string | null
  }>
  earnings: Array<{
    id: string
    userId: string
    businessId: string
    visitId: string
    type: string
    amount: number
    status: string
    createdAt: string | null
  }>
  referrerStatus: string | null
}

interface EarningsResponse {
  success: boolean
  stats: {
    totalEarnings: number
    pendingEarnings: number
    completedEarnings: number
    thisMonth: number
  }
  transactions: Array<{
    id: string
    date: string
    business: string
    customer: string
    amount: number
    status: string
    type: string
  }>
}

export function PromoterDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessWithOffer[]>([])
  const [earningsStats, setEarningsStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    thisMonth: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<EarningsResponse['transactions']>([])
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  const chartData = recentTransactions.slice(0, 4).map((tx) => ({
    date: new Date(tx.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    amount: tx.amount,
  }))

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
      const [referralsResult, earningsResult] = await Promise.all([
        apiGet<ReferralsResponse>('/api/referrals'),
        apiGet<EarningsResponse>('/api/earnings'),
      ])
      if (referralsResult.ok && referralsResult.data) {
        setBusinesses(referralsResult.data.businesses || [])
      }
      if (earningsResult.ok && earningsResult.data) {
        setEarningsStats(earningsResult.data.stats)
        setRecentTransactions(earningsResult.data.transactions || [])
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

  const renderBusinessCard = (biz: BusinessWithOffer) => {
    const img = biz.offer?.image || biz.images?.[0]
    const commission = biz.offer?.referrerCommissionAmount || 0

    return (
      <div
        key={biz.id}
        className="relative overflow-hidden rounded-xl h-[120px]"
        style={img ? {
          backgroundImage: `url(${img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {!img && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <Building2 className="h-16 w-16 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative h-full p-4 flex flex-col justify-end">
          <h3 className="text-white font-bold text-sm mb-1 leading-tight">{biz.name}</h3>
          {commission > 0 && (
            <p className="text-white/95 text-xs mb-2">
              {formatCurrency(commission)} {t('dashboard.perCustomer', 'per customer')}
            </p>
          )}
          <Button
            size="sm"
            className="w-auto h-8 px-4 bg-theme-primaryLight hover:opacity-90 rounded-lg text-xs font-semibold"
            onClick={() => router.push(`/dashboard/referrals?offer=${biz.id}`)}
          >
            {t('dashboard.viewOffer')}
          </Button>
        </div>
      </div>
    )
  }

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
        subtitle={t('dashboard.subtitlePromoter')}
      />

      {/* Desktop Content */}
      <div className="hidden md:block">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr] gap-4 min-w-0">
            {/* Column 1: How It Works */}
            <div className="min-w-0">
              <div className="rounded-2xl p-5 shadow-xl h-full flex flex-col" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
                <h2 className="text-base font-bold text-white mb-4">{t('dashboard.howItWorks')}</h2>
                <div className="flex-1 flex flex-col justify-evenly">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t('dashboard.howStep1Title')}</p>
                      <p className="text-white/70 text-xs">{t('dashboard.howStep1Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t('dashboard.howStep2Title')}</p>
                      <p className="text-white/70 text-xs">{t('dashboard.howStep2Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t('dashboard.howStep3Title')}</p>
                      <p className="text-white/70 text-xs">{t('dashboard.howStep3Desc')}</p>
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

            {/* Column 3: Top Partners */}
            <div className="space-y-6 min-w-0">
              <div className="rounded-2xl p-5 shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white">{t('dashboard.topPartnersWeek', { count: Math.min(businesses.length, 5) })}</h2>
                  <Link href="/dashboard/referrals" className="text-white/60 hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {businesses.length > 0 ? (
                  <div className="space-y-3">
                    {businesses.slice(0, 5).map((biz) => {
                      const img = biz.offer?.image || biz.images?.[0]
                      const commission = biz.offer?.referrerCommissionAmount || 0
                      return (
                        <div
                          key={biz.id}
                          className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 hover:bg-white/15 transition-colors"
                        >
                          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                            {img ? (
                              <img src={img} alt={biz.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-white/40" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm truncate">{biz.name}</h3>
                            <p className="text-white/60 text-xs truncate">{biz.category}</p>
                            {commission > 0 && (
                              <p className="text-theme-primaryLight text-xs font-medium mt-0.5 truncate">
                                {formatCurrency(commission)} {t('dashboard.perCustomer', 'per customer')}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="bg-theme-primaryLight hover:opacity-90 rounded-lg text-xs font-semibold h-8 px-2 lg:px-3 flex-shrink-0"
                            onClick={() => router.push(`/dashboard/referrals?offer=${biz.id}`)}
                          >
                            <ChevronRight className="h-3 w-3 lg:mr-1" />
                            <span className="hidden lg:inline">{t('dashboard.viewOffer')}</span>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-10 w-10 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60 text-sm">{t('dashboard.noBusinesses', 'No businesses available yet')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Your Earnings */}
          <div className="bg-card backdrop-blur-sm rounded-2xl p-5 shadow-xl">
            <div className="mb-3">
              <h2 className="text-base font-bold text-foreground mb-1">{t('dashboard.yourEarnings')}:</h2>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(earningsStats.thisMonth)}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('dashboard.thisMonth')}</p>

            {chartData.length > 1 && (
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Bar dataKey="amount" fill="url(#earningsGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--theme-primaryLight)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">{t('dashboard.commissionBreakdown')}</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-theme-primary" />
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(earningsStats.completedEarnings)}</span>
                  <span className="text-xs text-muted-foreground">{t('dashboard.referrals')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-theme-primaryLight" />
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(earningsStats.pendingEarnings)}</span>
                  <span className="text-xs text-muted-foreground">{t('earnings.pending', 'Pending')}</span>
                </div>
              </div>
            </div>
            <Link href="/dashboard/visits">
              <Button size="sm" className="w-full mt-4 bg-theme-primary hover:opacity-90 rounded-lg h-10 text-sm font-semibold">
                {t('dashboard.earningsSummary')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden">
        <div className="space-y-2">
          {/* How It Works */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <h2 className="text-sm font-bold text-white mb-2">{t('dashboard.howItWorks')}</h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">1</div>
                <div>
                  <p className="text-white font-semibold text-xs">{t('dashboard.howStep1Title')}</p>
                  <p className="text-white/70 text-[10px]">{t('dashboard.howStep1Desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">2</div>
                <div>
                  <p className="text-white font-semibold text-xs">{t('dashboard.howStep2Title')}</p>
                  <p className="text-white/70 text-[10px]">{t('dashboard.howStep2Desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">3</div>
                <div>
                  <p className="text-white font-semibold text-xs">{t('dashboard.howStep3Title')}</p>
                  <p className="text-white/70 text-[10px]">{t('dashboard.howStep3Desc')}</p>
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

          {/* Top Partners This Week */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">{t('dashboard.topPartnersWeek', { count: Math.min(businesses.length, 5) })}</h2>
              <Link
                href="/dashboard/referrals"
                className="text-[10px] text-white/90 hover:text-white flex items-center gap-0.5"
              >
                {t('dashboard.viewAll', 'View All')} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {businesses.length > 0 ? (
                businesses.slice(0, 5).map((biz) => renderBusinessCard(biz))
              ) : (
                <div className="flex items-center justify-center bg-white/5 rounded-lg p-4">
                  <div className="text-center">
                    <Building2 className="h-8 w-8 text-white/30 mx-auto mb-2" />
                    <p className="text-white/50 text-[10px]">{t('dashboard.noBusinesses', 'No businesses yet')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Earnings */}
          <div className="bg-card backdrop-blur-sm rounded-xl p-2.5 shadow-lg">
            <div className="mb-2">
              <h2 className="text-sm font-bold text-foreground mb-0.5">{t('dashboard.yourEarnings')}:</h2>
              <p className="text-xl font-bold text-foreground">{formatCurrency(earningsStats.thisMonth)}</p>
              <p className="text-[10px] text-muted-foreground">{t('dashboard.thisMonth')}</p>
            </div>

            {chartData.length > 1 && (
              <div className="h-24 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 8 }} />
                    <Bar dataKey="amount" fill="url(#earningsGradientMobile)" radius={[3, 3, 0, 0]} />
                    <defs>
                      <linearGradient id="earningsGradientMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--theme-primaryLight)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-semibold text-foreground mb-1.5">{t('dashboard.commissionBreakdown')}</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-theme-primary" />
                  <span className="text-[10px] font-medium text-foreground">{formatCurrency(earningsStats.completedEarnings)}</span>
                  <span className="text-[10px] text-muted-foreground">{t('dashboard.referrals')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-theme-primaryLight" />
                  <span className="text-[10px] font-medium text-foreground">{formatCurrency(earningsStats.pendingEarnings)}</span>
                  <span className="text-[10px] text-muted-foreground">{t('earnings.pending', 'Pending')}</span>
                </div>
              </div>
            </div>

            <Link href="/dashboard/visits">
              <Button size="sm" className="w-full mt-3 bg-theme-primary hover:opacity-90 rounded-lg h-8 text-[11px] font-semibold">
                {t('dashboard.earningsSummary')}
              </Button>
            </Link>
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
