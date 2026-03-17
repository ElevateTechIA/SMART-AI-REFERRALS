'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { themes, defaultTheme, type ThemeName } from './colors'

/** Convert a hex color (#rrggbb) to "H S% L%" string for Shadcn CSS vars */
function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

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

  // Apply theme colors as CSS variables (respects dark mode)
  useEffect(() => {
    const currentTheme = themes[theme]
    const root = document.documentElement

    // Use darkColors if available and in dark mode, otherwise use default colors
    const colors = (resolvedMode === 'dark' && 'darkColors' in currentTheme && currentTheme.darkColors)
      ? currentTheme.darkColors
      : currentTheme.colors

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value as string)
    })

    // Set HSL versions of theme text colors for scoped Shadcn overrides.
    // These are applied via CSS on [data-themed-surface] (dashboard layout)
    // so modals/dialogs keep their default white bg + dark text.
    root.style.setProperty('--theme-textPrimary-hsl', hexToHSL(colors.textPrimary as string))
    root.style.setProperty('--theme-textSecondary-hsl', hexToHSL(colors.textSecondary as string))
    root.style.setProperty('--theme-textMuted-hsl', hexToHSL(colors.textMuted as string))
    root.style.setProperty('--theme-cardBg-hsl', hexToHSL(colors.cardBg as string))
    root.style.setProperty('--theme-surfaceVariant-hsl', hexToHSL((colors as Record<string, string>).surfaceVariant || colors.cardBg as string))

    localStorage.setItem('app-theme', theme)
  }, [theme, resolvedMode])

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
