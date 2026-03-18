'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/use-toast'
import { X, Users, Building2, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'

interface RegisterShareModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'referrer' | 'business'
}

export function RegisterShareModal({ isOpen, onClose, type }: RegisterShareModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [qrCode, setQrCode] = useState<string>('')
  const [canShare, setCanShare] = useState(false)

  const registerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/register${type === 'business' ? '/business' : ''}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'https://elivapp.com'}/auth/register${type === 'business' ? '/business' : ''}`

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  useEffect(() => {
    if (isOpen) {
      generateQRCode()
    }
  }, [isOpen, type, theme])

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(registerUrl, {
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
      await navigator.clipboard.writeText(registerUrl)
      toast({
        title: t('common.success'),
        description: t('landing.copyLink') + '!',
      })
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: type === 'business'
            ? t('auth.growYourBusiness')
            : t('auth.startEarningMoney'),
          text: type === 'business'
            ? t('auth.createBusinessAccountDesc')
            : t('auth.createReferrerAccountDesc'),
          url: registerUrl,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }
  }

  const goToLink = () => {
    window.open(registerUrl, '_blank')
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
          <X className="h-5 w-5 text-gray-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--theme-secondary)' }}>
            {type === 'business' ? (
              <Building2 className="h-8 w-8 text-white" />
            ) : (
              <Users className="h-8 w-8 text-white" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {type === 'business'
              ? t('landing.listYourBusiness')
              : t('landing.startEarningFree')}
          </h3>
          <p className="text-sm text-gray-500">
            {type === 'business'
              ? t('auth.createBusinessAccountDesc')
              : t('auth.createReferrerAccountDesc')}
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-4 border-2 border-theme-primaryBorder mb-6">
          {qrCode && (
            <img
              src={qrCode}
              alt="QR Code"
              className="w-full h-auto"
            />
          )}
        </div>

        {/* Go to Link Button */}
        <button
          onClick={goToLink}
          className="w-full border-2 rounded-xl mb-4 flex items-center justify-center gap-2 h-11 px-4 text-sm font-medium transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--theme-secondary)', color: 'var(--theme-secondary)' }}
        >
          <ExternalLink className="h-4 w-4" />
          {t('common.goToLink', 'Go to Registration')}
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={copyLink}
            className="flex-1 rounded-xl h-11 px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--theme-secondary)' }}
          >
            {t('landing.copyLink')}
          </button>
          {canShare && (
            <button
              onClick={shareLink}
              className="flex-1 border-2 rounded-xl h-11 px-4 text-sm font-medium transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--theme-secondary)', color: 'var(--theme-secondary)' }}
            >
              {t('landing.share')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
