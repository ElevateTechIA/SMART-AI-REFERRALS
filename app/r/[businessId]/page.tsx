'use client'

import { Suspense } from 'react'
import {
  ReferralPageContent,
  ReferralPageFallback,
} from '@/components/referral-page-content'

/**
 * Legacy referral entry point: `/r/[businessId]`.
 *
 * Delegates to the shared `ReferralPageContent` so the offer-specific route
 * (`/r/[businessId]/[offerId]`) can reuse the exact same UI. Kept as a thin
 * wrapper to comply with Next.js's rule that `page.tsx` files only export
 * `default` (plus route segment configs).
 */
export default function ReferralPage() {
  return (
    <Suspense fallback={<ReferralPageFallback />}>
      <ReferralPageContent />
    </Suspense>
  )
}
