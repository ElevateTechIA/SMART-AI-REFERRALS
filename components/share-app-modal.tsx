'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { X, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'

interface ShareAppModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareAppModal({ isOpen, onClose }: ShareAppModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [qrCode, setQrCode] = useState<string>('')
  const [canShare, setCanShare] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://elivapp.com')

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  useEffect(() => {
    if (isOpen) {
      generateQRCode()
    }
  }, [isOpen, theme])

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(appUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: themes[theme].colors.accent,
          light: '#ffffff',
        },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl)
      toast({
        title: t('share.linkCopied', 'Link Copied!'),
        description: t('share.linkCopiedDescription', 'App link copied to clipboard'),
      })
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Eliv',
          text: t('share.appDescription', 'Turn your network into real income!'),
          url: appUrl,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header area */}
        <div
          className="px-6 pt-6 pb-10 text-center"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white/80" />
          </button>

          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Share2 className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {t('landing.shareTheApp', 'Share the App')}
          </h3>
          <p className="text-sm text-white/70">
            {t('landing.scanQR', 'Scan QR code or share the link')}
          </p>
        </div>

        {/* Content area */}
        <div className="bg-card px-6 pb-6 -mt-4 rounded-t-3xl">
          {/* QR Code */}
          <div className="bg-white rounded-2xl p-4 shadow-sm -mt-2 mb-4">
            {qrCode && (
              <img
                src={qrCode}
                alt="QR Code"
                className="w-full h-auto max-w-[220px] mx-auto"
              />
            )}
          </div>

          {/* URL */}
          <div className="bg-muted/60 rounded-xl py-3 px-4 mb-5">
            <p className="text-[10px] text-muted-foreground mb-0.5 text-center uppercase tracking-wide">
              {t('landing.orVisit', 'Or visit')}
            </p>
            <p className="text-sm font-semibold text-foreground text-center break-all">
              {appUrl.replace('https://', '').replace('http://', '')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={copyLink}
              className="flex-1 bg-theme-accent hover:opacity-90 rounded-xl font-semibold h-11"
              style={{ color: '#001f3d' }}
            >
              {t('landing.copyLink', 'Copy Link')}
            </Button>
            {canShare && (
              <Button
                onClick={shareApp}
                variant="outline"
                className="flex-1 border-2 border-theme-primary text-foreground hover:bg-theme-primaryBg rounded-xl font-semibold h-11"
              >
                {t('landing.share', 'Share')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
