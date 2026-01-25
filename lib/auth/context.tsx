'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase/client'
import type { User, UserRole } from '@/lib/types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
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
        roles: data.roles || ['consumer'],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      }
    }
    return null
  }

  const createUserDocument = async (
    firebaseUser: FirebaseUser,
    name?: string
  ): Promise<User> => {
    // Admin role is only assigned through server-side scripts (scripts/make-admin.js)
    // Never assign admin role on client side to prevent privilege escalation
    const defaultRoles: UserRole[] = ['consumer']

    const userData = {
      email: firebaseUser.email!,
      name: name || firebaseUser.displayName || 'User',
      photoURL: firebaseUser.photoURL || null,
      roles: defaultRoles,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), userData)

    return {
      id: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      photoURL: userData.photoURL || undefined,
      roles: userData.roles,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  useEffect(() => {
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

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: name })
    await createUserDocument(credential.user, name)
  }

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider)
    const existingUser = await fetchUserData(result.user)
    if (!existingUser) {
      await createUserDocument(result.user)
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser)
      if (userData) {
        setUser(userData)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        signIn,
        signUp,
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
