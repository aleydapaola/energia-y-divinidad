'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Smartphone, Loader2, CheckCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

function NequiPendingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const reference = searchParams?.get('ref') || ''

  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<'pending' | 'approved' | 'expired'>('pending')
  const [countdown, setCountdown] = useState(300) // 5 minutos

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending') return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status])

  // Auto-check status every 10 seconds
  useEffect(() => {
    if (status !== 'pending') return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${reference}/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.paymentStatus === 'COMPLETED') {
            setStatus('approved')
            // Redirigir a confirmación después de 2 segundos
            setTimeout(() => {
              router.push(`/pago/confirmacion?ref=${reference}`)
            }, 2000)
          }
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }

    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [reference, status, router])

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/orders/${reference}/status`)
      if (response.ok) {
        const data = await response.json()
        if (data.paymentStatus === 'COMPLETED') {
          setStatus('approved')
          setTimeout(() => {
            router.push(`/pago/confirmacion?ref=${reference}`)
          }, 2000)
        }
      }
    } catch (err) {
      console.error('Error checking status:', err)
    } finally {
      setChecking(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-[#f8f0f5] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="font-gazeta text-3xl text-[#654177] mb-4">¡Pago Aprobado!</h1>
          <p className="font-dm-sans text-gray-600 mb-6">
            Tu pago con Nequi fue aprobado exitosamente.
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-dm-sans text-sm">Redirigiendo...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Icono animado */}
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Smartphone className="w-12 h-12 text-[#8A4BAF]" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#8A4BAF] rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>

          <h1 className="font-gazeta text-2xl text-[#654177] mb-4">
            Aprueba el pago en tu app Nequi
          </h1>

          <p className="font-dm-sans text-gray-600 mb-6">
            Te enviamos una notificación a tu app Nequi. Abre la app y aprueba el pago para
            completar tu compra.
          </p>

          {/* Pasos */}
          <div className="bg-[#eef1fa] rounded-lg p-4 mb-6 text-left">
            <p className="font-dm-sans font-semibold text-[#4b316c] mb-3">Pasos:</p>
            <ol className="font-dm-sans text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  1
                </span>
                Abre tu app Nequi
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  2
                </span>
                Busca la notificación de pago
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  3
                </span>
                Confirma el pago
              </li>
            </ol>
          </div>

          {/* Timer */}
          {status === 'pending' && (
            <div className="mb-6">
              <p className="font-dm-sans text-sm text-gray-500 mb-2">
                Tiempo restante para aprobar:
              </p>
              <p className="font-dm-sans text-3xl font-bold text-[#8A4BAF]">
                {formatTime(countdown)}
              </p>
            </div>
          )}

          {status === 'expired' && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <p className="font-dm-sans text-red-600">
                El tiempo para aprobar el pago ha expirado. Por favor intenta nuevamente.
              </p>
            </div>
          )}

          {/* Referencia */}
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="font-dm-sans text-xs text-gray-500">Referencia</p>
            <p className="font-dm-sans font-mono text-sm text-gray-900">{reference}</p>
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            <button
              onClick={handleManualCheck}
              disabled={checking || status === 'expired'}
              className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Ya aprobé el pago
                </>
              )}
            </button>

            <Link
              href="/"
              className="w-full border border-gray-300 text-gray-700 font-dm-sans py-3 px-6 rounded-lg transition-colors hover:bg-gray-50 block text-center"
            >
              Cancelar
            </Link>
          </div>
        </div>

        {/* Info adicional */}
        <div className="mt-6 text-center">
          <p className="font-dm-sans text-sm text-gray-500">
            ¿No recibiste la notificación?{' '}
            <a
              href="https://wa.me/573151165921"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8A4BAF] hover:underline"
            >
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function NequiPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      }
    >
      <NequiPendingContent />
    </Suspense>
  )
}
