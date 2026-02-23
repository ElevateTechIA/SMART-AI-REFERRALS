'use client'

import { useEffect, useRef } from 'react'
import { useNetworkStatus } from '@/lib/pwa/network-status'
import { processSyncQueue } from '@/lib/pwa/sync-processor'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'

export function SyncManager() {
  const { isOnline } = useNetworkStatus()
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const prevOnlineRef = useRef(isOnline)

  useEffect(() => {
    // When transitioning from offline to online, process the queue
    if (isOnline && !prevOnlineRef.current && user) {
      processSyncQueue().then(({ synced, failed }) => {
        if (synced > 0) {
          toast({
            title: t('pwa.syncComplete', 'Changes synced!'),
            description: failed > 0
              ? t('pwa.syncFailed', 'Some changes failed to sync.')
              : `${synced} pending action${synced > 1 ? 's' : ''} synced.`,
          })
        }
      })
    }
    prevOnlineRef.current = isOnline
  }, [isOnline, user, toast, t])

  return null
}
