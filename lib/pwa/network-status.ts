'use client'

import { useState, useEffect, useRef } from 'react'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Set initial state after mount to avoid SSR mismatch
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      // Clear any pending offline transition
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current)
        offlineTimerRef.current = null
      }
      setIsOnline(true)
    }

    const handleOffline = () => {
      // Delay offline state to ignore brief network blips (e.g. during auth popups)
      offlineTimerRef.current = setTimeout(() => {
        if (!navigator.onLine) {
          setIsOnline(false)
        }
        offlineTimerRef.current = null
      }, 3000)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current)
    }
  }, [])

  return { isOnline }
}
