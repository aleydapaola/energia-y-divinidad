'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Loader2, Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type PaymentStatus = 'success' | 'pending' | 'failed' | 'loading'

function ConfirmacionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Parámetros de la URL
  const reference = searchParams?.get('ref') || ''
  const refPayco = searchParams?.get('ref_payco') || ''
  // Wompi redirige con el ID de la transacción
  const wompiTransactionId = searchParams?.get('id') || ''

  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [orderData, setOrderData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  useEffect(() => {
    async function checkPaymentStatus() {
      if (!reference) {
        setStatus('failed')
        setError('No se encontró referencia de pago')
        return
      }

      // Si viene de Wompi con ID de transacción, verificar estado real con la API
      if (wompiTransactionId) {
        try {
          // Verificar transacción directamente con Wompi (como Stripe)
          const verifyResponse = await fetch(
            `/api/payments/wompi/verify?transactionId=${wompiTransactionId}&ref=${reference}`
          )

          if (!verifyResponse.ok) {
            throw new Error('Error verificando transacción')
          }

          const verifyData = await verifyResponse.json()

          // Cargar datos de la orden para mostrar en UI
          if (verifyData.order) {
            setOrderData(verifyData.order)
            setPaymentMethod(verifyData.order.paymentMethod || null)
          }

          // Mostrar resultado real de la transacción
          switch (verifyData.transactionStatus) {
            case 'APPROVED':
              setStatus('success')
              break
            case 'DECLINED':
            case 'ERROR':
              setStatus('failed')
              setError('El pago fue rechazado. Por favor verifica los datos de tu tarjeta e intenta nuevamente.')
              break
            case 'VOIDED':
              setStatus('failed')
              setError('El pago fue cancelado.')
              break
            case 'PENDING':
              setStatus('pending')
              break
            default:
              setStatus('failed')
              setError('Estado de pago desconocido.')
          }
        } catch (err: any) {
          console.error('Error verifying Wompi transaction:', err)
          setStatus('failed')
          setError('Error verificando el pago. Por favor contacta soporte.')
        }
        return
      }

      // Si viene de ePayco
      if (refPayco) {
        try {
          const response = await fetch(`/api/orders/${reference}/status`)
          if (response.ok) {
            const data = await response.json()
            setOrderData(data)
            setPaymentMethod(data.paymentMethod || null)
          }
        } catch {
          // Ignorar
        }
        setStatus('success')
        return
      }

      // Sin ID de transacción externa, verificar estado en BD
      try {
        const response = await fetch(`/api/orders/${reference}/status`)
        if (!response.ok) {
          throw new Error('Error al consultar estado del pago')
        }

        const data = await response.json()
        setOrderData(data)
        setPaymentMethod(data.paymentMethod || null)

        switch (data.paymentStatus) {
          case 'COMPLETED':
            setStatus('success')
            break
          case 'FAILED':
          case 'CANCELLED':
            setStatus('failed')
            break
          default:
            setStatus('pending')
        }
      } catch (err: any) {
        console.error('Error checking payment status:', err)
        setStatus('failed')
        setError(err.message)
      }
    }

    checkPaymentStatus()
  }, [reference, refPayco, wompiTransactionId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#8A4BAF] mx-auto mb-4" />
          <p className="font-dm-sans text-gray-600">Verificando tu pago...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {status === 'success' && (
            <>
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
                    {new Intl.NumberFormat(orderData.currency === 'COP' ? 'es-CO' : 'en-US', {
                      style: 'currency',
                      currency: orderData.currency,
                      minimumFractionDigits: 0,
                    }).format(orderData.amount)}
                  </p>
                </div>
              )}
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
              <h1 className="font-gazeta text-3xl text-[#654177] mb-4">
                Pago en Proceso
              </h1>
              <p className="font-dm-sans text-gray-600 mb-6">
                {paymentMethod === 'WOMPI_NEQUI'
                  ? 'Se envió una solicitud de pago a tu app Nequi. Por favor apruébala para completar la compra.'
                  : 'Tu pago está siendo verificado. Esto puede tomar unos segundos.'}
              </p>
              {reference && (
                <div className="bg-[#eef1fa] rounded-lg p-4 mb-6">
                  <p className="font-dm-sans text-sm text-gray-600">
                    <span className="font-semibold">Referencia:</span> {reference}
                  </p>
                  {orderData?.itemName && (
                    <p className="font-dm-sans text-sm text-gray-600 mt-1">
                      <span className="font-semibold">Producto:</span> {orderData.itemName}
                    </p>
                  )}
                </div>
              )}
              {paymentMethod === 'WOMPI_NEQUI' && (
                <p className="font-dm-sans text-sm text-gray-500 mb-6">
                  Abre tu app de Nequi y aprueba el pago pendiente.
                </p>
              )}
              {paymentMethod === 'WOMPI_CARD' && (
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-dm-sans text-sm">Verificando con el banco...</span>
                </div>
              )}
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="font-gazeta text-3xl text-[#654177] mb-4">
                Pago No Completado
              </h1>
              <p className="font-dm-sans text-gray-600 mb-6">
                {error || 'Hubo un problema procesando tu pago. Por favor intenta nuevamente.'}
              </p>
            </>
          )}

          {/* Acciones */}
          <div className="space-y-3">
            {status === 'success' && orderData?.orderType === 'MEMBERSHIP' && (
              <Link
                href="/membresia/dashboard"
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Ir a mi Membresía
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            {status === 'success' && orderData?.orderType === 'SESSION' && (
              <Link
                href="/sesiones/mis-sesiones"
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Ver mis Sesiones
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            {status === 'failed' && (
              <button
                onClick={() => router.back()}
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Intentar de nuevo
              </button>
            )}

            <Link
              href="/"
              className="w-full border border-gray-300 text-gray-700 font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Volver al inicio
            </Link>
          </div>
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

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      }
    >
      <ConfirmacionContent />
    </Suspense>
  )
}
