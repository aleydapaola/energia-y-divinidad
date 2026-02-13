'use client'

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'

interface PayPalCheckoutProps {
  // Product info
  productType: 'membership' | 'session' | 'pack' | 'event'
  productId: string
  productName: string
  amount: number
  currency: 'USD' | 'COP'

  // Optional - for memberships
  billingInterval?: 'monthly' | 'yearly'

  // Optional - for sessions/events
  scheduledAt?: string

  // Guest checkout
  guestEmail?: string
  guestName?: string

  // Callbacks
  onSuccess?: (details: PayPalSuccessDetails) => void
  onError?: (error: Error) => void
  onCancel?: () => void
}

export interface PayPalSuccessDetails {
  reference: string
  captureId: string
  status: string
}

export function PayPalCheckout({
  productType,
  productId,
  productName,
  amount,
  currency,
  billingInterval,
  scheduledAt,
  guestEmail,
  guestName,
  onSuccess,
  onError,
  onCancel,
}: PayPalCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  // Todos los hooks deben estar antes de cualquier return condicional
  const createOrder = useCallback(async (): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType,
          productId,
          productName,
          amount,
          currency,
          billingInterval,
          scheduledAt,
          guestEmail,
          guestName,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear la orden de PayPal')
      }

      return data.paypalOrderId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [productType, productId, productName, amount, currency, billingInterval, scheduledAt, guestEmail, guestName])

  const onApprove = useCallback(async (data: { orderID: string }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paypalOrderId: data.orderID,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al capturar el pago')
      }

      onSuccess?.({
        reference: result.reference,
        captureId: result.captureId,
        status: result.status,
      })

      // Redirect to confirmation page
      window.location.href = `/pago/confirmacion?ref=${result.reference}`
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])

  const handleCancel = useCallback(() => {
    setError('Pago cancelado')
    onCancel?.()
  }, [onCancel])

  const handleError = useCallback((err: Record<string, unknown>) => {
    console.error('[PayPalCheckout] Error:', err)
    const errorMessage = 'Error al procesar el pago con PayPal'
    setError(errorMessage)
    onError?.(new Error(errorMessage))
  }, [onError])

  // Early return después de todos los hooks
  if (!clientId) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        PayPal no está configurado. Por favor contacta soporte.
      </div>
    )
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#4944a4]" />
          <span className="ml-2 text-gray-600">Procesando...</span>
        </div>
      )}

      <PayPalScriptProvider
        options={{
          clientId,
          currency,
          intent: 'capture',
        }}
      >
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
          }}
          disabled={isLoading}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={handleCancel}
          onError={handleError}
        />
      </PayPalScriptProvider>

      <p className="mt-3 text-xs text-gray-500 text-center">
        Al hacer clic en PayPal, serás redirigido para completar tu pago de forma segura.
      </p>
    </div>
  )
}

export default PayPalCheckout
