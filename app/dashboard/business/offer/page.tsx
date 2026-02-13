'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { apiPost, apiUpload } from '@/lib/api-client'
import type { Business, PromotionType } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Loader2, DollarSign, Building2, ImagePlus, Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function OfferConfigPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [offerImage, setOfferImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
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
        // Fetch user's business
        const businessQuery = query(
          collection(db, 'businesses'),
          where('ownerUserId', '==', user.id)
        )
        const businessSnapshot = await getDocs(businessQuery)

        if (businessSnapshot.empty) {
          router.push('/dashboard/business/setup')
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

        // Fetch existing offer
        const offerDoc = await getDoc(doc(db, 'offers', fetchedBusiness.id))
        if (offerDoc.exists()) {
          const offerData = offerDoc.data()
          setFormData({
            pricePerNewCustomer: offerData.pricePerNewCustomer || 100,
            promotionType: offerData.promotionType || 'none',
            promotionValue: offerData.promotionValue || 0,
            promotionDescription: offerData.promotionDescription || '',
            allowPlatformAttribution: offerData.allowPlatformAttribution !== false,
            active: offerData.active !== false,
          })
          if (offerData.image) {
            setOfferImage(offerData.image)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: t('common.error'),
          description: 'Failed to load data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, router, toast, t])

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

      const result = await apiUpload<{ success: boolean; url: string }>(
        '/api/upload',
        uploadData
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to upload image')
      }

      setOfferImage(result.data.url)
      toast({
        title: t('common.success'),
        description: t('businessOffer.imageUploaded'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return

    setSaving(true)
    try {
      // API uses auth token to verify ownership - no need to pass ownerUserId
      const result = await apiPost<{ success: boolean; error?: string }>(
        '/api/offers',
        {
          ...formData,
          businessId: business.id,
          image: offerImage,
        }
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to save offer')
      }

      toast({
        title: t('businessOffer.offerSaved'),
        description: t('businessOffer.offerSavedDesc'),
      })

      router.push('/dashboard/business')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save offer'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
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

  if (!business) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('businessOffer.title')}</h1>
        <p className="text-muted-foreground">
          {t('businessOffer.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Offer Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              {t('businessOffer.offerImage')}
            </CardTitle>
            <CardDescription>
              {t('businessOffer.offerImageDesc')}
            </CardDescription>
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
                  <Image
                    src={offerImage}
                    alt={t('businessOffer.offerImage')}
                    fill
                    className="object-cover"
                    unoptimized
                  />
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
            <CardDescription>
              {t('businessOffer.pricingDesc')}
            </CardDescription>
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
                onChange={(e) =>
                  setFormData({ ...formData, pricePerNewCustomer: Number(e.target.value) })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('businessOffer.pricePerCustomerDesc')}
              </p>
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
            <CardDescription>
              {t('businessOffer.promotionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('businessOffer.promotionType')}</Label>
              <Select
                value={formData.promotionType}
                onValueChange={(value: PromotionType) =>
                  setFormData({ ...formData, promotionType: value, promotionValue: value === 'none' || value === 'free_item' ? 0 : formData.promotionValue })
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
                  onChange={(e) =>
                    setFormData({ ...formData, promotionValue: Number(e.target.value) })
                  }
                />
              </div>
            )}

            {formData.promotionType !== 'none' && (
              <div className="space-y-2">
                <Label>{t('businessOffer.promoDescription')}</Label>
                <Textarea
                  value={formData.promotionDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, promotionDescription: e.target.value })
                  }
                  placeholder={t('businessOffer.promoDescriptionPlaceholder')}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  {t('businessOffer.promoDescriptionHint')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('businessOffer.paymentSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('businessOffer.pricePerCustomerSummary')}</span>
              <span className="font-bold text-primary">{formatCurrency(formData.pricePerNewCustomer)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
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
