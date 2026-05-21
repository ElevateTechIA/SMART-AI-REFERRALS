import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

/**
 * Build a referral URL.
 *
 * - `offerId` (optional) targets a specific offer when the business has more
 *   than one. When omitted, the page falls back to listing all active offers,
 *   keeping legacy links (`/r/[businessId]`) functional.
 */
export function generateReferralUrl(
  businessId: string,
  referrerUserId?: string,
  offerId?: string,
): string {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`
  const path = offerId
    ? `${baseUrl}/r/${businessId}/${offerId}`
    : `${baseUrl}/r/${businessId}`
  return referrerUserId ? `${path}?ref=${referrerUserId}` : path
}
