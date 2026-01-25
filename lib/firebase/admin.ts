import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, DecodedIdToken } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { NextRequest } from 'next/server'

// Result type for auth verification
export interface AuthResult {
  success: true
  user: DecodedIdToken
  uid: string
}

export interface AuthError {
  success: false
  error: string
  status: number
}

export type VerifyAuthResult = AuthResult | AuthError

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    // Defer throwing until runtime when a function actually requests the admin app.
    // This prevents build-time failures in environments where env vars are
    // only provided at runtime (for example, Vercel).
    throw new Error('Firebase Admin SDK environment variables are not properly configured')
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

// Export helper getters that initialize the Admin SDK on first use instead of
// during module import.
export function getAdminApp(): App {
  return getFirebaseAdminApp()
}
export function getAdminAuth() {
  return getAuth(getAdminApp())
}
export function getAdminDb() {
  return getFirestore(getAdminApp())
}
export function getAdminStorage() {
  return getStorage(getAdminApp())
}

/**
 * Verify Firebase ID token from request Authorization header
 * Returns the decoded token if valid, or an error object if invalid
 */
export async function verifyAuth(request: NextRequest): Promise<VerifyAuthResult> {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid Authorization header',
        status: 401,
      }
    }

    const token = authHeader.split('Bearer ')[1]

    if (!token) {
      return {
        success: false,
        error: 'No token provided',
        status: 401,
      }
    }

    const decodedToken = await getAdminAuth().verifyIdToken(token)

    return {
      success: true,
      user: decodedToken,
      uid: decodedToken.uid,
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return {
      success: false,
      error: 'Invalid or expired token',
      status: 401,
    }
  }
}

/**
 * Verify that the authenticated user has admin role
 */
export async function verifyAdmin(request: NextRequest): Promise<VerifyAuthResult> {
  const authResult = await verifyAuth(request)

  if (!authResult.success) {
    return authResult
  }

  // Check if user has admin role in Firestore
  const userDoc = await getAdminDb().collection('users').doc(authResult.uid).get()

  if (!userDoc.exists || !userDoc.data()?.roles?.includes('admin')) {
    return {
      success: false,
      error: 'Admin access required',
      status: 403,
    }
  }

  return authResult
}

export default getAdminApp
