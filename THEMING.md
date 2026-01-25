# Theme System Documentation

This app features a powerful and flexible theming system that allows you to easily customize the entire look and feel of your application.

## Current Themes

The app comes with 4 pre-built themes:

1. **Purple Dream** (Default) - Beautiful purple gradient with pink accents
2. **Ocean Blue** - Cool blue gradient theme
3. **Forest Green** - Natural green gradient theme
4. **Sunset Orange** - Warm orange gradient theme

## Changing Themes

Users can switch between themes using the theme switcher in the dashboard navigation bar (palette icon next to the user profile).

The selected theme is automatically saved to localStorage and persists across sessions.

## Creating a New Theme

To add a new theme to your app:

### 1. Add Theme Configuration

Edit [`lib/theme/colors.ts`](lib/theme/colors.ts) and add your new theme to the `themes` object:

```typescript
export const themes = {
  // ... existing themes ...

  myCustomTheme: {
    name: 'My Custom Theme',
    colors: {
      // Primary gradient colors (for backgrounds)
      gradientFrom: '#your-color',  // Darkest
      gradientVia: '#your-color',   // Medium
      gradientTo: '#your-color',    // Brightest

      // Main theme colors
      primary: '#your-color',
      primaryLight: '#your-lighter-color',
      primaryDark: '#your-darker-color',

      // Secondary colors
      secondary: '#your-color',
      secondaryLight: '#your-lighter-color',

      // Interactive elements
      accent: '#your-color',
      accentHover: '#your-hover-color',

      // Status colors
      success: '#your-success-color',
      warning: '#your-warning-color',
      error: '#your-error-color',

      // Card backgrounds (use rgba for transparency/glassmorphism)
      cardBg: 'rgba(r, g, b, 0.4)',
      cardBgHover: 'rgba(r, g, b, 0.6)',
      cardBorder: 'rgba(r, g, b, 0.3)',

      // Text colors
      textPrimary: '#ffffff',
      textSecondary: '#your-color',
      textMuted: '#your-color',
    }
  }
}
```

### 2. Set as Default (Optional)

To make your theme the default theme:

```typescript
export const defaultTheme = 'myCustomTheme'
```

### 3. Using Theme Colors in Components

#### Method 1: Tailwind Classes (Recommended)

Use the `theme-*` prefix to access theme colors:

```tsx
<div className="bg-theme-primary text-theme-textPrimary">
  Themed content
</div>
```

#### Method 2: Gradient Backgrounds

Use pre-built utility classes:

```tsx
<div className="gradient-bg">
  Beautiful gradient background
</div>
```

Available gradient classes:
- `gradient-bg` - Linear gradient from gradientFrom → gradientVia → gradientTo
- `gradient-bg-radial` - Radial gradient for backgrounds

#### Method 3: Glassmorphism Cards

Apply glassmorphism effects:

```tsx
<div className="glass-card rounded-lg p-6">
  Glassmorphism card with blur effect
</div>
```

#### Method 4: CSS Variables

Access theme colors directly in CSS or inline styles:

```tsx
<div style={{ backgroundColor: 'var(--theme-primary)' }}>
  Custom styled element
</div>
```

## Special Effects

### Gradient Text

```tsx
<h1 className="gradient-text text-4xl font-bold">
  Gradient Text
</h1>
```

### Gradient Border

```tsx
<div className="gradient-border rounded-lg p-6">
  Content with animated gradient border
</div>
```

### Glow Effect

```tsx
<button className="glow rounded-lg px-4 py-2">
  Glowing Button
</button>
```

### Animations

Available animation classes:
- `shimmer` - Shimmer animation effect
- `float` - Floating animation
- `pulse-glow` - Pulsing glow effect

## Available Theme Colors in Tailwind

All theme colors are available as Tailwind classes with the `theme-` prefix:

- `bg-theme-primary` / `text-theme-primary` / `border-theme-primary`
- `bg-theme-primaryLight` / `text-theme-primaryLight`
- `bg-theme-secondary` / `text-theme-secondary`
- `bg-theme-accent` / `text-theme-accent`
- `bg-theme-success` / `text-theme-success`
- `bg-theme-warning` / `text-theme-warning`
- `bg-theme-error` / `text-theme-error`
- ... and all other colors defined in your theme

## Theme Provider

The `ThemeProvider` component wraps the entire app and provides theme context:

```tsx
import { ThemeProvider } from '@/lib/theme/theme-provider'

function App() {
  return (
    <ThemeProvider>
      {/* Your app */}
    </ThemeProvider>
  )
}
```

## Using Theme Hook

Access theme information programmatically:

```tsx
import { useTheme } from '@/lib/theme/theme-provider'

function MyComponent() {
  const { theme, setTheme, availableThemes } = useTheme()

  return (
    <div>
      <p>Current theme: {availableThemes[theme].name}</p>
      <button onClick={() => setTheme('ocean')}>
        Switch to Ocean theme
      </button>
    </div>
  )
}
```

## Best Practices

1. **Use Semantic Names**: Choose descriptive color names that reflect their purpose (primary, accent, etc.)

2. **Maintain Contrast**: Ensure sufficient contrast between text and background colors for accessibility

3. **Test All Themes**: After creating a new theme, test all pages to ensure colors work well together

4. **Glassmorphism Transparency**: For glassmorphism effects, use rgba colors with alpha between 0.3-0.6

5. **Gradient Balance**: Make sure gradient colors transition smoothly (use color scales/generators)

## Color Tools

Recommended tools for creating color schemes:

- **Coolors.co** - Generate color palettes
- **Adobe Color** - Create color schemes
- **Gradient Generator** - Create smooth gradients
- **Color Contrast Checker** - Verify accessibility

## File Structure

```
lib/theme/
├── colors.ts          # Theme color definitions
└── theme-provider.tsx # Theme context provider

components/
└── theme-switcher.tsx # Theme switcher UI component

app/
└── globals.css        # Theme utility classes and animations
```

## Example: Creating a "Midnight" Theme

```typescript
midnight: {
  name: 'Midnight',
  colors: {
    gradientFrom: '#0a0e27',
    gradientVia: '#162447',
    gradientTo: '#1f4068',

    primary: '#1f4068',
    primaryLight: '#2d5a8c',
    primaryDark: '#162447',

    secondary: '#1b1b2f',
    secondaryLight: '#162447',

    accent: '#e43f5a',
    accentHover: '#ff6b7a',

    success: '#06ffa5',
    warning: '#ffd700',
    error: '#ff006e',

    cardBg: 'rgba(22, 36, 71, 0.5)',
    cardBgHover: 'rgba(22, 36, 71, 0.7)',
    cardBorder: 'rgba(45, 90, 140, 0.3)',

    textPrimary: '#ffffff',
    textSecondary: '#94b3d9',
    textMuted: '#6b8ab3',
  }
}
```

Then users can switch to it via the theme switcher UI or programmatically:

```tsx
const { setTheme } = useTheme()
setTheme('midnight')
```

---

## Support

For questions or issues with the theming system, please open an issue on GitHub.
