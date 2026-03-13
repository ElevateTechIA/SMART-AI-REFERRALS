'use client'

import { ThemeSwitcher } from '@/components/theme-switcher'

export function FloatingThemeSwitcher() {
  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50">
      <div
        className="rounded-full shadow-lg backdrop-blur-sm p-1"
        style={{
          background: 'color-mix(in srgb, var(--theme-cardBg, #fff) 90%, transparent)',
          border: '1px solid var(--theme-cardBorder)',
        }}
      >
        <ThemeSwitcher />
      </div>
    </div>
  )
}
