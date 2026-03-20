import { NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { TEST_ACCOUNTS } from '@/lib/auth/test-accounts'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH !== 'true') {
    return NextResponse.json(
      { error: 'Test auth is not enabled' },
      { status: 403 }
    )
  }

  const adminAuth = getAdminAuth()
  const db = getAdminDb()
  const results: { email: string; status: string }[] = []

  for (const account of TEST_ACCOUNTS) {
    try {
      // Create or get existing Firebase Auth user
      let uid: string
      try {
        const userRecord = await adminAuth.createUser({
          email: account.email,
          password: account.password,
          displayName: account.name,
          emailVerified: true,
        })
        uid = userRecord.uid
      } catch (error: unknown) {
        const firebaseError = error as { code?: string }
        if (firebaseError.code === 'auth/email-already-exists') {
          const existingUser = await adminAuth.getUserByEmail(account.email)
          uid = existingUser.uid
          // Update password in case it changed
          await adminAuth.updateUser(uid, { password: account.password })
        } else {
          throw error
        }
      }

      // Create/update Firestore user document
      const userData: Record<string, unknown> = {
        email: account.email,
        name: account.name,
        roles: [account.role],
        profileComplete: true,
        termsAccepted: true,
        termsAcceptedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (account.role === 'referrer' && 'referrerStatus' in account) {
        userData.referrerStatus = account.referrerStatus
      }

      await db.collection('users').doc(uid).set(userData, { merge: true })

      // For business account, create a test business
      if (account.role === 'business') {
        const bizSnapshot = await db
          .collection('businesses')
          .where('ownerUserId', '==', uid)
          .limit(1)
          .get()

        if (bizSnapshot.empty) {
          await db.collection('businesses').add({
            name: 'Test Business Store',
            ownerUserId: uid,
            status: 'active',
            category: 'Restaurant',
            address: '123 Test St, Miami, FL',
            phone: '555-0100',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
      }

      results.push({ email: account.email, status: 'ok' })
    } catch (error) {
      console.error(`Error seeding ${account.email}:`, error)
      results.push({
        email: account.email,
        status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
      })
    }
  }

  return NextResponse.json({ success: true, results })
}
