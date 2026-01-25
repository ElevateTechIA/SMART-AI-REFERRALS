'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { themes, defaultTheme, type ThemeName } from './colors'

interface ThemeContextType {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  availableThemes: typeof themes
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme)

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('app-theme') as ThemeName
    if (savedTheme && themes[savedTheme]) {
      setThemeState(savedTheme)
    }
  }, [])

  useEffect(() => {
    // Apply theme colors as CSS variables
    const currentTheme = themes[theme]
    const root = document.documentElement

    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value)
    })

    // Save to localStorage
    localStorage.setItem('app-theme', theme)
  }, [theme])

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
