'use client'

import { useNetworkStatus } from '@/lib/pwa/network-status'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus()
  const { t } = useTranslation()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-amber-950 text-center py-1.5 px-4 text-sm font-medium flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="h-4 w-4" />
      {t('pwa.offlineMode', 'You are offline. Changes will sync when you reconnect.')}
    </div>
  )
}
