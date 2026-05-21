'use client'

import { useParams } from 'next/navigation'
import { ReferralPageWithOffer } from '../page'

/**
 * Offer-specific referral page: `/r/[businessId]/[offerId]`.
 *
 * Just delegates to the same component used at `/r/[businessId]` but pins
 * the offer the user lands on. Legacy `/r/[businessId]` links still work.
 */
export default function ReferralPageByOffer() {
  const params = useParams()
  const offerId = params.offerId as string
  return <ReferralPageWithOffer offerId={offerId} />
}
