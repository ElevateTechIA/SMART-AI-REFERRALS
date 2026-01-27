/**
 * Utility functions for managing visit intents (pending visits)
 * Stores in both localStorage (immediate) and Firestore (persistent)
 */

export interface VisitIntent {
  businessId: string
  businessName: string
  businessCategory: string
  referrerId: string | null
  offerId: string | null
  scannedAt: string
  expiresAt: number
}

const STORAGE_KEY = 'pendingVisits'
const EXPIRY_DAYS = 7

/**
 * Save a visit intent to localStorage
 */
export function saveVisitIntent(intent: Omit<VisitIntent, 'scannedAt' | 'expiresAt'>) {
  try {
    const pendingVisits = getPendingVisits()

    // Check if already exists
    const existingIndex = pendingVisits.findIndex(
      v => v.businessId === intent.businessId
    )

    const newIntent: VisitIntent = {
      ...intent,
      scannedAt: new Date().toISOString(),
      expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    }

    if (existingIndex >= 0) {
      // Update existing
      pendingVisits[existingIndex] = newIntent
    } else {
      // Add new
      pendingVisits.push(newIntent)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingVisits))

    return newIntent
  } catch (error) {
    console.error('Error saving visit intent:', error)
    return null
  }
}

/**
 * Get all pending visits from localStorage
 */
export function getPendingVisits(): VisitIntent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const visits: VisitIntent[] = JSON.parse(stored)

    // Filter out expired visits
    const now = Date.now()
    const validVisits = visits.filter(v => v.expiresAt > now)

    // Update storage if any were filtered out
    if (validVisits.length !== visits.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validVisits))
    }

    return validVisits
  } catch (error) {
    console.error('Error getting pending visits:', error)
    return []
  }
}

/**
 * Remove a visit intent after it's been completed
 */
export function removeVisitIntent(businessId: string) {
  try {
    const pendingVisits = getPendingVisits()
    const filtered = pendingVisits.filter(v => v.businessId !== businessId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error removing visit intent:', error)
    return false
  }
}

/**
 * Get a specific visit intent by business ID
 */
export function getVisitIntent(businessId: string): VisitIntent | null {
  const pendingVisits = getPendingVisits()
  return pendingVisits.find(v => v.businessId === businessId) || null
}

/**
 * Clear all expired visit intents
 */
export function clearExpiredIntents() {
  try {
    const pendingVisits = getPendingVisits()
    const now = Date.now()
    const validVisits = pendingVisits.filter(v => v.expiresAt > now)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validVisits))
    return true
  } catch (error) {
    console.error('Error clearing expired intents:', error)
    return false
  }
}

/**
 * Check if user has a pending visit for a business
 */
export function hasPendingVisit(businessId: string): boolean {
  return getVisitIntent(businessId) !== null
}
