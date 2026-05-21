// User Roles
export type UserRole = 'admin' | 'business' | 'referrer' | 'consumer'

// Referrer Status
export type ReferrerStatus = 'pending' | 'active' | 'suspended'

// Bank Info (promoter payouts)
export interface BankInfo {
  bankName: string
  accountHolderName: string
  routingNumber: string
  accountNumber: string
  accountType: 'checking' | 'savings'
}

// User Profile
export interface User {
  id: string
  email: string
  name: string
  secondaryEmail?: string
  dateOfBirth?: string // ISO YYYY-MM-DD
  state?: string // US state abbreviation e.g. "CA"
  city?: string
  zipcode?: string
  phone?: string
  photoURL?: string
  roles: UserRole[]
  referrerStatus?: ReferrerStatus
  profileComplete?: boolean
  bankInfo?: BankInfo
  termsAccepted?: boolean
  termsAcceptedAt?: Date
  adminPermissions?: AdminPermission[]
  createdAt: Date
  updatedAt: Date
}

// Admin permissions — if empty/undefined, user is a full admin with all access
export type AdminPermission = 'businesses' | 'referrers' | 'users' | 'visits' | 'support' | 'payouts' | 'revenue'

// Tabs restricted to full admins only (cannot be granted to limited admins)
export const FULL_ADMIN_ONLY_TABS = ['settings'] as const

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
  email?: string // Owner email (populated from users collection)
  images: string[] // Firebase Storage URLs
  status: BusinessStatus
  createdAt: Date
  updatedAt: Date
}

// Consumer Reward Type (admin-controlled platform payout)
export type ConsumerRewardType = 'cash' | 'none'

// Business Promotion Type (business-controlled incentive for consumer)
export type PromotionType = 'discount_percent' | 'discount_fixed' | 'free_item' | 'none'

// Offer lifecycle state. `status` is the source of truth on new documents.
// Legacy documents (pre multi-offer) only carried `active: boolean` — see
// `lib/offers-config.ts` `isOfferActive` for the reconciled rule.
export type OfferStatus = 'active' | 'archived'

// Offer / Campaign
export interface Offer {
  id: string
  businessId: string
  title?: string // Short label shown in lists/selectors when a business has multiple offers
  image?: string // Firebase Storage URL for offer image
  pricePerNewCustomer: number // e.g., 100 USD
  referrerCommissionAmount: number // Fixed amount referrer earns (admin-set)
  referrerCommissionPercentage?: number // Alternative: percentage of pricePerNewCustomer
  consumerRewardType: ConsumerRewardType // Admin-set platform payout
  consumerRewardValue: number // Cash back amount
  promotionType: PromotionType // Business-set incentive for consumer
  promotionValue: number // Discount % or $ amount
  promotionDescription?: string // Free text, e.g. "Free appetizer on first visit"
  allowPlatformAttribution: boolean // If true, platform can get commission when no referrer
  active: boolean // Kept for backwards compat — derive UI state from `status` when present
  status?: OfferStatus // Preferred lifecycle field on new docs
  startDate?: Date
  endDate?: Date
  // Migration audit (only set on docs created by the migration script)
  legacyOfferId?: string
  legacyBusinessId?: string
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
  // Receipt fields
  receiptId?: string // Links to the receipt document if one was uploaded
}

// Receipt Status
export type ReceiptStatus = 'PROCESSING' | 'EXTRACTED' | 'VERIFIED' | 'FAILED'

// Receipt Line Item
export interface ReceiptItem {
  name: string
  quantity?: number
  price?: number
}

// Extracted Receipt Data
export interface ReceiptData {
  storeName?: string
  storeAddress?: string
  date?: string // ISO YYYY-MM-DD
  totalAmount?: number
  subtotal?: number
  tax?: number
  tip?: number
  paymentMethod?: string // "Visa", "Cash", "Mastercard", etc.
  lastFourDigits?: string
  items?: ReceiptItem[]
  currency?: string // default "USD"
  receiptNumber?: string
}

// Receipt Record
export interface Receipt {
  id: string
  visitId: string
  businessId: string
  uploadedByUserId: string
  uploadedByRole: 'consumer' | 'business'
  imageUrl: string
  status: ReceiptStatus
  extractedData?: ReceiptData
  confidence?: number // 0-1 confidence score from Gemini
  error?: string
  createdAt: Date
  updatedAt: Date
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

// Payout Request Status
export type PayoutRequestStatus = 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'

// Payout Request (User cashout request)
export interface PayoutRequest {
  id: string
  userId: string
  amount: number
  earningIds: string[]
  status: PayoutRequestStatus
  paymentMethod?: string
  adminNote?: string
  processedBy?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

// Minimum cashout amount in USD
export const MIN_CASHOUT_AMOUNT = 50

// Charge Status
export type ChargeStatus = 'OWED' | 'PARTIAL' | 'PAID' | 'VOID'

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

// Review
export interface Review {
  id: string
  businessId: string
  userId: string
  userName: string
  rating: number // 1-5
  text: string
  createdAt: Date
  updatedAt: Date
}

// Support Ticket
export type SupportTicketStatus = 'open' | 'resolved'

export interface TicketReply {
  id: string
  message: string
  senderRole: 'user' | 'admin'
  senderUserId: string
  senderName: string
  createdAt: Date
}

export interface SupportTicket {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  message: string
  status: SupportTicketStatus
  read: boolean
  adminReply?: string
  repliedBy?: string
  replies?: TicketReply[]
  lastReplyAt?: Date
  lastReplyBy?: 'user' | 'admin'
  createdAt: Date
  updatedAt: Date
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
