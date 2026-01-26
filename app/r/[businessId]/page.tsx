'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { doc, getDoc } from 'firebase/firestore'
import { apiPost } from '@/lib/api-client'
import type { Business, Offer } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import {
  MapPin,
  Phone,
  Globe,
  Gift,
  Loader2,
  QrCode,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

function ReferralPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading, signUp, signInWithGoogle } = useAuth()
  const { toast } = useToast()

  const businessId = params.businessId as string
  const referrerId = searchParams.get('ref')

  const [business, setBusiness] = useState<Business | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [visitCreated, setVisitCreated] = useState(false)

  // Registration form state
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const fetchBusinessAndOffer = async () => {
      try {
        // Fetch business
        const businessDoc = await getDoc(doc(db, 'businesses', businessId))
        if (!businessDoc.exists()) {
          toast({
            title: 'Business not found',
            description: 'This referral link is invalid.',
            variant: 'destructive',
          })
          return
        }

        const businessData = businessDoc.data()
        setBusiness({
          id: businessDoc.id,
          ...businessData,
          createdAt: businessData.createdAt?.toDate(),
          updatedAt: businessData.updatedAt?.toDate(),
        } as Business)

        // Fetch active offer for this business
        const offerDoc = await getDoc(doc(db, 'offers', businessId))
        if (offerDoc.exists()) {
          const offerData = offerDoc.data()
          if (offerData.active) {
            setOffer({
              id: offerDoc.id,
              ...offerData,
              createdAt: offerData.createdAt?.toDate(),
              updatedAt: offerData.updatedAt?.toDate(),
            } as Offer)
          }
        }
      } catch (error) {
        console.error('Error fetching business:', error)
        toast({
          title: 'Error',
          description: 'Failed to load business information.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessAndOffer()
  }, [businessId, toast])

  const handleCreateVisit = async () => {
    if (!user || !business) return

    setRegistering(true)
    try {
      // API uses auth token to identify consumer - no need to pass consumerUserId
      const result = await apiPost<{ success: boolean; error?: string }>(
        '/api/visits',
        {
          businessId: business.id,
          offerId: offer?.id,
          referrerUserId: referrerId,
        }
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to create visit')
      }

      setVisitCreated(true)
      toast({
        title: 'Success!',
        description: 'Your visit has been recorded. Enjoy your experience!',
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record visit'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setRegistering(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegistering(true)

    try {
      await signUp(email, password, name)
      toast({
        title: 'Account created!',
        description: 'Now let\'s record your visit.',
      })
      // After signup, create visit automatically
      setTimeout(() => handleCreateVisit(), 500)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      setRegistering(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setRegistering(true)
    try {
      await signInWithGoogle()
      toast({
        title: 'Signed in!',
        description: 'Now let\'s record your visit.',
      })
      // After signup, create visit automatically
      setTimeout(() => handleCreateVisit(), 500)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      setRegistering(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Business Not Found</CardTitle>
            <CardDescription>
              This referral link appears to be invalid or the business is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (visitCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Visit Recorded!</CardTitle>
            <CardDescription>
              Your visit to {business.name} has been recorded. Enjoy your experience!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {offer && offer.consumerRewardType !== 'none' && (
              <div className="bg-primary/5 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Your Reward</p>
                <p className="text-lg font-semibold text-primary">
                  {offer.consumerRewardType === 'cash' && formatCurrency(offer.consumerRewardValue)}
                  {offer.consumerRewardType === 'points' && `${offer.consumerRewardValue} Points`}
                  {offer.consumerRewardType === 'discount' && `${offer.consumerRewardValue}% Off`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Applied after your purchase is confirmed
                </p>
              </div>
            )}
            <Link href="/dashboard">
              <Button className="w-full gap-2">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Smart AI Referrals</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Referral Attribution */}
        {referrerId && (
          <div className="mb-4 text-center">
            <Badge variant="secondary" className="gap-1">
              <Gift className="h-3 w-3" />
              You were referred by a friend
            </Badge>
          </div>
        )}

        {/* Business Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{business.name}</CardTitle>
                <CardDescription className="text-base">{business.category}</CardDescription>
              </div>
              <Badge
                variant={business.status === 'active' ? 'success' : 'secondary'}
              >
                {business.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{business.description}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{business.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{business.phone}</span>
              </div>
              {business.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {business.website}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Offer Card */}
        {offer && offer.consumerRewardType !== 'none' && (
          <Card className="mb-6 border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Special Offer for You
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {offer.consumerRewardType === 'cash' && formatCurrency(offer.consumerRewardValue)}
                  {offer.consumerRewardType === 'points' && `${offer.consumerRewardValue} Points`}
                  {offer.consumerRewardType === 'discount' && `${offer.consumerRewardValue}% Off`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {offer.consumerRewardType === 'cash' && 'Cash back on your first visit'}
                  {offer.consumerRewardType === 'points' && 'Reward points for your account'}
                  {offer.consumerRewardType === 'discount' && 'Discount on your purchase'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Area */}
        <Card>
          <CardHeader>
            <CardTitle>
              {user ? 'Confirm Your Visit' : 'Sign Up to Claim Your Offer'}
            </CardTitle>
            <CardDescription>
              {user
                ? 'Click below to record your visit and claim any available rewards.'
                : 'Create a free account to track your rewards and start earning.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <Button
                onClick={handleCreateVisit}
                disabled={registering}
                className="w-full"
                size="lg"
              >
                {registering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording Visit...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    I&apos;m Visiting Today
                  </>
                )}
              </Button>
            ) : showAuthForm ? (
              <div className="space-y-4">
                {/* Google Sign Up - Primary Option */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignUp}
                  disabled={registering}
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
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Email/Password Form - Secondary Option */}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={registering}>
                    {registering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Sign Up & Claim Offer'
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
              </form>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowAuthForm(true)}
                  className="w-full"
                  size="lg"
                >
                  Get Started
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="mt-8 text-center">
          <h3 className="font-semibold mb-4">How It Works</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="font-semibold text-primary">1</span>
              </div>
              <p className="text-muted-foreground">Sign up</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="font-semibold text-primary">2</span>
              </div>
              <p className="text-muted-foreground">Visit & buy</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="font-semibold text-primary">3</span>
              </div>
              <p className="text-muted-foreground">Get rewarded</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReferralPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ReferralPageContent />
    </Suspense>
  )
}
