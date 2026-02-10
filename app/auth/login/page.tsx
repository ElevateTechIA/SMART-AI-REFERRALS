'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/language-switcher'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { QrCode } from 'lucide-react'

export default function LoginPage() {
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
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

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                <QrCode className="w-full h-full text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-white font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{t('dashboard.welcomeBack', { name: '' }).replace(', !', '!')}</CardTitle>
              <CardDescription className="text-base">
                {t('auth.signInToAccount')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6 px-8">
              <GoogleAuthButton onClick={handleGoogleSignIn} loading={loading} />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-0">
              <p className="text-sm text-gray-700 text-center font-medium">
                {t('auth.noAccount')}{' '}
                <Link href="/auth/register" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline">
                  {t('auth.signUp')}
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-white/20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-white/90 text-sm">
              {t('landing.allRightsReserved')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
