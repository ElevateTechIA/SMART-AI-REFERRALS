'use client'

import { useTranslation } from 'react-i18next'

interface WelcomeBannerProps {
  userName: string
  subtitle: string
}

export function WelcomeBanner({ userName, subtitle }: WelcomeBannerProps) {
  const { t } = useTranslation()

  return (
    <div className="relative rounded-2xl overflow-hidden mb-6">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/dashboard/assets/header-backgroun.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: 'linear-gradient(135deg, var(--theme-gradientFrom), var(--theme-gradientTo))',
        }}
      />
      <div className="relative px-6 py-8 md:px-8 md:py-10">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-1">
          {t('dashboard.welcomeBack', { name: userName })}
        </h1>
        <p className="text-white/90 text-sm md:text-lg">{subtitle}</p>
      </div>
    </div>
  )
}
