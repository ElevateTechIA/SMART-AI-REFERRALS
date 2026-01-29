'use client'

import { useTranslation } from 'react-i18next'

export function AuthDivider() {
  const { t } = useTranslation()

  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-2 text-muted-foreground">
          {t('auth.orContinueWith')}
        </span>
      </div>
    </div>
  )
}
