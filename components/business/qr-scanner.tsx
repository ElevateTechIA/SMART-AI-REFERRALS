'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ScanResult {
  visitId: string
  token: string
}

interface QRScannerProps {
  onScanSuccess: (result: ScanResult) => Promise<void>
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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
    } catch (err) {
      setError('QR inválido. Escanea un QR de check-in válido.')
      return null
    }
  }

  // Handle successful scan
  const handleScan = async (decodedText: string) => {
    if (processing) return

    setProcessing(true)
    setError(null)

    const scanResult = parseQRData(decodedText)
    if (!scanResult) {
      setProcessing(false)
      return
    }

    try {
      await onScanSuccess(scanResult)
      setSuccess(true)
      stopScanning()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in falló')
    } finally {
      setProcessing(false)
    }
  }

  // Start scanning
  const startScanning = async () => {
    try {
      setError(null)
      setScanning(true) // Set scanning state immediately to show container

      const scanner = new Html5Qrcode(scannerIdRef.current)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // Prefer back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        handleScan,
        undefined // Ignore errors (no QR in frame)
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setScanning(false)

      // More detailed error messages
      if (err instanceof Error) {
        if (err.message.includes('NotAllowedError') || err.message.includes('Permission')) {
          setError('Acceso a cámara denegado. Por favor permite el acceso en la configuración del navegador.')
        } else if (err.message.includes('NotFoundError') || err.message.includes('NotReadableError')) {
          setError('No se encontró ninguna cámara o está siendo usada por otra aplicación.')
        } else {
          setError(`Error al iniciar cámara: ${err.message}`)
        }
      } else {
        setError('Error desconocido al iniciar la cámara.')
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Escanear QR del Cliente
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
                Listo para escanear QR de check-in
              </p>
              <Button onClick={startScanning}>
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Scanner
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        {scanning && (
          <Button variant="outline" onClick={stopScanning} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        )}

        {/* Processing State */}
        {processing && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Procesando check-in...</AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              ¡Check-in exitoso! Cliente verificado.
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
          <p>• Pide al cliente que muestre su QR de check-in</p>
          <p>• Posiciona el QR dentro del marco de la cámara</p>
          <p>• El scanner detectará y verificará automáticamente</p>
        </div>
      </CardContent>
    </Card>
  )
}
