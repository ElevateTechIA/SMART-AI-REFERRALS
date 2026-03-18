'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import type { User, UserRole } from '@/lib/types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
  signInWithGoogle: (role?: UserRole) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrateUser = (id: string, data: Record<string, unknown>): User => ({
    id,
    email: data.email as string,
    name: data.name as string,
    secondaryEmail: (data.secondaryEmail as string) || undefined,
    dateOfBirth: (data.dateOfBirth as string) || undefined,
    state: (data.state as string) || undefined,
    city: (data.city as string) || undefined,
    zipcode: (data.zipcode as string) || undefined,
    phone: (data.phone as string) || undefined,
    photoURL: (data.photoURL as string) || undefined,
    roles: (data.roles as UserRole[]) || ['referrer'],
    referrerStatus: data.referrerStatus as User['referrerStatus'],
    profileComplete: (data.profileComplete as boolean) || false,
    bankInfo: data.bankInfo as User['bankInfo'],
    termsAccepted: (data.termsAccepted as boolean) || false,
    termsAcceptedAt: (data.termsAcceptedAt as { toDate: () => Date })?.toDate() || undefined,
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate() || new Date(),
    updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate() || new Date(),
  })

  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (userDoc.exists()) {
      return hydrateUser(userDoc.id, userDoc.data())
    }
    return null
  }

  const createUserDocument = async (
    firebaseUser: FirebaseUser,
    name?: string,
    role?: UserRole
  ): Promise<User> => {
    // Admin role is only assigned through server-side scripts (scripts/make-admin.js)
    // Never assign admin role on client side to prevent privilege escalation
    // All users get 'referrer' (promoter) role unless registering as business
    const userRole: UserRole = role === 'admin' ? 'referrer' : (role === 'business' ? 'business' : 'referrer')
    const roles: UserRole[] = [userRole]

    // Set referrerStatus to pending if registering as referrer
    const referrerStatus = userRole === 'referrer' ? 'pending' : undefined

    const userData: Record<string, unknown> = {
      email: firebaseUser.email!,
      name: name || firebaseUser.displayName || 'User',
      photoURL: firebaseUser.photoURL || null,
      roles: roles,
      profileComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (referrerStatus) {
      userData.referrerStatus = referrerStatus
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), userData)

    // Trigger auto-approve if the admin flag is active (fire-and-forget)
    firebaseUser.getIdToken().then((token) => {
      fetch('/api/auth/auto-approve', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Non-critical: user will be approved manually if this fails
      })
    })

    return {
      id: firebaseUser.uid,
      email: userData.email as string,
      name: userData.name as string,
      photoURL: (userData.photoURL as string) || undefined,
      roles: userData.roles as UserRole[],
      referrerStatus: referrerStatus as User['referrerStatus'],
      profileComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  useEffect(() => {
    // Handle pending redirect result (mobile fallback for Google sign-in)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const existingUser = await fetchUserData(result.user)
          if (existingUser) {
            setUser(existingUser)
          } else {
            let role: UserRole | undefined
            try {
              const stored = sessionStorage.getItem('pendingAuthRole')
              if (stored) role = stored as UserRole
              sessionStorage.removeItem('pendingAuthRole')
            } catch {
              // sessionStorage may be unavailable
            }
            const newUser = await createUserDocument(result.user, undefined, role)
            setUser(newUser)
          }
        }
      })
      .catch(() => {
        // Redirect result errors are non-fatal (e.g. missing initial state)
      })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser)
        if (userData) {
          setUser(userData)
        }
        // Never auto-create user docs here — only signInWithGoogle and
        // getRedirectResult should create docs so the correct role is preserved
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async (role?: UserRole) => {
    // Create a fresh provider each time to ensure prompt: 'select_account' is always applied
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      const result = await signInWithPopup(auth, provider)
      const existingUser = await fetchUserData(result.user)
      if (!existingUser) {
        const newUser = await createUserDocument(result.user, undefined, role)
        setUser(newUser)
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      // Popup blocked or closed on mobile - fall back to redirect
      if (
        firebaseError.code === 'auth/popup-blocked' ||
        firebaseError.code === 'auth/popup-closed-by-user' ||
        firebaseError.code === 'auth/cancelled-popup-request'
      ) {
        try {
          if (role) sessionStorage.setItem('pendingAuthRole', role)
        } catch {
          // sessionStorage may be unavailable
        }
        await signInWithRedirect(auth, provider)
      } else {
        throw error
      }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        // Use getDocFromServer to bypass Firestore client cache
        const userDoc = await getDocFromServer(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setUser(hydrateUser(userDoc.id, userDoc.data()))
        }
      } catch (error) {
        console.error('Error refreshing user data:', error)
        // Fallback to regular getDoc if server fetch fails
        const userData = await fetchUserData(firebaseUser)
        if (userData) {
          setUser(userData)
        }
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        signInWithGoogle,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
