'use client'

import { useTranslation } from 'react-i18next'

interface WelcomeBannerProps {
  userName: string
  subtitle: string
}

export function WelcomeBanner({ userName, subtitle }: WelcomeBannerProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'var(--theme-cardBg)', borderColor: 'var(--theme-cardBorder)', borderWidth: '1px' }}>
      <div className="px-6 py-8 md:px-8 md:py-10">
        <h1 className="text-2xl md:text-4xl font-bold text-theme-textPrimary mb-1">
          {t('dashboard.welcomeBack', { name: userName })}
        </h1>
        <p className="text-theme-textSecondary text-sm md:text-lg">{subtitle}</p>
      </div>
    </div>
  )
}
