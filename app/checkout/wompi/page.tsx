'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { WompiCheckout } from '@/components/pago/WompiCheckout'

type CheckoutState = 'loading' | 'ready' | 'success' | 'error'

function WompiCheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [state, setState] = useState<CheckoutState>('loading')
  const [orderData, setOrderData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)

  const orderId = searchParams?.get('order') || ''

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setError('No se encontró la orden')
        setState('error')
        return
      }

      try {
        // Cargar datos de la orden
        const response = await fetch(`/api/orders/${orderId}/status`)
        if (!response.ok) {
          throw new Error('Orden no encontrada')
        }

        const data = await response.json()

        // Verificar que la orden esté pendiente
        if (data.paymentStatus !== 'PENDING') {
          // Ya fue procesada, redirigir a confirmación
          router.push(`/pago/confirmacion?ref=${orderId}`)
          return
        }

        setOrderData(data)
        setState('ready')
      } catch (err: any) {
        console.error('Error loading order:', err)
        setError(err.message || 'Error cargando la orden')
        setState('error')
      }
    }

    loadOrder()
  }, [orderId, router])

  const handleSuccess = async (txId: string, status: string) => {
    setTransactionId(txId)

    // Actualizar orden en el servidor
    try {
      await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txId,
          status: status,
        }),
      })
    } catch (err) {
      console.error('Error updating order:', err)
    }

    setState('success')
  }

  const handleError = (errorMsg: string) => {
    setError(errorMsg)
    setState('error')
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#8A4BAF] mx-auto mb-4" />
          <p className="font-dm-sans text-gray-600">Cargando checkout...</p>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-[#f8f0f5] py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="font-gazeta text-3xl text-[#654177] mb-4">
              ¡Pago Exitoso!
            </h1>
            <p className="font-dm-sans text-gray-600 mb-6">
              Tu pago ha sido procesado correctamente. Recibirás un correo de confirmación
              con los detalles de tu compra.
            </p>
            {orderData && (
              <div className="bg-[#eef1fa] rounded-lg p-4 mb-6 text-left">
                <p className="font-dm-sans text-sm text-gray-600">
                  <span className="font-semibold">Referencia:</span> {orderData.orderNumber}
                </p>
                <p className="font-dm-sans text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Producto:</span> {orderData.itemName}
                </p>
                <p className="font-dm-sans text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Monto:</span>{' '}
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                  }).format(orderData.amount)}
                </p>
                {transactionId && (
                  <p className="font-dm-sans text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Transacción:</span> {transactionId}
                  </p>
                )}
              </div>
            )}
            <Link
              href="/"
              className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#f8f0f5] py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="font-gazeta text-3xl text-[#654177] mb-4">
              Error en el Pago
            </h1>
            <p className="font-dm-sans text-gray-600 mb-6">
              {error || 'Hubo un problema procesando tu pago. Por favor intenta nuevamente.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setState('loading')
                  setError(null)
                  window.location.reload()
                }}
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Intentar de nuevo
              </button>
              <Link
                href="/"
                className="w-full border border-gray-300 text-gray-700 font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-gray-50 flex items-center justify-center"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // State === 'ready'
  const metadata = orderData?.metadata as Record<string, any> | null

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/sesiones"
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] font-dm-sans text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <h1 className="font-gazeta text-3xl text-[#654177]">
            Completar Pago
          </h1>
        </div>

        {/* Checkout Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <WompiCheckout
            amountInCents={Math.round(orderData.amount * 100)}
            reference={orderData.orderNumber}
            productName={orderData.itemName}
            customerEmail={metadata?.customerEmail || ''}
            customerName={metadata?.customerName}
            onSuccess={handleSuccess}
            onError={handleError}
            redirectUrl={`${window.location.origin}/pago/confirmacion?ref=${orderData.orderNumber}`}
          />
        </div>

        {/* Info adicional */}
        <div className="mt-6 text-center">
          <p className="font-dm-sans text-sm text-gray-500">
            ¿Tienes algún problema?{' '}
            <a
              href="https://wa.me/573001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8A4BAF] hover:underline"
            >
              Contáctanos por WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function WompiCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      }
    >
      <WompiCheckoutContent />
    </Suspense>
  )
}
