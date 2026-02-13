'use client'

import {
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  XCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { UserSubscription } from '@/types/membership'

interface SubscriptionManagerProps {
  subscription: UserSubscription
}

export function SubscriptionManager({ subscription }: SubscriptionManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'COP') {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-dm-sans font-medium border border-green-200">
            <CheckCircle className="w-4 h-4" />
            Activa
          </span>
        )
      case 'TRIAL':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-dm-sans font-medium border border-blue-200">
            <AlertCircle className="w-4 h-4" />
            Prueba
          </span>
        )
      case 'PAST_DUE':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-dm-sans font-medium border border-amber-200">
            <AlertCircle className="w-4 h-4" />
            Pago Pendiente
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-dm-sans font-medium border border-red-200">
            <XCircle className="w-4 h-4" />
            Cancelada
          </span>
        )
      default:
        return (
          <span className="text-[#654177] font-dm-sans">{status}</span>
        )
    }
  }

  const getPaymentMethodLabel = () => {
    if (subscription.paymentProvider === 'stripe') {
      return `Tarjeta ···${subscription.stripeCustomerId?.slice(-4) || ''}`
    } else if (subscription.paymentProvider === 'nequi') {
      return `Nequi ···${subscription.nequiPhoneNumber?.slice(-4) || ''}`
    }
    return subscription.paymentProvider
  }

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        `¿Estás seguro de que quieres cancelar tu membresía? Mantendrás acceso hasta el ${formatDate(subscription.currentPeriodEnd)}`
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al cancelar suscripción')
      }

      setSuccess(
        `Tu suscripción ha sido cancelada. Mantendrás acceso hasta el ${formatDate(subscription.currentPeriodEnd)}`
      )

      // Recargar página después de 2 segundos
      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al reactivar suscripción')
      }

      setSuccess('Tu suscripción ha sido reactivada exitosamente')

      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isCancelled = subscription.cancelledAt !== null

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm font-dm-sans">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-600 text-sm font-dm-sans">{success}</p>
        </div>
      )}

      {/* Estado Actual */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e8d5e0]">
        <h2 className="font-gazeta text-xl text-[#4b316c] mb-6">
          Estado de tu Membresía
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#e8d5e0]">
            <span className="text-[#654177] font-dm-sans">Plan</span>
            <span className="font-dm-sans font-semibold text-[#8A4BAF]">
              {subscription.membershipTierName}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[#e8d5e0]">
            <span className="text-[#654177] font-dm-sans">Estado</span>
            {getStatusBadge(subscription.status)}
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[#e8d5e0]">
            <span className="text-[#654177] font-dm-sans">Facturación</span>
            <span className="font-dm-sans font-medium text-[#4b316c]">
              {subscription.billingInterval === 'MONTHLY' ? 'Mensual' : 'Anual'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[#e8d5e0]">
            <span className="text-[#654177] font-dm-sans">Precio</span>
            <span className="font-dm-sans font-semibold text-[#4b316c]">
              {formatPrice(subscription.amount, subscription.currency)}
              <span className="text-sm text-[#654177]/70 ml-1">
                /{subscription.billingInterval === 'MONTHLY' ? 'mes' : 'año'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[#e8d5e0]">
            <span className="text-[#654177] font-dm-sans">Método de pago</span>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#8A4BAF]" />
              <span className="font-dm-sans font-medium text-[#4b316c]">
                {getPaymentMethodLabel()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-[#654177] font-dm-sans">
              {isCancelled ? 'Acceso hasta' : 'Próxima renovación'}
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8A4BAF]" />
              <span className="font-dm-sans font-medium text-[#4b316c]">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          </div>

          {isCancelled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <p className="text-amber-700 text-sm font-dm-sans">
                Tu suscripción fue cancelada pero aún tienes acceso hasta el{' '}
                <span className="font-semibold">{formatDate(subscription.currentPeriodEnd)}</span>.
                Puedes reactivarla en cualquier momento.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e8d5e0]">
        <h2 className="font-gazeta text-xl text-[#4b316c] mb-6">
          Gestionar Suscripción
        </h2>

        <div className="space-y-4">
          {/* Reactivar (si está cancelada) */}
          {isCancelled && (
            <button
              onClick={handleReactivateSubscription}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-dm-sans font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Reactivar Suscripción</span>
                </>
              )}
            </button>
          )}

          {/* Cambiar plan */}
          <button
            onClick={() => router.push('/membresia')}
            className="w-full bg-[#f8f0f5] hover:bg-[#ede4ea] text-[#654177] font-dm-sans font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 border border-[#e8d5e0]"
          >
            <DollarSign className="w-5 h-5" />
            <span>Cambiar de Plan</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>

          {/* Cancelar suscripción (si está activa) */}
          {!isCancelled && (
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-dm-sans font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Cancelar Suscripción</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-[#f8f0f5] rounded-2xl p-6 border border-[#e8d5e0]">
        <h3 className="font-gazeta text-lg text-[#4b316c] mb-4 flex items-center gap-2">
          <span className="text-xl">ℹ️</span>
          Información Importante
        </h3>
        <ul className="space-y-3 text-sm text-[#654177] font-dm-sans">
          <li className="flex items-start gap-2">
            <span className="text-[#8A4BAF] mt-1">•</span>
            <span>Los cobros son automáticos y se realizan en la fecha de renovación</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#8A4BAF] mt-1">•</span>
            <span>Si cancelas, mantendrás acceso hasta el final del período ya pagado</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#8A4BAF] mt-1">•</span>
            <span>Puedes cambiar de plan en cualquier momento desde esta página</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#8A4BAF] mt-1">•</span>
            <span>Para cambiar el método de pago, contacta a soporte</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
