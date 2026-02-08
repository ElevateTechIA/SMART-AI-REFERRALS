'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { themes, defaultTheme, type ThemeName } from './colors'

export type Mode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  mode: Mode
  setMode: (mode: Mode) => void
  resolvedMode: 'light' | 'dark'
  availableThemes: typeof themes
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getInitialTheme(): ThemeName {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app-theme') as ThemeName
    if (saved && themes[saved]) return saved
  }
  return defaultTheme
}

function getInitialMode(): Mode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app-mode') as Mode
    if (saved && ['light', 'dark', 'system'].includes(saved)) return saved
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme)
  const [mode, setModeState] = useState<Mode>(getInitialMode)
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light')

  const resolveSystemMode = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  const applyMode = useCallback((resolved: 'light' | 'dark') => {
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    setResolvedMode(resolved)
  }, [])

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as ThemeName
    if (savedTheme && themes[savedTheme]) {
      setThemeState(savedTheme)
    }

    const savedMode = localStorage.getItem('app-mode') as Mode
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setModeState(savedMode)
      const resolved = savedMode === 'system' ? resolveSystemMode() : savedMode
      applyMode(resolved)
    } else {
      applyMode(resolveSystemMode())
    }
  }, [resolveSystemMode, applyMode])

  // Listen for system preference changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      applyMode(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [mode, applyMode])

  // Apply mode when it changes
  useEffect(() => {
    const resolved = mode === 'system' ? resolveSystemMode() : mode
    applyMode(resolved)
    localStorage.setItem('app-mode', mode)
  }, [mode, resolveSystemMode, applyMode])

  // Apply theme colors as CSS variables
  useEffect(() => {
    const currentTheme = themes[theme]
    const root = document.documentElement

    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value)
    })

    localStorage.setItem('app-theme', theme)
  }, [theme])

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme)
  }

  const setMode = (newMode: Mode) => {
    setModeState(newMode)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, resolvedMode, availableThemes: themes }}>
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
