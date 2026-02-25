'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'
import type { Business, Offer } from '@/lib/types'
import { ReferralCardCarousel } from '@/components/referral-card-carousel'
import { ArrowLeft, Star } from 'lucide-react'

function getFakeReviewCount(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 7) - hash)
  }
  return 50 + (Math.abs(hash) % 450)
}

type BusinessWithOffer = Business & { offer?: Offer; images?: string[] }

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
  'bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30',
  'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
  'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30',
  'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30',
  'bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/30 dark:to-violet-800/30',
  'bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30',
  'bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30',
  'bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30',
  'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30',
  'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30',
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
}

export function BusinessGrid({ businesses, userId }: BusinessGridProps) {
  const { t } = useTranslation()
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithOffer | null>(null)

  const placeholderCount = Math.max(0, 10 - businesses.length)

  // Detail view — full page with back button
  if (selectedBusiness) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedBusiness(null)}
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

  // Grid view
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {/* Real businesses */}
      {businesses.map((biz) => {
        const logo = biz.images?.[biz.images.length - 1] || null
        const earn = biz.offer
          ? formatCurrency(biz.offer.referrerCommissionAmount)
          : null

        return (
          <button
            key={biz.id}
            onClick={() => setSelectedBusiness(biz)}
            className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all"
          >
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
              <span className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400">
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
          </button>
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
  )
}
