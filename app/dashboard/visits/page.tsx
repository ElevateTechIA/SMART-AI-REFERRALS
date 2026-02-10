'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
          throw new Error(result.error || 'Failed to load visit data')
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
          title: 'Error',
          description: 'Failed to load visit data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

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
          <h1 className="text-3xl font-bold tracking-tight">My Visits</h1>
          <p className="text-muted-foreground">
            Track your visits and rewards from promotions
          </p>
        </div>
        <Link href="/dashboard/referrals">
          <Button className="gap-2">
            <Share2 className="h-4 w-4" />
            Start Promoting
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">Places you&apos;ve visited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">{stats.pending} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRewards)}</div>
            <p className="text-xs text-muted-foreground">Earned from visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingRewards)}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Visits - Now showing CREATED visits from Firestore */}
      {stats.pending > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Visitas Pendientes</h2>
              <p className="text-muted-foreground">
                Muestra estos códigos QR en el negocio para hacer check-in
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {stats.pending} pendientes
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
                            {visit.business?.name || 'Unknown Business'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {visit.business?.category}
                          </CardDescription>
                          <p className="text-xs text-muted-foreground mt-1">
                            Creada el {formatDate(visit.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={visit.status === 'CHECKED_IN' ? 'default' : 'secondary'}
                      >
                        {visit.status === 'CHECKED_IN' ? 'Check-In Hecho' : 'Pendiente'}
                      </Badge>
                    </div>
                  </CardHeader>

                  {visit.status === 'CREATED' && qrImage && visit.checkInToken && (
                    <CardContent className="space-y-4">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-semibold mb-2">
                            Código QR de Check-In
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Muestra este código al personal del negocio
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
                            El QR expira en {daysRemaining}{' '}
                            {daysRemaining === 1 ? 'día' : 'días'}
                          </AlertDescription>
                        </Alert>

                        <div className="bg-blue-50 rounded-lg p-4 w-full">
                          <p className="text-sm font-semibold mb-2 text-blue-900">
                            Instrucciones:
                          </p>
                          <div className="text-xs text-blue-900 space-y-1">
                            <p>1. Muestra este QR al personal del negocio</p>
                            <p>2. Ellos lo escanearán para confirmar tu llegada</p>
                            <p>3. Después de tu compra, marcarán la conversión</p>
                            <p>4. ¡Tus recompensas serán procesadas!</p>
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
                          ¡Check-in completado! El negocio confirmará tu compra para
                          procesar las recompensas.
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
            Share & Earn More
          </CardTitle>
          <CardDescription>
            Loved a business? Share it with friends and earn commissions when they visit!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/referrals">
            <Button className="gap-2">
              Get Promo Links <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>Visit History</CardTitle>
          <CardDescription>All your visits and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Visits Yet</h3>
              <p className="text-muted-foreground mb-4">
                Scan a promo QR code or use a promo link to get started!
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
                          {visit.business?.name || 'Unknown Business'}
                        </h4>
                        <p className="text-sm text-muted-foreground break-words">
                          {visit.business?.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Visited {formatDate(visit.createdAt)}
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
                            ? 'Confirmed'
                            : visit.status === 'CHECKED_IN'
                            ? 'Checked In'
                            : visit.status === 'REJECTED'
                            ? 'Rejected'
                            : 'Pending'}
                        </Badge>
                        {visit.attributionType === 'REFERRER' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Via promotion
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
            <CardTitle>Rewards History</CardTitle>
            <CardDescription>Rewards earned from your visits</CardDescription>
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
                        <p className="font-medium">Reward from Visit</p>
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
