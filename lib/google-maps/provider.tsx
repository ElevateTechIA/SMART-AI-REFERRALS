'use client'

import { createContext, useContext } from 'react'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

interface GoogleMapsContextValue {
  isLoaded: boolean
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({ isLoaded: false })

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    version: 'weekly',
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}
