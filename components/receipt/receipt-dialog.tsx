'use client'

import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReceiptScanner } from './receipt-scanner'
import type { Receipt } from '@/lib/types'

interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitId: string
  businessId: string
  onSuccess: (receipt: Receipt) => void
}

export function ReceiptDialog({
  open,
  onOpenChange,
  visitId,
  businessId,
  onSuccess,
}: ReceiptDialogProps) {
  const { t } = useTranslation()

  const handleSuccess = (receipt: Receipt) => {
    onSuccess(receipt)
    // Close dialog after a short delay to show success state
    setTimeout(() => onOpenChange(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('receipt.scanReceipt')}</DialogTitle>
          <DialogDescription>{t('receipt.proofOfPurchase')}</DialogDescription>
        </DialogHeader>
        <ReceiptScanner
          visitId={visitId}
          businessId={businessId}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
