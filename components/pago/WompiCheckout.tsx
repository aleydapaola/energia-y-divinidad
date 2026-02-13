'use client'

import { Loader2, CreditCard, Lock, AlertCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface WompiCheckoutProps {
  // Datos del pago
  amountInCents: number
  reference: string
  productName: string
  productDescription?: string

  // Datos del cliente
  customerEmail: string
  customerName?: string

  // Callbacks
  onSuccess: (transactionId: string, status: string) => void
  onError: (error: string) => void
  onPending?: (transactionId: string) => void

  // Redirect URL for after payment
  redirectUrl?: string
}

declare global {
  interface Window {
    WidgetCheckout?: any
  }
}

export function WompiCheckout({
  amountInCents,
  reference,
  productName,
  productDescription,
  customerEmail,
  customerName,
  onSuccess,
  onError,
  onPending,
  redirectUrl,
}: WompiCheckoutProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [integritySignature, setIntegritySignature] = useState<string | null>(null)

  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY

  // Obtener firma de integridad del servidor
  useEffect(() => {
    async function getIntegritySignature() {
      try {
        const response = await fetch('/api/checkout/wompi/signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference,
            amountInCents,
            currency: 'COP',
          }),
        })

        if (!response.ok) {
          throw new Error('Error obteniendo firma de integridad')
        }

        const data = await response.json()
        setIntegritySignature(data.signature)
      } catch (err) {
        console.error('Error getting integrity signature:', err)
        setError('Error preparando el pago')
      }
    }

    getIntegritySignature()
  }, [reference, amountInCents])

  // Cargar script de Wompi
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.async = true
    script.onload = () => setIsLoading(false)
    script.onerror = () => {
      setError('Error cargando el sistema de pagos')
      setIsLoading(false)
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handlePayment = useCallback(() => {
    if (!window.WidgetCheckout || !publicKey || !integritySignature) {
      setError('Sistema de pagos no disponible')
      return
    }

    setIsProcessing(true)
    setError(null)

    const checkout = new window.WidgetCheckout({
      currency: 'COP',
      amountInCents: amountInCents,
      reference: reference,
      publicKey: publicKey,
      signature: { integrity: integritySignature },
      redirectUrl: redirectUrl,
      customerData: {
        email: customerEmail,
        fullName: customerName || undefined,
      },
    })

    checkout.open((result: any) => {
      setIsProcessing(false)

      if (!result || !result.transaction) {
        // Usuario cerró el widget sin completar
        return
      }

      const transaction = result.transaction
      const status = transaction.status

      switch (status) {
        case 'APPROVED':
          onSuccess(transaction.id, status)
          break
        case 'DECLINED':
        case 'ERROR':
          onError(transaction.statusMessage || 'Pago rechazado')
          break
        case 'PENDING':
          if (onPending) {
            onPending(transaction.id)
          } else {
            onSuccess(transaction.id, status)
          }
          break
        case 'VOIDED':
          onError('Pago cancelado')
          break
        default:
          onError(`Estado desconocido: ${status}`)
      }
    })
  }, [
    amountInCents,
    reference,
    publicKey,
    integritySignature,
    redirectUrl,
    customerEmail,
    customerName,
    onSuccess,
    onError,
    onPending,
  ])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="font-dm-sans text-red-700 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null)
            setIsLoading(true)
            window.location.reload()
          }}
          className="font-dm-sans text-sm text-red-600 hover:text-red-800 underline"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen del pedido */}
      <div className="bg-[#eef1fa] rounded-xl p-4">
        <h3 className="font-dm-sans font-semibold text-gray-800 mb-2">
          Resumen del pedido
        </h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="font-dm-sans text-gray-700">{productName}</p>
            {productDescription && (
              <p className="font-dm-sans text-sm text-gray-500">{productDescription}</p>
            )}
          </div>
          <p className="font-dm-sans font-bold text-lg text-[#654177]">
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
            }).format(amountInCents / 100)}
          </p>
        </div>
      </div>

      {/* Información del cliente */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="font-dm-sans text-sm text-gray-600">
          <span className="font-semibold">Email:</span> {customerEmail}
        </p>
        {customerName && (
          <p className="font-dm-sans text-sm text-gray-600 mt-1">
            <span className="font-semibold">Nombre:</span> {customerName}
          </p>
        )}
      </div>

      {/* Botón de pago */}
      <button
        onClick={handlePayment}
        disabled={isLoading || isProcessing || !integritySignature}
        className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] disabled:bg-gray-400 text-white font-dm-sans font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
      >
        {isLoading || !integritySignature ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Preparando pago...
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pagar con Tarjeta
          </>
        )}
      </button>

      {/* Seguridad */}
      <div className="flex items-center justify-center gap-2 text-gray-500">
        <Lock className="w-4 h-4" />
        <span className="font-dm-sans text-xs">
          Pago seguro procesado por Wompi (Bancolombia)
        </span>
      </div>

      {/* Logos de tarjetas */}
      <div className="flex items-center justify-center gap-4 opacity-60">
        <img src="https://checkout.wompi.co/static/assets/visa.svg" alt="Visa" className="h-6" />
        <img src="https://checkout.wompi.co/static/assets/mastercard.svg" alt="Mastercard" className="h-6" />
        <img src="https://checkout.wompi.co/static/assets/amex.svg" alt="American Express" className="h-6" />
      </div>
    </div>
  )
}
