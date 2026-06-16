'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiPut, apiUpload } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import {
  User,
  Camera,
  Calendar,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GoogleMapsProvider } from '@/lib/google-maps/provider'
import { PhoneInput } from '@/components/business/phone-input'
import { ImageCropper } from '@/components/business/image-cropper'
import { CityAutocomplete } from '@/components/settings/city-autocomplete'
import { US_STATES } from '@/lib/constants/us-states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const isCompleting = searchParams.get('complete') === 'true'

  const [saving, setSaving] = useState(false)
  const [phoneValid, setPhoneValid] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    secondaryEmail: '',
    dateOfBirth: '',
    state: '',
    city: '',
    zipcode: '',
    phone: '',
  })

  // Load existing user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        secondaryEmail: user.secondaryEmail || '',
        dateOfBirth: user.dateOfBirth || '',
        state: user.state || '',
        city: user.city || '',
        zipcode: user.zipcode || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (fileInputRef.current) fileInputRef.current.value = ''

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCroppedUpload = async (croppedBlob: Blob) => {
    setUploading(true)
    try {
      const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', file)

      const result = await apiUpload<{ success: boolean; url: string }>(
        '/api/users/profile/upload',
        formData
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to upload photo')
      }

      setCropperOpen(false)
      setCropImageSrc(null)
      await refreshUser()

      toast({
        title: t('common.success'),
        description: t('accountSettings.photoUploaded'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast({ title: t('common.error'), description: t('validation.nameRequired'), variant: 'destructive' })
      return false
    }
    if (formData.secondaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.secondaryEmail)) {
      toast({ title: t('common.error'), description: t('validation.invalidEmail'), variant: 'destructive' })
      return false
    }
    if (!formData.dateOfBirth) {
      toast({ title: t('common.error'), description: t('validation.dobRequired'), variant: 'destructive' })
      return false
    }
    // Age check (13+)
    const dob = new Date(formData.dateOfBirth)
    const today = new Date()
    const age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    const dayDiff = today.getDate() - dob.getDate()
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
    if (actualAge < 13) {
      toast({ title: t('common.error'), description: t('validation.ageRequirement'), variant: 'destructive' })
      return false
    }
    if (!formData.state) {
      toast({ title: t('common.error'), description: t('validation.stateRequired'), variant: 'destructive' })
      return false
    }
    if (formData.city && formData.city.trim().length > 0 && formData.city.trim().length < 2) {
      toast({ title: t('common.error'), description: t('validation.cityRequired'), variant: 'destructive' })
      return false
    }
    if (formData.zipcode && formData.zipcode.length > 0 && !/^\d{5}$/.test(formData.zipcode)) {
      toast({ title: t('common.error'), description: t('validation.invalidZipcode'), variant: 'destructive' })
      return false
    }
    if (!formData.phone.trim()) {
      toast({ title: t('common.error'), description: t('validation.phoneRequired'), variant: 'destructive' })
      return false
    }
    if (!phoneValid) {
      toast({ title: t('common.error'), description: t('validation.invalidPhone'), variant: 'destructive' })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...formData }

      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/users/profile',
        payload
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      await refreshUser()

      toast({
        title: t('common.success'),
        description: t('accountSettings.profileUpdated'),
      })

      if (isCompleting) {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <GoogleMapsProvider>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('accountSettings.title')}</h1>
          <p className="text-muted-foreground">{t('accountSettings.subtitle')}</p>
        </div>

        {/* Profile completion banner */}
        {isCompleting && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                {t('accountSettings.completeProfile')}
              </h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                {t('accountSettings.completeProfileDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t('accountSettings.profilePhoto')}
            </CardTitle>
            <CardDescription>{t('accountSettings.profilePhotoDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-28 w-28">
                  <AvatarImage src={user.photoURL} alt={user.name} />
                  <AvatarFallback className="text-3xl">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center"
                >
                  <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.uploading')}
                  </>
                ) : user.photoURL ? (
                  t('accountSettings.changePhoto')
                ) : (
                  t('accountSettings.uploadPhoto')
                )}
              </Button>
              <p className="text-xs text-muted-foreground">{t('accountSettings.uploadFormats')}</p>
            </div>

            <ImageCropper
              imageSrc={cropImageSrc}
              open={cropperOpen}
              onClose={() => {
                setCropperOpen(false)
                setCropImageSrc(null)
              }}
              onCropComplete={handleCroppedUpload}
              uploading={uploading}
              cropShape="round"
              title={t('accountSettings.cropPhoto')}
              description={t('accountSettings.cropPhotoDesc')}
            />
          </CardContent>
        </Card>

        {/* Profile Information Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('accountSettings.profileInfo')}
            </CardTitle>
            <CardDescription>{t('accountSettings.profileInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} id="profile-form" className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('accountSettings.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('accountSettings.namePlaceholder')}
                  required
                />
              </div>

              {/* Login Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="loginEmail">{t('accountSettings.loginEmail')}</Label>
                <Input
                  id="loginEmail"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">{t('accountSettings.loginEmailHint')}</p>
              </div>

              {/* Secondary Email */}
              <div className="space-y-2">
                <Label htmlFor="secondaryEmail">{t('accountSettings.secondaryEmail')}</Label>
                <Input
                  id="secondaryEmail"
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                  placeholder={t('accountSettings.secondaryEmailPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('accountSettings.secondaryEmailHint')}</p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">{t('accountSettings.dateOfBirth')} *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* State & City */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('accountSettings.state')} *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => {
                      // Guard against spurious/empty onValueChange fires (e.g. the
                      // browser autofilling Radix's hidden `required` <select>), which
                      // were wiping the just-loaded state AND resetting the city to ''
                      // on page load. Only react to a genuine change of state, and only
                      // then clear the (state-scoped) city.
                      if (!value || value === formData.state) return
                      setFormData((prev) => ({ ...prev, state: value, city: '' }))
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('accountSettings.selectState')} />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('accountSettings.city')}</Label>
                  <CityAutocomplete
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    stateCode={formData.state}
                    placeholder={t('accountSettings.cityPlaceholder')}
                  />
                </div>
              </div>

              {/* Zipcode & Phone */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="zipcode">{t('accountSettings.zipcode')}</Label>
                  <Input
                    id="zipcode"
                    value={formData.zipcode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 5)
                      setFormData({ ...formData, zipcode: val })
                    }}
                    placeholder={t('accountSettings.zipcodePlaceholder')}
                    maxLength={5}
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('accountSettings.phone')} *</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    placeholder="(555) 123-4567"
                    onValidation={setPhoneValid}
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('accountSettings.accountInfo')}
            </CardTitle>
            <CardDescription>{t('accountSettings.accountInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('accountSettings.memberSince')}</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('accountSettings.roles')}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* Defensive: a freshly-created Firestore user doc could
                      briefly hydrate with `roles` undefined if the document
                      write hasn't fully replicated. Optional chaining +
                      fallback prevents the entire page from crashing into
                      the error boundary during that window. */}
                  {(user.roles ?? []).map((role) => (
                    <Badge
                      key={role}
                      variant={role === 'admin' ? 'default' : 'secondary'}
                    >
                      {t('roles.' + role)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!isCompleting && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            form="profile-form"
            className={isCompleting ? 'w-full' : 'flex-1'}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('accountSettings.saveChanges')
            )}
          </Button>
        </div>
      </div>
    </GoogleMapsProvider>
  )
}
