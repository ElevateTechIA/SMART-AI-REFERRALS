'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import {
  ReferralPageContent,
  ReferralPageFallback,
} from '@/components/referral-page-content'

/**
 * Offer-specific referral page: `/r/[businessId]/[offerId]`.
 *
 * Pins the offer the user lands on. Shares the same UI as
 * `/r/[businessId]`. The legacy entry point stays functional.
 */
export default function ReferralPageByOffer() {
  const params = useParams()
  const offerId = params.offerId as string
  return (
    <Suspense fallback={<ReferralPageFallback />}>
      <ReferralPageContent offerIdFromRoute={offerId} />
    </Suspense>
  )
}
