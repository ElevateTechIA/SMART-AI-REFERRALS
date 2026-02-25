'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Loader2 } from 'lucide-react'
import { apiPost, apiPut } from '@/lib/api-client'
import type { Review } from '@/lib/types'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  businessName: string
  existingReview?: Review | null
  onSuccess: (review: Review) => void
}

export function ReviewDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
  existingReview,
  onSuccess,
}: ReviewDialogProps) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [text, setText] = useState(existingReview?.text || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!existingReview

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(t('review.ratingRequired'))
      return
    }
    if (text.trim().length < 3) {
      setError(t('review.textRequired'))
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let result
      if (isEditing) {
        result = await apiPut<{ review: Review }>('/api/reviews', {
          reviewId: existingReview.id,
          rating,
          text: text.trim(),
        })
      } else {
        result = await apiPost<{ review: Review }>('/api/reviews', {
          businessId,
          rating,
          text: text.trim(),
        })
      }

      if (!result.ok) {
        setError(result.error || t('common.error'))
        return
      }

      onSuccess(result.data!.review)
      setTimeout(() => onOpenChange(false), 500)
    } catch {
      setError(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('review.editReview') : t('review.writeReview')}
          </DialogTitle>
          <DialogDescription>{businessName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star rating input */}
          <div>
            <p className="text-sm font-medium mb-2">{t('review.rating')}</p>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const starValue = i + 1
                const isFilled = starValue <= (hoveredStar || rating)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoveredStar(starValue)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted-foreground/30'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Text input */}
          <div>
            <p className="text-sm font-medium mb-2">{t('review.yourReview')}</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('review.reviewPlaceholder')}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {text.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('common.saving')}
              </>
            ) : isEditing ? (
              t('review.updateReview')
            ) : (
              t('review.submitReview')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
