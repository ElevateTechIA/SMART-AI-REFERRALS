'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { apiPost } from '@/lib/api-client'
import type { Business, Offer, Visit, Charge } from '@/lib/types'
import { formatCurrency, formatDate, generateReferralUrl } from '@/lib/utils'
import {
  Building2,
  Users,
  DollarSign,
  QrCode,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Copy,
  ExternalLink,
  Camera,
} from 'lucide-react'
import { QRScanner } from '@/components/business/qr-scanner'

export default function BusinessDashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [business, setBusiness] = useState<Business | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<string | null>(null)

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return

      try {
        // Fetch user's business
        const businessQuery = query(
          collection(db, 'businesses'),
          where('ownerUserId', '==', user.id)
        )
        const businessSnapshot = await getDocs(businessQuery)

        if (businessSnapshot.empty) {
          setLoading(false)
          return
        }

        const businessDoc = businessSnapshot.docs[0]
        const businessData = businessDoc.data()
        const fetchedBusiness: Business = {
          id: businessDoc.id,
          ...businessData,
          createdAt: businessData.createdAt?.toDate(),
          updatedAt: businessData.updatedAt?.toDate(),
        } as Business
        setBusiness(fetchedBusiness)

        // Fetch offer
        const offerDoc = await getDoc(doc(db, 'offers', fetchedBusiness.id))
        if (offerDoc.exists()) {
          const offerData = offerDoc.data()
          setOffer({
            id: offerDoc.id,
            ...offerData,
            createdAt: offerData.createdAt?.toDate(),
            updatedAt: offerData.updatedAt?.toDate(),
          } as Offer)
        }

        // Fetch visits (without orderBy to avoid index requirement, sort client-side)
        const visitsQuery = query(
          collection(db, 'visits'),
          where('businessId', '==', fetchedBusiness.id)
        )
        const visitsSnapshot = await getDocs(visitsQuery)
        const fetchedVisits: Visit[] = []
        visitsSnapshot.forEach((doc) => {
          const data = doc.data()
          fetchedVisits.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Visit)
        })
        // Sort by createdAt descending client-side
        fetchedVisits.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        setVisits(fetchedVisits)

        // Fetch charges (without orderBy to avoid index requirement, sort client-side)
        const chargesQuery = query(
          collection(db, 'charges'),
          where('businessId', '==', fetchedBusiness.id)
        )
        const chargesSnapshot = await getDocs(chargesQuery)
        const fetchedCharges: Charge[] = []
        chargesSnapshot.forEach((doc) => {
          const data = doc.data()
          fetchedCharges.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Charge)
        })
        // Sort by createdAt descending client-side
        fetchedCharges.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        setCharges(fetchedCharges)
      } catch (error) {
        console.error('Error fetching business data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load business data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessData()
  }, [user, toast])

  const handleCheckIn = async (scanResult: { visitId: string; token: string }) => {
    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/visits/${scanResult.visitId}/check-in`,
        { token: scanResult.token }
      )

      if (!result.ok) {
        throw new Error(result.error || 'Check-in failed')
      }

      // Update local state - refetch data to get latest
      if (user && business) {
        const visitsQuery = query(
          collection(db, 'visits'),
          where('businessId', '==', business.id)
        )
        const visitsSnapshot = await getDocs(visitsQuery)
        const fetchedVisits: Visit[] = []
        visitsSnapshot.forEach((doc) => {
          const data = doc.data()
          fetchedVisits.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            checkedInAt: data.checkedInAt?.toDate(),
          } as Visit)
        })
        fetchedVisits.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        setVisits(fetchedVisits)
      }

      toast({
        title: 'Check-In Exitoso',
        description: 'Cliente verificado exitosamente.',
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Check-in failed'
      throw new Error(errorMessage)
    }
  }

  const handleConfirmConversion = async (visitId: string) => {
    if (!user || !business) return

    setConverting(visitId)
    try {
      // API uses auth token to verify business owner - no need to pass user ID
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/visits/${visitId}/convert`,
        {}
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to confirm conversion')
      }

      // Update local state
      setVisits((prev) =>
        prev.map((v) =>
          v.id === visitId ? { ...v, status: 'CONVERTED' as const } : v
        )
      )

      toast({
        title: 'Conversion Confirmed',
        description: 'The customer has been converted and charges applied.',
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm conversion'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setConverting(null)
    }
  }

  const copyReferralLink = () => {
    if (!business) return
    const url = generateReferralUrl(business.id)
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link Copied',
      description: 'Promo link copied to clipboard',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">No Business Found</h1>
        <p className="text-muted-foreground mb-6">
          You haven&apos;t registered a business yet. Get started by creating your business profile.
        </p>
        <Link href="/dashboard/business/setup">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Register Your Business
          </Button>
        </Link>
      </div>
    )
  }

  const stats = {
    totalVisits: visits.length,
    conversions: visits.filter((v) => v.status === 'CONVERTED').length,
    pending: visits.filter((v) => v.status === 'CREATED').length,
    checkedIn: visits.filter((v) => v.status === 'CHECKED_IN').length,
    totalOwed: charges.filter((c) => c.status === 'OWED').reduce((sum, c) => sum + c.amount, 0),
    totalPaid: charges.filter((c) => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
          <p className="text-muted-foreground">
            Business Dashboard - {business.category}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              business.status === 'active'
                ? 'success'
                : business.status === 'pending'
                ? 'warning'
                : 'destructive'
            }
          >
            {business.status}
          </Badge>
          <Link href="/dashboard/business/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} pending check-in
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalVisits > 0
                ? `${Math.round((stats.conversions / stats.totalVisits) * 100)}% conversion rate`
                : 'No visits yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOwed)}</div>
            <p className="text-xs text-muted-foreground">To platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Your Promo Link
          </CardTitle>
          <CardDescription>
            Share this link to get direct promotions (platform attribution)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="bg-muted rounded-md px-4 py-2 text-sm font-mono overflow-x-auto">
              {generateReferralUrl(business.id)}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={copyReferralLink}>
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" className="flex-1 gap-2" asChild>
                <a
                  href={generateReferralUrl(business.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Link
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Settings */}
      {offer ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Offer</CardTitle>
                <CardDescription>Your active promo offer settings</CardDescription>
              </div>
              <Link href="/dashboard/business/offer">
                <Button variant="outline" size="sm">
                  Edit Offer
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Price per Customer</p>
                <p className="text-lg font-semibold">{formatCurrency(offer.pricePerNewCustomer)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promoter Commission</p>
                <p className="text-lg font-semibold">{formatCurrency(offer.referrerCommissionAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consumer Reward</p>
                <p className="text-lg font-semibold">
                  {offer.consumerRewardType === 'none'
                    ? 'None'
                    : `${formatCurrency(offer.consumerRewardValue)} ${offer.consumerRewardType}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={offer.active ? 'success' : 'secondary'}>
                  {offer.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Offer Configured</CardTitle>
            <CardDescription>
              Create an offer to start accepting promotions and paying commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/business/offer">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Offer
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Visits & Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Visits & Conversions</CardTitle>
          <CardDescription>
            View all visits and confirm customer conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scanner">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="scanner">
                <Camera className="h-4 w-4 mr-2" />
                Scanner
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pendientes ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="checkedin">
                Check-In ({stats.checkedIn})
              </TabsTrigger>
              <TabsTrigger value="converted">
                Convertidos ({stats.conversions})
              </TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="mt-4">
              <QRScanner onScanSuccess={handleCheckIn} />
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <VisitsList
                visits={visits.filter((v) => v.status === 'CREATED')}
                onConfirm={handleConfirmConversion}
                converting={converting}
                showActions={false}
              />
            </TabsContent>

            <TabsContent value="checkedin" className="mt-4">
              <VisitsList
                visits={visits.filter((v) => v.status === 'CHECKED_IN')}
                onConfirm={handleConfirmConversion}
                converting={converting}
                showActions
              />
            </TabsContent>

            <TabsContent value="converted" className="mt-4">
              <VisitsList
                visits={visits.filter((v) => v.status === 'CONVERTED')}
                onConfirm={handleConfirmConversion}
                converting={converting}
              />
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <VisitsList
                visits={visits}
                onConfirm={handleConfirmConversion}
                converting={converting}
                showActions
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function VisitsList({
  visits,
  onConfirm,
  converting,
  showActions = false,
}: {
  visits: Visit[]
  onConfirm: (id: string) => void
  converting: string | null
  showActions?: boolean
}) {
  if (visits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No visits found
      </div>
    )
  }

  return (
    <div className="divide-y">
      {visits.map((visit) => (
        <div
          key={visit.id}
          className="flex items-center justify-between py-4 gap-4"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">
                Visit #{visit.id.slice(-6)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(visit.createdAt)} •{' '}
                {visit.attributionType === 'REFERRER' ? 'Promoter' : 'Platform'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <Badge
                variant={
                  visit.status === 'CONVERTED'
                    ? 'success'
                    : visit.status === 'REJECTED'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {visit.status}
              </Badge>
              {!visit.isNewCustomer && (
                <span className="text-xs text-destructive mt-1">Repeat customer</span>
              )}
            </div>

            {showActions &&
              visit.isNewCustomer &&
              visit.status !== 'CONVERTED' &&
              visit.status !== 'REJECTED' && (
                <Button
                  size="sm"
                  onClick={() => onConfirm(visit.id)}
                  disabled={converting === visit.id}
                >
                  {converting === visit.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm
                    </>
                  )}
                </Button>
              )}
          </div>
        </div>
      ))}
    </div>
  )
}
