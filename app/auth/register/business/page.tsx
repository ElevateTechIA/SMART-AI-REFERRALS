'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthPageLayout } from '@/components/auth/auth-page-layout'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Building2 } from 'lucide-react'

function BusinessRegisterContent() {
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      await signInWithGoogle('business')
      toast({
        title: 'Account created',
        description: 'Welcome to Eliv!',
      })
      router.push('/dashboard/business/setup')
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
    <AuthPageLayout showSignInLink={true} loginHref="/auth/login?from=business">
      <Card className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-3xl">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-green-100">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{t('auth.growYourBusiness')}</CardTitle>
          <CardDescription className="text-base text-gray-500 mt-2">
            {t('auth.createBusinessAccountDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-6">
          <GoogleAuthButton onClick={handleGoogleSignUp} loading={loading} />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8 bg-gray-50/50">
          <p className="text-sm text-gray-700 text-center font-medium">
            {t('auth.haveAccount')}{' '}
            <Link href="/auth/login?from=business" className="text-theme-secondary hover:opacity-80 font-semibold hover:underline">
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

export default function BusinessRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-theme-secondary" />
      </div>
    }>
      <BusinessRegisterContent />
    </Suspense>
  )
}
