'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { apiPost, apiGet } from '@/lib/api-client'
import type { Business, Offer, Visit, Charge, Receipt } from '@/lib/types'
import { formatCurrency, formatDate, generateReferralUrl } from '@/lib/utils'
import { SearchAndFilter, Pagination, paginate } from '@/components/list-controls'
import {
  Building2,
  Users,
  DollarSign,
  QrCode,
  Settings,
  CheckCircle,
  Loader2,
  Plus,
  Copy,
  ExternalLink,
  ReceiptText,
} from 'lucide-react'
import { ReceiptDialog } from '@/components/receipt/receipt-dialog'
import { ReceiptPreview } from '@/components/receipt/receipt-preview'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { QRScanner, type ScanResult } from '@/components/business/qr-scanner'
import { useTheme } from '@/lib/theme/theme-provider'
import { BusinessCalendar } from '@/components/dashboard/business-calendar'
import { themes } from '@/lib/theme/colors'

export default function BusinessDashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [business, setBusiness] = useState<Business | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<string | null>(null)
  const [promoQr, setPromoQr] = useState<string | null>(null)

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
          title: t('common.error'),
          description: t('businessDashboard.failedToLoad'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessData()
  }, [user, toast, t])

  useEffect(() => {
    if (!business) return
    QRCode.toDataURL(generateReferralUrl(business.id), {
      width: 240,
      margin: 2,
      color: { dark: themes[theme].colors.accent, light: '#ffffff' },
    })
      .then(setPromoQr)
      .catch(console.error)
  }, [business, theme])

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

      // Update local visit state
      setVisits((prev) =>
        prev.map((v) =>
          v.id === visitId ? { ...v, status: 'CONVERTED' as const } : v
        )
      )

      // Refetch charges to reflect the new charge created by the conversion
      if (business) {
        const chargesQuery = query(
          collection(db, 'charges'),
          where('businessId', '==', business.id)
        )
        const chargesSnapshot = await getDocs(chargesQuery)
        const freshCharges: Charge[] = []
        chargesSnapshot.forEach((d) => {
          const data = d.data()
          freshCharges.push({
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Charge)
        })
        freshCharges.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        setCharges(freshCharges)
      }

      toast({
        title: t('businessDashboard.conversionConfirmed'),
        description: t('businessDashboard.conversionConfirmedDesc'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm conversion'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setConverting(null)
    }
  }

  const handleQRScan = async (scanResult: ScanResult) => {
    const result = await apiPost<{ success: boolean; error?: string }>(
      `/api/visits/${scanResult.visitId}/convert`,
      { token: scanResult.token }
    )
    if (!result.ok) {
      throw new Error(result.error || 'Failed to confirm conversion')
    }
    // Update local visit state
    setVisits((prev) =>
      prev.map((v) =>
        v.id === scanResult.visitId ? { ...v, status: 'CONVERTED' as const } : v
      )
    )
    // Refetch charges
    if (business) {
      const chargesQuery = query(
        collection(db, 'charges'),
        where('businessId', '==', business.id)
      )
      const chargesSnapshot = await getDocs(chargesQuery)
      const freshCharges: Charge[] = []
      chargesSnapshot.forEach((d) => {
        const data = d.data()
        freshCharges.push({
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Charge)
      })
      freshCharges.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      setCharges(freshCharges)
    }
    toast({
      title: t('businessDashboard.conversionConfirmed'),
      description: t('businessDashboard.conversionConfirmedDesc'),
    })
  }

  const copyReferralLink = () => {
    if (!business) return
    const url = generateReferralUrl(business.id)
    navigator.clipboard.writeText(url)
    toast({
      title: t('businessDashboard.linkCopied'),
      description: t('businessDashboard.linkCopiedDesc'),
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
        <h1 className="text-2xl font-bold mb-2">{t('businessDashboard.noBusinessFound')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('businessDashboard.noBusinessDesc')}
        </p>
        <Link href="/dashboard/business/setup">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t('businessDashboard.registerBusiness')}
          </Button>
        </Link>
      </div>
    )
  }

  const convertedVisits = visits.filter((v) => v.status === 'CONVERTED')
  const stats = {
    totalVisits: visits.length,
    conversions: convertedVisits.length,
    newCustomers: convertedVisits.filter((v) => v.isNewCustomer).length,
    repeatCustomers: convertedVisits.filter((v) => !v.isNewCustomer).length,
    pending: visits.filter((v) => v.status === 'CREATED' || v.status === 'CHECKED_IN').length,
    totalOwed: charges.filter((c) => c.status === 'OWED').reduce((sum, c) => sum + c.amount, 0),
    totalPaid: charges.filter((c) => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
  }

  const isAdmin = user?.roles?.includes('admin') ?? false

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
          <p className="text-muted-foreground">
            {t('businessDashboard.businessDashboard')} - {business.category}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/business/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              {t('businessDashboard.settings')}
            </Button>
          </Link>
          <Badge
            variant={
              business.status === 'active'
                ? 'success'
                : business.status === 'pending'
                ? 'warning'
                : 'destructive'
            }
          >
            {business.status === 'active' ? t('common.active', 'Active') : business.status === 'pending' ? t('common.pending', 'Pending') : t('common.suspended', 'Suspended')}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('businessDashboard.totalVisits')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">
              {t('businessDashboard.pendingConversion', { count: stats.pending })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('businessDashboard.conversions')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversions}</div>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-muted-foreground">
                {stats.totalVisits > 0
                  ? t('businessDashboard.conversionRate', { rate: Math.round((stats.conversions / stats.totalVisits) * 100) })
                  : t('businessDashboard.noVisitsYet')}
              </p>
              {stats.conversions > 0 && (
                <>
                  <p className="text-xs text-green-600">
                    {t('businessDashboard.newCustomers')}: {stats.newCustomers}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('businessDashboard.repeatCustomers')}: {stats.repeatCustomers}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        {isAdmin && (
          <>
            <Card className={theme === 'eliv' ? 'bg-[#d6fd79] border-[#d6fd79]' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${theme === 'eliv' ? 'text-black' : ''}`}>{t('businessDashboard.amountOwed')}</CardTitle>
                <DollarSign className={`h-4 w-4 ${theme === 'eliv' ? 'text-black/60' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${theme === 'eliv' ? 'text-black' : ''}`}>{formatCurrency(stats.totalOwed)}</div>
                <p className={`text-xs ${theme === 'eliv' ? 'text-black/60' : 'text-muted-foreground'}`}>{t('businessDashboard.toPlatform')}</p>
              </CardContent>
            </Card>
            <Card className={theme === 'eliv' ? 'bg-[#d6fd79] border-[#d6fd79]' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${theme === 'eliv' ? 'text-black' : ''}`}>{t('businessDashboard.totalPaid')}</CardTitle>
                <DollarSign className={`h-4 w-4 ${theme === 'eliv' ? 'text-black/60' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${theme === 'eliv' ? 'text-black' : ''}`}>{formatCurrency(stats.totalPaid)}</div>
                <p className={`text-xs ${theme === 'eliv' ? 'text-black/60' : 'text-muted-foreground'}`}>{t('businessDashboard.allTime')}</p>
              </CardContent>
            </Card>
          </>
        )}

      </div>

      {/* Activity Calendar */}
      <BusinessCalendar visits={visits} charges={charges} />

      {/* Offer Settings */}
      {offer ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('businessDashboard.currentOffer')}</CardTitle>
                <CardDescription>{t('businessDashboard.currentOfferDesc')}</CardDescription>
              </div>
              <Link href="/dashboard/business/offer">
                <Button variant="outline" size="sm">
                  {t('businessDashboard.editOffer')}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {offer.image && (
              <div className="relative h-40 w-full rounded-lg overflow-hidden mb-4">
                <Image
                  src={offer.image}
                  alt={t('businessDashboard.currentOffer')}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('businessDashboard.pricePerCustomer')}</p>
                <p className="text-lg font-semibold">{formatCurrency(offer.pricePerNewCustomer)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('businessDashboard.promotion')}</p>
                <p className="text-lg font-semibold">
                  {offer.promotionType === 'discount_percent'
                    ? t('businessDashboard.promoDiscountPercent', { value: offer.promotionValue })
                    : offer.promotionType === 'discount_fixed'
                    ? t('businessDashboard.promoDiscountFixed', { value: formatCurrency(offer.promotionValue) })
                    : offer.promotionType === 'free_item'
                    ? t('businessDashboard.promoFreeItem')
                    : t('businessDashboard.none')}
                </p>
                {offer.promotionDescription && (
                  <p className="text-xs text-muted-foreground mt-1">{offer.promotionDescription}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('businessDashboard.status')}</p>
                <Badge variant={offer.active ? 'success' : 'secondary'}>
                  {offer.active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('businessDashboard.noOfferConfigured')}</CardTitle>
            <CardDescription>
              {t('businessDashboard.noOfferDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/business/offer">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('businessDashboard.createOffer')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t('businessDashboard.yourPromoLink')}
          </CardTitle>
          <CardDescription>
            {t('businessDashboard.promoLinkDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100">
                {promoQr ? (
                  <img src={promoQr} alt="QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 bg-muted animate-pulse rounded-xl" />
                )}
              </div>
            </div>

            <div className="bg-muted rounded-md px-4 py-2 text-sm font-mono overflow-x-auto text-center text-foreground">
              {generateReferralUrl(business.id)}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={copyReferralLink}>
                <Copy className="h-4 w-4" />
                {t('common.copyLink')}
              </Button>
              <Button variant="outline" className="flex-1 gap-2" asChild>
                <a
                  href={generateReferralUrl(business.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('common.openLink')}
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner */}
      <QRScanner onScanSuccess={handleQRScan} />

      {/* Visits & Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('businessDashboard.visitsConversions')}</CardTitle>
          <CardDescription>
            {t('businessDashboard.visitsConversionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="pending" className="text-xs sm:text-sm">
                  {t('businessDashboard.tabPending', { count: stats.pending })}
                </TabsTrigger>
                <TabsTrigger value="converted" className="text-xs sm:text-sm">
                  {t('businessDashboard.tabConverted', { count: stats.conversions })}
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  {t('businessDashboard.tabAll')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="mt-4">
              <VisitsList
                visits={visits.filter((v) => v.status === 'CREATED' || v.status === 'CHECKED_IN')}
                onConfirm={handleConfirmConversion}
                converting={converting}
                showActions={false}
                businessId={business.id}
              />
            </TabsContent>

            <TabsContent value="converted" className="mt-4">
              <VisitsList
                visits={visits.filter((v) => v.status === 'CONVERTED')}
                onConfirm={handleConfirmConversion}
                converting={converting}
                businessId={business.id}
              />
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <VisitsList
                visits={visits}
                onConfirm={handleConfirmConversion}
                converting={converting}
                showActions
                businessId={business.id}
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
  businessId,
}: {
  visits: Visit[]
  onConfirm: (id: string) => void
  converting: string | null
  showActions?: boolean
  businessId: string
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [visitSearch, setVisitSearch] = useState('')
  const [visitPage, setVisitPage] = useState(1)
  const [receiptDialogVisitId, setReceiptDialogVisitId] = useState<string | null>(null)
  const [visitReceipts, setVisitReceipts] = useState<Record<string, boolean>>({})
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  // Check which visits already have receipts
  useEffect(() => {
    const checkReceipts = async () => {
      const receiptsMap: Record<string, boolean> = {}
      for (const visit of visits) {
        if (visit.receiptId) {
          receiptsMap[visit.id] = true
        }
      }
      setVisitReceipts(receiptsMap)
    }
    checkReceipts()
  }, [visits])

  const handleViewReceipt = async (visitId: string) => {
    setLoadingReceipt(true)
    try {
      const res = await apiGet<{ receipt: Receipt }>(`/api/receipts?visitId=${visitId}`)
      if (res.data?.receipt) {
        setViewingReceipt(res.data.receipt)
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('receipt.fetchError', 'Could not load receipt'),
        variant: 'destructive',
      })
    } finally {
      setLoadingReceipt(false)
    }
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

  const visitSearchLower = visitSearch.toLowerCase()
  const filteredVisits = visits.filter((visit) => {
    if (visitSearch && !visit.id.toLowerCase().includes(visitSearchLower)) return false
    return true
  })
  const { paged: pagedVisits, totalPages: visitTotalPages } = paginate(filteredVisits, visitPage)

  if (visits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('businessDashboard.noVisitsFound')}
      </div>
    )
  }

  return (
    <>
      {visits.length > 10 && (
        <SearchAndFilter
          search={visitSearch}
          onSearchChange={(v) => { setVisitSearch(v); setVisitPage(1) }}
          searchPlaceholder={t('businessDashboard.searchVisitPlaceholder')}
        />
      )}
      <div className="divide-y">
        {pagedVisits.map((visit) => (
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
                  {t('businessDashboard.visitNumber', { id: visit.id.slice(-6) })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(visit.createdAt)} •{' '}
                  {visit.attributionType === 'REFERRER' ? t('admin.promoter') : t('admin.platform')}
                </p>
                {visitReceipts[visit.id] && (
                  <button
                    onClick={() => handleViewReceipt(visit.id)}
                    disabled={loadingReceipt}
                    className="text-xs text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <ReceiptText className="h-3 w-3" />
                    {t('receipt.receiptAttached')}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                  {visit.status === 'CONVERTED'
                    ? t('businessDashboard.statusConverted')
                    : visit.status === 'CHECKED_IN'
                    ? t('businessDashboard.statusCheckedIn')
                    : visit.status === 'REJECTED'
                    ? t('businessDashboard.statusRejected')
                    : t('businessDashboard.statusPending')}
                </Badge>
                {!visit.isNewCustomer && (
                  <span className="text-xs text-destructive mt-1">{t('businessDashboard.repeatCustomer')}</span>
                )}
              </div>

              {/* Receipt scan button */}
              {!visitReceipts[visit.id] && visit.status !== 'REJECTED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReceiptDialogVisitId(visit.id)}
                  title={t('receipt.scanReceipt')}
                >
                  <ReceiptText className="h-4 w-4" />
                </Button>
              )}

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
                        {t('common.confirm')}
                      </>
                    )}
                  </Button>
                )}
            </div>
          </div>
        ))}
      </div>
      <Pagination page={visitPage} totalPages={visitTotalPages} onPageChange={setVisitPage} />

      {/* Receipt Upload Dialog */}
      <ReceiptDialog
        open={!!receiptDialogVisitId}
        onOpenChange={(open) => !open && setReceiptDialogVisitId(null)}
        visitId={receiptDialogVisitId || ''}
        businessId={businessId}
        onSuccess={handleReceiptSuccess}
      />

      {/* Receipt View Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('receipt.receiptDetails', 'Receipt Details')}</DialogTitle>
          </DialogHeader>
          {viewingReceipt && (
            <ReceiptPreview receipt={viewingReceipt} showImage />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
