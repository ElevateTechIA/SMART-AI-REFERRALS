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
        description: 'Welcome to Smart AI Referrals!',
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
    <AuthPageLayout showSignInLink={true}>
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="w-12 h-12 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.growYourBusiness')}</CardTitle>
          <CardDescription className="text-base">
            {t('auth.createBusinessAccountDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-6">
          <GoogleAuthButton onClick={handleGoogleSignUp} loading={loading} />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-gray-700 text-center font-medium">
            {t('auth.haveAccount')}{' '}
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
          <p className="text-xs text-gray-600 text-center">
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
      <div className="min-h-screen relative overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/dashboard/assets/landing-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-purple-800/30 to-purple-900/50"></div>
        </div>
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    }>
      <BusinessRegisterContent />
    </Suspense>
  )
}
