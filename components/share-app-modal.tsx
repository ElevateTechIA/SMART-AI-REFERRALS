'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { X, Share2 } from 'lucide-react'
import QRCode from 'qrcode'

interface ShareAppModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareAppModal({ isOpen, onClose }: ShareAppModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
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
  }, [isOpen])

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(appUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#4f46e5',
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
          title: 'Smart AI Referrals',
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
        className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {t('landing.shareTheApp', 'Share the App')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('landing.scanQR', 'Scan QR code or share the link')}
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-4 border-2 border-indigo-100 mb-6">
          {qrCode && (
            <img
              src={qrCode}
              alt="QR Code"
              className="w-full h-auto"
            />
          )}
        </div>

        {/* URL */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-600 mb-1 text-center">
            {t('landing.orVisit', 'Or visit')}
          </p>
          <p className="text-sm font-semibold text-indigo-600 text-center break-all">
            {appUrl.replace('https://', '').replace('http://', '')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={copyLink}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            {t('landing.copyLink', 'Copy Link')}
          </Button>
          {canShare && (
            <Button
              onClick={shareApp}
              variant="outline"
              className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl"
            >
              {t('landing.share', 'Share')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
