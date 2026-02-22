'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, generateReferralUrl } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'
import {
  DollarSign,
  Users,
  Copy,
  Share2,
  ChevronRight,
  QrCode as QrCodeIcon,
  Building2,
  Loader2,
  Settings,
  LogOut,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'
import QRCode from 'qrcode'
import { ShareAppModal } from '@/components/share-app-modal'

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

interface Referral {
  id: string
  businessId: string
  consumerUserId: string
  referrerUserId: string
  status: string
  createdAt: string | null
}

interface Earning {
  id: string
  userId: string
  businessId: string
  visitId: string
  type: string
  amount: number
  status: string
  createdAt: string | null
}

interface ReferralsResponse {
  businesses: BusinessWithOffer[]
  referrals: Referral[]
  earnings: Earning[]
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

export default function EnhancedDashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [businesses, setBusinesses] = useState<BusinessWithOffer[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [earningsStats, setEarningsStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    thisMonth: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<EarningsResponse['transactions']>([])
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)

  // Build chart data from real transactions
  const chartData = recentTransactions.slice(0, 4).map((tx) => ({
    date: new Date(tx.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    amount: tx.amount,
  }))

  // First business for QR code link (or app URL fallback)
  const firstBusiness = businesses[0]
  const referralUrl = firstBusiness && user
    ? generateReferralUrl(firstBusiness.id, user.id)
    : typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  useEffect(() => {
    if (referralUrl) {
      generateQRCode()
    }
  }, [referralUrl])

  useEffect(() => {
    const controlHeaderVisibility = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false)
      } else {
        setShowHeader(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlHeaderVisibility)
    return () => window.removeEventListener('scroll', controlHeaderVisibility)
  }, [lastScrollY])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch referrals data (businesses, referrals, earnings)
      const [referralsResult, earningsResult] = await Promise.all([
        apiGet<ReferralsResponse>('/api/referrals'),
        apiGet<EarningsResponse>('/api/earnings'),
      ])

      if (referralsResult.ok && referralsResult.data) {
        setBusinesses(referralsResult.data.businesses || [])
        setReferrals(referralsResult.data.referrals || [])
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
    if (!referralUrl) return
    try {
      const qr = await QRCode.toDataURL(referralUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#1D4ED8', light: '#ffffff' },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const copyLink = () => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    toast({ title: t('cards.linkCopied'), description: t('cards.linkCopiedDesc') })
  }

  const share = () => {
    if (navigator.share && referralUrl) {
      navigator.share({ title: 'Smart AI Referrals', url: referralUrl })
    }
  }

  const shareApp = () => {
    setShowShareModal(true)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Computed values
  const totalReferrals = referrals.length
  const convertedReferrals = referrals.filter((r) => r.status === 'CONVERTED')
  const thisMonthReferrals = referrals.filter((r) => {
    if (!r.createdAt) return false
    const d = new Date(r.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const renderBusinessCard = (biz: BusinessWithOffer, size: 'sm' | 'lg') => {
    const img = biz.offer?.image || biz.images?.[0]
    const commission = biz.offer?.referrerCommissionAmount || 0
    const url = user ? generateReferralUrl(biz.id, user.id) : ''
    const h = size === 'lg' ? 'h-52' : 'h-[120px]'
    const textSize = size === 'lg' ? 'text-base' : 'text-sm'
    const subSize = size === 'lg' ? 'text-xs mb-3' : 'text-xs mb-2'
    const btnSize = size === 'lg' ? 'w-full h-9' : 'w-auto h-8 px-4'

    return (
      <div
        key={biz.id}
        className={`relative overflow-hidden rounded-xl ${h}`}
        style={img ? {
          backgroundImage: `url(${img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {!img && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center opacity-30">
            <Building2 className="h-16 w-16 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative h-full p-4 flex flex-col justify-end">
          <h3 className={`text-white font-bold ${textSize} mb-1 leading-tight`}>{biz.name}</h3>
          {commission > 0 && (
            <p className={`text-white/95 ${subSize}`}>
              {formatCurrency(commission)} {t('dashboard.perCustomer', 'per customer')}
            </p>
          )}
          <Button
            size="sm"
            className={`${btnSize} bg-blue-400 hover:bg-blue-500 rounded-lg text-xs font-semibold`}
            onClick={() => {
              navigator.clipboard.writeText(url)
              toast({ title: t('cards.linkCopied') })
            }}
          >
            {t('dashboard.copyLink')}
          </Button>
        </div>
      </div>
    )
  }

  const renderDesktopContent = () => (
    <div className="space-y-6">
      {/* Top Row: Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card backdrop-blur-sm rounded-xl p-5 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{t('dashboard.totalEarnings')}:</p>
          <p className="text-3xl font-bold text-foreground mb-3">
            {formatCurrency(earningsStats.totalEarnings)}
          </p>
          <Link href="/dashboard/earnings">
            <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-10 text-sm">
              {t('dashboard.viewEarnings', 'View Earnings')}
            </Button>
          </Link>
        </div>

        <div className="bg-card backdrop-blur-sm rounded-xl p-5 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{t('dashboard.newCustomers')}:</p>
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-3xl font-bold text-foreground">
              {thisMonthReferrals.length}
            </p>
            <p className="text-xs text-muted-foreground">{t('dashboard.thisMonth')}</p>
          </div>
          {chartData.length > 0 && (
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Bar dataKey="amount" fill="url(#miniGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--theme-primaryLight)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card backdrop-blur-sm rounded-xl p-5 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{t('dashboard.pendingPayouts')}:</p>
          <p className="text-3xl font-bold text-foreground mb-3">
            {formatCurrency(earningsStats.pendingEarnings)}
          </p>
          <Link href="/dashboard/earnings">
            <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-10 text-sm">
              {t('dashboard.review')} &gt;
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: responsive columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1fr] gap-4 min-w-0">
        {/* Column 1: My Referral Link & Your Earnings */}
        <div className="space-y-6 min-w-0">
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{t('dashboard.myReferralLink')}</h2>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </div>
            <div className="bg-card rounded-xl p-4 flex flex-col items-center overflow-hidden">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-40 h-40 mb-3" />
              )}
              <p className="text-xs text-muted-foreground text-center mb-3 truncate w-full break-all">
                {referralUrl ? referralUrl.replace('https://', '').replace('http://', '') : '...'}
              </p>
              <Button onClick={copyLink} className="w-full mb-2 bg-blue-600 hover:bg-blue-700 rounded-lg h-11 text-sm font-semibold">
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.copyLink')}
              </Button>
            </div>
          </div>

          <div className="bg-card backdrop-blur-sm rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">{t('dashboard.yourEarnings')}:</h2>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(earningsStats.thisMonth)}</p>
              </div>
              <Link href="/dashboard/earnings" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                {t('dashboard.thisMonth')} &gt;
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('dashboard.thisMonth')}</p>

            {chartData.length > 0 && (
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
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(earningsStats.completedEarnings)}</span>
                  <span className="text-xs text-muted-foreground">{t('dashboard.referrals')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(earningsStats.pendingEarnings)}</span>
                  <span className="text-xs text-muted-foreground">{t('earnings.pending', 'Pending')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Top Businesses */}
        <div className="space-y-6 min-w-0">
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{t('dashboard.topBusinessesWeek')}</h2>
              <Link href="/dashboard/referrals" className="text-white/60 hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {businesses.length > 0 ? (
              <div className="space-y-3">
                {businesses.slice(0, 4).map((biz) => {
                  const img = biz.offer?.image || biz.images?.[0]
                  const commission = biz.offer?.referrerCommissionAmount || 0
                  const url = user ? generateReferralUrl(biz.id, user.id) : ''
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
                          <p className="text-blue-300 text-xs font-medium mt-0.5 truncate">
                            {formatCurrency(commission)} {t('dashboard.perCustomer', 'per customer')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-400 hover:bg-blue-500 rounded-lg text-xs font-semibold h-8 px-2 lg:px-3 flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(url)
                          toast({ title: t('cards.linkCopied') })
                        }}
                      >
                        <Copy className="h-3 w-3 lg:mr-1" />
                        <span className="hidden lg:inline">{t('dashboard.copyLink')}</span>
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

        {/* Column 3: Recent Conversions */}
        <div className="min-w-0">
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{t('dashboard.recentConversions')}</h2>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </div>

            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(tx.customer)}&background=random`}
                        alt={tx.customer}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{tx.customer}</p>
                      <p className="text-white/70 text-xs truncate">{tx.business}</p>
                    </div>
                    <Badge className={`text-white text-xs px-2 py-1 rounded-full ${
                      tx.status === 'completed' ? 'bg-green-500' : tx.status === 'processing' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 text-sm">{t('dashboard.noConversions', 'No conversions yet')}</p>
                <p className="text-white/40 text-xs mt-1">{t('dashboard.startSharing', 'Start sharing your referral links!')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMobileContent = () => (
    <div className="px-0">
      {/* Stats Cards */}
      <div className="flex gap-2 mb-6 overflow-x-visible pb-2">
        <div className="bg-card backdrop-blur-sm rounded-xl p-3 shadow-lg flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">{t('dashboard.totalEarnings')}:</p>
          <p className="text-xl font-bold text-foreground mb-2">
            {formatCurrency(earningsStats.totalEarnings)}
          </p>
          <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-8 text-[10px]" onClick={copyLink}>
            {t('dashboard.copyLink')}
          </Button>
        </div>

        <div className="bg-card backdrop-blur-sm rounded-xl p-3 shadow-lg flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">{t('dashboard.newCustomers')}:</p>
          <div className="flex items-baseline gap-1 mb-0.5">
            <p className="text-xl font-bold text-foreground">{thisMonthReferrals.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('dashboard.thisMonth')}</p>
          </div>
          {chartData.length > 0 && (
            <div className="h-10 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Bar dataKey="amount" fill="url(#miniGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--theme-primaryLight)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card backdrop-blur-sm rounded-xl p-3 shadow-lg flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">{t('dashboard.pendingPayouts')}:</p>
          <p className="text-xl font-bold text-foreground mb-2">
            {formatCurrency(earningsStats.pendingEarnings)}
          </p>
          <Link href="/dashboard/earnings">
            <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-8 text-[10px]">
              {t('dashboard.review')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-2">
        {/* My Referral Link & Top Businesses */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white whitespace-nowrap">{t('dashboard.myReferralLink')}</h2>
            <Link
              href="/dashboard/referrals"
              className="text-[10px] text-white/90 hover:text-white flex items-center gap-0.5"
            >
              {t('dashboard.topBusinessesWeek')} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-[0.85fr_1.15fr] gap-1.5">
            {/* QR Code / Link */}
            <div className="flex flex-col items-center bg-card rounded-lg p-2">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-full h-auto mb-1.5" />
              )}
              <p className="text-[9px] text-muted-foreground text-center mb-1.5 truncate w-full">
                {referralUrl ? referralUrl.replace('https://', '').replace('http://', '').substring(0, 20) + '...' : '...'}
              </p>
              <Button onClick={copyLink} className="w-full mb-1.5 bg-blue-600 hover:bg-blue-700 rounded-md h-7 text-[10px] font-medium">
                <Copy className="h-2.5 w-2.5 mr-0.5" />
                {t('dashboard.copyLink')}
              </Button>
              <div className="flex gap-1 w-full">
                <button
                  className="flex-1 h-7 bg-teal-500 hover:bg-teal-600 text-white rounded-md flex items-center justify-center"
                  onClick={share}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex-1 h-7 bg-muted-foreground/50 hover:bg-muted-foreground/60 text-white rounded-md flex items-center justify-center"
                  onClick={shareApp}
                >
                  <QrCodeIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Top Businesses */}
            <div className="space-y-1.5">
              {businesses.length > 0 ? (
                businesses.slice(0, 2).map((biz) => renderBusinessCard(biz, 'sm'))
              ) : (
                <div className="flex items-center justify-center h-full bg-white/5 rounded-lg p-4">
                  <div className="text-center">
                    <Building2 className="h-8 w-8 text-white/30 mx-auto mb-2" />
                    <p className="text-white/50 text-[10px]">{t('dashboard.noBusinesses', 'No businesses yet')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Earnings Chart */}
        <div className="bg-card backdrop-blur-sm rounded-xl p-2.5 shadow-lg">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-foreground mb-0.5">{t('dashboard.yourEarnings')}:</h2>
            <p className="text-xl font-bold text-foreground">{formatCurrency(earningsStats.thisMonth)}</p>
            <p className="text-[10px] text-muted-foreground">{t('dashboard.thisMonth')}</p>
          </div>

          {chartData.length > 0 && (
            <div className="h-24 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 8 }} />
                  <Bar dataKey="amount" fill="url(#earningsGradient)" radius={[3, 3, 0, 0]} />
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
            <h3 className="text-[10px] font-semibold text-foreground mb-1.5">{t('dashboard.commissionBreakdown')}</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-medium text-foreground">{formatCurrency(earningsStats.completedEarnings)}</span>
                <span className="text-[10px] text-muted-foreground">{t('dashboard.referrals')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-medium text-foreground">{formatCurrency(earningsStats.pendingEarnings)}</span>
                <span className="text-[10px] text-muted-foreground">{t('earnings.pending', 'Pending')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Header with background image */}
      <div
        className={`md:hidden fixed top-0 left-0 right-0 z-50 px-6 pt-6 pb-8 transition-transform duration-300 ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{
          backgroundImage: 'url(/dashboard/assets/header-backgroun.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={shareApp}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                <QrCodeIcon className="w-full h-full text-theme-primary" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-white font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-white font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative cursor-pointer">
                  <div className="w-14 h-14 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                    <img
                      src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3B82F6&color=fff`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user?.roles.filter((role) => role !== 'consumer').map((role) => (
                        <span
                          key={role}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize"
                        >
                          {role === 'referrer' ? 'promoter' : role}
                        </span>
                      ))}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('nav.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || '' })}
            </h1>
            <p className="text-white/90 text-lg">{t('dashboard.trackReferEarn')}</p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-80 bg-gradient-to-b from-blue-900 via-blue-900 to-blue-800 flex flex-col">
          <div className="p-8">
            <button
              onClick={shareApp}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2.5">
                <QrCodeIcon className="w-full h-full text-blue-900" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-white font-bold text-xl leading-tight">SMART AI</span>
                <span className="text-white font-bold text-xl leading-tight">REFERRALS</span>
              </div>
            </button>
          </div>

          <nav className="flex-1 px-4">
            <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 mb-2 bg-blue-700/50 rounded-lg text-white">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="text-base font-medium">Dashboard</span>
            </Link>
            <Link href="/dashboard/referrals" className="flex items-center gap-4 px-6 py-4 mb-2 text-white/80 hover:bg-blue-700/30 rounded-lg transition-colors">
              <Users className="h-6 w-6" />
              <span className="text-base font-medium">My Promotions</span>
            </Link>
            <Link href="/dashboard/earnings" className="flex items-center gap-4 px-6 py-4 mb-2 text-white/80 hover:bg-blue-700/30 rounded-lg transition-colors">
              <DollarSign className="h-6 w-6" />
              <span className="text-base font-medium">Earnings</span>
            </Link>
            {user?.roles?.includes('business') && (
              <Link href="/dashboard/business" className="flex items-center gap-4 px-6 py-4 mb-2 text-white/80 hover:bg-blue-700/30 rounded-lg transition-colors">
                <Building2 className="h-6 w-6" />
                <span className="text-base font-medium">Businesses</span>
              </Link>
            )}
          </nav>

        </aside>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <header
            className="px-8 pt-12 pb-8"
            style={{
              backgroundImage: 'url(/dashboard/assets/header-backgroun.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || '' })}
                </h1>
                <p className="text-white/90 text-lg">{t('dashboard.trackReferEarn')}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                      <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3B82F6&color=fff`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-base">{user?.name?.split(' ')[0] || 'User'}</span>
                      <ChevronRight className="h-5 w-5 text-white/80 rotate-90" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user?.roles.filter((role) => role !== 'consumer').map((role) => (
                          <span
                            key={role}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize"
                          >
                            {role === 'referrer' ? 'promoter' : role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="px-8 pb-8">
            {renderDesktopContent()}
          </div>
        </div>
      </div>

      {/* Mobile Spacer for fixed header */}
      <div className="md:hidden h-56" />

      {/* Mobile Content */}
      <div className="md:hidden px-0 pb-24">{renderMobileContent()}</div>

      {/* Share App Modal */}
      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  )
}
