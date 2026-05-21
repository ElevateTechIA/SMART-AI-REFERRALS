'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'
import type { Business, Offer } from '@/lib/types'
import { ReferralCardCarousel } from '@/components/referral-card-carousel'
import { ArrowLeft, Star, Heart } from 'lucide-react'

function getFakeReviewCount(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 7) - hash)
  }
  return 50 + (Math.abs(hash) % 450)
}

type BusinessWithOffer = Business & { offer?: Offer; offers?: Offer[]; images?: string[] }

const PLACEHOLDER_BUSINESSES = [
  'Bloom Café',
  'Neon Barber',
  'Fresh Bites',
  'Peak Fitness',
  'Luxe Nails',
  'Urban Auto',
  'Zen Spa',
  'Quick Wash',
  'Happy Paws',
  'Solar Tech',
]

const PLACEHOLDER_GRADIENTS = [
  'bg-gradient-to-br from-rose-200/60 to-rose-300/60',
  'bg-gradient-to-br from-blue-200/60 to-blue-300/60',
  'bg-gradient-to-br from-amber-200/60 to-amber-300/60',
  'bg-gradient-to-br from-emerald-200/60 to-emerald-300/60',
  'bg-gradient-to-br from-violet-200/60 to-violet-300/60',
  'bg-gradient-to-br from-cyan-200/60 to-cyan-300/60',
  'bg-gradient-to-br from-pink-200/60 to-pink-300/60',
  'bg-gradient-to-br from-teal-200/60 to-teal-300/60',
  'bg-gradient-to-br from-orange-200/60 to-orange-300/60',
  'bg-gradient-to-br from-indigo-200/60 to-indigo-300/60',
]

const INITIAL_COLORS = [
  'text-rose-500',
  'text-blue-500',
  'text-amber-500',
  'text-emerald-500',
  'text-violet-500',
  'text-cyan-500',
  'text-pink-500',
  'text-teal-500',
  'text-orange-500',
  'text-indigo-500',
]

interface BusinessGridProps {
  businesses: BusinessWithOffer[]
  userId: string
  initialOfferId?: string | null
  favorites?: Set<string>
  onToggleFavorite?: (businessId: string) => void
  isFiltered?: boolean
}

export function BusinessGrid({ businesses, userId, initialOfferId, favorites, onToggleFavorite, isFiltered }: BusinessGridProps) {

  const { t } = useTranslation()
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithOffer | null>(null)
  const [dismissedOffer, setDismissedOffer] = useState(false)

  // Auto-select business when businesses load with initialOfferId
  useEffect(() => {
    if (initialOfferId && !dismissedOffer && !selectedBusiness && businesses.length > 0) {
      const match = businesses.find((b) => b.id === initialOfferId)
      if (match) setSelectedBusiness(match)
    }
  }, [initialOfferId, businesses, selectedBusiness, dismissedOffer])

  const placeholderCount = isFiltered ? 0 : Math.max(0, 10 - businesses.length)

  // Detail view — full page with back button
  if (selectedBusiness) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setDismissedOffer(true); setSelectedBusiness(null) }}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.back')}
        </button>

        {/* Referral card carousel (supports future multiple promos) */}
        <div className="max-w-md mx-auto">
          <ReferralCardCarousel
            businesses={[selectedBusiness]}
            userId={userId}
          />
        </div>
      </div>
    )
  }

  // Empty state for favorites filter
  if (businesses.length === 0 && isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">{t('promotions.noFavoritesTitle')}</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">{t('promotions.noFavorites')}</p>
      </div>
    )
  }

  const totalItems = businesses.length + placeholderCount
  const needsScroll = totalItems > 8

  // Grid view
  return (
    <div
      className={needsScroll
        ? 'overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-thin'
        : ''
      }
    >
    <div
      className={needsScroll
        ? 'grid grid-rows-2 sm:grid-rows-3 grid-flow-col auto-cols-[calc((100%-0.75rem)/2)] sm:auto-cols-[calc((100%-1.5rem)/3)] lg:grid-rows-none lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4'
        : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4'
      }
    >
      {/* Real businesses */}
      {businesses.map((biz) => {
        const logo = biz.images?.[biz.images.length - 1] || null
        const earn = biz.offer
          ? formatCurrency(biz.offer.referrerCommissionAmount)
          : null

        const isFavorite = favorites?.has(biz.id) ?? false

        return (
          <div
            key={biz.id}
            className="relative flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelectedBusiness(biz)}
          >
            {/* Favorite toggle */}
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(biz.id) }}
                className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full hover:bg-muted/80 transition-all active:scale-125"
                aria-label={isFavorite ? t('promotions.removeFromFavorites') : t('promotions.addToFavorites')}
              >
                <Heart className={`h-4 w-4 transition-all duration-200 ${isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-muted-foreground hover:text-rose-400'}`} />
              </button>
            )}
            {/* Logo circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border shadow-sm">
              {logo ? (
                <img
                  src={logo}
                  alt={biz.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                  {biz.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Name */}
            <span className="text-xs sm:text-sm font-medium text-foreground text-center leading-tight line-clamp-2 w-full">
              {biz.name}
            </span>
            {/* Earn tag */}
            {earn && (
              <span className="text-[10px] sm:text-xs font-semibold text-theme-accent">
                {t('promotions.earnTag', { amount: earn })}
              </span>
            )}
            {/* Reviews count */}
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {getFakeReviewCount(biz.name)}
              </span>
            </div>
          </div>
        )
      })}

      {/* Placeholder businesses */}
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <div
          key={`placeholder-${i}`}
          className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-dashed border-border/60 opacity-50"
        >
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ${PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]}`}
          >
            <span className={`text-2xl sm:text-3xl font-bold ${INITIAL_COLORS[i % INITIAL_COLORS.length]}`}>
              {PLACEHOLDER_BUSINESSES[i].charAt(0)}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground text-center leading-tight line-clamp-2 w-full">
            {PLACEHOLDER_BUSINESSES[i]}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground/60">
            {t('promotions.comingSoon')}
          </span>
        </div>
      ))}
    </div>
    </div>
  )
}
