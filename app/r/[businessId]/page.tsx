'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { doc, getDoc } from 'firebase/firestore'
import { apiPost } from '@/lib/api-client'
import type { Business, Offer } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
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
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()

  const businessId = params.businessId as string
  const referrerId = searchParams.get('ref')

  const [business, setBusiness] = useState<Business | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [visitCreated, setVisitCreated] = useState(false)

  const [showAuthForm, setShowAuthForm] = useState(false)

  useEffect(() => {
    const fetchBusinessAndOffer = async () => {
      try {
        // Fetch business
        const businessDoc = await getDoc(doc(db, 'businesses', businessId))
        if (!businessDoc.exists()) {
          toast({
            title: t('referralPage.businessNotFound'),
            description: t('referralPage.invalidLink'),
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
          title: t('common.error'),
          description: t('referralPage.failedLoadBusiness'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessAndOffer()
  }, [businessId, toast, t])

  // Auto-create visit if user is already logged in when landing on referral page
  useEffect(() => {
    const autoCreateVisit = async () => {
      if (business && user && !authLoading && !visitCreated) {
        // Create visit directly in Firestore (no localStorage)
        await handleCreateVisit()
      }
    }

    autoCreateVisit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, user, authLoading])

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
        title: t('referralPage.visitSuccess'),
        description: t('referralPage.visitSuccessDesc'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record visit'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setRegistering(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setRegistering(true)
    try {
      // Users registering via referral link are consumers
      await signInWithGoogle('consumer')
      toast({
        title: t('referralPage.signedIn'),
        description: t('referralPage.signedInDesc'),
      })
      // After signup, create visit automatically
      setTimeout(() => handleCreateVisit(), 500)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google'
      toast({
        title: t('common.error'),
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
            <CardTitle>{t('referralPage.businessNotFound')}</CardTitle>
            <CardDescription>
              {t('referralPage.businessNotFoundDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">{t('referralPage.goHome')}</Button>
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
            <CardTitle>{t('referralPage.visitRecorded')}</CardTitle>
            <CardDescription>
              {t('referralPage.visitRecordedDesc', { name: business.name })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {offer && offer.consumerRewardType !== 'none' && (
              <div className="bg-primary/5 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('referralPage.yourReward')}</p>
                <p className="text-lg font-semibold text-primary">
                  {offer.consumerRewardType === 'cash' && formatCurrency(offer.consumerRewardValue)}
                  {offer.consumerRewardType === 'points' && t('referralPage.points', { value: offer.consumerRewardValue })}
                  {offer.consumerRewardType === 'discount' && t('referralPage.percentOff', { value: offer.consumerRewardValue })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('referralPage.rewardApplied')}
                </p>
              </div>
            )}
            <Link href="/dashboard">
              <Button className="w-full gap-2">
                {t('referralPage.goToDashboard')} <ArrowRight className="h-4 w-4" />
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
              {t('referralPage.referredByFriend')}
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
                {t('referralPage.specialOffer')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {offer.consumerRewardType === 'cash' && formatCurrency(offer.consumerRewardValue)}
                  {offer.consumerRewardType === 'points' && t('referralPage.points', { value: offer.consumerRewardValue })}
                  {offer.consumerRewardType === 'discount' && t('referralPage.percentOff', { value: offer.consumerRewardValue })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {offer.consumerRewardType === 'cash' && t('referralPage.cashBackFirstVisit')}
                  {offer.consumerRewardType === 'points' && t('referralPage.rewardPoints')}
                  {offer.consumerRewardType === 'discount' && t('referralPage.discountOnPurchase')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Area */}
        <Card>
          <CardHeader>
            <CardTitle>
              {user ? t('referralPage.confirmVisit') : t('referralPage.signUpClaim')}
            </CardTitle>
            <CardDescription>
              {user
                ? t('referralPage.confirmVisitDesc')
                : t('referralPage.signUpDesc')}
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
                    {t('referralPage.recordingVisit')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('referralPage.visitingToday')}
                  </>
                )}
              </Button>
            ) : showAuthForm ? (
              <div className="space-y-4">
                <GoogleAuthButton onClick={handleGoogleSignUp} loading={registering} />
                <p className="text-xs text-center text-muted-foreground">
                  {t('referralPage.alreadyHaveAccount')}{' '}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    {t('common.signIn')}
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowAuthForm(true)}
                  className="w-full"
                  size="lg"
                >
                  {t('common.getStarted')}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {t('referralPage.alreadyHaveAccount')}{' '}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    {t('common.signIn')}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="mt-8 text-center">
          <h3 className="font-semibold mb-4">{t('referralPage.howItWorks')}</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="font-semibold text-primary">1</span>
              </div>
              <p className="text-muted-foreground">{t('referralPage.step1')}</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="font-semibold text-primary">2</span>
              </div>
              <p className="text-muted-foreground">{t('referralPage.step2')}</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="font-semibold text-primary">3</span>
              </div>
              <p className="text-muted-foreground">{t('referralPage.step3')}</p>
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
