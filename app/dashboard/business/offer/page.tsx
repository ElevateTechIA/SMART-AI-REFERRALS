'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { apiGet, apiPatch } from '@/lib/api-client'
import type { Business, Offer } from '@/lib/types'
import { MAX_ACTIVE_OFFERS_PER_BUSINESS, isOfferActive } from '@/lib/offers-config'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  ArrowLeft,
  Plus,
  Archive,
  ArchiveRestore,
  Edit3,
  AlertCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function OffersListPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const loadData = async () => {
    if (!user) return
    try {
      // Find the user's business
      const businessQuery = query(
        collection(db, 'businesses'),
        where('ownerUserId', '==', user.id)
      )
      const snap = await getDocs(businessQuery)
      if (snap.empty) {
        router.push('/dashboard/business/setup')
        return
      }
      const bDoc = snap.docs[0]
      const bData = bDoc.data()
      const b: Business = {
        id: bDoc.id,
        ...bData,
        createdAt: bData.createdAt?.toDate(),
        updatedAt: bData.updatedAt?.toDate(),
      } as Business
      setBusiness(b)

      // Fetch all offers for this business (active + archived for the owner)
      const result = await apiGet<{ success: boolean; data: Offer[] }>(`/api/offers?businessId=${b.id}`)
      if (result.ok && result.data?.success) {
        setOffers(result.data.data || [])
      }
    } catch (e) {
      console.error('Error loading offers:', e)
      toast({ title: t('common.error'), description: 'Failed to load offers', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleToggleArchive = async (offer: Offer) => {
    const archived = isOfferActive(offer) // we're archiving when currently active
    setMutatingId(offer.id)
    try {
      const result = await apiPatch<{ success: boolean; error?: string }>(
        `/api/offers/${offer.id}/archive`,
        { archived }
      )
      if (!result.ok) {
        throw new Error(result.error || 'Failed to update offer status')
      }
      toast({
        title: archived ? t('businessOffer.archivedTitle', 'Offer archived') : t('businessOffer.restoredTitle', 'Offer restored'),
        description: archived
          ? t('businessOffer.archivedDesc', 'Customers can no longer see this offer.')
          : t('businessOffer.restoredDesc', 'Offer is active again.'),
      })
      await loadData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update offer'
      toast({ title: t('common.error'), description: msg, variant: 'destructive' })
    } finally {
      setMutatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!business) return null

  const activeOffers = offers.filter(isOfferActive)
  const archivedOffers = offers.filter((o) => !isOfferActive(o))
  const atLimit = activeOffers.length >= MAX_ACTIVE_OFFERS_PER_BUSINESS

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/business"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.backToDashboard')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('businessOffer.listTitle', 'Your offers')}</h1>
            <p className="text-muted-foreground">
              {t('businessOffer.listSubtitle', 'Manage the promotions your business publishes ({{active}}/{{limit}} active).', {
                active: activeOffers.length,
                limit: MAX_ACTIVE_OFFERS_PER_BUSINESS,
              })}
            </p>
          </div>
          <Link href={atLimit ? '#' : '/dashboard/business/offer/new'}>
            <Button disabled={atLimit} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('businessOffer.newOffer', 'New offer')}
            </Button>
          </Link>
        </div>
      </div>

      {atLimit && (
        <Card className="border-amber-300 bg-amber-50 mb-6">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              {t('businessOffer.limitReached', 'You have reached the limit of {{limit}} active offers. Archive one to create another.', {
                limit: MAX_ACTIVE_OFFERS_PER_BUSINESS,
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {offers.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('businessDashboard.noOfferConfigured')}</CardTitle>
            <CardDescription>{t('businessDashboard.noOfferDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/business/offer/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('businessDashboard.createOffer')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {activeOffers.length > 0 && (
        <section className="space-y-3 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('businessOffer.activeOffers', 'Active offers')}
          </h2>
          {activeOffers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              busy={mutatingId === offer.id}
              onArchive={() => handleToggleArchive(offer)}
            />
          ))}
        </section>
      )}

      {archivedOffers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('businessOffer.archivedOffers', 'Archived')}
          </h2>
          {archivedOffers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              busy={mutatingId === offer.id}
              onArchive={() => handleToggleArchive(offer)}
              archived
              canRestore={!atLimit}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function OfferRow({
  offer,
  busy,
  onArchive,
  archived = false,
  canRestore = true,
}: {
  offer: Offer
  busy: boolean
  onArchive: () => void
  archived?: boolean
  canRestore?: boolean
}) {
  const { t } = useTranslation()
  const promoLabel =
    offer.promotionType === 'discount_percent'
      ? `${offer.promotionValue}% off`
      : offer.promotionType === 'discount_fixed'
      ? `${formatCurrency(offer.promotionValue)} off`
      : offer.promotionType === 'free_item'
      ? t('businessOffer.promoFreeItem')
      : t('businessOffer.promoNone')

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {offer.image ? (
            <div className="relative h-20 w-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <Image src={offer.image} alt={offer.title || 'Offer'} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs">
              {t('businessOffer.noImage', 'No image')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">
                {offer.title || `${t('businessOffer.offerLabel', 'Offer')} ${offer.id.slice(-6)}`}
              </h3>
              <Badge variant={archived ? 'secondary' : 'success'}>
                {archived ? t('businessOffer.statusArchived', 'Archived') : t('common.active', 'Active')}
              </Badge>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {t('businessOffer.pricePerCustomerSummary')}
                : <span className="text-foreground font-medium">{formatCurrency(offer.pricePerNewCustomer)}</span>
              </span>
              <span className="text-muted-foreground">
                {t('businessOffer.promotion')}
                : <span className="text-foreground font-medium">{promoLabel}</span>
              </span>
              <span className="text-muted-foreground">
                {t('businessOffer.promoterCommissionSummary')}
                : <span className="text-foreground font-medium">{formatCurrency(offer.referrerCommissionAmount)}</span>
              </span>
              <span className="text-muted-foreground">
                {t('businessOffer.consumerRewardSummary')}
                : <span className="text-foreground font-medium">{formatCurrency(offer.consumerRewardValue)}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Link href={`/dashboard/business/offer/${offer.id}`}>
              <Button size="sm" variant="outline" className="gap-1 w-full">
                <Edit3 className="h-3.5 w-3.5" />
                {t('common.edit', 'Edit')}
              </Button>
            </Link>
            <Button
              size="sm"
              variant={archived ? 'default' : 'outline'}
              className="gap-1"
              onClick={onArchive}
              disabled={busy || (archived && !canRestore)}
              title={archived && !canRestore ? t('businessOffer.cannotRestoreLimit', 'Active limit reached') : undefined}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : archived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              {archived
                ? t('businessOffer.restore', 'Restore')
                : t('businessOffer.archive', 'Archive')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
