'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Star, Loader2 } from 'lucide-react'
import { apiGet } from '@/lib/api-client'
import type { Review } from '@/lib/types'

interface ReviewsListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  businessName: string
}

export function ReviewsListDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
}: ReviewsListDialogProps) {
  const { t } = useTranslation()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return

    const fetchReviews = async () => {
      setLoading(true)
      try {
        const result = await apiGet<{ reviews: Review[] }>(
          `/api/reviews?businessId=${businessId}`
        )
        if (result.ok && result.data) {
          setReviews(
            result.data.reviews.map((r) => ({
              ...r,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
              updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
            }))
          )
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [open, businessId])

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  function timeAgo(date: Date): string {
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days === 0) return t('review.today')
    if (days === 1) return t('review.yesterday')
    return t('review.daysAgo', { count: days })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{businessName}</DialogTitle>
          {!loading && reviews.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(avgRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-muted text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? t('review.reviewSingular') : t('review.reviewPlural')})
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('review.noReviewsYet')}
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {reviews.map((review) => (
                <div key={review.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {review.userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-muted text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
