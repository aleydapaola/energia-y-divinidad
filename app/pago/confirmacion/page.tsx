'use client'

import { CheckCircle, XCircle, Clock, Loader2, Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense, useRef } from 'react'

import { useCartStore } from '@/lib/stores/cart-store'

type PaymentStatus = 'success' | 'pending' | 'failed' | 'loading'

function ConfirmacionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const clearCart = useCartStore((state) => state.clearCart)
  const cartCleared = useRef(false)

  // Parámetros de la URL
  const reference = searchParams?.get('ref') || ''
  const refPayco = searchParams?.get('ref_payco') || ''
  // Wompi redirige con el ID de la transacción
  const wompiTransactionId = searchParams?.get('id') || ''
  // PayPal redirige con token (PayPal order ID) y PayerID
  const paypalToken = searchParams?.get('token') || ''
  const paypalPayerId = searchParams?.get('PayerID') || ''

  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [orderData, setOrderData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [isGuestCheckout, setIsGuestCheckout] = useState<boolean>(false)
  const [userWasCreated, setUserWasCreated] = useState<boolean>(false)

  // Limpiar carrito cuando el pago es exitoso (solo para cursos)
  useEffect(() => {
    if (status === 'success' && orderData?.orderType === 'COURSE' && !cartCleared.current) {
      clearCart()
      cartCleared.current = true
      console.log('[CONFIRMACION] Carrito limpiado después de compra exitosa de cursos')
    }
  }, [status, orderData, clearCart])

  useEffect(() => {
    async function checkPaymentStatus() {
      console.log('[CONFIRMACION] Checking payment status...')
      console.log('[CONFIRMACION] reference:', reference)
      console.log('[CONFIRMACION] wompiTransactionId:', wompiTransactionId)
      console.log('[CONFIRMACION] refPayco:', refPayco)
      console.log('[CONFIRMACION] paypalToken:', paypalToken)
      console.log('[CONFIRMACION] paypalPayerId:', paypalPayerId)
      console.log('[CONFIRMACION] Full URL params:', window.location.search)

      if (!reference) {
        setStatus('failed')
        setError('No se encontró referencia de pago')
        return
      }

      // Si viene de PayPal, capturar el pago automáticamente
      if (paypalToken) {
        console.log('[CONFIRMACION] PayPal return detected, capturing payment...')
        console.log('[CONFIRMACION] PayPal token:', paypalToken)
        console.log('[CONFIRMACION] PayPal PayerID:', paypalPayerId)

        try {
          const captureResponse = await fetch('/api/checkout/paypal/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paypalOrderId: paypalToken,
              reference: reference,
            }),
          })

          const captureData = await captureResponse.json()

          if (!captureResponse.ok) {
            throw new Error(captureData.error || 'Error al capturar el pago')
          }

          console.log('[CONFIRMACION] PayPal capture successful:', captureData)

          // Cargar datos de la orden actualizados
          const orderResponse = await fetch(`/api/orders/${reference}/status`)
          if (orderResponse.ok) {
            const orderDataResponse = await orderResponse.json()
            setOrderData(orderDataResponse)
            setPaymentMethod(orderDataResponse.paymentMethod || 'PAYPAL_DIRECT')
            // Detectar si fue guest checkout y si se creó un usuario nuevo
            const metadata = orderDataResponse.metadata || {}
            setIsGuestCheckout(metadata.isGuestCheckout || metadata.convertedFromGuest || false)
            setUserWasCreated(metadata.userWasCreated || false)
          }

          setStatus('success')
        } catch (err: any) {
          console.error('[CONFIRMACION] PayPal capture error:', err)
          setStatus('failed')
          setError(err.message || 'Error al procesar el pago de PayPal')
        }
        return
      }

      // Si viene de Wompi con ID de transacción, verificar estado real con la API
      if (wompiTransactionId) {
        console.log('[CONFIRMACION] Verifying with Wompi transactionId...')
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
            // Detectar si fue guest checkout y si se creó un usuario nuevo
            const metadata = verifyData.order.metadata || {}
            setIsGuestCheckout(metadata.isGuestCheckout || metadata.convertedFromGuest || false)
            setUserWasCreated(metadata.userWasCreated || false)
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
      // PERO si la orden es de Wompi y está PENDING, intentar verificar por referencia
      try {
        const response = await fetch(`/api/orders/${reference}/status`)
        if (!response.ok) {
          throw new Error('Error al consultar estado del pago')
        }

        const data = await response.json()
        setOrderData(data)
        setPaymentMethod(data.paymentMethod || null)
        // Detectar si fue guest checkout y si se creó un usuario nuevo
        const metadata = data.metadata || {}
        setIsGuestCheckout(metadata.isGuestCheckout || metadata.convertedFromGuest || false)
        setUserWasCreated(metadata.userWasCreated || false)

        // Si la orden está PENDING y es de Wompi, intentar verificar con la API de Wompi
        // usando el endpoint de búsqueda por referencia
        if (data.paymentStatus === 'PENDING' && data.paymentMethod?.startsWith('WOMPI')) {
          console.log('[CONFIRMACION] Order is PENDING and from Wompi, trying to verify by reference...')
          try {
            const verifyByRefResponse = await fetch(
              `/api/payments/wompi/verify-by-reference?ref=${reference}`
            )
            if (verifyByRefResponse.ok) {
              const verifyData = await verifyByRefResponse.json()
              console.log('[CONFIRMACION] Verify by reference result:', verifyData)
              if (verifyData.order) {
                setOrderData(verifyData.order)
                // Actualizar metadata si está disponible
                const verifyMetadata = verifyData.order.metadata || {}
                setIsGuestCheckout(verifyMetadata.isGuestCheckout || verifyMetadata.convertedFromGuest || false)
                setUserWasCreated(verifyMetadata.userWasCreated || false)
              }
              switch (verifyData.transactionStatus) {
                case 'APPROVED':
                  setStatus('success')
                  return
                case 'DECLINED':
                case 'ERROR':
                  setStatus('failed')
                  setError('El pago fue rechazado.')
                  return
                case 'PENDING':
                  setStatus('pending')
                  return
              }
            }
          } catch (verifyErr) {
            console.error('Error verifying by reference:', verifyErr)
            // Continuar con el flujo normal
          }
        }

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
  }, [reference, refPayco, wompiTransactionId, paypalToken, paypalPayerId])

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
            {status === 'success' && orderData?.orderType === 'MEMBERSHIP' && !isGuestCheckout && (
              <Link
                href="/mi-cuenta"
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Ir a mi cuenta
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            {status === 'success' && orderData?.orderType === 'SESSION' && !isGuestCheckout && (
              <Link
                href="/mi-cuenta?tab=sesiones"
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Ver mis Sesiones
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            {status === 'success' && isGuestCheckout && (
              <>
                <div className="bg-[#eef1fa] rounded-lg p-4 mb-4 text-left">
                  <p className="font-dm-sans text-sm text-[#654177]">
                    {userWasCreated ? (
                      <>
                        <span className="font-semibold">¡Cuenta creada!</span> Hemos creado una cuenta con tu email.
                        Revisa tu correo de confirmación donde encontrarás un enlace para establecer tu contraseña.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">¡Compra asociada!</span> Tu compra ha sido asociada a tu cuenta existente.
                        Inicia sesión para ver los detalles de tu reserva.
                      </>
                    )}
                  </p>
                </div>
                {userWasCreated ? (
                  <Link
                    href="/auth/forgot-password"
                    className="w-full border border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    ¿No recibiste el correo? Solicitar nuevo enlace
                  </Link>
                ) : (
                  <Link
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(
                      orderData?.orderType === 'SESSION' ? '/mi-cuenta?tab=sesiones' :
                      orderData?.orderType === 'MEMBERSHIP' ? '/mi-cuenta' :
                      orderData?.orderType === 'COURSE' ? '/mi-cuenta/cursos' :
                      orderData?.orderType === 'EVENT' ? '/mi-cuenta?tab=eventos' :
                      '/mi-cuenta'
                    )}`}
                    className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Iniciar Sesión
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </>
            )}

            {status === 'success' && orderData?.orderType === 'COURSE' && !isGuestCheckout && (
              <Link
                href="/mi-cuenta/cursos"
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Ir a mis Cursos
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
              href="https://wa.me/573151165921"
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
