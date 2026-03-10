'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthPageLayout } from '@/components/auth/auth-page-layout'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const from = searchParams.get('from')
  const registerHref = from === 'business' ? '/auth/register/business' : '/auth/register'

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.failedSignInGoogle')
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
    <AuthPageLayout>
      <Card className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-3xl">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-theme-primary rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{t('dashboard.welcomeBack', { name: '' }).replace(', !', '!')}</CardTitle>
          <CardDescription className="text-base text-gray-500 mt-2">
            {t('auth.signInToAccount')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-6">
          <GoogleAuthButton onClick={handleGoogleSignIn} loading={loading} />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8 bg-gray-50/50">
          <p className="text-sm text-gray-700 text-center font-medium">
            {t('auth.noAccount')}{' '}
            <Link href={registerHref} className="text-theme-primary hover:opacity-80 font-semibold hover:underline">
              {t('auth.signUp')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthPageLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
