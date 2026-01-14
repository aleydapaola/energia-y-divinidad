'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Smartphone, CheckCircle, XCircle, Loader2, RefreshCw, Bell } from 'lucide-react'
import Link from 'next/link'

type PaymentStatus = 'idle' | 'sending' | 'waiting' | 'success' | 'failed' | 'expired'

function NequiPushContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const bookingId = searchParams.get('booking_id')
  const amount = searchParams.get('amount') || '0'
  const type = searchParams.get('type') || 'single'

  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [message, setMessage] = useState('')
  const [polling, setPolling] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes to approve

  const productName = type === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión Individual'
  const formattedAmount = Number(amount).toLocaleString('es-CO')

  // Validate Colombian phone number (starts with 3, 10 digits)
  const isValidPhone = /^3\d{9}$/.test(phoneNumber.replace(/\s|-/g, ''))

  // Send push notification
  const sendPushNotification = async () => {
    if (!isValidPhone || !bookingId) return

    setStatus('sending')
    setMessage('')

    try {
      const response = await fetch('/api/pago/nequi/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          phoneNumber: phoneNumber.replace(/\s|-/g, ''),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('waiting')
        setMessage('Notificación enviada. Aprueba el pago en tu app Nequi.')
        setPolling(true)
        setTimeLeft(180)
      } else {
        setStatus('failed')
        setMessage(data.error || 'Error al enviar notificación')
      }
    } catch (error) {
      setStatus('failed')
      setMessage('Error de conexión. Intenta de nuevo.')
    }
  }

  // Poll for payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!bookingId || !polling) return

    try {
      const response = await fetch(`/api/pago/nequi/status?booking_id=${bookingId}`)
      const data = await response.json()

      if (data.status === 'success') {
        setStatus('success')
        setMessage('Pago confirmado')
        setPolling(false)
        // Redirect to success page after 2 seconds
        setTimeout(() => {
          router.push(`/sesiones/confirmacion?booking_id=${bookingId}&type=${type}`)
        }, 2000)
      } else if (data.status === 'failed') {
        setStatus('failed')
        setMessage(data.message || 'El pago fue rechazado')
        setPolling(false)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }, [bookingId, polling, router, type])

  // Polling interval
  useEffect(() => {
    if (!polling) return

    const interval = setInterval(checkPaymentStatus, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [checkPaymentStatus, polling])

  // Countdown timer
  useEffect(() => {
    if (!polling || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired')
          setMessage('El tiempo para aprobar el pago ha expirado')
          setPolling(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [polling, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRetry = () => {
    setStatus('idle')
    setMessage('')
    setPolling(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          {/* Back button */}
          <Link
            href="/sesiones"
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] transition-colors mb-6 font-dm-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Sesiones</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-[#8A4BAF]" />
            </div>
            <h1 className="font-gazeta text-3xl text-[#8A4BAF] mb-2">
              Pago con Nequi
            </h1>
            <p className="font-dm-sans text-[#654177]/70">
              {productName}
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-[#8A4BAF]/10">
            <div className="flex items-center justify-between">
              <span className="font-dm-sans text-gray-500">Total a pagar</span>
              <span className="font-gazeta text-2xl text-[#8A4BAF]">
                ${formattedAmount} COP
              </span>
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-[#8A4BAF]/10">
            {/* Idle - Enter phone number */}
            {status === 'idle' && (
              <>
                <div className="mb-6">
                  <label className="block font-dm-sans text-sm text-gray-600 mb-2">
                    Número de celular Nequi
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                    placeholder="300 123 4567"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-mono text-lg focus:border-[#8A4BAF] focus:outline-none transition-colors"
                    maxLength={12}
                  />
                  {phoneNumber && !isValidPhone && (
                    <p className="text-red-500 text-sm mt-2 font-dm-sans">
                      Ingresa un número válido (10 dígitos, empieza con 3)
                    </p>
                  )}
                </div>

                <div className="bg-[#8A4BAF]/5 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-dm-sans text-sm text-gray-700">
                        Recibirás una <strong>notificación</strong> en tu app Nequi para aprobar el pago.
                      </p>
                      <p className="font-dm-sans text-xs text-gray-500 mt-1">
                        Asegúrate de tener la app Nequi instalada y las notificaciones activadas.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={sendPushNotification}
                  disabled={!isValidPhone}
                  className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
                    isValidPhone
                      ? 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Enviar Notificación de Pago
                </button>
              </>
            )}

            {/* Sending */}
            {status === 'sending' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-[#8A4BAF] animate-spin mx-auto mb-4" />
                <p className="font-dm-sans text-gray-600">
                  Enviando notificación a tu app Nequi...
                </p>
              </div>
            )}

            {/* Waiting for approval */}
            {status === 'waiting' && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <Bell className="w-10 h-10 text-[#8A4BAF]" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                </div>

                <h2 className="font-gazeta text-xl text-[#8A4BAF] mb-2">
                  Notificación Enviada
                </h2>
                <p className="font-dm-sans text-gray-600 mb-4">
                  Abre tu app Nequi y aprueba el pago
                </p>

                {/* Timer */}
                <div className="mb-4">
                  <p className="font-dm-sans text-sm text-gray-500 mb-1">
                    Tiempo para aprobar
                  </p>
                  <p className={`font-mono text-2xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-[#8A4BAF]'}`}>
                    {formatTime(timeLeft)}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2 text-[#8A4BAF]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-dm-sans text-sm">
                    Esperando aprobación...
                  </span>
                </div>

                {/* Resend button */}
                <button
                  onClick={sendPushNotification}
                  className="mt-6 font-dm-sans text-sm text-[#8A4BAF] hover:text-[#654177] underline"
                >
                  ¿No recibiste la notificación? Reenviar
                </button>
              </div>
            )}

            {/* Success */}
            {status === 'success' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="font-gazeta text-2xl text-green-600 mb-2">
                  Pago Exitoso
                </h2>
                <p className="font-dm-sans text-gray-600 mb-4">
                  {message || 'Tu pago ha sido confirmado'}
                </p>
                <p className="font-dm-sans text-sm text-gray-500">
                  Redirigiendo a la confirmación...
                </p>
              </div>
            )}

            {/* Failed */}
            {status === 'failed' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="font-gazeta text-2xl text-red-600 mb-2">
                  Pago No Completado
                </h2>
                <p className="font-dm-sans text-gray-600 mb-6">
                  {message || 'No se pudo procesar tu pago'}
                </p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#4944a4] text-white rounded-xl font-dm-sans font-medium hover:bg-[#3d3a8a] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Intentar de nuevo
                </button>
              </div>
            )}

            {/* Expired */}
            {status === 'expired' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-amber-500" />
                </div>
                <h2 className="font-gazeta text-2xl text-amber-600 mb-2">
                  Tiempo Expirado
                </h2>
                <p className="font-dm-sans text-gray-600 mb-6">
                  {message || 'El tiempo para aprobar el pago ha expirado'}
                </p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#4944a4] text-white rounded-xl font-dm-sans font-medium hover:bg-[#3d3a8a] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>

          {/* Alternative payment */}
          {(status === 'idle' || status === 'expired' || status === 'failed') && (
            <div className="text-center">
              <p className="font-dm-sans text-sm text-gray-500 mb-2">
                ¿Problemas con Nequi?
              </p>
              <Link
                href={`/pago/nequi?booking_id=${bookingId}&amount=${amount}&type=${type}`}
                className="font-dm-sans text-[#8A4BAF] hover:text-[#654177] text-sm underline"
              >
                Pagar con transferencia manual
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NequiPushPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8A4BAF]"></div>
      </div>
    }>
      <NequiPushContent />
    </Suspense>
  )
}
