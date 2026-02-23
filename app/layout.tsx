import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'
import { ThemeProvider } from '@/lib/theme/theme-provider'
import { I18nProvider } from '@/lib/i18n/provider'
import { Toaster } from '@/components/ui/toaster'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import { SyncManager } from '@/components/pwa/sync-manager'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { themes, defaultTheme } from '@/lib/theme/colors'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Smart AI Referrals',
  description: 'Earn money by promoting local businesses',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartRef',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('app-mode') || 'system';
                  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                  var themes = ${JSON.stringify(
                    Object.fromEntries(
                      Object.entries(themes).map(([key, val]) => [key, val.colors])
                    )
                  )};
                  var saved = localStorage.getItem('app-theme') || '${defaultTheme}';
                  var colors = themes[saved] || themes['${defaultTheme}'];
                  if (colors) {
                    var root = document.documentElement;
                    Object.keys(colors).forEach(function(key) {
                      root.style.setProperty('--theme-' + key, colors[key]);
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <OfflineIndicator />
              {children}
              <SyncManager />
              <InstallPrompt />
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
