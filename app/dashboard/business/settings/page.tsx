'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { apiPut, apiUpload } from '@/lib/api-client'
import type { Business } from '@/lib/types'
import { Building2, Loader2, ArrowLeft, ImagePlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GoogleMapsProvider } from '@/lib/google-maps/provider'
import { AddressAutocomplete } from '@/components/business/address-autocomplete'
import { PhoneInput } from '@/components/business/phone-input'

const CATEGORIES = [
  'Restaurant',
  'Retail',
  'Health & Beauty',
  'Automotive',
  'Entertainment',
  'Professional Services',
  'Home Services',
  'Fitness',
  'Travel & Tourism',
  'Other',
]

export default function BusinessSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phoneValid, setPhoneValid] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    website: '',
  })

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return

      try {
        const businessQuery = query(
          collection(db, 'businesses'),
          where('ownerUserId', '==', user.id)
        )
        const snapshot = await getDocs(businessQuery)

        if (snapshot.empty) {
          router.push('/dashboard/business/setup')
          return
        }

        const doc = snapshot.docs[0]
        const data = doc.data()
        const fetchedBusiness: Business = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Business

        setBusiness(fetchedBusiness)
        setFormData({
          name: fetchedBusiness.name,
          category: fetchedBusiness.category,
          description: fetchedBusiness.description || '',
          address: fetchedBusiness.address,
          phone: fetchedBusiness.phone,
          website: fetchedBusiness.website || '',
        })
      } catch (error) {
        console.error('Error fetching business:', error)
        toast({
          title: t('common.error'),
          description: t('businessDashboard.failedToLoad'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [user, router, toast, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return
    if (!phoneValid) {
      toast({ title: t('common.error'), description: t('validation.invalidPhone'), variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // API uses auth token to verify ownership - no need to pass ownerUserId
      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/businesses',
        {
          businessId: business.id,
          ...formData,
        }
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to update business')
      }

      toast({
        title: t('common.success'),
        description: t('businessSettings.businessUpdated'),
      })

      router.push('/dashboard/business')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update business'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !business) return

    // Reset input so user can re-select same file
    if (fileInputRef.current) fileInputRef.current.value = ''

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('businessId', business.id)

      const result = await apiUpload<{ success: boolean; url: string }>(
        '/api/upload',
        formData
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to upload image')
      }

      // Update local state with new image
      setBusiness({
        ...business,
        images: [...(business.images || []), result.data.url],
      })

      toast({
        title: t('common.success'),
        description: t('businessSettings.coverImageUploaded'),
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

  const coverImage = business?.images?.[business.images.length - 1] || null

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
    <GoogleMapsProvider>
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/business"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.backToDashboard')}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('businessSettings.title')}</h1>
            <p className="text-muted-foreground">
              {t('businessSettings.subtitle')}
            </p>
          </div>
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
        </div>
      </div>

      {/* Cover Image Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            {t('businessSettings.coverImage')}
          </CardTitle>
          <CardDescription>
            {t('businessSettings.coverImageDesc')}
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
          {coverImage ? (
            <div className="relative group rounded-lg overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={coverImage}
                  alt={`${business.name} cover`}
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
                    t('businessSettings.changeImage')
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
                  <span className="text-sm font-medium">{t('businessSettings.uploadCoverImage')}</span>
                  <span className="text-xs">{t('businessSettings.uploadFormats')}</span>
                </>
              )}
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('businessSettings.businessInfo')}
          </CardTitle>
          <CardDescription>
            {t('businessSettings.businessInfoDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('businessSettings.businessName') + ' *'}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('businessSettings.businessNamePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('businessSettings.category') + ' *'}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('businessSettings.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('businessSettings.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('businessSettings.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('businessSettings.address') + ' *'}</Label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                placeholder="123 Main St, City, State 12345"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('businessSettings.phone') + ' *'}</Label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="(555) 123-4567"
                  required
                  onValidation={setPhoneValid}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{t('businessSettings.website')}</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>

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
                  t('businessSettings.saveChanges')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Offer Settings Link */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('businessSettings.promoOffer')}</CardTitle>
          <CardDescription>
            {t('businessSettings.promoOfferDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/business/offer">
            <Button variant="outline" className="w-full">
              {t('businessSettings.configureOffer')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
    </GoogleMapsProvider>
  )
}
