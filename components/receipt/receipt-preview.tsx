'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt as ReceiptIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Receipt } from '@/lib/types'

interface ReceiptPreviewProps {
  receipt: Receipt
  showImage?: boolean
  compact?: boolean
}

function getConfidenceLabel(confidence: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (confidence >= 0.8) return { label: 'high', variant: 'default' }
  if (confidence >= 0.5) return { label: 'medium', variant: 'secondary' }
  return { label: 'low', variant: 'destructive' }
}

export function ReceiptPreview({ receipt, showImage, compact }: ReceiptPreviewProps) {
  const { t } = useTranslation()
  const [showItems, setShowItems] = useState(false)
  const data = receipt.extractedData

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <ReceiptIcon className="h-4 w-4" />
        <span>{t('receipt.extractionFailed')}</span>
      </div>
    )
  }

  const confidenceInfo = receipt.confidence ? getConfidenceLabel(receipt.confidence) : null

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <ReceiptIcon className="h-4 w-4 text-green-600" />
        <span className="font-medium">{data.storeName || t('receipt.receiptAttached')}</span>
        {data.totalAmount != null && (
          <span className="text-muted-foreground">
            ${data.totalAmount.toFixed(2)}
          </span>
        )}
        {confidenceInfo && (
          <Badge variant={confidenceInfo.variant} className="text-xs">
            {t(`receipt.${confidenceInfo.label}`)}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header with store name and confidence */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <ReceiptIcon className="h-5 w-5 text-primary" />
          <div>
            {data.storeName && (
              <p className="font-medium">{data.storeName}</p>
            )}
            {data.date && (
              <p className="text-xs text-muted-foreground">{data.date}</p>
            )}
          </div>
        </div>
        {confidenceInfo && (
          <Badge variant={confidenceInfo.variant}>
            {t('receipt.confidence')}: {t(`receipt.${confidenceInfo.label}`)}
          </Badge>
        )}
      </div>

      {/* Store address */}
      {data.storeAddress && (
        <p className="text-xs text-muted-foreground">{data.storeAddress}</p>
      )}

      {/* Items list (expandable) */}
      {data.items && data.items.length > 0 && (
        <div>
          <button
            onClick={() => setShowItems(!showItems)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {t('receipt.items')} ({data.items.length})
            {showItems ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showItems && (
            <div className="mt-2 space-y-1">
              {data.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}
                    {item.name}
                  </span>
                  {item.price != null && (
                    <span>${item.price.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="border-t pt-2 space-y-1">
        {data.subtotal != null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('receipt.subtotal')}</span>
            <span>${data.subtotal.toFixed(2)}</span>
          </div>
        )}
        {data.tax != null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('receipt.tax')}</span>
            <span>${data.tax.toFixed(2)}</span>
          </div>
        )}
        {data.tip != null && data.tip > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('receipt.tip')}</span>
            <span>${data.tip.toFixed(2)}</span>
          </div>
        )}
        {data.totalAmount != null && (
          <div className="flex justify-between font-medium">
            <span>{t('receipt.total')}</span>
            <span>${data.totalAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Payment method */}
      {data.paymentMethod && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('receipt.paymentMethod')}</span>
          <span>
            {data.paymentMethod}
            {data.lastFourDigits ? ` ****${data.lastFourDigits}` : ''}
          </span>
        </div>
      )}

      {/* Receipt number */}
      {data.receiptNumber && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('receipt.receiptNumber')}</span>
          <span>{data.receiptNumber}</span>
        </div>
      )}

      {/* Receipt image thumbnail */}
      {showImage && receipt.imageUrl && (
        <div className="pt-2">
          <a href={receipt.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={receipt.imageUrl}
              alt="Receipt"
              className="w-full max-h-40 object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
            />
          </a>
        </div>
      )}
    </div>
  )
}
