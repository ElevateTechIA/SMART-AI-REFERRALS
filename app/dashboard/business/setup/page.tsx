'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiPost } from '@/lib/api-client'
import { Building2, Loader2 } from 'lucide-react'
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

export default function BusinessSetupPage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [phoneValid, setPhoneValid] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    website: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!phoneValid) {
      toast({ title: t('common.error'), description: t('validation.invalidPhone'), variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      // API uses auth token to identify owner - no need to pass user ID
      const result = await apiPost<{ success: boolean; error?: string }>(
        '/api/businesses',
        formData
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to create business')
      }

      await refreshUser()

      toast({
        title: t('businessSetup.businessCreated'),
        description: t('businessSetup.businessCreatedDesc'),
      })

      router.push('/dashboard/business/offer')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create business'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <GoogleMapsProvider>
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('businessSetup.title')}</h1>
        <p className="text-muted-foreground">
          {t('businessSetup.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('businessSetup.businessInfo')}
          </CardTitle>
          <CardDescription>
            {t('businessSetup.businessInfoDesc')}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('businessSetup.creatingBusiness')}
                </>
              ) : (
                t('businessSetup.createBusiness')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </GoogleMapsProvider>
  )
}
