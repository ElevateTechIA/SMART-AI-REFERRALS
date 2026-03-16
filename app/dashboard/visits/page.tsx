'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import type { Business, Visit, Earning, Receipt, Review } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Gift,
  MapPin,
  Clock,
  CheckCircle,
  Loader2,
  Share2,
  ArrowRight,
  Building2,
  QrCode,
  ReceiptText,
  Star,
  Pencil,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Phone,
  Mail,
  Globe,

} from 'lucide-react'

import { ReceiptDialog } from '@/components/receipt/receipt-dialog'
import { ReviewDialog } from '@/components/review-dialog'
import { generateCheckInQRImage, getDaysRemaining } from '@/lib/qr-checkin'

const GRADIENTS = [
  'from-rose-500 via-pink-500 to-teal-500',
  'from-purple-600 via-violet-500 to-cyan-400',
  'from-emerald-600 via-teal-500 to-blue-400',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-blue-600 via-indigo-500 to-purple-400',
  'from-pink-500 via-rose-400 to-orange-400',
]

function getGradientForBusiness(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function getFakeReviewCount(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 7) - hash)
  }
  return 50 + (Math.abs(hash) % 450)
}

const FAKE_REVIEWERS = [
  'Maria G.', 'Carlos R.', 'Ana P.', 'Luis M.', 'Sofia T.',
  'Diego H.', 'Laura V.', 'Juan S.', 'Elena F.', 'Pedro A.',
]

const FAKE_REVIEW_TEXTS = [
  'Excellent service and great prices! Highly recommended.',
  'Amazing experience, will definitely come back again.',
  'Very professional staff. The best in town!',
  'Great quality and fast service. Love this place!',
  'Wonderful atmosphere and friendly people. 10/10!',
  'Outstanding! Exceeded all my expectations.',
  'Top-notch quality. Couldn\'t be happier!',
  'Fantastic experience from start to finish.',
  'Service was a bit slow on my visit. Had to wait longer than expected.',
  'The experience was okay but not what I expected for the price.',
]

const FAKE_RATINGS = [5, 5, 5, 4, 5, 5, 4, 5, 3, 2]

const BUSINESS_REPLIES = [
  'Thank you for your feedback! We apologize for the wait — we were short-staffed that day. We\'ve since added more team members to ensure faster service. We\'d love to make it up to you on your next visit!',
  'We appreciate your honest review and are sorry we didn\'t meet your expectations. We\'ve taken your feedback to heart and made improvements. Please give us another chance — we\'re confident you\'ll notice the difference!',
]

type DisplayReview = Review & {
  businessReply?: string
  replyDaysAgo?: number
}

function generateFakeReviews(businessName: string): DisplayReview[] {
  let hash = 0
  for (let i = 0; i < businessName.length; i++) {
    hash = businessName.charCodeAt(i) + ((hash << 3) - hash)
  }
  const offset = Math.abs(hash)
  const count = 5 + (offset % 4) // 5-8 fake reviews

  return Array.from({ length: count }).map((_, i) => {
    const daysAgo = 1 + ((offset + i * 7) % 30)
    const rating = FAKE_RATINGS[(offset + i) % FAKE_RATINGS.length]
    const isBadReview = rating <= 3
    return {
      id: `fake-${businessName}-${i}`,
      businessId: '',
      userId: `fake-user-${i}`,
      userName: FAKE_REVIEWERS[(offset + i) % FAKE_REVIEWERS.length],
      rating,
      text: FAKE_REVIEW_TEXTS[(offset + i * 3) % FAKE_REVIEW_TEXTS.length],
      createdAt: new Date(Date.now() - daysAgo * 86400000),
      updatedAt: new Date(Date.now() - daysAgo * 86400000),
      ...(isBadReview && {
        businessReply: BUSINESS_REPLIES[i % BUSINESS_REPLIES.length],
        replyDaysAgo: 1 + ((offset + i * 3) % 5),
      }),
    }
  })
}

interface Transaction {
  id: string
  date: string
  business: string
  customer: string
  amount: number
  status: 'completed' | 'pending' | 'processing'
  type: 'referral' | 'bonus'
  earningType?: string
}

