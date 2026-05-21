'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, generateReferralUrl } from '@/lib/utils'
import QRCode from 'qrcode'
import { Copy, Download, Share2, Building2, Gift, Link2, MapPin, Phone, Globe, Mail, Star, ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { Business, Offer } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes, getQRColor } from '@/lib/theme/colors'

const GRADIENTS = [
  'from-rose-500 via-pink-500 to-teal-500',
  'from-purple-600 via-violet-500 to-cyan-400',
  'from-emerald-600 via-teal-500 to-blue-400',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-blue-600 via-indigo-500 to-purple-400',
  'from-pink-500 via-rose-400 to-orange-400',
]

function getGradientForBusiness(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function getFakeReviewCount(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 7) - hash)
  }
  return 50 + (Math.abs(hash) % 450) // 50–499 reviews
}

const FAKE_REVIEWERS = [
  'Maria G.', 'Carlos R.', 'Ana P.', 'Luis M.', 'Sofia T.',
  'Diego H.', 'Laura V.', 'Juan S.', 'Elena F.', 'Pedro A.',
]

const FAKE_REVIEW_TEXTS = [
  'Excellent service and great prices! Highly recommended.',
  'Amazing experience, will definitely come back again.',
  'Very professional staff. The best in town!',
  'Great quality and fast service. Love this place!',
  'Wonderful atmosphere and friendly people. 10/10!',
  'Outstanding! Exceeded all my expectations.',
  'Top-notch quality. Couldn\'t be happier!',
  'Fantastic experience from start to finish.',
  'Best business in the area. Always reliable.',
  'Incredible value for money. Five stars!',
]

const BAD_REVIEWS = [
  { text: 'Service was a bit slow on my visit. Had to wait longer than expected.', stars: 3 },
  { text: 'The experience was okay but not what I expected for the price.', stars: 2 },
]

const BUSINESS_REPLIES = [
  'Thank you for your feedback! We apologize for the wait — we were short-staffed that day. We\'ve since added more team members to ensure faster service. We\'d love to make it up to you on your next visit!',
  'We appreciate your honest review and are sorry we didn\'t meet your expectations. We\'ve taken your feedback to heart and made improvements. Please give us another chance — we\'re confident you\'ll notice the difference!',
]

interface FakeReview {
  reviewer: string
  text: string
  stars: number
  daysAgo: number
  businessReply?: string
  replyDaysAgo?: number
}

function getFakeReviews(name: string): FakeReview[] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 3) - hash)
  }
  const offset = Math.abs(hash)
  return Array.from({ length: 5 }).map((_, i) => {
    // Reviews at index 1 and 3 are bad reviews with business replies
    if (i === 1 || i === 3) {
      const badIdx = i === 1 ? 0 : 1
      return {
        reviewer: FAKE_REVIEWERS[(offset + i) % FAKE_REVIEWERS.length],
        text: BAD_REVIEWS[badIdx].text,
        stars: BAD_REVIEWS[badIdx].stars,
        daysAgo: 3 + ((offset + i * 7) % 25),
        businessReply: BUSINESS_REPLIES[badIdx],
        replyDaysAgo: 1 + ((offset + i * 3) % 5),
      }
    }
    return {
      reviewer: FAKE_REVIEWERS[(offset + i) % FAKE_REVIEWERS.length],
      text: FAKE_REVIEW_TEXTS[(offset + i * 3) % FAKE_REVIEW_TEXTS.length],
      stars: 5,
      daysAgo: 1 + ((offset + i * 7) % 30),
    }
  })
}

interface ReferralCardProps {
  // `offer` is the legacy single-offer field; `offers` is the multi-offer
  // array. When both are present, `offers` wins. New consumers should pass
  // `offers` and the carousel/card will let the promoter pick which one to
  // share.
  business: Business & { offer?: Offer; offers?: Offer[]; images?: string[] }
  userId: string
}

