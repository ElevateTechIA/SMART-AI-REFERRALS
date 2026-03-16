'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import type { Business, Offer, Visit, Earning } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BusinessGrid } from '@/components/business-grid'
import {
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  QrCode,
  Building2,
  Clock,
  ShieldAlert,
  Search,
  Plus,
} from 'lucide-react'

interface ReferralsApiResponse {
  businesses: (Business & { offer?: Offer; images?: string[] })[]
  referrals: Visit[]
  earnings: Earning[]
  referrerStatus: string | null
}

function ReferralsContent() {
  const searchParams = useSearchParams()
  const offerId = searchParams.get('offer')

  const { t } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [businesses, setBusinesses] = useState<(Business & { offer?: Offer; images?: string[] })[]>([])
  const [referrals, setReferrals] = useState<Visit[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [serverReferrerStatus, setServerReferrerStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const result = await apiGet<ReferralsApiResponse>('/api/referrals')

        if (!result.ok) {
          throw new Error(result.error || t('promotions.failedToLoad'))
        }

        const data = result.data!

        const businessList = data.businesses.map((b) => ({
          ...b,
          createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
          updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
        })) as (Business & { offer?: Offer; images?: string[] })[]

        const referralsList = data.referrals.map((r) => ({
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
        })) as Visit[]

        const earningsList = data.earnings.map((e) => ({
          ...e,
          createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : undefined,
        })) as Earning[]

        setBusinesses(businessList)
        setReferrals(referralsList)
        setEarnings(earningsList)
        setServerReferrerStatus(data.referrerStatus)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: t('common.error'),
          description: t('promotions.failedToLoad'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast, t])

  const categories = useMemo(() => {
    const cats = new Set(businesses.map((b) => b.category).filter(Boolean))
    return Array.from(cats).sort()
  }, [businesses])

  const filteredBusinesses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return businesses.filter((b) => {
      const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory
      const matchesSearch = !query || b.name.toLowerCase().includes(query) || b.category?.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [businesses, searchQuery, selectedCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = {
    totalReferrals: referrals.length,
    conversions: referrals.filter((r) => r.status === 'CONVERTED').length,
    pendingEarnings: earnings
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + e.amount, 0),
    totalEarnings: earnings
      .filter((e) => e.status === 'PAID' || e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0),
  }

  // Admins bypass referrer approval entirely
  const isAdmin = user?.roles?.includes('admin')
  const isReferrer = user?.roles?.includes('referrer')
  const isReferrerApproved = isAdmin || serverReferrerStatus === 'active'
  const isReferrerSuspended = !isAdmin && isReferrer && serverReferrerStatus === 'suspended'
  const isReferrerPending = !isAdmin && isReferrer && (!serverReferrerStatus || serverReferrerStatus === 'pending')

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('promotions.title')}</h1>
        <p className="text-sm text-foreground/70">
          {t('promotions.subtitle')}
        </p>
      </div>

      {/* Pending Approval Banner */}
      {isReferrerPending && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="flex items-center gap-4 py-4">
            <Clock className="h-8 w-8 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800">{t('promotions.pendingApproval')}</h3>
              <p className="text-sm text-yellow-700">
                {t('promotions.pendingApprovalDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspended Banner */}
      {isReferrerSuspended && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <ShieldAlert className="h-8 w-8 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">{t('promotions.accountSuspended')}</h3>
              <p className="text-sm text-red-700">
                {t('promotions.accountSuspendedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('promotions.totalPromotions')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('promotions.promotedTo')}</p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('promotions.conversions')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.conversions}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats.totalReferrals > 0
                ? t('promotions.conversionRate', { rate: Math.round((stats.conversions / stats.totalReferrals) * 100) })
                : t('promotions.startPromoting')}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('promotions.pendingEarnings')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.pendingEarnings)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('promotions.awaitingApproval')}</p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('promotions.totalEarned')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('promotions.allTimeEarnings')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stores Grid */}
      {isReferrerApproved && (
        <div>
          <Link href="/dashboard/support?subject=recommend" className="block mb-4 px-px">
            <div className="relative rounded-2xl p-5 sm:p-6 transition-all hover:shadow-xl group animate-border-glow"
              style={{ background: 'var(--theme-cardBg)' }}>
              {/* Subtle glow */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15 blur-3xl" style={{ background: 'var(--theme-primary)' }} />
              </div>
              <div className="relative flex items-center gap-4 sm:gap-5">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full blur-lg opacity-20 animate-pulse [animation-duration:3s]" style={{ background: 'var(--theme-primary)' }} />
                  <img src="/icons/money.png" alt="Earn money" className="relative w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] drop-shadow-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-theme-textPrimary font-bold text-base sm:text-xl leading-tight">
                    {t('visits.recommendBusinessTitle')}
                  </h3>
                  <p className="text-theme-textSecondary text-xs sm:text-sm mt-1">
                    {t('visits.recommendBusinessDesc')}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-opacity group-hover:opacity-90" style={{ color: '#001f3d', background: 'var(--theme-primary)' }}>
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('visits.recommendBusinessCta')}</span>
                  </span>
                </div>
              </div>
            </div>
          </Link>

          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <QrCode className="h-5 w-5" />
            {t('promotions.storesForYou')}
          </h2>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('promotions.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder={t('promotions.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('promotions.allCategories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <BusinessGrid businesses={filteredBusinesses} userId={user!.id} initialOfferId={offerId} />
        </div>
      )}

      {!isReferrerApproved && (
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {isReferrerSuspended
              ? t('promotions.suspendedMessage')
              : isReferrerPending
              ? t('promotions.pendingMessage')
              : t('promotions.defaultMessage')}
          </CardContent>
        </Card>
      )}


      {/* Referral History */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">{t('promotions.promotionHistory')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('promotions.promotionHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <Tabs defaultValue="all">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="all" className="text-xs sm:text-sm">{t('common.all')}</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">{t('common.pending')}</TabsTrigger>
              <TabsTrigger value="converted" className="text-xs sm:text-sm">{t('promotions.converted')}</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ReferralList referrals={referrals} businesses={businesses} />
            </TabsContent>
            <TabsContent value="pending">
              <ReferralList
                referrals={referrals.filter(
                  (r) => r.status === 'CREATED' || r.status === 'CHECKED_IN'
                )}
                businesses={businesses}
              />
            </TabsContent>
            <TabsContent value="converted">
              <ReferralList
                referrals={referrals.filter((r) => r.status === 'CONVERTED')}
                businesses={businesses}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Earnings Ledger */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">{t('promotions.earningsLedger')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('promotions.earningsLedgerDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {earnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {t('promotions.noEarnings')}
            </p>
          ) : (
            <div className="divide-y">
              {earnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between py-3 sm:py-4 gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{t('promotions.commissionEarned')}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(earning.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <span className="font-semibold text-sm sm:text-base">{formatCurrency(earning.amount)}</span>
                    <Badge
                      className="text-[10px] sm:text-xs"
                      variant={
                        earning.status === 'PAID'
                          ? 'success'
                          : earning.status === 'APPROVED'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {t(`promotions.earningStatus${earning.status.charAt(0) + earning.status.slice(1).toLowerCase()}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReferralList({
  referrals,
  businesses,
}: {
  referrals: Visit[]
  businesses: (Business & { offer?: Offer })[]
}) {
  const { t } = useTranslation()

  if (referrals.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t('promotions.noPromotions')}
      </p>
    )
  }

  return (
    <div className="divide-y max-h-80 overflow-auto">
      {referrals.map((referral) => {
        const business = businesses.find((b) => b.id === referral.businessId)
        return (
          <div
            key={referral.id}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{business?.name || t('common.unknown')}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(referral.createdAt)}
                </p>
              </div>
            </div>
            <Badge
              variant={
                referral.status === 'CONVERTED'
                  ? 'success'
                  : referral.status === 'REJECTED'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {referral.status === 'CONVERTED'
                ? t('promotions.statusConverted')
                : referral.status === 'CHECKED_IN'
                ? t('promotions.statusCheckedIn')
                : referral.status === 'REJECTED'
                ? t('promotions.statusRejected')
                : t('promotions.statusPending')}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

export default function ReferralsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ReferralsContent />
    </Suspense>
  )
}
