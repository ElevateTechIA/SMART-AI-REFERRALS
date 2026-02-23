/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import {
  Serwist,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  type RuntimeCaching,
} from 'serwist'

declare const self: WorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>
}

const runtimeCaching: RuntimeCaching[] = [
  // Cache dashboard static images (large assets in public/dashboard/assets/)
  {
    matcher: /\/dashboard\/assets\/.*/i,
    handler: new CacheFirst({
      cacheName: 'dashboard-images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },
  // Cache Firebase Storage images (business/offer images)
  {
    matcher: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'firebase-images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...defaultCache, ...runtimeCaching],
})

serwist.addEventListeners()
