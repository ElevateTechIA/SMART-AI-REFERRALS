'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LOADED_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || ''
const POLL_INTERVAL_MS = 5 * 60 * 1000

export function VersionUpdater() {
  const { t } = useTranslation()
  const [newVersion, setNewVersion] = useState<string | null>(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/version', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { version?: string }
      if (data.version && LOADED_VERSION && data.version !== LOADED_VERSION) {
        setNewVersion(data.version)
      }
    } catch {
      // Offline or transient network error — retry next tick.
    }
  }, [])

  useEffect(() => {
    if (!LOADED_VERSION) return
    check()
    const id = window.setInterval(check, POLL_INTERVAL_MS)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  if (!newVersion) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[200] flex justify-center p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
        <RefreshCw className="h-5 w-5 flex-shrink-0 text-theme-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('app.newVersionTitle')}</p>
          <p className="text-xs text-muted-foreground truncate">
            {t('app.newVersionDesc', { version: newVersion })}
          </p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          {t('app.upgrade')}
        </Button>
      </div>
    </div>
  )
}