export function ReferralCard({ business, userId }: ReferralCardProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)

  // Build the offer list for the picker. Falls back to the singular `offer`
  // for callers that haven't migrated to the array shape yet.
  const offerList: Offer[] = (business.offers && business.offers.length > 0)
    ? business.offers
    : business.offer
    ? [business.offer]
    : []

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
    offerList[0]?.id ?? null
  )
  const selectedOffer = offerList.find((o) => o.id === selectedOfferId) || offerList[0] || undefined

  // The shareable URL points at a specific offer only when the business
  // actually has more than one; for single-offer businesses we keep the
  // bare `/r/[businessId]` form so existing links/QR codes remain valid.
  const referralUrl = generateReferralUrl(
    business.id,
    userId,
    offerList.length > 1 ? selectedOffer?.id : undefined
  )
  const coverImage = selectedOffer?.image || business.images?.[0] || null
  const gradient = getGradientForBusiness(business.name)
  const fakeReviews = getFakeReviews(business.name)

  useEffect(() => {
    QRCode.toDataURL(referralUrl, {
      width: 240,
      margin: 2,
      color: { dark: getQRColor(theme), light: '#ffffff' },
    })
      .then(setQrCode)
      .catch(console.error)
  }, [referralUrl, theme])

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl)
    toast({ title: t('cards.linkCopied'), description: t('cards.linkCopiedDesc') })
  }

  const downloadQR = () => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.download = `${business.name.replace(/\s+/g, '-')}-promo-qr.png`
    link.href = qrCode
    link.click()
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('cards.checkOut', { name: business.name }),
          text: t('cards.recommend', { name: business.name }),
          url: referralUrl,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className="w-full">
      {/* ===== Offer tabs — rendered OUTSIDE the main card =====
          Lives above the QR card so the promoter sees "first pick an offer,
          then this is the QR/link for that offer". Only shown when the
          business has more than one offer. Pure UI; tapping a pill calls
          setSelectedOfferId, which causes referralUrl + QR to recompute via
          the existing useEffect — no business logic here. */}
      {offerList.length > 1 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide px-1">
            {t('cards.chooseOffer', 'Choose an offer to share')}
          </p>
          {/* Pills span the full width of the card below: each pill takes
              an equal share via flex-1. Horizontal scroll kicks in only if
              MAX_ACTIVE_OFFERS_PER_BUSINESS is raised high enough that the
              row no longer fits (today capped at 2 so they'll never scroll). */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin snap-x">
            {offerList.map((o) => {
              const isSelected = o.id === selectedOfferId
              const label = o.title || `${t('businessOffer.offerLabel', 'Offer')} ${o.id.slice(-6)}`
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOfferId(o.id)}
                  aria-pressed={isSelected}
                  className={`flex-1 min-w-0 snap-start text-left rounded-2xl px-4 py-3 transition-all duration-200 ${
                    isSelected
                      ? 'border-2 border-primary bg-primary/15 ring-1 ring-primary/40'
                      : 'border border-border/60 bg-card opacity-75 hover:opacity-100 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                      {label}
                    </p>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold mt-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {t('cards.earn', { amount: formatCurrency(o.referrerCommissionAmount) })}
                  </p>
                  <p className={`text-[10px] mt-1.5 font-medium uppercase tracking-wide ${isSelected ? 'text-primary' : 'text-muted-foreground/70'}`}>
                    {isSelected
                      ? t('cards.sharingThisOffer', 'Sharing this offer')
                      : t('cards.tapToSelect', 'Tap to select')}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="w-full perspective-1000">
      <div className={`relative preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
        {/* ===== FRONT FACE ===== */}
        <div className="backface-hidden">
          <div className="rounded-3xl overflow-hidden shadow-xl border border-border bg-card">
            {/* Banner */}
            <div className="relative h-40 sm:h-48">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${gradient}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Building2 className="h-24 w-24 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Business name & category */}
              <div className="absolute bottom-4 left-5 right-5">
                <h3 className="text-white font-extrabold text-xl sm:text-2xl drop-shadow-lg truncate tracking-wide uppercase">
                  {business.name}
                </h3>
                <p className="text-theme-textSecondary text-sm drop-shadow font-medium">
                  {business.category}
                </p>
              </div>

              {/* Earn badge */}
              {selectedOffer && (
                <div className="absolute top-4 right-4">
                  <div className="bg-white border border-[var(--theme-success,#22c55e)]/30 rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg">
                    <Gift className="h-3.5 w-3.5 text-[var(--theme-success,#22c55e)]" />
                    <span className="text-sm font-bold text-[var(--theme-success,#22c55e)]">
                      {t('cards.earn', { amount: formatCurrency(selectedOffer.referrerCommissionAmount) })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scan to Refer & Earn label */}
            <div className="pt-5 pb-2 text-center">
              <h4 className="text-lg font-bold text-foreground">
                {t('cards.scanToRefer')}
              </h4>
              {/* Context badge: which offer this QR/link belongs to.
                  Only shown for multi-offer businesses; single-offer
                  promoters don't need this disambiguation. */}
              {offerList.length > 1 && selectedOffer && (
                <div className="mt-2 mx-5 flex items-center justify-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {t('cards.currentlySharing', {
                      title: selectedOffer.title || `${t('businessOffer.offerLabel', 'Offer')} ${selectedOffer.id.slice(-6)}`,
                      amount: formatCurrency(selectedOffer.referrerCommissionAmount),
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center px-4 pb-3">
              <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-36 h-36 sm:w-40 sm:h-40" />
                ) : (
                  <div className="w-36 h-36 sm:w-40 sm:h-40 bg-muted animate-pulse rounded-xl" />
                )}
              </div>
            </div>

            {/* Referral URL */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {referralUrl}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 pb-4 pt-1 grid grid-cols-3 gap-2">
              <Button
                onClick={copyLink}
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
                title={offerList.length > 1 ? t('cards.copySelectedLink', 'Copy selected offer link') : undefined}
              >
                <Copy className="h-3.5 w-3.5" />
                {/* "Copy selected offer link" makes it explicit which link
                    goes to the clipboard when a picker is visible; the
                    shorter "Copy" stays for single-offer businesses. */}
                <span className="truncate">
                  {offerList.length > 1
                    ? t('cards.copySelectedLink', 'Copy selected offer link')
                    : t('cards.copy')}
                </span>
              </Button>
              <Button
                onClick={downloadQR}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
              >
                <Download className="h-3.5 w-3.5" />
                {t('cards.qr')}
              </Button>
              <Button
                onClick={shareLink}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
              >
                <Share2 className="h-3.5 w-3.5" />
                {t('cards.share')}
              </Button>
            </div>

            {/* Business Info */}
            {(business.description || business.address || business.phone || business.email || business.website) && (
              <div className="px-5 pb-5 pt-1 border-t border-border space-y-2">
                {business.description && (
                  <p className="text-xs text-muted-foreground pt-3">{business.description}</p>
                )}
                {business.address && (
                  <div className="flex items-start gap-2 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{business.address}</span>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${business.phone}`} className="hover:underline">
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${business.email}`} className="hover:underline truncate">
                      {business.email}
                    </a>
                  </div>
                )}
                {business.website && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                    >
                      {business.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {/* Reviews - tap to flip */}
                <button
                  onClick={() => setFlipped(true)}
                  className="flex items-center justify-end gap-1.5 pt-1 w-full hover:opacity-80 transition-opacity"
                >
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    ({getFakeReviewCount(business.name)})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===== BACK FACE (Reviews) ===== */}
        <div className="backface-hidden rotate-y-180 absolute inset-0">
          <div className="rounded-3xl overflow-hidden shadow-xl border border-border bg-card h-full flex flex-col">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlipped(false)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    4.5
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mt-2">
                {t('cards.reviews', { count: getFakeReviewCount(business.name) })}
              </h3>
            </div>

            {/* Reviews list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {fakeReviews.map((review, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{review.reviewer}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {review.daysAgo}d ago
                    </span>
                  </div>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s < review.stars
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-muted text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {review.text}
                  </p>
                  {/* Business reply */}
                  {review.businessReply && (
                    <div className="ml-4 mt-1.5 pl-3 border-l-2 border-primary/30 bg-muted/50 rounded-r-lg py-2 pr-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-foreground">
                          {business.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {review.replyDaysAgo}d ago
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {review.businessReply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border">
              <button
                onClick={() => setFlipped(false)}
                className="w-full text-center text-sm font-medium text-theme-secondary hover:opacity-80 transition-opacity"
              >
                {t('cards.viewPromo')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
