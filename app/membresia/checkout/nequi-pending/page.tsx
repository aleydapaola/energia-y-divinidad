'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react'

function NequiPendingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const subscriptionId = searchParams?.get('subscription_id')

  const [status, setStatus] = useState<'pending' | 'approved' | 'failed'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const MAX_ATTEMPTS = 60 // 5 minutos de polling (60 * 5 segundos)

  useEffect(() => {
    if (!subscriptionId) {
      router.push('/membresia')
      return
    }

    // Polling cada 5 segundos
    const interval = setInterval(async () => {
      try {
        setAttempts((prev) => prev + 1)

        const response = await fetch(`/api/subscriptions/${subscriptionId}/status`)

        if (!response.ok) {
          throw new Error('Error al verificar estado')
        }

        const data = await response.json()

        if (data.status === 'ACTIVE') {
          setStatus('approved')
          clearInterval(interval)

          // Esperar 2 segundos antes de redirigir para mostrar el mensaje de éxito
          setTimeout(() => {
            router.push('/dashboard/membresia/publicaciones')
          }, 2000)
        } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
          setStatus('failed')
          setError('La suscripción fue cancelada o expiró')
          clearInterval(interval)
        }

        // Si llegamos al máximo de intentos, mostrar error
        if (attempts >= MAX_ATTEMPTS) {
          setStatus('failed')
          setError('Tiempo de espera agotado. Por favor intenta nuevamente.')
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Error en polling:', err)
        setError('Error al verificar el estado de tu suscripción')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [subscriptionId, router, attempts])

  if (!subscriptionId) {
    return null
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
            ¡Suscripción Aprobada!
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Tu membresía ha sido activada exitosamente. Redirigiendo al dashboard...
          </p>

          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
            Error en la Aprobación
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || 'No se pudo aprobar la suscripción. Por favor intenta nuevamente.'}
          </p>

          <button
            onClick={() => router.push('/membresia')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Volver a Membresías
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8">
        {/* Icono de celular animado */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Smartphone className="w-20 h-20 text-amber-600 dark:text-amber-400" />
            <div className="absolute -top-2 -right-2">
              <div className="animate-ping absolute h-4 w-4 rounded-full bg-amber-400 opacity-75"></div>
              <div className="relative h-4 w-4 rounded-full bg-amber-500"></div>
            </div>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-4">
          Esperando Aprobación en Nequi
        </h1>

        <p className="text-center text-neutral-600 dark:text-neutral-400 mb-8">
          Por favor aprueba la suscripción de débito automático en tu aplicación Nequi
        </p>

        {/* Instrucciones paso a paso */}
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">
            Pasos para aprobar:
          </h2>
          <ol className="space-y-4">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center font-semibold mr-3">
                1
              </span>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Abre tu app Nequi
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  En tu celular, abre la aplicación Nequi
                </p>
              </div>
            </li>

            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center font-semibold mr-3">
                2
              </span>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Ve a Notificaciones
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Busca la sección de notificaciones en la app
                </p>
              </div>
            </li>

            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center font-semibold mr-3">
                3
              </span>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Busca la solicitud de débito automático
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Verás una solicitud de "Energía y Divinidad"
                </p>
              </div>
            </li>

            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center font-semibold mr-3">
                4
              </span>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Aprueba la suscripción
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Confirma la autorización del débito automático
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Estado de verificación */}
        <div className="flex items-center justify-center gap-3 text-neutral-600 dark:text-neutral-400 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-amber-400" />
          <span>Verificando aprobación...</span>
        </div>

        {/* Información adicional */}
        <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>Esta página se actualizará automáticamente cuando apruebes la suscripción</p>
          <p className="mt-2">
            Intentos: {attempts} / {MAX_ATTEMPTS}
          </p>
        </div>

        {/* Botón de cancelar */}
        <div className="text-center mt-8">
          <button
            onClick={() => {
              if (confirm('¿Estás seguro de que quieres cancelar?')) {
                router.push('/membresia')
              }
            }}
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors underline"
          >
            Cancelar y volver
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400">Cargando...</p>
      </div>
    </div>
  )
}

export default function NequiPendingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NequiPendingContent />
    </Suspense>
  )
}
