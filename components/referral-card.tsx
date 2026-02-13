'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, generateReferralUrl } from '@/lib/utils'
import QRCode from 'qrcode'
import { Copy, Download, Share2, Building2, Gift, Link2 } from 'lucide-react'
import type { Business, Offer } from '@/lib/types'
import { useTranslation } from 'react-i18next'

const GRADIENTS = [
  'from-rose-500 via-pink-500 to-teal-500',
  'from-purple-600 via-violet-500 to-cyan-400',
  'from-emerald-600 via-teal-500 to-blue-400',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-blue-600 via-indigo-500 to-purple-400',
  'from-pink-500 via-rose-400 to-orange-400',
]

function getGradientForBusiness(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

interface ReferralCardProps {
  business: Business & { offer?: Offer; images?: string[] }
  userId: string
}

export function ReferralCard({ business, userId }: ReferralCardProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const referralUrl = generateReferralUrl(business.id, userId)
  const coverImage = business.offer?.image || business.images?.[0] || null
  const gradient = getGradientForBusiness(business.name)

  useEffect(() => {
    QRCode.toDataURL(referralUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
      .then(setQrCode)
      .catch(console.error)
  }, [referralUrl])

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl)
    toast({ title: t('cards.linkCopied'), description: t('cards.linkCopiedDesc') })
  }

  const downloadQR = () => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.download = `${business.name.replace(/\s+/g, '-')}-promo-qr.png`
    link.href = qrCode
    link.click()
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('cards.checkOut', { name: business.name }),
          text: t('cards.recommend', { name: business.name }),
          url: referralUrl,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-3xl overflow-hidden shadow-xl border border-border bg-card">
        {/* Banner */}
        <div className="relative h-40 sm:h-48">
          {coverImage ? (
            <img
              src={coverImage}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${gradient}`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Building2 className="h-24 w-24 text-white" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Business name & category */}
          <div className="absolute bottom-4 left-5 right-5">
            <h3 className="text-white font-extrabold text-xl sm:text-2xl drop-shadow-lg truncate tracking-wide uppercase">
              {business.name}
            </h3>
            <p className="text-white/80 text-sm drop-shadow font-medium">
              {business.category}
            </p>
          </div>

          {/* Earn badge */}
          {business.offer && (
            <div className="absolute top-4 right-4">
              <div className="bg-green-50 dark:bg-green-900/80 border border-green-200 dark:border-green-700 rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg">
                <Gift className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  {t('cards.earn', { amount: formatCurrency(business.offer.referrerCommissionAmount) })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scan to Refer & Earn label */}
        <div className="pt-5 pb-2 text-center">
          <h4 className="text-lg font-bold text-foreground">
            {t('cards.scanToRefer')}
          </h4>
        </div>

        {/* QR Code */}
        <div className="flex justify-center px-4 pb-3">
          <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-36 h-36 sm:w-40 sm:h-40" />
            ) : (
              <div className="w-36 h-36 sm:w-40 sm:h-40 bg-gray-100 animate-pulse rounded-xl" />
            )}
          </div>
        </div>

        {/* Referral URL */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
            <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {referralUrl}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 pt-1 grid grid-cols-3 gap-2">
          <Button onClick={copyLink} size="sm" className="gap-1.5 text-xs rounded-xl">
            <Copy className="h-3.5 w-3.5" />
            {t('cards.copy')}
          </Button>
          <Button
            onClick={downloadQR}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl"
          >
            <Download className="h-3.5 w-3.5" />
            {t('cards.qr')}
          </Button>
          <Button
            onClick={shareLink}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('cards.share')}
          </Button>
        </div>
      </div>
    </div>
  )
}
