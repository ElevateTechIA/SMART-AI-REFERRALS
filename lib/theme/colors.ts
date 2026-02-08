/**
 * Theme Color Configuration
 *
 * Easily change your app's theme by modifying the colors in this file.
 * All components will automatically use these colors.
 */

export const themes = {
  purple: {
    name: 'Purple Dream',
    colors: {
      // Primary gradient colors
      gradientFrom: '#1a0b2e', // Deep purple
      gradientVia: '#2d1b69',  // Mid purple
      gradientTo: '#7b2cbf',   // Bright purple

      // Accent colors
      primary: '#7b2cbf',
      primaryLight: '#9d4edd',
      primaryDark: '#5a189a',

      // Secondary colors
      secondary: '#3c096c',
      secondaryLight: '#5a189a',

      // Interactive colors
      accent: '#ff6b9d',       // Pink accent
      accentHover: '#ff8db3',

      // Success, warning, error
      success: '#06ffa5',
      warning: '#ffb703',
      error: '#ff006e',

      // Card backgrounds (with transparency for glassmorphism)
      cardBg: 'rgba(45, 27, 105, 0.4)',
      cardBgHover: 'rgba(45, 27, 105, 0.6)',
      cardBorder: 'rgba(157, 78, 221, 0.3)',

      // Text colors
      textPrimary: '#ffffff',
      textSecondary: '#e0aaff',
      textMuted: '#c77dff',
    }
  },

  ocean: {
    name: 'Ocean Blue',
    colors: {
      gradientFrom: '#0a1929',
      gradientVia: '#1e3a8a',
      gradientTo: '#3b82f6',

      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryDark: '#2563eb',

      secondary: '#1e40af',
      secondaryLight: '#3b82f6',

      accent: '#06b6d4',
      accentHover: '#22d3ee',

      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',

      cardBg: 'rgba(30, 58, 138, 0.4)',
      cardBgHover: 'rgba(30, 58, 138, 0.6)',
      cardBorder: 'rgba(96, 165, 250, 0.3)',

      textPrimary: '#ffffff',
      textSecondary: '#bfdbfe',
      textMuted: '#93c5fd',
    }
  },

  forest: {
    name: 'Forest Green',
    colors: {
      gradientFrom: '#0f1f0f',
      gradientVia: '#1a4d2e',
      gradientTo: '#4ade80',

      primary: '#22c55e',
      primaryLight: '#4ade80',
      primaryDark: '#16a34a',

      secondary: '#15803d',
      secondaryLight: '#22c55e',

      accent: '#fbbf24',
      accentHover: '#fcd34d',

      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',

      cardBg: 'rgba(26, 77, 46, 0.4)',
      cardBgHover: 'rgba(26, 77, 46, 0.6)',
      cardBorder: 'rgba(74, 222, 128, 0.3)',

      textPrimary: '#ffffff',
      textSecondary: '#bbf7d0',
      textMuted: '#86efac',
    }
  },

  sunset: {
    name: 'Sunset Orange',
    colors: {
      gradientFrom: '#1f0a0a',
      gradientVia: '#7c2d12',
      gradientTo: '#f97316',

      primary: '#f97316',
      primaryLight: '#fb923c',
      primaryDark: '#ea580c',

      secondary: '#c2410c',
      secondaryLight: '#f97316',

      accent: '#fbbf24',
      accentHover: '#fcd34d',

      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',

      cardBg: 'rgba(124, 45, 18, 0.4)',
      cardBgHover: 'rgba(124, 45, 18, 0.6)',
      cardBorder: 'rgba(251, 146, 60, 0.3)',

      textPrimary: '#ffffff',
      textSecondary: '#fed7aa',
      textMuted: '#fdba74',
    }
  },

  cleanBlue: {
    name: 'Clean Blue',
    colors: {
      // Light theme with blue accents (white background)
      gradientFrom: '#60A5FA',
      gradientVia: '#3B82F6',
      gradientTo: '#1D4ED8',

      primary: '#3B82F6',
      primaryLight: '#60A5FA',
      primaryDark: '#1D4ED8',

      secondary: '#6B7280',
      secondaryLight: '#9CA3AF',

      accent: '#22C55E',
      accentHover: '#16A34A',

      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',

      // Clean white cards with subtle borders
      cardBg: 'rgba(255, 255, 255, 0.95)',
      cardBgHover: 'rgba(255, 255, 255, 1)',
      cardBorder: 'rgba(229, 231, 235, 1)',

      // Dark text on light background
      textPrimary: '#111827',
      textSecondary: '#4B5563',
      textMuted: '#9CA3AF',
    }
  }
}

// Default theme
export const defaultTheme = 'cleanBlue'

// Get current theme
export function getTheme(themeName: keyof typeof themes = defaultTheme) {
  return themes[themeName]
}

// Theme type
export type ThemeName = keyof typeof themes
export type ThemeColors = typeof themes[typeof defaultTheme]['colors']
