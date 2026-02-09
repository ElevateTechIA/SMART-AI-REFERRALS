'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase/client'
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

  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        id: userDoc.id,
        email: data.email,
        name: data.name,
        photoURL: data.photoURL,
        roles: data.roles || ['referrer'],
        referrerStatus: data.referrerStatus,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      }
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
    // Default to 'referrer' for new users (most common case)
    const userRole: UserRole = role === 'admin' ? 'referrer' : (role || 'referrer')
    const roles: UserRole[] = [userRole]

    // Set referrerStatus to pending if registering as referrer
    const referrerStatus = userRole === 'referrer' ? 'pending' : undefined

    const userData: Record<string, unknown> = {
      email: firebaseUser.email!,
      name: name || firebaseUser.displayName || 'User',
      photoURL: firebaseUser.photoURL || null,
      roles: roles,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (referrerStatus) {
      userData.referrerStatus = referrerStatus
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), userData)

    return {
      id: firebaseUser.uid,
      email: userData.email as string,
      name: userData.name as string,
      photoURL: (userData.photoURL as string) || undefined,
      roles: userData.roles as UserRole[],
      referrerStatus: referrerStatus as User['referrerStatus'],
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
          if (!existingUser) {
            let role: UserRole | undefined
            try {
              const stored = sessionStorage.getItem('pendingAuthRole')
              if (stored) role = stored as UserRole
              sessionStorage.removeItem('pendingAuthRole')
            } catch {
              // sessionStorage may be unavailable
            }
            await createUserDocument(result.user, undefined, role)
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
        } else {
          // Create user document if it doesn't exist
          const newUser = await createUserDocument(firebaseUser)
          setUser(newUser)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async (role?: UserRole) => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const existingUser = await fetchUserData(result.user)
      if (!existingUser) {
        await createUserDocument(result.user, undefined, role)
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
        await signInWithRedirect(auth, googleProvider)
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
          const data = userDoc.data()
          setUser({
            id: userDoc.id,
            email: data.email,
            name: data.name,
            photoURL: data.photoURL,
            roles: data.roles || ['referrer'],
            referrerStatus: data.referrerStatus,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          })
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
