import crypto from 'crypto'
import QRCode from 'qrcode'

/**
 * Generate cryptographically secure random token for check-in
 * @returns Base64url-encoded token (URL-safe, no padding)
 */
export function generateCheckInToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Hash token for secure storage (prevents token theft from database)
 * @param token Plain text token
 * @returns SHA-256 hash of token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate check-in URL for QR code
 * @param visitId Visit document ID
 * @param token Plain text check-in token
 * @returns URL for QR code
 */
export function generateCheckInQRUrl(visitId: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/check-in?v=${visitId}&t=${token}`
}

/**
 * Check if token has expired
 * @param expiryDate Token expiration date (Date object, string, or timestamp)
 * @returns True if expired, false otherwise
 */
export function isTokenExpired(expiryDate: Date | string | number): boolean {
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate)
  return new Date() > expiry
}

/**
 * Calculate days remaining until expiration
 * @param expiryDate Token expiration date (Date object, string, or timestamp)
 * @returns Number of days remaining (rounded up)
 */
export function getDaysRemaining(expiryDate: Date | string | number): number {
  const now = Date.now()
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate)
  const diff = expiry.getTime() - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Generate QR code image as data URL
 * @param visitId Visit document ID
 * @param token Plain text check-in token
 * @returns Promise resolving to data URL of QR code image
 */
export async function generateCheckInQRImage(visitId: string, token: string): Promise<string> {
  const url = generateCheckInQRUrl(visitId, token)
  return await QRCode.toDataURL(url, { width: 300, margin: 2 })
}
