// User Roles
export type UserRole = 'admin' | 'business' | 'referrer' | 'consumer'

// Referrer Status
export type ReferrerStatus = 'pending' | 'active' | 'suspended'

// User Profile
export interface User {
  id: string
  email: string
  name: string
  photoURL?: string
  roles: UserRole[]
  referrerStatus?: ReferrerStatus
  createdAt: Date
  updatedAt: Date
}

// Business Status
export type BusinessStatus = 'pending' | 'active' | 'suspended'

// Business Profile
export interface Business {
  id: string
  ownerUserId: string
  name: string
  category: string
  description: string
  address: string
  phone: string
  website?: string
  images: string[] // Firebase Storage URLs
  status: BusinessStatus
  createdAt: Date
  updatedAt: Date
}

// Consumer Reward Type
export type ConsumerRewardType = 'cash' | 'points' | 'discount' | 'none'

// Offer / Campaign
export interface Offer {
  id: string
  businessId: string
  pricePerNewCustomer: number // e.g., 100 USD
  referrerCommissionAmount: number // Fixed amount referrer earns
  referrerCommissionPercentage?: number // Alternative: percentage of pricePerNewCustomer
  consumerRewardType: ConsumerRewardType
  consumerRewardValue: number // Amount/points/discount percentage
  allowPlatformAttribution: boolean // If true, platform can get commission when no referrer
  active: boolean
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

// Attribution Type
export type AttributionType = 'REFERRER' | 'PLATFORM'

// Visit Status
export type VisitStatus = 'CREATED' | 'CHECKED_IN' | 'CONVERTED' | 'REJECTED'

// Visit Record
export interface Visit {
  id: string
  businessId: string
  offerId: string
  consumerUserId: string
  referrerUserId: string | null // null if platform attribution
  attributionType: AttributionType
  status: VisitStatus
  isNewCustomer: boolean // Anti-fraud: true only if first visit
  deviceFingerprint?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
  convertedAt?: Date
  // QR Check-in fields
  checkInToken?: string // Hashed token (SHA-256) for validation
  checkInTokenExpiry?: Date // Expires 7 days from creation
  checkInTokenUsed?: boolean // Prevents token reuse (single-use)
  checkedInAt?: Date // Timestamp when business scanned QR
  checkInByUserId?: string // Business user who performed check-in (audit trail)
}

// Earning Type
export type EarningType = 'REFERRER_COMMISSION' | 'CONSUMER_REWARD'

// Earning Status
export type EarningStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'

// Earning Record (Ledger entry for users)
export interface Earning {
  id: string
  userId: string
  businessId: string
  visitId: string
  offerId: string
  amount: number
  type: EarningType
  status: EarningStatus
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
}

// Charge Status
export type ChargeStatus = 'OWED' | 'PAID' | 'VOID'

// Charge Record (Amount owed by business to platform)
export interface Charge {
  id: string
  businessId: string
  visitId: string
  offerId: string
  amount: number // Total amount (pricePerNewCustomer)
  platformAmount: number // Platform's portion
  referrerAmount: number // Referrer's portion (if any)
  consumerRewardAmount: number // Consumer reward amount (if any)
  status: ChargeStatus
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
}

// Fraud Flag
export interface FraudFlag {
  id: string
  visitId: string
  consumerUserId: string
  businessId: string
  reason: string // e.g., "Repeat visit from same consumer"
  createdAt: Date
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Form Types
export interface BusinessFormData {
  name: string
  category: string
  description: string
  address: string
  phone: string
  website?: string
}

export interface OfferFormData {
  pricePerNewCustomer: number
  referrerCommissionAmount: number
  consumerRewardType: ConsumerRewardType
  consumerRewardValue: number
  allowPlatformAttribution: boolean
  active: boolean
}

// Dashboard Stats
export interface BusinessStats {
  totalVisits: number
  totalConversions: number
  pendingConversions: number
  totalChargesOwed: number
  totalChargesPaid: number
}

export interface ReferrerStats {
  totalReferrals: number
  successfulConversions: number
  pendingEarnings: number
  totalEarnings: number
  paidEarnings: number
}

export interface AdminStats {
  totalBusinesses: number
  pendingBusinesses: number
  pendingReferrers: number
  totalUsers: number
  totalVisits: number
  totalConversions: number
  totalRevenue: number
}
