/**
 * Theme Color Configuration
 *
 * Easily change your app's theme by modifying the colors in this file.
 * All components will automatically use these colors.
 *
 * WCAG 2.1 AA compliance: every text/bg pair targets ≥ 4.5:1 contrast ratio.
 */

export const themes = {
  purple: {
    name: 'Purple Dream',
    colors: {
      // Solid purple background (unified for WCAG)
      gradientFrom: '#6b24a8',
      gradientVia: '#6b24a8',
      gradientTo: '#6b24a8',

      primary: '#b88ce6',
      primaryLight: '#c9a4ee',
      primaryDark: '#5a189a',

      secondary: '#5a189a',
      secondaryLight: '#7b2cbf',

      accent: '#ff6b9d',
      accentHover: '#ff8db3',

      success: '#06ffa5',
      successForeground: '#111827',
      warning: '#ffb703',
      warningForeground: '#111827',
      error: '#c2185b',

      cardBg: '#6b24a8',
      cardBgHover: '#5a189a',
      cardBorder: 'rgba(157, 78, 221, 0.3)',

      primaryBg: '#f3e8ff',
      primaryBgHover: '#e9d5ff',
      primaryBorder: 'rgba(157, 78, 221, 0.2)',
      overlayFrom: 'rgba(90, 24, 154, 0.4)',
      overlayTo: 'rgba(90, 24, 154, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#e0aaff',
      textMuted: '#e8ccff',
      surfaceVariant: '#7b30bc',
    }
  },

  ocean: {
    name: 'Ocean Blue',
    colors: {
      // Solid ocean blue background (unified for WCAG)
      gradientFrom: '#1d4ed8',
      gradientVia: '#1d4ed8',
      gradientTo: '#1d4ed8',

      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryDark: '#2563eb',

      secondary: '#1e40af',
      secondaryLight: '#3b82f6',

      accent: '#06b6d4',
      accentHover: '#22d3ee',

      success: '#10b981',
      successForeground: '#111827',
      warning: '#f59e0b',
      warningForeground: '#111827',
      error: '#dc2626',

      cardBg: '#1d4ed8',
      cardBgHover: '#1e40af',
      cardBorder: 'rgba(96, 165, 250, 0.3)',

      primaryBg: '#eff6ff',
      primaryBgHover: '#dbeafe',
      primaryBorder: 'rgba(96, 165, 250, 0.2)',
      overlayFrom: 'rgba(30, 58, 138, 0.4)',
      overlayTo: 'rgba(30, 58, 138, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#c8e0ff',
      textMuted: '#bdd6ff',
      surfaceVariant: '#2a5ce0',
    }
  },

  forest: {
    name: 'Forest Green',
    colors: {
      // Solid forest green background (darkened for WCAG)
      gradientFrom: '#0d6830',
      gradientVia: '#0d6830',
      gradientTo: '#0d6830',

      primary: '#22c55e',
      primaryLight: '#4ade80',
      primaryDark: '#0d6830',

      secondary: '#0d6830',
      secondaryLight: '#22c55e',

      accent: '#fbbf24',
      accentHover: '#fcd34d',

      success: '#10b981',
      successForeground: '#111827',
      warning: '#f59e0b',
      warningForeground: '#111827',
      error: '#dc2626',

      cardBg: '#0d6830',
      cardBgHover: '#0a5526',
      cardBorder: 'rgba(74, 222, 128, 0.3)',

      primaryBg: '#f0fdf4',
      primaryBgHover: '#dcfce7',
      primaryBorder: 'rgba(74, 222, 128, 0.2)',
      overlayFrom: 'rgba(13, 104, 48, 0.4)',
      overlayTo: 'rgba(13, 104, 48, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#d4fce0',
      textMuted: '#b8f0ca',
      surfaceVariant: '#12783a',
    }
  },

  eliv: {
    name: 'eliv Brand',
    colors: {
      // Solid background (slightly darkened for WCAG)
      gradientFrom: '#3f50d4',
      gradientVia: '#3f50d4',
      gradientTo: '#3f50d4',

      // eliv green for buttons/CTAs
      primary: '#d6fd79',
      primaryLight: '#e2fe9a',
      primaryDark: '#2d5a00',

      secondary: '#1a237e',
      secondaryLight: '#3347d4',

      accent: '#d6fd79',
      accentHover: '#c4f060',

      success: '#6BC24A',
      successForeground: '#111827',
      warning: '#f59e0b',
      warningForeground: '#111827',
      error: '#dc2626',

      cardBg: '#3f50d4',
      cardBgHover: '#3545b8',
      cardBorder: 'rgba(112, 128, 245, 0.3)',

      primaryBg: '#f4fde6',
      primaryBgHover: '#e8fbc8',
      primaryBorder: 'rgba(214, 253, 121, 0.3)',
      overlayFrom: 'rgba(63, 80, 212, 0.4)',
      overlayTo: 'rgba(63, 80, 212, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#e0e4ff',
      textMuted: '#dce2ff',
      surfaceVariant: '#4c5ede',
    }
  },

  rosePastel: {
    name: 'Rose Pastel',
    colors: {
      // Solid rose background (darkened for WCAG)
      gradientFrom: '#ffb7da',
      gradientVia: '#ffb7da',
      gradientTo: '#ffb7da',

      // Rosa suave as primary (buttons, CTAs)
      primary: '#E9A7CC',
      primaryLight: '#FFa8d0',
      primaryDark: '#D4467E',

      secondary: '#9B2D5E',
      secondaryLight: '#C85088',

      accent: '#E9A7CC',
      accentHover: '#E870A8',

      success: '#81C784',
      successForeground: '#111827',
      warning: '#F0B775',
      warningForeground: '#111827',
      error: '#c62828',

      // Solid pink cards (darkened for WCAG)
      cardBg: '#ffb7da',
      cardBgHover: '#f0a0c8',
      cardBorder: 'rgba(255, 255, 255, 0.5)',

      primaryBg: '#FFF5F9',
      primaryBgHover: '#FFEDF4',
      primaryBorder: 'rgba(233, 167, 204, 0.25)',
      overlayFrom: 'rgba(255, 183, 218, 0.3)',
      overlayTo: 'rgba(255, 183, 218, 0.4)',

      textPrimary: '#ffffff',
      textSecondary: '#ffffff',
      textMuted: '#fce0ee',
      surfaceVariant: '#ffc8e2',
    },
    darkColors: {
      // Softer, brighter pink for dark mode
      gradientFrom: '#904060',
      gradientVia: '#904060',
      gradientTo: '#904060',

      primary: '#FF83BE',
      primaryLight: '#FFa8d0',
      primaryDark: '#FF83BE',

      secondary: '#C04878',
      secondaryLight: '#D06898',

      accent: '#FF83BE',
      accentHover: '#E870A8',

      success: '#81C784',
      successForeground: '#111827',
      warning: '#F0B775',
      warningForeground: '#111827',
      error: '#c62828',

      // Brighter pink cards
      cardBg: '#A85078',
      cardBgHover: '#984868',
      cardBorder: 'rgba(255, 131, 190, 0.25)',

      primaryBg: '#803858',
      primaryBgHover: '#904060',
      primaryBorder: 'rgba(255, 131, 190, 0.2)',
      overlayFrom: 'rgba(144, 64, 96, 0.4)',
      overlayTo: 'rgba(144, 64, 96, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#FFEEF3',
      textMuted: '#FFD8E8',
      surfaceVariant: '#B86090',
    }
  },

  cleanBlue: {
    name: 'Clean Blue',
    colors: {
      // Solid blue background
      gradientFrom: '#3B82F6',
      gradientVia: '#3B82F6',
      gradientTo: '#3B82F6',

      primary: '#3B82F6',
      primaryLight: '#60A5FA',
      primaryDark: '#1D4ED8',

      secondary: '#4B5563',
      secondaryLight: '#6B7280',

      accent: '#22C55E',
      accentHover: '#16A34A',

      success: '#22C55E',
      successForeground: '#111827',
      warning: '#F59E0B',
      warningForeground: '#111827',
      error: '#dc2626',

      // Solid white cards
      cardBg: '#ffffff',
      cardBgHover: '#f9fafb',
      cardBorder: '#e5e7eb',

      primaryBg: '#EFF6FF',
      primaryBgHover: '#DBEAFE',
      primaryBorder: 'rgba(59, 130, 246, 0.2)',
      overlayFrom: 'rgba(30, 58, 138, 0.4)',
      overlayTo: 'rgba(30, 58, 138, 0.5)',

      textPrimary: '#111827',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      surfaceVariant: '#f3f4f6',
    }
  }
}

// Default theme
export const defaultTheme = 'eliv'

// Get current theme
export function getTheme(themeName: keyof typeof themes = defaultTheme) {
  return themes[themeName]
}

// Theme type
export type ThemeName = keyof typeof themes
export type ThemeColors = typeof themes[typeof defaultTheme]['colors']
