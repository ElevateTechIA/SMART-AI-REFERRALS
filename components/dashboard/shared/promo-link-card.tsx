'use client'

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ChevronRight, Share2, QrCode as QrCodeIcon } from 'lucide-react'

interface PromoLinkCardProps {
  qrCode: string
  appUrl: string
  onCopyLink: () => void
  onShare: () => void
  onShareApp: () => void
}

export function PromoLinkCard({ qrCode, appUrl, onCopyLink, onShare, onShareApp }: PromoLinkCardProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-xl md:rounded-2xl p-2.5 md:p-5 shadow-lg md:shadow-xl overflow-hidden md:h-full"
      style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}
    >
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <h2 className="text-sm md:text-base font-bold text-white">{t('dashboard.myReferralLink')}</h2>
        <ChevronRight className="h-4 w-4 text-theme-textMuted md:text-theme-textMuted" />
      </div>
      <div className="flex flex-col items-center bg-card rounded-lg md:rounded-xl p-3 md:p-4 overflow-hidden">
        {qrCode && (
          <img src={qrCode} alt="QR Code" className="w-48 md:w-40 h-auto md:h-40 mb-2 md:mb-3" />
        )}
        <p className="text-[9px] md:text-xs text-muted-foreground text-center mb-2 md:mb-3 truncate w-full md:break-all">
          {appUrl.replace('https://', '')}
        </p>
        <Button
          onClick={onCopyLink}
          className="w-full mb-1.5 md:mb-2 bg-theme-primary hover:opacity-90 rounded-md md:rounded-lg h-8 md:h-11 text-[11px] md:text-sm font-medium md:font-semibold"
        >
          <Share2 className="h-3 md:h-4 w-3 md:w-4 mr-1 md:mr-2" />
          {t('dashboard.startSharingNow')}
        </Button>
        {/* Mobile-only share buttons */}
        <div className="flex gap-1.5 w-full md:hidden">
          <button
            className="flex-1 h-8 bg-theme-accent hover:opacity-90 rounded-md flex items-center justify-center"
            style={{ color: '#001f3d' }}
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            className="flex-1 h-8 bg-muted-foreground/50 hover:bg-muted-foreground/60 rounded-md flex items-center justify-center"
            style={{ color: '#001f3d' }}
            onClick={onShareApp}
          >
            <QrCodeIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
