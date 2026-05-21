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
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { apiPost } from '@/lib/api-client'
import type { Business, Offer } from '@/lib/types'
import { isOfferActive } from '@/lib/offers-config'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { ElivBrand } from '@/components/eliv-logo'
import {
  MapPin,
  Phone,
  Globe,
  Gift,
  Loader2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

/**
 * Public referral page.
 *
 * Resolves the offer to show in this priority:
 *   1. `props.offerIdFromRoute`   — when the route is `/r/[businessId]/[offerId]`.
 *   2. `?offer=X` query string    — alternative deep-link shape.
 *   3. The single active offer    — when the business has exactly one.
 *   4. The user picks from a list — when there are multiple actives and no
 *      explicit offer was specified.
 *
 * Falls back to `offers/{businessId}` (legacy doc) when no active offer is
 * found via the `where businessId == X` query, so older links keep working
 * for businesses that have not migrated their offer document.
 */
function ReferralPageContent({ offerIdFromRoute }: { offerIdFromRoute?: string }) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()

  const businessId = params.businessId as string
  const referrerId = searchParams.get('ref')
  const offerIdParam = offerIdFromRoute || searchParams.get('offer') || undefined

  const [business, setBusiness] = useState<Business | null>(null)
  const [activeOffers, setActiveOffers] = useState<Offer[]>([])
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [visitCreated, setVisitCreated] = useState(false)

  const [showAuthForm, setShowAuthForm] = useState(false)

  // Derived
  const selectedOffer = activeOffers.find((o) => o.id === selectedOfferId) || null

  useEffect(() => {
    const fetchBusinessAndOffers = async () => {
      try {
        // Business
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

        // Query all offers for this business, keep only active ones.
        // (Public read is allowed by firestore.rules.)
        const offersSnap = await getDocs(
          query(collection(db, 'offers'), where('businessId', '==', businessId))
        )
        let offers: Offer[] = offersSnap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Offer
        })

        // Compatibility fallback: if the where-query returned nothing (e.g.
        // an old offer doc missing the `businessId` field), try the legacy
        // doc-id lookup so historic links don't break.
        if (offers.length === 0) {
          const legacy = await getDoc(doc(db, 'offers', businessId))
          if (legacy.exists()) {
            const data = legacy.data()
            offers = [
              {
                id: legacy.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
              } as Offer,
            ]
          }
        }

        const active = offers.filter(isOfferActive)
        // Newest first
        active.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
        setActiveOffers(active)

        // Auto-select: explicit param if present and valid; otherwise the
        // sole offer if there's only one. Multiple offers leave the user to
        // pick.
        if (offerIdParam && active.some((o) => o.id === offerIdParam)) {
          setSelectedOfferId(offerIdParam)
        } else if (active.length === 1) {
          setSelectedOfferId(active[0].id)
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

    fetchBusinessAndOffers()
  }, [businessId, offerIdParam, toast, t])

  const isSelfReferral = user && referrerId && referrerId === user.id
  const isBusinessOwner = user && business && business.ownerUserId === user.id

  // Auto-create visit when: logged in, an offer has been resolved/picked, and
  // not in preview mode.
  useEffect(() => {
    const autoCreateVisit = async () => {
      if (
        business &&
        user &&
        !authLoading &&
        !visitCreated &&
        !isSelfReferral &&
        !isBusinessOwner &&
        selectedOffer
      ) {
        await handleCreateVisit()
      }
    }
    autoCreateVisit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, user, authLoading, selectedOfferId])

  const handleCreateVisit = async () => {
    if (!user || !business) return
    setRegistering(true)
    try {
      const result = await apiPost<{ success: boolean; error?: string }>('/api/visits', {
        businessId: business.id,
        offerId: selectedOffer?.id || null,
        referrerUserId: referrerId,
      })

      if (!result.ok) {
        if (result.status === 409) {
          setVisitCreated(true)
          toast({
            title: t('referralPage.alreadyVisited'),
            description: t('referralPage.alreadyVisitedDesc'),
          })
          return
        }
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
      await signInWithGoogle('referrer')
      toast({
        title: t('referralPage.signedIn'),
        description: t('referralPage.signedInDesc'),
      })
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
            <CardDescription>{t('referralPage.businessNotFoundDesc')}</CardDescription>
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
            {selectedOffer && selectedOffer.consumerRewardType !== 'none' && (
              <div className="bg-primary/5 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('referralPage.yourReward')}</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(selectedOffer.consumerRewardValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('referralPage.rewardApplied')}</p>
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

  // Multi-offer picker shown when there are 2+ active offers and the user
  // hasn't picked one yet.
  const showOfferPicker = activeOffers.length > 1 && !selectedOffer

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <ElivBrand responsive="sm/md" forceDark />
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
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
              <Badge variant={business.status === 'active' ? 'success' : 'secondary'}>
                {business.status === 'active'
                  ? t('common.active', 'Active')
                  : business.status === 'pending'
                  ? t('common.pending', 'Pending')
                  : t('common.suspended', 'Suspended')}
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

        {/* Offer picker (only when 2+ active and not preselected) */}
        {showOfferPicker && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('referralPage.chooseOffer', 'Choose an offer')}</CardTitle>
              <CardDescription>
                {t('referralPage.chooseOfferDesc', 'This business has more than one current offer — pick the one you want to claim.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeOffers.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOfferId(o.id)}
                  className="w-full text-left border rounded-lg p-3 hover:bg-muted transition-colors flex items-center gap-3"
                >
                  <Gift className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {o.title || `${t('businessOffer.offerLabel', 'Offer')} ${o.id.slice(-6)}`}
                    </p>
                    {o.consumerRewardType !== 'none' && (
                      <p className="text-sm text-primary">
                        {t('referralPage.cashBackAmount', '{{amount}} cash back', {
                          amount: formatCurrency(o.consumerRewardValue),
                        })}
                      </p>
                    )}
                    {o.promotionDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{o.promotionDescription}</p>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Selected offer summary */}
        {selectedOffer && selectedOffer.consumerRewardType !== 'none' && (
          <Card className="mb-6 border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                {selectedOffer.title || t('referralPage.specialOffer')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(selectedOffer.consumerRewardValue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('referralPage.cashBackFirstVisit')}</p>
                {activeOffers.length > 1 && (
                  <button
                    onClick={() => setSelectedOfferId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
                  >
                    {t('referralPage.changeOffer', 'Choose a different offer')}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Area */}
        <Card>
          <CardHeader>
            <CardTitle>
              {(isSelfReferral || isBusinessOwner)
                ? t('referralPage.previewMode')
                : user
                ? t('referralPage.confirmVisit')
                : t('referralPage.signUpClaim')}
            </CardTitle>
            <CardDescription>
              {(isSelfReferral || isBusinessOwner)
                ? t('referralPage.previewModeDesc')
                : user
                ? t('referralPage.confirmVisitDesc')
                : t('referralPage.signUpDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isSelfReferral || isBusinessOwner) ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {isBusinessOwner
                    ? t('referralPage.ownerPreviewNote')
                    : t('referralPage.selfReferralNote')}
                </p>
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full gap-2">
                    {t('common.backToDashboard')} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : user ? (
              <Button
                onClick={handleCreateVisit}
                disabled={registering || (activeOffers.length > 1 && !selectedOffer)}
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
                <Button onClick={() => setShowAuthForm(true)} className="w-full" size="lg">
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReferralPageContent />
    </Suspense>
  )
}

// Exported wrapper that allows the nested `/r/[businessId]/[offerId]` route
// to reuse the same component while pinning the offer.
export function ReferralPageWithOffer({ offerId }: { offerId: string }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReferralPageContent offerIdFromRoute={offerId} />
    </Suspense>
  )
}
