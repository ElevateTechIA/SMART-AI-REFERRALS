'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import type { Business, Offer, Visit, Earning } from '@/lib/types'
import { formatCurrency, formatDate, generateReferralUrl } from '@/lib/utils'
import QRCode from 'qrcode'
import {
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  Loader2,
  QrCode,
  Download,
  Share2,
  Building2,
} from 'lucide-react'

interface ReferralsApiResponse {
  businesses: (Business & { offer?: Offer })[]
  referrals: Visit[]
  earnings: Earning[]
}

function ReferralsContent() {
  const searchParams = useSearchParams()
  const selectedBusinessId = searchParams.get('business')

  const { user } = useAuth()
  const { toast } = useToast()
  const [businesses, setBusinesses] = useState<(Business & { offer?: Offer })[]>([])
  const [referrals, setReferrals] = useState<Visit[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(selectedBusinessId)
  const [qrCode, setQrCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const result = await apiGet<ReferralsApiResponse>('/api/referrals')

        if (!result.ok) {
          throw new Error(result.error || 'Failed to load referral data')
        }

        const data = result.data!

        // Parse dates from API response
        const businessList = data.businesses.map((b) => ({
          ...b,
          createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
          updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
        })) as (Business & { offer?: Offer })[]

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

        // Set initial selected business
        if (selectedBusinessId && businessList.some((b) => b.id === selectedBusinessId)) {
          setSelectedBusiness(selectedBusinessId)
        } else if (businessList.length > 0) {
          setSelectedBusiness(businessList[0].id)
        }
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
  }, [user, selectedBusinessId, toast])

  // Generate QR code when business is selected
  useEffect(() => {
    const generateQR = async () => {
      if (!selectedBusiness || !user) return
      const url = generateReferralUrl(selectedBusiness, user.id)
      try {
        const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 })
        setQrCode(qr)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }
    generateQR()
  }, [selectedBusiness, user])

  const copyReferralLink = () => {
    if (!selectedBusiness || !user) return
    const url = generateReferralUrl(selectedBusiness, user.id)
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link Copied',
      description: 'Referral link copied to clipboard',
    })
  }

  const downloadQRCode = () => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.download = 'referral-qr-code.png'
    link.href = qrCode
    link.click()
  }

  const shareLink = async () => {
    if (!selectedBusiness || !user) return
    const url = generateReferralUrl(selectedBusiness, user.id)
    const business = businesses.find((b) => b.id === selectedBusiness)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${business?.name}!`,
          text: `I recommend ${business?.name}. Use my referral link to get rewards!`,
          url,
        })
      } catch (error) {
        // User cancelled
      }
    } else {
      copyReferralLink()
    }
  }

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

  const currentBusiness = businesses.find((b) => b.id === selectedBusiness)

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Referral Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Share referral links and earn commissions when friends visit
        </p>
      </div>

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

      <div className="grid gap-4 sm:gap-8 lg:grid-cols-2">
        {/* QR Code & Referral Link */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
              Your Referral Link
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Select a business and share your unique referral link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            {businesses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No businesses available for referral yet.
              </p>
            ) : (
              <>
                {/* Business Selector - scrollable on mobile */}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {businesses.map((business) => (
                    <Button
                      key={business.id}
                      variant={selectedBusiness === business.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBusiness(business.id)}
                      className="text-xs sm:text-sm whitespace-nowrap"
                    >
                      {business.name}
                    </Button>
                  ))}
                </div>

                {currentBusiness && (
                  <>
                    {/* Business Info */}
                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                      <h4 className="font-semibold text-sm sm:text-base">{currentBusiness.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{currentBusiness.category}</p>
                      {currentBusiness.offer && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            Earn {formatCurrency(currentBusiness.offer.referrerCommissionAmount)} per referral
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* QR Code */}
                    {qrCode && (
                      <div className="flex justify-center">
                        <img
                          src={qrCode}
                          alt="Referral QR Code"
                          className="rounded-lg border w-40 h-40 sm:w-auto sm:h-auto max-w-[200px]"
                        />
                      </div>
                    )}

                    {/* Link and Actions */}
                    <div className="space-y-2">
                      <div className="bg-muted rounded-md px-3 py-2 text-xs sm:text-sm font-mono overflow-x-auto whitespace-nowrap">
                        {generateReferralUrl(selectedBusiness!, user?.id)}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button onClick={copyReferralLink} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Copy Link</span>
                          <span className="sm:hidden">Copy</span>
                        </Button>
                        <Button variant="outline" onClick={downloadQRCode} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Download QR</span>
                          <span className="sm:hidden">QR</span>
                        </Button>
                        <Button variant="outline" onClick={shareLink} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                          <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
      </div>

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
