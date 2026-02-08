'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, generateReferralUrl } from '@/lib/utils'
import QRCode from 'qrcode'
import { Copy, Download, Share2, Building2, Gift } from 'lucide-react'
import type { Business, Offer } from '@/lib/types'

const GRADIENTS = [
  'from-blue-600 via-blue-500 to-cyan-400',
  'from-purple-600 via-purple-500 to-pink-400',
  'from-emerald-600 via-emerald-500 to-teal-400',
  'from-orange-600 via-orange-500 to-amber-400',
  'from-rose-600 via-rose-500 to-pink-400',
  'from-indigo-600 via-indigo-500 to-blue-400',
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
  const [qrCode, setQrCode] = useState<string | null>(null)
  const referralUrl = generateReferralUrl(business.id, userId)
  const coverImage = business.images?.[0] || null
  const gradient = getGradientForBusiness(business.name)

  useEffect(() => {
    QRCode.toDataURL(referralUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
      .then(setQrCode)
      .catch(console.error)
  }, [referralUrl])

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl)
    toast({ title: 'Link Copied', description: 'Referral link copied to clipboard' })
  }

  const downloadQR = () => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.download = `${business.name.replace(/\s+/g, '-')}-referral-qr.png`
    link.href = qrCode
    link.click()
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${business.name}!`,
          text: `I recommend ${business.name}. Use my referral link to get rewards!`,
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
      <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Banner */}
        <div className="relative h-36 sm:h-44">
          {coverImage ? (
            <img
              src={coverImage}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              <Building2 className="h-16 w-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white font-bold text-lg sm:text-xl drop-shadow-lg truncate">
              {business.name}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm drop-shadow">
              {business.category}
            </p>
          </div>
          {business.offer && (
            <div className="absolute top-3 right-3">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 shadow-lg">
                <Gift className="h-3 w-3 text-green-600" />
                <span className="text-xs font-bold text-green-700 dark:text-green-400">
                  Earn {formatCurrency(business.offer.referrerCommissionAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* QR Code overlapping banner */}
        <div className="flex justify-center -mt-10 relative z-10">
          <div className="bg-white rounded-xl p-2 shadow-lg border border-gray-100">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-28 h-28 sm:w-32 sm:h-32" />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gray-100 animate-pulse rounded-lg" />
            )}
          </div>
        </div>

        {/* Referral URL */}
        <div className="px-4 pt-3 pb-2">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-xs font-mono text-center truncate text-gray-600 dark:text-gray-300">
            {referralUrl}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 pt-1 grid grid-cols-3 gap-2">
          <Button onClick={copyLink} size="sm" className="gap-1.5 text-xs rounded-xl">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button
            onClick={downloadQR}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl"
          >
            <Download className="h-3.5 w-3.5" />
            QR
          </Button>
          <Button
            onClick={shareLink}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>
    </div>
  )
}