interface EarningsStats {
  totalEarnings: number
  pendingEarnings: number
  completedEarnings: number
  thisMonth: number
}

interface EarningsResponse {
  success: boolean
  stats: EarningsStats
  transactions: Transaction[]
}

interface VisitsApiResponse {
  visits: (Visit & { business?: Business })[]
  rewards: Earning[]
  reviews: Review[]
}

export default function VisitsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [visits, setVisits] = useState<(Visit & { business?: Business })[]>([])
  const [rewards, setRewards] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())
  const [receiptDialogVisitId, setReceiptDialogVisitId] = useState<string | null>(null)
  const [visitReceipts, setVisitReceipts] = useState<Record<string, boolean>>({})
  const [userReviews, setUserReviews] = useState<Record<string, Review>>({})
  const [reviewDialogBusinessId, setReviewDialogBusinessId] = useState<string | null>(null)
  const [reviewDialogBusinessName, setReviewDialogBusinessName] = useState('')
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [businessReviews, setBusinessReviews] = useState<Record<string, DisplayReview[]>>({})
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({})
  const [earningsStats, setEarningsStats] = useState<EarningsStats>({
    totalEarnings: 0, pendingEarnings: 0, completedEarnings: 0, thisMonth: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const result = await apiGet<VisitsApiResponse>('/api/visits/consumer')

        if (!result.ok) {
          throw new Error(result.error || t('visits.failedToLoad'))
        }

        const data = result.data!

        // Parse dates from API response
        const visitsList = data.visits.map((v) => ({
          ...v,
          createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
          updatedAt: v.updatedAt ? new Date(v.updatedAt) : undefined,
        })) as (Visit & { business?: Business })[]

        const rewardsList = data.rewards.map((r) => ({
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
        })) as Earning[]

        // Parse reviews
        const reviewsMap: Record<string, Review> = {}
        if (data.reviews) {
          for (const r of data.reviews) {
            reviewsMap[r.businessId] = {
              ...r,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
              updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
            } as Review
          }
        }

        setVisits(visitsList)
        setRewards(rewardsList)
        setUserReviews(reviewsMap)

        // Track which visits have receipts
        const receiptsMap: Record<string, boolean> = {}
        for (const v of visitsList) {
          if (v.receiptId) {
            receiptsMap[v.id] = true
          }
        }
        setVisitReceipts(receiptsMap)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: t('common.error'),
          description: t('visits.failedToLoad'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast, t])

  // Fetch earnings data
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user) return
      try {
        const result = await apiGet<EarningsResponse>(`/api/earnings?period=${selectedPeriod}`)
        if (result.ok && result.data) {
          setEarningsStats(result.data.stats)
          setTransactions(result.data.transactions)
        }
      } catch (error) {
        console.error('Error fetching earnings:', error)
      }
    }
    fetchEarnings()
  }, [user, selectedPeriod])

  // Generate QR codes for CREATED visits with check-in tokens
  useEffect(() => {
    const generateQRs = async () => {
      const createdVisits = visits.filter(
        (v) => v.status === 'CREATED' && v.checkInToken
      )
      const qrMap = new Map<string, string>()

      for (const visit of createdVisits) {
        try {
          // checkInToken here is the plain token (not hashed)
          // that was received when the visit was created
          const qrImage = await generateCheckInQRImage(
            visit.id,
            visit.checkInToken!
          )
          qrMap.set(visit.id, qrImage)
        } catch (err) {
          console.error('QR generation error:', err)
        }
      }

      setQrCodes(qrMap)
    }

    if (visits.length > 0) {
      generateQRs()
    }
  }, [visits])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleReceiptSuccess = (receipt: Receipt) => {
    if (receiptDialogVisitId) {
      setVisitReceipts((prev) => ({ ...prev, [receiptDialogVisitId]: true }))
    }
    toast({
      title: t('receipt.receiptSaved'),
      description: t('receipt.receiptSavedDesc'),
    })
  }

  const handleReviewSuccess = (review: Review) => {
    setUserReviews((prev) => ({ ...prev, [review.businessId]: review }))
    toast({
      title: userReviews[review.businessId] ? t('review.reviewUpdated') : t('review.reviewSaved'),
    })
  }

  const openReviewDialog = (businessId: string, businessName: string) => {
    setReviewDialogBusinessId(businessId)
    setReviewDialogBusinessName(businessName)
  }

  const flipToReviews = async (visitId: string, businessId: string, businessName: string) => {
    // Pre-populate with fake reviews immediately so user sees them on flip
    if (!businessReviews[businessId]) {
      const fakeReviews = generateFakeReviews(businessName)
      setBusinessReviews((prev) => ({
        ...prev,
        [businessId]: fakeReviews,
      }))
    }
    setFlippedCards((prev) => ({ ...prev, [visitId]: true }))

    // Then fetch real reviews and prepend them
    if (!loadingReviews[businessId] && !businessReviews[businessId]?.some((r) => !r.id.startsWith('fake-'))) {
      setLoadingReviews((prev) => ({ ...prev, [businessId]: true }))
      try {
        const result = await apiGet<{ reviews: Review[] }>(
          `/api/reviews?businessId=${businessId}`
        )
        if (result.ok && result.data && result.data.reviews.length > 0) {
          const realReviews = result.data.reviews.map((r) => ({
            ...r,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          }))
          const fakeReviews = generateFakeReviews(businessName)
          setBusinessReviews((prev) => ({
            ...prev,
            [businessId]: [...realReviews, ...fakeReviews],
          }))
        }
      } catch {
        // fake reviews already showing, nothing to do
      } finally {
        setLoadingReviews((prev) => ({ ...prev, [businessId]: false }))
      }
    }
  }

  const flipToFront = (visitId: string) => {
    setFlippedCards((prev) => ({ ...prev, [visitId]: false }))
  }

  function timeAgo(date: Date): string {
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days === 0) return t('review.today')
    if (days === 1) return t('review.yesterday')
    return t('review.daysAgo', { count: days })
  }

  const receiptDialogVisit = receiptDialogVisitId
    ? visits.find((v) => v.id === receiptDialogVisitId)
    : null

  const stats = {
    totalVisits: visits.length,
    converted: visits.filter((v) => v.status === 'CONVERTED').length,
    pending: visits.filter((v) => v.status === 'CREATED' || v.status === 'CHECKED_IN').length,
    totalRewards: rewards
      .filter((r) => r.status === 'PAID' || r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amount, 0),
    pendingRewards: rewards
      .filter((r) => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.amount, 0),
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('visits.title')}</h1>
          <p className="text-foreground/70">
            {t('visits.subtitle')}
          </p>
        </div>
        <Link href="/dashboard/referrals">
          <Button className="gap-2">
            <Share2 className="h-4 w-4" />
            {t('visits.startPromoting')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visits.totalVisits')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">{t('visits.placesVisited')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visits.confirmed')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">{t('visits.pendingCount', { count: stats.pending })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visits.pendingRewards')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingRewards)}</div>
            <p className="text-xs text-muted-foreground">{t('visits.awaitingConfirmation')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visits.totalRewards')}</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRewards)}</div>
            <p className="text-xs text-muted-foreground">{t('visits.earnedFromVisits')}</p>
          </CardContent>
        </Card>
      </div>

      {/* My Earnings Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-theme-primary" />
                {t('earnings.title')}
              </CardTitle>
              <CardDescription>{t('earnings.subtitle')}</CardDescription>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-theme-primary"
              >
                <option value="all">{t('earnings.allTime')}</option>
                <option value="month">{t('earnings.thisMonthOption')}</option>
                <option value="year">{t('earnings.thisYear')}</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Earnings Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl p-4 border border-theme-cardBorder" style={{ background: 'var(--theme-cardBg)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}>
                  <DollarSign className="h-4 w-4 text-theme-primary" />
                </div>
              </div>
              <p className="text-xl font-bold text-theme-textPrimary">{formatCurrency(earningsStats.totalEarnings)}</p>
              <span className="text-xs text-theme-textSecondary">{t('earnings.totalEarnings')}</span>
            </div>
            <div className="rounded-xl p-4 border border-theme-cardBorder" style={{ background: 'var(--theme-cardBg)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, #22c55e 20%, transparent)' }}>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-theme-textPrimary">{formatCurrency(earningsStats.completedEarnings)}</p>
              <span className="text-xs text-theme-textSecondary">{t('earnings.completed')}</span>
            </div>
            <div className="rounded-xl p-4 border border-theme-cardBorder" style={{ background: 'var(--theme-cardBg)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, #eab308 20%, transparent)' }}>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-theme-textPrimary">{formatCurrency(earningsStats.pendingEarnings)}</p>
              <span className="text-xs text-theme-textSecondary">{t('earnings.pending')}</span>
            </div>
            <div className="rounded-xl p-4 border border-theme-cardBorder" style={{ background: 'var(--theme-cardBg)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}>
                  <Calendar className="h-4 w-4 text-theme-primary" />
                </div>
              </div>
              <p className="text-xl font-bold text-theme-textPrimary">{formatCurrency(earningsStats.thisMonth)}</p>
              <span className="text-xs text-theme-textSecondary">{t('earnings.thisMonth')}</span>
            </div>
          </div>

          {/* Transaction History */}
          {transactions.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-theme-textPrimary mb-3">{t('earnings.transactionHistory')}</h3>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-theme-cardBorder last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tx.status === 'completed' ? 'color-mix(in srgb, #22c55e 20%, transparent)' : tx.status === 'pending' ? 'color-mix(in srgb, #eab308 20%, transparent)' : 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}>
                        <DollarSign className={`h-4 w-4 ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'pending' ? 'text-yellow-400' : 'text-theme-primary'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-theme-textPrimary">{tx.business}</p>
                        <p className="text-xs text-theme-textMuted">
                          {new Date(tx.date).toLocaleDateString()}
                          {' · '}
                          {tx.type === 'referral' ? t('earnings.typeReferral') : t('earnings.typeReward')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-theme-textPrimary">{formatCurrency(tx.amount)}</p>
                      <Badge className={
                        tx.status === 'completed' ? 'bg-green-500 text-white' :
                        tx.status === 'pending' ? 'bg-yellow-500 text-white' :
                        'bg-theme-primary text-gray-900'
                      }>
                        {tx.status === 'completed' ? t('earnings.statusCompleted') :
                         tx.status === 'pending' ? t('earnings.statusPending') :
                         t('earnings.statusProcessing')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <DollarSign className="h-10 w-10 text-theme-textMuted mx-auto mb-3" />
              <p className="text-sm text-theme-textMuted">{t('earnings.noTransactions')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Visits - Now showing CREATED visits from Firestore */}
      {stats.pending > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t('visits.pendingVisits')}</h2>
              <p className="text-foreground/70">
                {t('visits.pendingVisitsDesc')}
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {t('visits.pendingBadge', { count: stats.pending })}
            </Badge>
          </div>

          {visits
            .filter((v) => v.status === 'CREATED' || v.status === 'CHECKED_IN')
            .map((visit) => {
              const qrImage = qrCodes.get(visit.id)
              const daysRemaining = visit.checkInTokenExpiry
                ? getDaysRemaining(visit.checkInTokenExpiry)
                : 0
              const isFlipped = flippedCards[visit.id] || false
              const reviews = businessReviews[visit.businessId] || []
              const isLoadingReviews = loadingReviews[visit.businessId] || false
              const avgRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0

              const businessName = visit.business?.name || t('common.unknown')
              const coverImage = visit.business?.images?.[0] || null
              const gradient = getGradientForBusiness(businessName)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const consumerReward = (visit as any).offer?.consumerRewardValue || 0

              return (
                <div key={visit.id} className="perspective-1000">
                  <div className={`relative preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* ===== FRONT FACE ===== */}
                    <div className="backface-hidden">
                      <div className="rounded-3xl overflow-hidden shadow-xl border border-theme-cardBorder" style={{ background: 'var(--theme-cardBg)' }}>
                        {/* Banner */}
                        <div className="relative h-40 sm:h-48">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={businessName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${gradient}`}>
                              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <Building2 className="h-24 w-24 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                          {/* Business name & category */}
                          <div className="absolute bottom-4 left-5 right-5">
                            <h3 className="text-white font-extrabold text-xl sm:text-2xl drop-shadow-lg truncate tracking-wide uppercase">
                              {businessName}
                            </h3>
                            <p className="text-white/80 text-sm drop-shadow font-medium">
                              {visit.business?.category}
                            </p>
                          </div>

                          {/* Reward badge */}
                          {consumerReward > 0 && (
                            <div className="absolute top-4 right-4">
                              <div className="bg-green-900/80 border border-green-700 rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                                <Gift className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-sm font-bold text-green-300">
                                  {t('cards.earn', { amount: formatCurrency(consumerReward) })}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Status badge */}
                          <div className="absolute top-4 left-4">
                            <Badge
                              variant={visit.status === 'CHECKED_IN' ? 'default' : 'secondary'}
                              className="shadow-lg"
                            >
                              {visit.status === 'CHECKED_IN' ? t('visits.checkInDone') : t('visits.pendingStatus')}
                            </Badge>
                          </div>
                        </div>

                        {/* QR Code section */}
                        {visit.status === 'CREATED' && qrImage && visit.checkInToken && (
                          <>
                            <div className="pt-5 pb-2 text-center">
                              <h4 className="text-lg font-bold text-theme-textPrimary">
                                {t('visits.checkInQR')}
                              </h4>
                              <p className="text-xs text-theme-textSecondary mt-1">
                                {t('visits.showQRToStaff')}
                              </p>
                            </div>

                            <div className="flex justify-center px-4 pb-3">
                              <div className="bg-white rounded-2xl p-3 shadow-md border border-white/20">
                                <img src={qrImage} alt="Check-in QR Code" className="w-44 h-44 sm:w-52 sm:h-52" />
                              </div>
                            </div>

                            {/* Expiry notice */}
                            <div className="px-5 pb-3">
                              <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${daysRemaining <= 0 ? 'bg-destructive/15' : ''}`} style={daysRemaining > 0 ? { background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' } : undefined}>
                                <Clock className={`h-4 w-4 flex-shrink-0 ${daysRemaining <= 0 ? 'text-destructive' : 'text-theme-textMuted'}`} />
                                <span className={`text-sm ${daysRemaining <= 0 ? 'text-destructive' : 'text-theme-textSecondary'}`}>
                                  {daysRemaining <= 0
                                    ? t('visits.qrExpired')
                                    : t('visits.qrExpires', { days: daysRemaining, dayWord: daysRemaining === 1 ? t('visits.day') : t('visits.days') })}
                                </span>
                              </div>
                            </div>

                            {/* Instructions */}
                            <div className="px-5 pb-4">
                              <div className="rounded-xl p-4" style={{ background: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)' }}>
                                <p className="text-sm font-semibold mb-2 text-theme-textPrimary">
                                  {t('visits.instructions')}
                                </p>
                                <div className="text-xs text-theme-textSecondary space-y-1">
                                  <p>{t('visits.instruction1')}</p>
                                  <p>{t('visits.instruction2')}</p>
                                  <p>{t('visits.instruction3')}</p>
                                  <p>{t('visits.instruction4')}</p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {visit.status === 'CHECKED_IN' && (
                          <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'color-mix(in srgb, var(--theme-success) 15%, transparent)' }}>
                              <CheckCircle className="h-4 w-4" style={{ color: 'var(--theme-success)' }} />
                              <span className="text-sm text-theme-textPrimary">
                                {t('visits.checkInComplete')}
                              </span>
                            </div>

                            {/* Review display / button for checked-in visits */}
                            {userReviews[visit.businessId] ? (
                              <div className="p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--theme-primary) 8%, transparent)' }}>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => flipToReviews(visit.id, visit.businessId, visit.business?.name || '')}
                                    className="flex hover:opacity-70 transition-opacity"
                                  >
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3.5 w-3.5 ${
                                          i < userReviews[visit.businessId].rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-theme-textMuted'
                                        }`}
                                      />
                                    ))}
                                  </button>
                                  <button
                                    onClick={() => openReviewDialog(visit.businessId, visit.business?.name || '')}
                                    className="text-xs hover:underline ml-auto flex items-center gap-1"
                                    style={{ color: 'var(--theme-primary)' }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                    {t('review.editReview')}
                                  </button>
                                </div>
                                <p className="text-xs text-theme-textSecondary mt-1 leading-relaxed">
                                  {userReviews[visit.businessId].text}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 rounded-xl border-theme-cardBorder text-theme-textPrimary"
                                  onClick={() => openReviewDialog(visit.businessId, visit.business?.name || '')}
                                >
                                  <Star className="h-4 w-4" />
                                  {t('review.writeReview')}
                                </Button>
                                <button
                                  onClick={() => flipToReviews(visit.id, visit.businessId, visit.business?.name || '')}
                                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                                >
                                  <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    ))}
                                  </div>
                                  <span className="text-xs font-medium text-theme-textMuted">
                                    ({getFakeReviewCount(visit.business?.name || '')})
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Business info */}
                        {(visit.business?.address || visit.business?.phone || visit.business?.email || visit.business?.website) && (
                          <div className="px-5 pb-4 pt-1 border-t border-theme-cardBorder space-y-2">
                            {visit.business?.description && (
                              <p className="text-xs text-theme-textSecondary pt-3">{visit.business.description}</p>
                            )}
                            {visit.business?.address && (
                              <div className="flex items-start gap-2 text-xs text-theme-textSecondary">
                                <MapPin className="h-3.5 w-3.5 text-theme-textMuted mt-0.5 flex-shrink-0" />
                                <span>{visit.business.address}</span>
                              </div>
                            )}
                            {visit.business?.phone && (
                              <div className="flex items-center gap-2 text-xs text-theme-textSecondary">
                                <Phone className="h-3.5 w-3.5 text-theme-textMuted flex-shrink-0" />
                                <a href={`tel:${visit.business.phone}`} className="hover:underline">
                                  {visit.business.phone}
                                </a>
                              </div>
                            )}
                            {visit.business?.email && (
                              <div className="flex items-center gap-2 text-xs text-theme-textSecondary">
                                <Mail className="h-3.5 w-3.5 text-theme-textMuted flex-shrink-0" />
                                <a href={`mailto:${visit.business.email}`} className="hover:underline truncate">
                                  {visit.business.email}
                                </a>
                              </div>
                            )}
                            {visit.business?.website && (
                              <div className="flex items-center gap-2 text-xs text-theme-textSecondary">
                                <Globe className="h-3.5 w-3.5 text-theme-textMuted flex-shrink-0" />
                                <a href={visit.business.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                                  {visit.business.website.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Receipt upload button */}
                        <div className="px-5 pb-5 flex justify-center">
                          {visitReceipts[visit.id] ? (
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-success)' }}>
                              <ReceiptText className="h-4 w-4" />
                              <span>{t('receipt.receiptAttached')}</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 rounded-xl border-theme-cardBorder text-theme-textPrimary"
                              onClick={() => setReceiptDialogVisitId(visit.id)}
                            >
                              <ReceiptText className="h-4 w-4" />
                              {t('receipt.uploadReceipt')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ===== BACK FACE (Reviews) ===== */}
                    <div className="backface-hidden rotate-y-180 absolute inset-0">
                      <Card className="border-primary bg-card h-full flex flex-col">
                        {/* Header */}
                        <CardHeader className="pb-3 border-b border-border">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => flipToFront(visit.id)}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              {t('common.back')}
                            </button>
                            {reviews.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < Math.round(avgRating)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'fill-muted text-muted-foreground/30'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-bold">
                                  {avgRating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-lg">
                            {visit.business?.name || t('common.unknown')}
                          </CardTitle>
                          <CardDescription>
                            {reviews.length > 0
                              ? `${reviews.length} ${reviews.length === 1 ? t('review.reviewSingular') : t('review.reviewPlural')}`
                              : t('review.noReviewsYet')}
                          </CardDescription>
                        </CardHeader>

                        {/* Reviews list */}
                        <CardContent className="flex-1 overflow-y-auto pt-4">
                          {isLoadingReviews ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : reviews.length === 0 ? (
                            <div className="text-center py-8">
                              <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">
                                {t('review.noReviewsYet')}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {reviews.map((review) => (
                                <div key={review.id} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{review.userName}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {timeAgo(review.createdAt)}
                                    </span>
                                  </div>
                                  <div className="flex">
                                    {Array.from({ length: 5 }).map((_, s) => (
                                      <Star
                                        key={s}
                                        className={`h-3 w-3 ${
                                          s < review.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-muted text-muted-foreground/30'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {review.text}
                                  </p>
                                  {review.businessReply && (
                                    <div className="ml-4 mt-1.5 pl-3 border-l-2 border-primary/30 bg-muted/50 rounded-r-lg py-2 pr-3">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[10px] font-semibold text-foreground">
                                          {visit.business?.name}
                                        </span>
                                        {review.replyDaysAgo && (
                                          <span className="text-[10px] text-muted-foreground">
                                            {review.replyDaysAgo}d ago
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {review.businessReply}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-border">
                          <button
                            onClick={() => flipToFront(visit.id)}
                            className="w-full text-center text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                          >
                            {t('cards.viewPromo')}
                          </button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Become a Referrer CTA */}
      <Card className="bg-primary/5 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            {t('visits.shareEarnMore')}
          </CardTitle>
          <CardDescription>
            {t('visits.shareEarnMoreDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/referrals">
            <Button className="gap-2">
              {t('visits.getPromoLinks')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('visits.visitHistory')}</CardTitle>
          <CardDescription>{t('visits.visitHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('visits.noVisitsYet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('visits.noVisitsDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((visit) => {
                const canReview = visit.status === 'CHECKED_IN' || visit.status === 'CONVERTED'
                const existingReview = userReviews[visit.businessId]
                const isFlipped = flippedCards[visit.id] || false
                const reviews = businessReviews[visit.businessId] || []
                const isLoadingReviews = loadingReviews[visit.businessId] || false
                const avgRating = reviews.length > 0
                  ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                  : 0

                return (
                  <div key={visit.id} className="perspective-1000">
                    <div className={`relative preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                      {/* ===== FRONT ===== */}
                      <div className="backface-hidden">
                        <div className="py-4 border-b border-border">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold break-words">
                                  {visit.business?.name || t('common.unknown')}
                                </h4>
                                <p className="text-sm text-muted-foreground break-words">
                                  {visit.business?.category}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('visits.visited', { date: formatDate(visit.createdAt) })}
                                </p>
                                {visitReceipts[visit.id] && (
                                  <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                    <ReceiptText className="h-3 w-3" />
                                    {t('receipt.receiptAttached')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!visitReceipts[visit.id] && visit.status !== 'REJECTED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReceiptDialogVisitId(visit.id)}
                                  title={t('receipt.uploadReceipt')}
                                >
                                  <ReceiptText className="h-4 w-4" />
                                </Button>
                              )}
                              {canReview && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReviewDialog(visit.businessId, visit.business?.name || '')}
                                  title={existingReview ? t('review.editReview') : t('review.writeReview')}
                                >
                                  {existingReview ? <Pencil className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                                </Button>
                              )}
                              <div className="text-right">
                                <Badge
                                  variant={
                                    visit.status === 'CONVERTED'
                                      ? 'success'
                                      : visit.status === 'CHECKED_IN'
                                      ? 'default'
                                      : visit.status === 'REJECTED'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {visit.status === 'CONVERTED'
                                    ? t('visits.statusConfirmed')
                                    : visit.status === 'CHECKED_IN'
                                    ? t('visits.statusCheckedIn')
                                    : visit.status === 'REJECTED'
                                    ? t('visits.statusRejected')
                                    : t('visits.statusPending')}
                                </Badge>
                                {visit.attributionType === 'REFERRER' && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('visits.viaPromotion')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* User's review */}
                          {existingReview && (
                            <div className="ml-16 mt-2 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => flipToReviews(visit.id, visit.businessId, visit.business?.name || '')}
                                  className="flex hover:opacity-70 transition-opacity"
                                >
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3.5 w-3.5 ${
                                        i < existingReview.rating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'fill-muted text-muted-foreground/30'
                                      }`}
                                    />
                                  ))}
                                </button>
                                <button
                                  onClick={() => openReviewDialog(visit.businessId, visit.business?.name || '')}
                                  className="text-[10px] text-primary hover:underline ml-auto"
                                >
                                  {t('review.editReview')}
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {existingReview.text}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ===== BACK (Reviews) ===== */}
                      <div className="backface-hidden rotate-y-180 absolute inset-0">
                        <div className="py-4 border-b border-border bg-card rounded-lg h-full flex flex-col">
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => flipToFront(visit.id)}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              {t('common.back')}
                            </button>
                            {reviews.length > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3.5 w-3.5 ${
                                        i < Math.round(avgRating)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'fill-muted text-muted-foreground/30'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-bold">{avgRating.toFixed(1)}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({reviews.length})
                                </span>
                              </div>
                            )}
                          </div>
                          <h4 className="font-semibold text-sm mb-2">
                            {visit.business?.name} — {t('review.reviewPlural')}
                          </h4>

                          <div className="flex-1 overflow-y-auto space-y-3">
                            {isLoadingReviews ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : reviews.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-6">
                                {t('review.noReviewsYet')}
                              </p>
                            ) : (
                              reviews.map((review) => (
                                <div key={review.id} className="space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">{review.userName}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {timeAgo(review.createdAt)}
                                    </span>
                                  </div>
                                  <div className="flex">
                                    {Array.from({ length: 5 }).map((_, s) => (
                                      <Star
                                        key={s}
                                        className={`h-3 w-3 ${
                                          s < review.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-muted text-muted-foreground/30'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {review.text}
                                  </p>
                                  {review.businessReply && (
                                    <div className="ml-4 mt-1.5 pl-3 border-l-2 border-primary/30 bg-muted/50 rounded-r-lg py-2 pr-3">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[10px] font-semibold text-foreground">
                                          {visit.business?.name}
                                        </span>
                                        {review.replyDaysAgo && (
                                          <span className="text-[10px] text-muted-foreground">
                                            {review.replyDaysAgo}d ago
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {review.businessReply}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards History */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('visits.rewardsHistory')}</CardTitle>
            <CardDescription>{t('visits.rewardsHistoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {rewards.map((reward) => {
                const visit = visits.find((v) => v.id === reward.visitId)
                return (
                  <div
                    key={reward.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t('visits.rewardFromVisit')}</p>
                        <p className="text-sm text-muted-foreground">
                          {visit?.business?.name} • {formatDate(reward.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-green-600">
                        +{formatCurrency(reward.amount)}
                      </span>
                      <Badge
                        variant={
                          reward.status === 'PAID'
                            ? 'success'
                            : reward.status === 'APPROVED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {reward.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt Dialog */}
      {receiptDialogVisit && (
        <ReceiptDialog
          open={!!receiptDialogVisitId}
          onOpenChange={(open) => !open && setReceiptDialogVisitId(null)}
          visitId={receiptDialogVisitId!}
          businessId={receiptDialogVisit.businessId}
          onSuccess={handleReceiptSuccess}
        />
      )}

      {/* Review Dialog */}
      {reviewDialogBusinessId && (
        <ReviewDialog
          open={!!reviewDialogBusinessId}
          onOpenChange={(open) => !open && setReviewDialogBusinessId(null)}
          businessId={reviewDialogBusinessId}
          businessName={reviewDialogBusinessName}
          existingReview={userReviews[reviewDialogBusinessId] || null}
          onSuccess={handleReviewSuccess}
        />
      )}

    </div>
  )
}
