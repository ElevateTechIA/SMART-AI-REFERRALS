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

  eliv: {
    name: 'ELiv Brand',
    colors: {
      // Trust Link navy gradient (dashboard backgrounds)
      gradientFrom: '#0F1B3D',
      gradientVia: '#1E3A6E',
      gradientTo: '#2B4F8C',

      // Reward Spark chartreuse as primary (buttons, CTAs, highlights)
      primary: '#B8C820',
      primaryLight: '#C8D630',
      primaryDark: '#9AB01A',

      // Trust Link navy as secondary (text, headers, cards)
      secondary: '#1E3A6E',
      secondaryLight: '#2B4F8C',

      // Growth Loop green as accent
      accent: '#6BC24A',
      accentHover: '#5AAF3A',

      success: '#6BC24A',
      warning: '#C8D630',
      error: '#EF4444',

      // Cards with navy glassmorphism
      cardBg: 'rgba(30, 58, 110, 0.4)',
      cardBgHover: 'rgba(30, 58, 110, 0.6)',
      cardBorder: 'rgba(43, 79, 140, 0.3)',

      // Light tint surfaces - Community Light cream
      primaryBg: '#F5F1E3',
      primaryBgHover: '#EDE8D6',
      primaryBorder: 'rgba(30, 58, 110, 0.15)',
      overlayFrom: 'rgba(15, 27, 61, 0.4)',
      overlayTo: 'rgba(15, 27, 61, 0.5)',

      // White text for dark navy backgrounds
      textPrimary: '#ffffff',
      textSecondary: '#C8D6E5',
      textMuted: '#8DA4BF',
    }
  },

  rosePastel: {
    name: 'Rose Pastel',
    colors: {
      // Rose gradient — deep enough for white text readability
      gradientFrom: '#8a2e50',
      gradientVia: '#b04a6e',
      gradientTo: '#c46888',

      // Pastel pink primary for buttons/accents
      primary: '#d4708e',
      primaryLight: '#e8a0b5',
      primaryDark: '#b84d6e',

      // Soft lilac secondary
      secondary: '#9e7098',
      secondaryLight: '#c9a0c5',

      // Peach accent
      accent: '#f0b8a8',
      accentHover: '#e8a494',

      success: '#a8d8b9',
      warning: '#f5d0a0',
      error: '#e8a0a0',

      // White cards with blush border
      cardBg: 'rgba(255, 255, 255, 0.97)',
      cardBgHover: 'rgba(255, 255, 255, 1)',
      cardBorder: 'rgba(232, 128, 155, 0.18)',

      // Very soft blush surfaces
      primaryBg: '#fef5f7',
      primaryBgHover: '#fde8ed',
      primaryBorder: 'rgba(232, 128, 155, 0.15)',
      overlayFrom: 'rgba(214, 96, 126, 0.3)',
      overlayTo: 'rgba(214, 96, 126, 0.4)',

      // High contrast text on light pink
      textPrimary: '#1a0a10',
      textSecondary: '#3d1f2e',
      textMuted: '#7a5568',
    },
    darkColors: {
      // Deep rose gradient (dark mode)
      gradientFrom: '#1f0a14',
      gradientVia: '#3d1a2e',
      gradientTo: '#7a2e55',

      // Brighter pink for dark backgrounds
      primary: '#e8789e',
      primaryLight: '#f2a0bc',
      primaryDark: '#d4507a',

      secondary: '#3d1a2e',
      secondaryLight: '#5c2d48',

      accent: '#d4a880',
      accentHover: '#e0bc9a',

      success: '#81c784',
      warning: '#ffcc6a',
      error: '#e57373',

      // Dark rose cards with subtle warmth
      cardBg: 'rgba(61, 26, 46, 0.45)',
      cardBgHover: 'rgba(61, 26, 46, 0.65)',
      cardBorder: 'rgba(232, 120, 158, 0.2)',

      primaryBg: '#2a1220',
      primaryBgHover: '#3d1a2e',
      primaryBorder: 'rgba(232, 120, 158, 0.15)',
      overlayFrom: 'rgba(31, 10, 20, 0.5)',
      overlayTo: 'rgba(31, 10, 20, 0.6)',

      // Light text on dark rose background
      textPrimary: '#fdf2f6',
      textSecondary: '#e8b8cc',
      textMuted: '#c2849e',
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
