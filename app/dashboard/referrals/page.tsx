'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import type { Business, Offer, Visit, Earning } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReferralCardCarousel } from '@/components/referral-card-carousel'
import {
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  QrCode,
  Building2,
  Clock,
  ShieldAlert,
} from 'lucide-react'

interface ReferralsApiResponse {
  businesses: (Business & { offer?: Offer; images?: string[] })[]
  referrals: Visit[]
  earnings: Earning[]
  referrerStatus: string | null
}

function ReferralsContent() {
  useSearchParams() // keep Suspense boundary working

  const { user } = useAuth()
  const { toast } = useToast()
  const [businesses, setBusinesses] = useState<(Business & { offer?: Offer; images?: string[] })[]>([])
  const [referrals, setReferrals] = useState<Visit[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [serverReferrerStatus, setServerReferrerStatus] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const result = await apiGet<ReferralsApiResponse>('/api/referrals')

        if (!result.ok) {
          throw new Error(result.error || 'Failed to load referral data')
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
          title: 'Error',
          description: 'Failed to load referral data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Referral Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Share referral links and earn commissions when friends visit
        </p>
      </div>

      {/* Pending Approval Banner */}
      {isReferrerPending && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="flex items-center gap-4 py-4">
            <Clock className="h-8 w-8 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800">Pending Approval</h3>
              <p className="text-sm text-yellow-700">
                Your referrer account is pending admin approval. You will be able to share referral links once approved.
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
              <h3 className="font-semibold text-red-800">Account Suspended</h3>
              <p className="text-sm text-red-700">
                Your referrer account has been suspended. Please contact support for more information.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">People you&apos;ve referred</p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.conversions}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats.totalReferrals > 0
                ? `${Math.round((stats.conversions / stats.totalReferrals) * 100)}% conversion rate`
                : 'Start referring!'}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.pendingEarnings)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Cards Carousel */}
      {isReferrerApproved && businesses.length > 0 && (
        <div className="overflow-hidden -mx-4 px-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Your Referral Cards
            </h2>
            <p className="text-xs text-muted-foreground">
              Swipe to browse businesses. Share your unique link or QR code.
            </p>
          </div>
          <ReferralCardCarousel businesses={businesses} userId={user!.id} />
        </div>
      )}

      {!isReferrerApproved && (
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {isReferrerSuspended
              ? 'Your referrer account is suspended. You cannot share referral links.'
              : isReferrerPending
              ? 'Your account is pending approval. Once approved, your referral cards will appear here.'
              : 'Referral cards will appear here once businesses are available.'}
          </CardContent>
        </Card>
      )}

      {isReferrerApproved && businesses.length === 0 && (
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No businesses available for referral yet.
          </CardContent>
        </Card>
      )}

      {/* Referral History */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Referral History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your recent referrals and their status</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <Tabs defaultValue="all">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
              <TabsTrigger value="converted" className="text-xs sm:text-sm">Converted</TabsTrigger>
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
          <CardTitle className="text-base sm:text-lg">Earnings Ledger</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Track your commission earnings and payout status</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {earnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No earnings yet. Start referring to earn commissions!
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
                      <p className="font-medium text-sm sm:text-base truncate">Commission Earned</p>
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
                      {earning.status}
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
  if (referrals.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No referrals found
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
                <p className="font-medium truncate">{business?.name || 'Unknown'}</p>
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
              {referral.status}
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
