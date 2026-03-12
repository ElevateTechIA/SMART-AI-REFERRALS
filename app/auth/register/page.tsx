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
import { Loader2, Users } from 'lucide-react'

function RegisterContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    if (searchParams.get('type') === 'business') {
      router.replace('/auth/register/business')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      await signInWithGoogle('referrer')
      toast({
        title: 'Account created',
        description: 'Welcome to Eliv!',
      })
      router.push('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up with Google'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout showSignInLink={true}>
      <Card className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-3xl">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-100">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{t('auth.startEarningMoney')}</CardTitle>
          <CardDescription className="text-base text-gray-500 mt-2">
            {t('auth.createReferrerAccountDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-6">
          <GoogleAuthButton onClick={handleGoogleSignUp} loading={loading} />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8 bg-gray-50/50">
          <p className="text-sm text-gray-700 text-center font-medium">
            {t('auth.haveAccount')}{' '}
            <Link href="/auth/login" className="text-theme-secondary hover:opacity-80 font-semibold hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
          <p className="text-xs text-gray-400 text-center">
            {t('auth.termsAgreement')}
          </p>
        </CardFooter>
      </Card>
    </AuthPageLayout>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-theme-secondary" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
