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
      textMuted: '#2d6ebf',
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

  eliv: {
    name: 'eliv Brand',
    colors: {
      // Solid background — all three set to the same color
      gradientFrom: '#4e61f2',
      gradientVia: '#4e61f2',
      gradientTo: '#4e61f2',

      // eliv green for buttons/CTAs
      primary: '#d6fd79',
      primaryLight: '#e2fe9a',
      primaryDark: '#b8e050',

      secondary: '#1a237e',
      secondaryLight: '#3347d4',

      accent: '#d6fd79',
      accentHover: '#c4f060',

      success: '#6BC24A',
      warning: '#f59e0b',
      error: '#EF4444',

      cardBg: '#4e61f2',
      cardBgHover: '#3f51e0',
      cardBorder: 'rgba(112, 128, 245, 0.3)',

      primaryBg: '#f4fde6',
      primaryBgHover: '#e8fbc8',
      primaryBorder: 'rgba(214, 253, 121, 0.3)',
      overlayFrom: 'rgba(78, 97, 242, 0.4)',
      overlayTo: 'rgba(78, 97, 242, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: '#e0e4ff',
      textMuted: '#c5cbf8',
    }
  },

  rosePastel: {
    name: 'Rose Pastel',
    colors: {
      // Soft pink gradient — light and airy
      gradientFrom: '#DE5696',
      gradientVia: '#E9A7CC',
      gradientTo: '#F2CCDF',

      // Rosa suave as primary (buttons, CTAs — soft and girly)
      primary: '#E9A7CC',
      primaryLight: '#F2CCDF',
      primaryDark: '#DE5696',

      // Rosa fuerte as secondary (logo, headings — needs contrast)
      secondary: '#DE5696',
      secondaryLight: '#E9A7CC',

      // Rosa fuerte as accent
      accent: '#DE5696',
      accentHover: '#C94A85',

      success: '#81C784',
      warning: '#F0B775',
      error: '#E57373',

      // White cards with soft pink border
      cardBg: 'rgba(255, 255, 255, 0.97)',
      cardBgHover: 'rgba(255, 255, 255, 1)',
      cardBorder: 'rgba(233, 167, 204, 0.35)',

      // Very soft pink surfaces
      primaryBg: '#FFF5F9',
      primaryBgHover: '#FFEDF4',
      primaryBorder: 'rgba(233, 167, 204, 0.25)',
      overlayFrom: 'rgba(222, 86, 150, 0.2)',
      overlayTo: 'rgba(222, 86, 150, 0.3)',

      // Soft dark text on light pink
      textPrimary: '#3D1A2E',
      textSecondary: '#6B3A52',
      textMuted: '#B07090',
    },
    darkColors: {
      // Warm pink gradient (dark mode — not too dark)
      gradientFrom: '#3D1A2E',
      gradientVia: '#6B3050',
      gradientTo: '#9E4A72',

      // Same rosa fuerte
      primary: '#DE5696',
      primaryLight: '#E9A7CC',
      primaryDark: '#C94A85',

      // Warm rose secondary
      secondary: '#6B3050',
      secondaryLight: '#9E4A72',

      // Rosa suave accent
      accent: '#E9A7CC',
      accentHover: '#DE5696',

      success: '#81C784',
      warning: '#F0B775',
      error: '#E57373',

      // Warm rose cards (not too dark)
      cardBg: 'rgba(107, 48, 80, 0.4)',
      cardBgHover: 'rgba(107, 48, 80, 0.6)',
      cardBorder: 'rgba(233, 167, 204, 0.2)',

      primaryBg: '#4A2238',
      primaryBgHover: '#5C2D48',
      primaryBorder: 'rgba(233, 167, 204, 0.15)',
      overlayFrom: 'rgba(61, 26, 46, 0.4)',
      overlayTo: 'rgba(61, 26, 46, 0.5)',

      // Light pink text on dark rose
      textPrimary: '#FFF5F9',
      textSecondary: '#E9A7CC',
      textMuted: '#D48AAB',
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
export const defaultTheme = 'eliv'

// Get current theme
export function getTheme(themeName: keyof typeof themes = defaultTheme) {
  return themes[themeName]
}

// Theme type
export type ThemeName = keyof typeof themes
export type ThemeColors = typeof themes[typeof defaultTheme]['colors']
