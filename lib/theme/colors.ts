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

      // Light tint surfaces
      primaryBg: '#f3e8ff',
      primaryBgHover: '#e9d5ff',
      primaryBorder: 'rgba(157, 78, 221, 0.2)',
      overlayFrom: 'rgba(90, 24, 154, 0.4)',
      overlayTo: 'rgba(90, 24, 154, 0.5)',

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

      // Light tint surfaces
      primaryBg: '#eff6ff',
      primaryBgHover: '#dbeafe',
      primaryBorder: 'rgba(96, 165, 250, 0.2)',
      overlayFrom: 'rgba(30, 58, 138, 0.4)',
      overlayTo: 'rgba(30, 58, 138, 0.5)',

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

      // Light tint surfaces
      primaryBg: '#f0fdf4',
      primaryBgHover: '#dcfce7',
      primaryBorder: 'rgba(74, 222, 128, 0.2)',
      overlayFrom: 'rgba(21, 128, 61, 0.4)',
      overlayTo: 'rgba(21, 128, 61, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#bbf7d0',
      textMuted: '#86efac',
    }
  },

  sunset: {
    name: 'Sunset Gold',
    colors: {
      gradientFrom: '#1a1207',
      gradientVia: '#6b4f1d',
      gradientTo: '#d4a844',

      primary: '#c9952c',
      primaryLight: '#d4a844',
      primaryDark: '#a67c22',

      secondary: '#8b6914',
      secondaryLight: '#c9952c',

      accent: '#e8c547',
      accentHover: '#f0d264',

      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',

      cardBg: 'rgba(107, 79, 29, 0.4)',
      cardBgHover: 'rgba(107, 79, 29, 0.6)',
      cardBorder: 'rgba(212, 168, 68, 0.3)',

      // Light tint surfaces
      primaryBg: '#fdf8ed',
      primaryBgHover: '#faf0d5',
      primaryBorder: 'rgba(201, 149, 44, 0.2)',
      overlayFrom: 'rgba(107, 79, 29, 0.4)',
      overlayTo: 'rgba(107, 79, 29, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#f0dca8',
      textMuted: '#d4b87a',
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

      // Light tint surfaces
      primaryBg: '#EFF6FF',
      primaryBgHover: '#DBEAFE',
      primaryBorder: 'rgba(59, 130, 246, 0.2)',
      overlayFrom: 'rgba(30, 58, 138, 0.4)',
      overlayTo: 'rgba(30, 58, 138, 0.5)',

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
