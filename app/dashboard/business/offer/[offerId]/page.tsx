'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { apiGet, apiPost, apiPut, apiUpload } from '@/lib/api-client'
import type { Business, Offer, PromotionType } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { DEFAULT_COMMISSION_SPLIT, type CommissionSplit } from '@/lib/commission-config'
import { Loader2, DollarSign, Building2, ImagePlus, Gift, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

/**
 * Single-offer create/edit form.
 *
 * Route matrix:
 *   - `/dashboard/business/offer/new`          → create flow (no offerId yet)
 *   - `/dashboard/business/offer/[offerId]`    → edit flow for that offer
 */
export default function OfferEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()

  const offerIdParam = (params.offerId as string) || 'new'
  const isCreating = offerIdParam === 'new'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [splitConfig, setSplitConfig] = useState<CommissionSplit>(DEFAULT_COMMISSION_SPLIT)
  const [offerImage, setOfferImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    pricePerNewCustomer: 100,
    promotionType: 'none' as PromotionType,
    promotionValue: 0,
    promotionDescription: '',
    allowPlatformAttribution: true,
    active: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      try {
        // Find user's business
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

        // Fetch commission split for the admin summary
        const splitResult = await apiGet<{ success: boolean; data: CommissionSplit }>('/api/config/commission')
        if (splitResult.ok && splitResult.data?.success) {
          setSplitConfig(splitResult.data.data)
        }

        if (!isCreating) {
          const result = await apiGet<{ success: boolean; data: Offer }>(`/api/offers/${offerIdParam}`)
          if (!result.ok || !result.data?.data) {
            toast({
              title: t('common.error'),
              description: t('businessOffer.notFound', 'Offer not found'),
              variant: 'destructive',
            })
            router.push('/dashboard/business/offer')
            return
          }
          const o = result.data.data
          setFormData({
            title: o.title || '',
            pricePerNewCustomer: o.pricePerNewCustomer ?? 100,
            promotionType: (o.promotionType as PromotionType) || 'none',
            promotionValue: o.promotionValue || 0,
            promotionDescription: o.promotionDescription || '',
            allowPlatformAttribution: o.allowPlatformAttribution !== false,
            active: o.active !== false,
          })
          if (o.image) setOfferImage(o.image)
        }
      } catch (error) {
        console.error('Error loading offer:', error)
        toast({ title: t('common.error'), description: 'Failed to load data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, offerIdParam])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !business) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('businessId', business.id)
      uploadData.append('target', 'offer')

      const result = await apiUpload<{ success: boolean; url: string }>('/api/upload', uploadData)
      if (!result.ok) throw new Error(result.error || 'Failed to upload image')
      setOfferImage(result.data.url)
      toast({ title: t('common.success'), description: t('businessOffer.imageUploaded') })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to upload image'
      toast({ title: t('common.error'), description: msg, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return
    setSaving(true)
    try {
      const payload = {
        ...formData,
        businessId: business.id,
        image: offerImage,
      }
      const result = isCreating
        ? await apiPost<{ success: boolean; error?: string }>('/api/offers', payload)
        : await apiPut<{ success: boolean; error?: string }>(`/api/offers/${offerIdParam}`, payload)

      if (!result.ok) throw new Error(result.error || 'Failed to save offer')

      toast({
        title: t('businessOffer.offerSaved'),
        description: t('businessOffer.offerSavedDesc'),
      })
      router.push('/dashboard/business/offer')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save offer'
      toast({ title: t('common.error'), description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
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

  const isAdmin = user?.roles?.includes('admin') ?? false

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/business/offer"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('businessOffer.backToList', 'Back to offers')}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {isCreating ? t('businessOffer.newOffer', 'New offer') : t('businessOffer.editOffer', 'Edit offer')}
        </h1>
        <p className="text-muted-foreground">
          {t('businessOffer.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Card>
          <CardHeader>
            <CardTitle>{t('businessOffer.offerTitle', 'Offer title')}</CardTitle>
            <CardDescription>
              {t('businessOffer.offerTitleDesc', 'A short label shown when your business has more than one offer.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              maxLength={120}
              placeholder={t('businessOffer.offerTitlePlaceholder', 'e.g., First-time customer special') as string}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Offer Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              {t('businessOffer.offerImage')}
            </CardTitle>
            <CardDescription>{t('businessOffer.offerImageDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
            {offerImage ? (
              <div className="relative group rounded-lg overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image src={offerImage} alt={t('businessOffer.offerImage')} fill className="object-cover" unoptimized />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.uploading')}
                      </>
                    ) : (
                      t('businessOffer.changeImage')
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm">{t('common.uploading')}</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm font-medium">{t('businessOffer.uploadImage')}</span>
                    <span className="text-xs">JPEG, PNG, WebP, GIF (max 5MB)</span>
                  </>
                )}
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('businessOffer.pricing')}
            </CardTitle>
            <CardDescription>{t('businessOffer.pricingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerNewCustomer">{t('businessOffer.pricePerCustomer')}</Label>
              <Input
                id="pricePerNewCustomer"
                type="number"
                min="1"
                step="1"
                value={formData.pricePerNewCustomer}
                onChange={(e) => setFormData({ ...formData, pricePerNewCustomer: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">{t('businessOffer.pricePerCustomerDesc')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Promotion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {t('businessOffer.promotion')}
            </CardTitle>
            <CardDescription>{t('businessOffer.promotionDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('businessOffer.promotionType')}</Label>
              <Select
                value={formData.promotionType}
                onValueChange={(value: PromotionType) =>
                  setFormData({
                    ...formData,
                    promotionType: value,
                    promotionValue: value === 'none' || value === 'free_item' ? 0 : formData.promotionValue,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('businessOffer.selectPromotionType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('businessOffer.promoNone')}</SelectItem>
                  <SelectItem value="discount_percent">{t('businessOffer.promoDiscountPercent')}</SelectItem>
                  <SelectItem value="discount_fixed">{t('businessOffer.promoDiscountFixed')}</SelectItem>
                  <SelectItem value="free_item">{t('businessOffer.promoFreeItem')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.promotionType === 'discount_percent' || formData.promotionType === 'discount_fixed') && (
              <div className="space-y-2">
                <Label>
                  {t('businessOffer.promoValue')}
                  {formData.promotionType === 'discount_percent' ? ' (%)' : ' ($)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={formData.promotionType === 'discount_percent' ? 100 : undefined}
                  step="1"
                  value={formData.promotionValue}
                  onChange={(e) => setFormData({ ...formData, promotionValue: Number(e.target.value) })}
                />
              </div>
            )}

            {formData.promotionType !== 'none' && (
              <div className="space-y-2">
                <Label>{t('businessOffer.promoDescription')}</Label>
                <Textarea
                  value={formData.promotionDescription}
                  onChange={(e) => setFormData({ ...formData, promotionDescription: e.target.value })}
                  placeholder={t('businessOffer.promoDescriptionPlaceholder')}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">{t('businessOffer.promoDescriptionHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('businessOffer.paymentSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('businessOffer.pricePerCustomerSummary')}</span>
                <span className="font-bold text-primary">{formatCurrency(formData.pricePerNewCustomer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('businessOffer.promoterCommissionSummary')} ({splitConfig.promoterPercent}%)
                </span>
                <span className="font-semibold">
                  {formatCurrency(Math.floor((formData.pricePerNewCustomer * splitConfig.promoterPercent) / 100))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('businessOffer.consumerRewardSummary')} ({splitConfig.consumerPercent}%)
                </span>
                <span className="font-semibold">
                  {formatCurrency(Math.floor((formData.pricePerNewCustomer * splitConfig.consumerPercent) / 100))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('businessOffer.platformFeeSummary')} ({splitConfig.platformPercent}%)
                </span>
                <span className="font-semibold">
                  {formatCurrency(
                    formData.pricePerNewCustomer -
                      Math.floor((formData.pricePerNewCustomer * splitConfig.promoterPercent) / 100) -
                      Math.floor((formData.pricePerNewCustomer * splitConfig.consumerPercent) / 100)
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('businessOffer.autoCommissionNote', {
                  promoter: splitConfig.promoterPercent,
                  consumer: splitConfig.consumerPercent,
                  platform: splitConfig.platformPercent,
                })}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('businessOffer.saveOffer')
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
