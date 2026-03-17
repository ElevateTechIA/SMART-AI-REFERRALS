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
  Landmark,
  Loader2,
  Eye,
  EyeOff,
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
  const [showAccountNumber, setShowAccountNumber] = useState(false)
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

  const [bankInfo, setBankInfo] = useState({
    bankName: '',
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking' as 'checking' | 'savings',
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
      if (user.bankInfo) {
        setBankInfo({
          bankName: user.bankInfo.bankName || '',
          accountHolderName: user.bankInfo.accountHolderName || '',
          routingNumber: user.bankInfo.routingNumber || '',
          accountNumber: user.bankInfo.accountNumber || '',
          accountType: user.bankInfo.accountType || 'checking',
        })
      }
    }
  }, [user])

  const isPromoter = user?.roles.includes('referrer')

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

    // Validate bank info if partially filled
    const bankFields = [bankInfo.bankName, bankInfo.accountHolderName, bankInfo.routingNumber, bankInfo.accountNumber]
    const filledBankFields = bankFields.filter((f) => f.trim().length > 0)
    if (filledBankFields.length > 0 && filledBankFields.length < bankFields.length) {
      toast({ title: t('common.error'), description: t('validation.bankInfoIncomplete'), variant: 'destructive' })
      return false
    }
    if (filledBankFields.length === bankFields.length) {
      if (!/^\d{9}$/.test(bankInfo.routingNumber)) {
        toast({ title: t('common.error'), description: t('validation.invalidRoutingNumber'), variant: 'destructive' })
        return false
      }
      if (!/^\d{4,17}$/.test(bankInfo.accountNumber)) {
        toast({ title: t('common.error'), description: t('validation.invalidAccountNumber'), variant: 'destructive' })
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!validateForm()) return

    setSaving(true)
    try {
      const bankFields = [bankInfo.bankName, bankInfo.accountHolderName, bankInfo.routingNumber, bankInfo.accountNumber]
      const hasBankInfo = bankFields.every((f) => f.trim().length > 0)

      const payload: Record<string, unknown> = { ...formData }
      if (hasBankInfo) {
        payload.bankInfo = bankInfo
      }

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
                      setFormData({ ...formData, state: value, city: '' })
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

        {/* Bank Information (Promoters only) */}
        {isPromoter && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                {t('accountSettings.bankInfo')}
              </CardTitle>
              <CardDescription>{t('accountSettings.bankInfoDesc')}</CardDescription>
              <p className="text-xs text-muted-foreground mt-1">{t('accountSettings.bankInfoHint')}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bank Name */}
              <div className="space-y-2">
                <Label htmlFor="bankName">{t('accountSettings.bankName')}</Label>
                <Input
                  id="bankName"
                  value={bankInfo.bankName}
                  onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                  placeholder={t('accountSettings.bankNamePlaceholder')}
                />
              </div>

              {/* Account Holder Name */}
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">{t('accountSettings.accountHolderName')}</Label>
                <Input
                  id="accountHolderName"
                  value={bankInfo.accountHolderName}
                  onChange={(e) => setBankInfo({ ...bankInfo, accountHolderName: e.target.value })}
                  placeholder={t('accountSettings.accountHolderNamePlaceholder')}
                />
              </div>

              {/* Routing & Account Numbers */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">{t('accountSettings.routingNumber')}</Label>
                  <Input
                    id="routingNumber"
                    value={bankInfo.routingNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 9)
                      setBankInfo({ ...bankInfo, routingNumber: val })
                    }}
                    placeholder={t('accountSettings.routingNumberPlaceholder')}
                    maxLength={9}
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">{t('accountSettings.accountNumber')}</Label>
                  <div className="relative">
                    <Input
                      id="accountNumber"
                      type={showAccountNumber ? 'text' : 'password'}
                      value={bankInfo.accountNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 17)
                        setBankInfo({ ...bankInfo, accountNumber: val })
                      }}
                      placeholder={t('accountSettings.accountNumberPlaceholder')}
                      maxLength={17}
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title={showAccountNumber ? t('accountSettings.hideAccountNumber') : t('accountSettings.showAccountNumber')}
                    >
                      {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label>{t('accountSettings.accountType')}</Label>
                <Select
                  value={bankInfo.accountType}
                  onValueChange={(value) => setBankInfo({ ...bankInfo, accountType: value as 'checking' | 'savings' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">{t('accountSettings.checking')}</SelectItem>
                    <SelectItem value="savings">{t('accountSettings.savings')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {user.roles.map((role) => (
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
