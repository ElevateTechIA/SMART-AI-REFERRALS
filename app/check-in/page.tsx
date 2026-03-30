'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/context'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { apiPost } from '@/lib/api-client'
import { useTranslation } from 'react-i18next'
import { ElivBrand } from '@/components/eliv-logo'
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogIn,
} from 'lucide-react'

function CheckInContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const { t } = useTranslation()

  const visitId = searchParams.get('v')
  const token = searchParams.get('t')

  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoTriggered, setAutoTriggered] = useState(false)

  // Auto-trigger conversion once user is authenticated
  useEffect(() => {
    if (user && visitId && token && !autoTriggered && !success && !error && !processing) {
      setAutoTriggered(true)
      handleCheckIn()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, visitId, token, autoTriggered])

  const handleCheckIn = async () => {
    if (!visitId || !token) return

    setProcessing(true)
    setError(null)

    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/visits/${visitId}/convert`,
        { token }
      )

      if (!result.ok) {
        throw new Error(result.error || 'Check-in failed')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setProcessing(false)
    }
  }

  // Missing parameters
  if (!visitId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ElivBrand size={32} className="mx-auto mb-4" />
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('checkInPage.errorTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('checkInPage.missingParams')}</AlertDescription>
            </Alert>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                {t('checkInPage.goToDashboard')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not authenticated - show login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ElivBrand size={32} className="mx-auto mb-4" />
            <CardTitle>
              <LogIn className="h-5 w-5 inline mr-2" />
              {t('checkInPage.title')}
            </CardTitle>
            <CardDescription>{t('checkInPage.loginRequired')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton
              onClick={async () => {
                await signInWithGoogle()
              }}
              loading={false}
              label={t('checkInPage.loginButton')}
            />
            <Link href="/dashboard" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('checkInPage.goToDashboard')}
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ElivBrand size={32} className="mx-auto mb-4" />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">{t('checkInPage.successTitle')}</CardTitle>
            <CardDescription>{t('checkInPage.successDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/business')} className="w-full">
              {t('checkInPage.goToDashboard')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ElivBrand size={32} className="mx-auto mb-4" />
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('checkInPage.errorTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/business')}
                className="flex-1"
              >
                {t('checkInPage.backToDashboard')}
              </Button>
              <Button
                onClick={() => {
                  setError(null)
                  setAutoTriggered(false)
                }}
                className="flex-1"
              >
                {t('checkInPage.tryAgain')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Processing state
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ElivBrand size={32} className="mx-auto mb-4" />
          <CardTitle>{t('checkInPage.title')}</CardTitle>
          <CardDescription>{t('checkInPage.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">{t('checkInPage.processing')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckInContent />
    </Suspense>
  )
}
