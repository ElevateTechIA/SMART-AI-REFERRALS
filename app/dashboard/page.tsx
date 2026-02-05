'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  Users,
  Copy,
  Share2,
  MessageCircle,
  ChevronRight,
  Star,
  QrCode as QrCodeIcon,
  Building2,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'
import QRCode from 'qrcode'
import { ShareAppModal } from '@/components/share-app-modal'

interface DashboardData {
  stats: {
    totalEarnings: number
    pendingEarnings: number
    totalReferrals: number
    totalVisits: number
    newCustomersThisMonth: number
  }
  businesses: any[]
  recentVisits: any[]
  earningsHistory: Array<{ date: string; amount: number }>
}

export default function EnhancedDashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)

  // Mock chart data for earnings
  const chartData = [
    { date: '3/01', amount: 100 },
    { date: '3/10', amount: 250 },
    { date: '3/17', amount: 450 },
    { date: '3/11', amount: 650 },
  ]

  useEffect(() => {
    fetchDashboardData()
    generateQRCode()
  }, [user])

  useEffect(() => {
    const controlHeaderVisibility = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setShowHeader(false)
      } else {
        // Scrolling up
        setShowHeader(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlHeaderVisibility)

    return () => {
      window.removeEventListener('scroll', controlHeaderVisibility)
    }
  }, [lastScrollY])

  const fetchDashboardData = async () => {
    try {
      // This would be replaced with actual API call
      setData({
        stats: {
          totalEarnings: 1250,
          pendingEarnings: 300,
          totalReferrals: 12,
          totalVisits: 34,
          newCustomersThisMonth: 34,
        },
        businesses: [],
        recentVisits: [],
        earningsHistory: chartData,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    try {
      const url = `${window.location.origin}/r/your-business-id`
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1D4ED8',
          light: '#ffffff',
        },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText('smartreferrals.io///boat...')
    // Show toast notification
  }

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Referral Link',
        url: 'smartreferrals.io///boat...',
      })
    }
  }

  const shareApp = () => {
    setShowShareModal(true)
  }

  // Mock recent conversions data
  const recentConversions = [
    { id: 1, name: 'Alex M.', type: 'Boat Rental', verified: true },
    { id: 2, name: 'Sarah T.', type: 'Spa Visit', verified: true },
    { id: 3, name: 'Sarah T.', type: 'Care Referral', verified: true },
    { id: 4, name: 'David S.', type: 'Cafe Referral', verified: true },
  ]

  const renderDesktopContent = () => (
    <div className="space-y-6">
      {/* Top Row: Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        {/* Total Earnings */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">{t('dashboard.totalEarnings')}:</p>
          <p className="text-3xl font-bold text-gray-900 mb-3">
            {formatCurrency(data?.stats.totalEarnings || 0)}
          </p>
          <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-10 text-sm">
            {t('dashboard.withdraw')}
          </Button>
        </div>

        {/* New Customers */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">{t('dashboard.newCustomers')}:</p>
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-3xl font-bold text-gray-900">
              {data?.stats.newCustomersThisMonth || 0}
            </p>
            <p className="text-xs text-gray-500">{t('dashboard.thisMonth')}</p>
          </div>
          {/* Mini chart */}
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, 4)}>
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
        </div>

        {/* Pending Payouts */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">{t('dashboard.pendingPayouts')}:</p>
          <p className="text-3xl font-bold text-gray-900 mb-3">$300</p>
          <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-10 text-sm">
            {t('dashboard.review')} &gt;
          </Button>
        </div>
      </div>

      {/* Main Grid: 3 Columns */}
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-6">
        {/* Column 1: My Referral Link & Your Earnings */}
        <div className="space-y-6">
          {/* My Referral Link */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{t('dashboard.myReferralLink')}</h2>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </div>

            <div className="bg-white/95 rounded-xl p-4 flex flex-col items-center">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-40 h-40 mb-3" />
              )}
              <p className="text-xs text-gray-600 text-center mb-3 truncate w-full">
                smartreferrals.io//boat...
              </p>
              <Button onClick={copyLink} className="w-full mb-2 bg-blue-600 hover:bg-blue-700 rounded-lg h-11 text-sm font-semibold">
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.copyLink')}
              </Button>
            </div>
          </div>

          {/* Your Earnings Chart */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-1">{t('dashboard.yourEarnings')}:</h2>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(1250)}</p>
              </div>
              <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                {t('dashboard.thisMonth')} &gt;
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-4">{t('dashboard.thisMonth')}</p>

            {/* Chart */}
            <div className="h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                  />
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

            {/* Commission Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-gray-800 mb-2">
                {t('dashboard.commissionBreakdown')}
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-semibold text-gray-900">$1,100</span>
                  <span className="text-xs text-gray-600">{t('dashboard.referrals')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  <span className="text-xs font-semibold text-gray-900">$150</span>
                  <span className="text-xs text-gray-600">{t('dashboard.bonuses')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Top Businesses & Write a Review */}
        <div className="space-y-6">
          {/* Top Businesses This Week */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{t('dashboard.topBusinessesWeek')}</h2>
              <div className="flex items-center gap-2">
                <button className="text-white/60 hover:text-white">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <button className="text-white/60 hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Marina Boat Tours */}
              <div
                className="relative overflow-hidden rounded-xl h-52"
                style={{
                  backgroundImage: 'url(/dashboard/assets/marina-boat-tours-background.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="relative h-full p-4 flex flex-col justify-between">
                  <div className="flex-1"></div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1.5 leading-tight">Marina Boat Tours</h3>
                    <p className="text-white/95 text-xs mb-3">$100 per new customer</p>
                    <Button size="sm" className="w-full bg-blue-400 hover:bg-blue-500 rounded-lg h-9 text-xs font-semibold">
                      {t('dashboard.copyLink')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bella Spa & Wellness */}
              <div
                className="relative overflow-hidden rounded-xl h-52"
                style={{
                  backgroundImage: 'url(/dashboard/assets/bella-spa-candles-background.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/30 to-transparent"></div>
                <div className="relative h-full p-4 flex flex-col justify-between">
                  <div className="flex-1"></div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1.5 leading-tight">Bella Spa & Wellness</h3>
                    <p className="text-yellow-300 text-xs mb-3">Get 20% Cash Back</p>
                    <Button size="sm" className="w-full bg-blue-400 hover:bg-blue-500 rounded-lg h-9 text-xs font-semibold">
                      Whatsapp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Write a Review & Earn */}
          <div
            className="relative overflow-hidden rounded-2xl shadow-xl"
            style={{
              backgroundImage: 'url(/dashboard/assets/bella-spa-review-background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/85 to-blue-700/85"></div>
            <div className="relative p-5">
              <h2 className="text-base font-bold text-white mb-3">{t('dashboard.writeReviewEarn')}</h2>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">Bella Spa & Wellness</span>
              </div>

              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-white/95 text-xs mb-3">
                {t('dashboard.shareExperience')}
              </p>

              <textarea
                className="w-full h-16 px-3 py-2 rounded-lg bg-white/95 text-gray-800 placeholder:text-gray-500 border-0 focus:ring-2 focus:ring-white/50 mb-3 text-xs resize-none"
                placeholder={t('dashboard.writeReview')}
              ></textarea>

              <Button className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-10 text-xs font-semibold">
                {t('dashboard.submitReview')}
              </Button>
            </div>
          </div>
        </div>

        {/* Column 3: Recent Conversions */}
        <div>
          {/* Recent Conversions */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{t('dashboard.recentConversions')}</h2>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </div>

            <div className="space-y-3">
              {recentConversions.map((conversion) => (
                <div key={conversion.id} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                    <img
                      src={`https://ui-avatars.com/api/?name=${conversion.name}&background=random`}
                      alt={conversion.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{conversion.name}</p>
                    <p className="text-white/70 text-xs">{conversion.type}</p>
                  </div>
                  {conversion.verified && (
                    <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      {t('dashboard.verified')}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMobileContent = () => (
    <div className="px-0">
      {/* Stats Cards - Single Row on Desktop, Scrollable on Mobile */}
      <div className="flex gap-2 mb-6 overflow-x-visible pb-2">
        {/* Total Earnings */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg flex-1 min-w-0 md:flex-none md:w-56">
          <p className="text-[10px] text-gray-600 mb-0.5">{t('dashboard.totalEarnings')}:</p>
          <p className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
            {formatCurrency(data?.stats.totalEarnings || 0)}
          </p>
          <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-8 md:h-10 text-[10px] md:text-sm">
            Copy Link
          </Button>
        </div>

        {/* New Customers */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg flex-1 min-w-0 md:flex-none md:w-56">
          <p className="text-[10px] text-gray-600 mb-0.5">{t('dashboard.newCustomers')}:</p>
          <div className="flex items-baseline gap-1 mb-0.5">
            <p className="text-xl md:text-3xl font-bold text-gray-900">
              {data?.stats.newCustomersThisMonth || 0}
            </p>
            <p className="text-[10px] text-gray-500">This Month</p>
          </div>
          {/* Mini chart */}
          <div className="h-10 md:h-14 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, 4)}>
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
        </div>

        {/* Pending Payouts */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg flex-1 min-w-0 md:flex-none md:w-56">
          <p className="text-[10px] text-gray-600 mb-0.5">{t('dashboard.pendingPayouts')}:</p>
          <p className="text-xl md:text-3xl font-bold text-gray-900 mb-2">$300</p>
          <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg h-8 md:h-10 text-[10px] md:text-sm">
            Review
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-2">
        {/* Left Column */}
        <div className="space-y-2">
          {/* My Referral Link & Top Businesses - Two Column Layout */}
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
              {/* My Referral Link - Left Side */}
              <div className="flex flex-col items-center bg-white/95 rounded-lg p-2">
                {qrCode && (
                  <img src={qrCode} alt="QR Code" className="w-full h-auto mb-1.5" />
                )}
                <p className="text-[9px] text-gray-600 text-center mb-1.5 truncate w-full">
                  smartreferrals.i...
                </p>
                <Button onClick={copyLink} className="w-full mb-1.5 bg-blue-600 hover:bg-blue-700 rounded-md h-7 text-[10px] font-medium">
                  <Copy className="h-2.5 w-2.5 mr-0.5" />
                  Copy Link
                </Button>
                <div className="flex gap-1 w-full">
                  <button className="flex-1 h-7 bg-teal-500 hover:bg-teal-600 text-white rounded-md flex items-center justify-center">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                  <button className="flex-1 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button className="flex-1 h-7 bg-gray-500 hover:bg-gray-600 text-white rounded-md flex items-center justify-center" onClick={share}>
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Top Businesses - Right Side */}
              <div className="space-y-1.5">
                {/* Marina Boat Tours */}
                <div
                  className="relative overflow-hidden rounded-lg h-[120px]"
                  style={{
                    backgroundImage: 'url(/dashboard/assets/marina-boat-tours-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="relative h-full p-3 flex flex-col justify-between">
                    <div className="flex-1"></div>
                    <div>
                      <h3 className="text-white font-bold text-sm mb-1 leading-tight">Marina Boat Tours</h3>
                      <p className="text-white/95 text-xs mb-2">$100 per new customer</p>
                      <Button size="sm" className="w-auto bg-blue-400 hover:bg-blue-500 rounded-lg h-8 px-4 text-xs font-semibold">
                        Copy Link
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bella Spa & Wellness */}
                <div
                  className="relative overflow-hidden rounded-lg h-[120px]"
                  style={{
                    backgroundImage: 'url(/dashboard/assets/bella-spa-candles-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/30 to-transparent"></div>
                  <div className="relative h-full p-3 flex flex-col justify-between">
                    <div className="flex-1"></div>
                    <div>
                      <h3 className="text-white font-bold text-sm mb-1 leading-tight">Bella Spa & Wellness</h3>
                      <p className="text-yellow-300 text-xs mb-2">Get 20% Cash Back</p>
                      <Button size="sm" className="w-auto bg-blue-400 hover:bg-blue-500 rounded-lg h-8 px-4 text-xs font-semibold">
                        Whatsapp
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Your Earnings & Write a Review - Two Column Layout */}
          <div className="grid grid-cols-[0.85fr_1.15fr] gap-1.5">
            {/* Your Earnings Chart - Left Side */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-lg">
              <div className="mb-2">
                <h2 className="text-sm font-bold text-gray-800 mb-0.5">{t('dashboard.yourEarnings')}:</h2>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(1250)}</p>
                <p className="text-[10px] text-gray-600">{t('dashboard.thisMonth')}</p>
              </div>

              {/* Chart */}
              <div className="h-24 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 8 }}
                    />
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

              {/* Commission Breakdown */}
              <div>
                <h3 className="text-[10px] font-semibold text-gray-800 mb-1.5">
                  {t('dashboard.commissionBreakdown')}
                </h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-medium text-gray-900">$1,100</span>
                    <span className="text-[10px] text-gray-600">{t('dashboard.referrals')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-[10px] font-medium text-gray-900">$150</span>
                    <span className="text-[10px] text-gray-600">{t('dashboard.bonuses')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Write a Review & Earn - Right Side */}
            <div
              className="relative overflow-hidden rounded-xl shadow-lg"
              style={{
                backgroundImage: 'url(/dashboard/assets/bella-spa-review-background.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900/85 to-blue-700/85"></div>
              <div className="relative p-2.5">
                <h2 className="text-sm font-bold text-white mb-2">{t('dashboard.writeReviewEarn')}</h2>

                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-white font-semibold text-xs">Bella Spa & Wellness</span>
                </div>

                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-white/95 text-[10px] mb-2">
                  {t('dashboard.shareExperience')}
                </p>

                <textarea
                  className="w-full h-12 px-2 py-1.5 rounded-md bg-white/95 text-gray-800 placeholder:text-gray-500 border-0 focus:ring-2 focus:ring-white/50 mb-2 text-[10px]"
                  placeholder={t('dashboard.writeReview')}
                ></textarea>

                <Button className="w-full bg-blue-500 hover:bg-blue-600 rounded-md h-7 text-[10px] font-semibold">
                  {t('dashboard.submitReview')}
                </Button>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
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
          {/* Top bar with logo and profile */}
          <div className="flex items-center justify-between mb-8">
            {/* Logo - tap to share app */}
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

            {/* Profile */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                <img
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3B82F6&color=fff`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Welcome message */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || 'Ethan' })}
            </h1>
            <p className="text-white/90 text-lg">{t('dashboard.trackReferEarn')}</p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="w-80 bg-gradient-to-b from-blue-900 via-blue-900 to-blue-800 flex flex-col">
          {/* Logo - tap to share app */}
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

          {/* Navigation Menu */}
          <nav className="flex-1 px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-4 px-6 py-4 mb-2 bg-blue-700/50 rounded-lg text-white"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span className="text-base font-medium">Dashboard</span>
            </Link>
            <Link
              href="/dashboard/referrals"
              className="flex items-center gap-4 px-6 py-4 mb-2 text-white/80 hover:bg-blue-700/30 rounded-lg transition-colors"
            >
              <Users className="h-6 w-6" />
              <span className="text-base font-medium">My Referrals</span>
            </Link>
            <Link
              href="/dashboard/earnings"
              className="flex items-center gap-4 px-6 py-4 mb-2 text-white/80 hover:bg-blue-700/30 rounded-lg transition-colors"
            >
              <DollarSign className="h-6 w-6" />
              <span className="text-base font-medium">Earnings</span>
            </Link>
            <Link
              href="/dashboard/business"
              className="flex items-center gap-4 px-6 py-4 mb-2 text-white/80 hover:bg-blue-700/30 rounded-lg transition-colors"
            >
              <Building2 className="h-6 w-6" />
              <span className="text-base font-medium">Businesses</span>
            </Link>
          </nav>

          {/* Bottom Profile Section */}
          <div className="p-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-700/30 rounded-lg">
              <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                <img
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3B82F6&color=fff`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Admin</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/60" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Desktop Header */}
          <header
            className="px-12 pt-12 pb-8"
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
                  {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || 'Ethan' })}
                </h1>
                <p className="text-white/90 text-lg">{t('dashboard.trackReferEarn')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                  <img
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3B82F6&color=fff`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-base">Admin</span>
                  <ChevronRight className="h-5 w-5 text-white/80 rotate-90" />
                </div>
              </div>
            </div>
          </header>

          {/* Desktop Content */}
          <div className="px-12 pb-8">
            {renderDesktopContent()}
          </div>
        </div>
      </div>

      {/* Mobile Spacer for fixed header */}
      <div className="md:hidden h-56"></div>

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
