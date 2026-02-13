'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Upload, Loader2, RotateCcw, Check, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiUpload } from '@/lib/api-client'
import type { Receipt } from '@/lib/types'
import { ReceiptPreview } from './receipt-preview'

interface ReceiptScannerProps {
  visitId: string
  businessId: string
  onSuccess: (receipt: Receipt) => void
  onCancel?: () => void
}

type ScanState = 'idle' | 'camera' | 'preview' | 'uploading' | 'success' | 'error'

export function ReceiptScanner({ visitId, businessId, onSuccess, onCancel }: ReceiptScannerProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<ScanState>('idle')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup camera stream on unmount or state change
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const startCamera = async () => {
    try {
      setState('camera')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error('Camera error:', err)
      setErrorMessage(t('qrScanner.cameraPermissionDenied'))
      setState('error')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    stopCamera()

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setSelectedFile(file)
        setImagePreview(canvas.toDataURL('image/jpeg', 0.9))
        setState('preview')
      },
      'image/jpeg',
      0.9
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage(t('receipt.invalidFileType'))
      setState('error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(t('receipt.fileTooLarge'))
      setState('error')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
      setState('preview')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    setState('uploading')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('visitId', visitId)

    const result = await apiUpload<{ success: boolean; receipt: Receipt }>(
      '/api/receipts/scan',
      formData
    )

    if (!result.ok) {
      setErrorMessage(result.error || t('receipt.extractionFailed'))
      setState('error')
      return
    }

    const receiptData = result.data.receipt
    setReceipt(receiptData)

    if (receiptData.status === 'FAILED') {
      if (receiptData.error === 'NOT_A_RECEIPT') {
        setErrorMessage(t('receipt.notAReceipt'))
      } else if (receiptData.error === 'UNREADABLE') {
        setErrorMessage(t('receipt.unreadable'))
      } else {
        setErrorMessage(t('receipt.extractionFailed'))
      }
      setState('error')
      return
    }

    setState('success')
    onSuccess(receiptData)
  }

  const handleRetake = () => {
    stopCamera()
    setState('idle')
    setImagePreview(null)
    setSelectedFile(null)
    setReceipt(null)
    setErrorMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input for gallery/file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Idle State: Show capture buttons */}
      {state === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-full bg-muted p-6">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t('receipt.scanReceipt')}
          </p>
          <div className="flex gap-3">
            <Button onClick={startCamera}>
              <Camera className="mr-2 h-4 w-4" />
              {t('receipt.takePhoto')}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {t('receipt.chooseFile')}
            </Button>
          </div>
        </div>
      )}

      {/* Camera State: Show live video feed */}
      {state === 'camera' && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-80 object-contain"
            />
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => { stopCamera(); setState('idle') }}
            >
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel')}
            </Button>
            <Button onClick={capturePhoto} size="lg" className="rounded-full w-16 h-16 p-0">
              <Camera className="h-8 w-8" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview State: Show image and submit button */}
      {state === 'preview' && imagePreview && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={imagePreview}
              alt="Receipt preview"
              className="w-full max-h-80 object-contain bg-muted"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('receipt.retake')}
            </Button>
            <Button onClick={handleSubmit}>
              <Check className="mr-2 h-4 w-4" />
              {t('receipt.submit')}
            </Button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {state === 'uploading' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('receipt.analyzing')}</p>
        </div>
      )}

      {/* Success State: Show extracted data */}
      {state === 'success' && receipt && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">{t('receipt.extractionComplete')}</span>
          </div>
          <ReceiptPreview receipt={receipt} showImage />
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{errorMessage}</span>
          </div>
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            )}
            <Button onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('receipt.retake')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
