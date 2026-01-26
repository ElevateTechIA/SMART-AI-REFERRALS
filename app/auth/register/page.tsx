'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { QrCode, Loader2, Users, Building2 } from 'lucide-react'

function RegisterContent() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') === 'business' ? 'business' : 'referrer'

  const [activeTab, setActiveTab] = useState(initialType)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signUp(email, password, name)
      toast({
        title: 'Account created',
        description: 'Welcome to Smart AI Referrals!',
      })
      // Redirect based on account type
      if (activeTab === 'business') {
        router.push('/dashboard/business/setup')
      } else {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      toast({
        title: 'Account created',
        description: 'Welcome to Smart AI Referrals!',
      })
      if (activeTab === 'business') {
        router.push('/dashboard/business/setup')
      } else {
        router.push('/dashboard')
      }
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
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-purple-800/30 to-purple-900/50"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                <svg className="w-full h-full text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">SMART AI</span>
                <span className="text-white font-bold text-lg leading-tight">REFERRALS</span>
              </div>
            </Link>

            {/* Language Switcher & Sign In Button */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/auth/login">
                <Button variant="ghost" className="text-white hover:bg-white/20">
                  {t('auth.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle>{t('auth.createAccount')}</CardTitle>
              <CardDescription>{t('auth.chooseHow')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="referrer" className="gap-2">
                    <Users className="w-4 h-4" />
                    {t('auth.earnMoney')}
                  </TabsTrigger>
                  <TabsTrigger value="business" className="gap-2">
                    <Building2 className="w-4 h-4" />
                    {t('auth.getCustomers')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="referrer" className="text-sm text-gray-800 mt-4 font-medium">
                  {t('auth.referrerDescription')}
                </TabsContent>
                <TabsContent value="business" className="text-sm text-gray-800 mt-4 font-medium">
                  {t('auth.businessDescription')}
                </TabsContent>
              </Tabs>

              {/* Google Sign Up - Primary Option */}
              <Button
                variant="outline"
                className="w-full mb-6"
                onClick={handleGoogleSignUp}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.continueWithGoogle')}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
                </div>
              </div>

              {/* Email/Password Form - Secondary Option */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.creatingAccount')}
                    </>
                  ) : (
                    activeTab === 'business' ? t('auth.createBusinessAccount') : t('auth.createReferrerAccount')
                  )}
                </Button>
              </form>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
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
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
