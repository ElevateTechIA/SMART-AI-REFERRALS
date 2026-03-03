/// <reference lib="webworker" />
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  ExpirationPlugin,
  type RuntimeCaching,
} from 'serwist'

declare const self: WorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>
}

const runtimeCaching: RuntimeCaching[] = [
  // ======= ALWAYS FRESH (no cache) =======

  // API routes - never cache, always fetch from server
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },

  // RSC data requests - never cache (prevents stale page data)
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.headers.get('RSC') === '1' && sameOrigin && !url.pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },

  // ======= NETWORK FIRST (fresh data, offline fallback) =======

  // HTML page navigations - try network, fallback to cache if offline
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.mode === 'navigate' && sameOrigin && !url.pathname.startsWith('/api/'),
    handler: new NetworkFirst({
      cacheName: 'pages',
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
    }),
  },

  // Next.js data routes
  {
    matcher: /\/_next\/data\/.+\/.+\.json$/i,
    handler: new NetworkFirst({
      cacheName: 'next-data',
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
    }),
  },

  // ======= CACHE FIRST (static, immutable assets) =======

  // Next.js static JS (hashed filenames, safe to cache)
  {
    matcher: /\/_next\/static.+\.js$/i,
    handler: new CacheFirst({
      cacheName: 'next-static-js',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },

  // Next.js static CSS
  {
    matcher: /\/_next\/static.+\.css$/i,
    handler: new CacheFirst({
      cacheName: 'next-static-css',
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },

  // Google Fonts webfonts
  {
    matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
    }),
  },

  // Google Fonts stylesheets
  {
    matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
      plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    }),
  },

  // Static fonts
  {
    matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
    handler: new CacheFirst({
      cacheName: 'static-fonts',
      plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },

  // Static images
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'static-images',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },

  // Next.js optimized images
  {
    matcher: /\/_next\/image\?url=.+$/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'next-image',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    }),
  },

  // Dashboard static assets
  {
    matcher: /\/dashboard\/assets\/.*/i,
    handler: new CacheFirst({
      cacheName: 'dashboard-images',
      plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },

  // Firebase Storage images
  {
    matcher: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'firebase-images',
      plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    }),
  },

  // Other static JS/CSS
  {
    matcher: /\.(?:js|css)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'static-assets',
      plugins: [new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 })],
    }),
  },

  // Cross-origin requests
  {
    matcher: ({ sameOrigin }) => !sameOrigin,
    handler: new NetworkFirst({
      cacheName: 'cross-origin',
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      networkTimeoutSeconds: 10,
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
})

serwist.addEventListeners()
