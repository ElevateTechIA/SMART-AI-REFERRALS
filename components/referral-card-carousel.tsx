'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ReferralCard } from '@/components/referral-card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Business, Offer } from '@/lib/types'

interface ReferralCardCarouselProps {
  businesses: (Business & { offer?: Offer; images?: string[] })[]
  userId: string
}

export function ReferralCardCarousel({ businesses, userId }: ReferralCardCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: 'trimSnaps',
    loop: businesses.length > 1,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  if (businesses.length === 0) return null

  // Single business - no carousel needed
  if (businesses.length === 1) {
    return (
      <div className="max-w-md mx-auto">
        <ReferralCard business={businesses[0]} userId={userId} />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex pl-4">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="flex-[0_0_85%] sm:flex-[0_0_70%] md:flex-[0_0_50%] min-w-0 pl-3"
            >
              <ReferralCard business={business} userId={userId} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop navigation arrows */}
      {canScrollPrev && (
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-card shadow-lg border border-border items-center justify-center hover:bg-muted transition-colors z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollNext && (
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-card shadow-lg border border-border items-center justify-center hover:bg-muted transition-colors z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {businesses.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? 'w-6 bg-blue-500'
                : 'w-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
