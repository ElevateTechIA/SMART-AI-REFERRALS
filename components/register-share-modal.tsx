'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { X, Users, Building2, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'

interface RegisterShareModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'referrer' | 'business'
}

export function RegisterShareModal({ isOpen, onClose, type }: RegisterShareModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [qrCode, setQrCode] = useState<string>('')
  const [canShare, setCanShare] = useState(false)

  const registerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/register${type === 'business' ? '/business' : ''}`
    : `https://smart-ai-referrals.vercel.app/auth/register${type === 'business' ? '/business' : ''}`

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  useEffect(() => {
    if (isOpen) {
      generateQRCode()
    }
  }, [isOpen, type])

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(registerUrl, {
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
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
          <p className="text-sm text-gray-600">
            {type === 'business'
              ? t('auth.createBusinessAccountDesc')
              : t('auth.createReferrerAccountDesc')}
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

        {/* Go to Link Button */}
        <Button
          onClick={goToLink}
          variant="outline"
          className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl mb-4 flex items-center justify-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {t('common.goToLink', 'Go to Registration')}
        </Button>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={copyLink}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            {t('landing.copyLink')}
          </Button>
          {canShare && (
            <Button
              onClick={shareLink}
              variant="outline"
              className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl"
            >
              {t('landing.share')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
