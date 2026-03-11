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

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smart-ai-referrals.vercel.app'

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
          dark: themes[theme].colors.primaryDark,
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
        className="bg-card rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-theme-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {t('landing.shareTheApp', 'Share the App')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('landing.scanQR', 'Scan QR code or share the link')}
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-background rounded-2xl p-4 border-2 border-theme-primaryBorder mb-6">
          {qrCode && (
            <img
              src={qrCode}
              alt="QR Code"
              className="w-full h-auto"
            />
          )}
        </div>

        {/* URL */}
        <div className="bg-muted rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-1 text-center">
            {t('landing.orVisit', 'Or visit')}
          </p>
          <p className="text-sm font-semibold text-theme-primary text-center break-all">
            {appUrl.replace('https://', '').replace('http://', '')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={copyLink}
            className="flex-1 bg-theme-primary hover:opacity-90 text-white rounded-xl"
          >
            {t('landing.copyLink', 'Copy Link')}
          </Button>
          {canShare && (
            <Button
              onClick={shareApp}
              variant="outline"
              className="flex-1 border-theme-primary text-theme-primary hover:bg-theme-primaryBg rounded-xl"
            >
              {t('landing.share', 'Share')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
