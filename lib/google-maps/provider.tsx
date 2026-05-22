'use client'

import { createContext, useContext, useEffect } from 'react'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

interface GoogleMapsContextValue {
  isLoaded: boolean
  loadError: Error | null
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: null,
})

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    version: 'weekly',
  })

  // Surface load errors to the console so they show up in Vercel runtime
  // logs and the browser DevTools. Previously these were swallowed which
  // made it impossible to tell apart "API key revoked" from "user is on a
  // slow network." Consumers that depend on places (CityAutocomplete) read
  // `loadError` from context and fall back to a plain text input.
  useEffect(() => {
    if (loadError) {
      console.warn('[GoogleMaps] failed to load:', loadError.message)
    }
  }, [loadError])

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError: loadError ?? null }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}
