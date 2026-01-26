# Internationalization (i18n) Setup

This application uses `i18next` and `react-i18next` for internationalization support.

## Current Languages

- **English (en)** - Default language
- **Spanish (es)**

## File Structure

```
lib/i18n/
├── config.ts          # i18n configuration
├── provider.tsx       # React provider component
├── locales/
│   ├── en.json       # English translations
│   └── es.json       # Spanish translations
└── README.md         # This file
```

## Usage in Components

### Using translations in a component

```tsx
'use client'

import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('dashboard.welcomeBack', { name: 'John' })}</h1>
      <p>{t('common.loading')}</p>
    </div>
  )
}
```

### Language Switcher Component

The `LanguageSwitcher` component is available globally and can be imported:

```tsx
import { LanguageSwitcher } from '@/components/language-switcher'

function MyComponent() {
  return <LanguageSwitcher />
}
```

## Adding a New Language

1. Create a new JSON file in `lib/i18n/locales/` (e.g., `fr.json` for French)
2. Copy the structure from `en.json` and translate all values
3. Import the new language in `lib/i18n/config.ts`:

```typescript
import fr from './locales/fr.json'

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr }, // Add new language
}
```

4. Update the `supportedLngs` array:

```typescript
i18n.init({
  // ...
  supportedLngs: ['en', 'es', 'fr'], // Add new language
  // ...
})
```

5. Add the language to the `LanguageSwitcher` component in `components/language-switcher.tsx`:

```typescript
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }, // Add new language
]
```

## Translation Keys Structure

The translation keys are organized by feature/module:

- `app.*` - Application-wide strings
- `common.*` - Common UI elements (buttons, labels, etc.)
- `nav.*` - Navigation items
- `auth.*` - Authentication pages
- `dashboard.*` - Dashboard page
- `roles.*` - User roles

## Adding New Translation Keys

1. Add the key to ALL language files (`en.json`, `es.json`, etc.)
2. Keep the same structure across all files
3. Use meaningful, hierarchical key names
4. Example:

```json
// en.json
{
  "dashboard": {
    "newFeature": "My New Feature",
    "newFeatureDescription": "This is a description"
  }
}

// es.json
{
  "dashboard": {
    "newFeature": "Mi Nueva Función",
    "newFeatureDescription": "Esta es una descripción"
  }
}
```

## Language Detection

The application automatically detects the user's preferred language using:
1. Previously selected language (stored in localStorage)
2. Browser language settings

## Switching Languages

Users can switch languages using the `LanguageSwitcher` component available in:
- Navigation bar (dashboard pages)
- Auth pages (login, register)

The selected language is automatically saved to localStorage and persists across sessions.
