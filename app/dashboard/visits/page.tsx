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
import type { Business, Visit, Earning } from '@/lib/types'
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
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { generateCheckInQRImage, getDaysRemaining } from '@/lib/qr-checkin'

interface VisitsApiResponse {
  visits: (Visit & { business?: Business })[]
  rewards: Earning[]
}

export default function VisitsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [visits, setVisits] = useState<(Visit & { business?: Business })[]>([])
  const [rewards, setRewards] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())

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

        setVisits(visitsList)
        setRewards(rewardsList)
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
          <p className="text-muted-foreground">
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
            <CardTitle className="text-sm font-medium">{t('visits.totalRewards')}</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRewards)}</div>
            <p className="text-xs text-muted-foreground">{t('visits.earnedFromVisits')}</p>
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
      </div>

      {/* Pending Visits - Now showing CREATED visits from Firestore */}
      {stats.pending > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t('visits.pendingVisits')}</h2>
              <p className="text-muted-foreground">
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

              return (
                <Card key={visit.id} className="border-primary bg-primary/5">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {visit.business?.name || t('common.unknown')}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {visit.business?.category}
                          </CardDescription>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('visits.createdOn', { date: formatDate(visit.createdAt) })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={visit.status === 'CHECKED_IN' ? 'default' : 'secondary'}
                      >
                        {visit.status === 'CHECKED_IN' ? t('visits.checkInDone') : t('visits.pendingStatus')}
                      </Badge>
                    </div>
                  </CardHeader>

                  {visit.status === 'CREATED' && qrImage && visit.checkInToken && (
                    <CardContent className="space-y-4">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-semibold mb-2">
                            {t('visits.checkInQR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('visits.showQRToStaff')}
                          </p>
                        </div>

                        <div className="flex justify-center">
                          <img
                            src={qrImage}
                            alt="Check-in QR Code"
                            className="rounded-lg border-2 border-primary w-64 h-64"
                          />
                        </div>

                        <Alert className="w-full">
                          <Clock className="h-4 w-4" />
                          <AlertDescription>
                            {t('visits.qrExpires', { days: daysRemaining, dayWord: daysRemaining === 1 ? t('visits.day') : t('visits.days') })}
                          </AlertDescription>
                        </Alert>

                        <div className="bg-blue-50 rounded-lg p-4 w-full">
                          <p className="text-sm font-semibold mb-2 text-blue-900">
                            {t('visits.instructions')}
                          </p>
                          <div className="text-xs text-blue-900 space-y-1">
                            <p>{t('visits.instruction1')}</p>
                            <p>{t('visits.instruction2')}</p>
                            <p>{t('visits.instruction3')}</p>
                            <p>{t('visits.instruction4')}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}

                  {visit.status === 'CHECKED_IN' && (
                    <CardContent>
                      <Alert className="border-green-500 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-900">
                          {t('visits.checkInComplete')}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  )}
                </Card>
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
        <CardContent>
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
            <div className="divide-y">
              {visits.map((visit) => (
                <div key={visit.id} className="py-4">
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
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
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
                </div>
              ))}
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
    </div>
  )
}
