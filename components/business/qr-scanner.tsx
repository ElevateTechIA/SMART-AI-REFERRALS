'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Camera, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ScanResult {
  visitId: string
  token: string
}

interface QRScannerProps {
  onScanSuccess: (result: ScanResult) => Promise<void>
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const { t } = useTranslation()
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pendingScan, setPendingScan] = useState<ScanResult | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerIdRef = useRef('qr-reader')

  // Parse QR code data
  const parseQRData = (decodedText: string): ScanResult | null => {
    try {
      const url = new URL(decodedText)
      const visitId = url.searchParams.get('v')
      const token = url.searchParams.get('t')

      if (!visitId || !token) {
        throw new Error('Invalid QR code format')
      }

      return { visitId, token }
    } catch {
      setError(t('qrScanner.invalidQR'))
      return null
    }
  }

  // Handle successful scan — show confirmation modal instead of converting immediately
  const handleScan = async (decodedText: string) => {
    if (processing || pendingScan) return

    setError(null)

    const scanResult = parseQRData(decodedText)
    if (!scanResult) return

    // Stop scanning and show confirmation modal
    stopScanning()
    setPendingScan(scanResult)
  }

  // User confirms conversion from the modal
  const handleConfirmConversion = async () => {
    if (!pendingScan) return

    setProcessing(true)
    setError(null)

    try {
      await onScanSuccess(pendingScan)
      setSuccess(true)
      setPendingScan(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('qrScanner.conversionFailed'))
      setPendingScan(null)
    } finally {
      setProcessing(false)
    }
  }

  // User cancels the conversion
  const handleCancelConversion = () => {
    setPendingScan(null)
    setError(null)
  }

  // Start scanning
  const startScanning = async () => {
    try {
      setError(null)
      setScanning(true)

      const scanner = new Html5Qrcode(scannerIdRef.current)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        handleScan,
        undefined
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setScanning(false)

      if (err instanceof Error) {
        if (err.message.includes('NotAllowedError') || err.message.includes('Permission')) {
          setError(t('qrScanner.cameraPermissionDenied'))
        } else if (err.message.includes('NotFoundError') || err.message.includes('NotReadableError')) {
          setError(t('qrScanner.cameraNotFound'))
        } else {
          setError(t('qrScanner.cameraError', { message: err.message }))
        }
      } else {
        setError(t('qrScanner.unknownError'))
      }
    }
  }

  // Stop scanning
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setScanning(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('qrScanner.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scanner Container */}
          <div className="relative">
            <div
              id={scannerIdRef.current}
              className={`w-full ${scanning ? 'block' : 'hidden'}`}
              style={{ minHeight: scanning ? '400px' : '0px' }}
            />

            {!scanning && !success && (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {t('qrScanner.readyToScan')}
                </p>
                <Button onClick={startScanning}>
                  <Camera className="h-4 w-4 mr-2" />
                  {t('qrScanner.startScanner')}
                </Button>
              </div>
            )}
          </div>

          {/* Controls */}
          {scanning && (
            <Button variant="outline" onClick={stopScanning} className="w-full">
              <X className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
          )}

          {/* Processing State */}
          {processing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{t('qrScanner.processingConversion')}</AlertDescription>
            </Alert>
          )}

          {/* Success State */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                {t('qrScanner.conversionSuccess')}
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• {t('qrScanner.instruction1')}</p>
            <p>• {t('qrScanner.instruction2')}</p>
            <p>• {t('qrScanner.instruction3')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={!!pendingScan} onOpenChange={(open) => { if (!open) handleCancelConversion() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('qrScanner.confirmConversionTitle')}</DialogTitle>
            <DialogDescription>
              {t('qrScanner.confirmConversionDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('qrScanner.visitId')}: <span className="font-mono font-medium text-foreground">{pendingScan?.visitId.slice(-6)}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConversion} disabled={processing}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmConversion} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('qrScanner.converting')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('qrScanner.confirmConversion')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
