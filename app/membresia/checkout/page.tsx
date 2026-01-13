'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, CreditCard, Smartphone, AlertCircle } from 'lucide-react'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const tierId = searchParams?.get('tier')
  const interval = searchParams?.get('interval') as 'monthly' | 'yearly' | null
  const currency = searchParams?.get('currency') as 'COP' | 'USD' | null

  const [tierData, setTierData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [phoneNumber, setPhoneNumber] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/membresia/checkout?tier=${tierId}&interval=${interval}&currency=${currency}`)
    }
  }, [status, router, tierId, interval, currency])

  // Fetch tier data from Sanity
  useEffect(() => {
    async function fetchTierData() {
      if (!tierId) {
        router.push('/membresia')
        return
      }

      try {
        const response = await fetch(`/api/sanity/membership-tiers/${tierId}`)
        if (!response.ok) {
          throw new Error('Error al cargar el plan')
        }
        const data = await response.json()
        setTierData(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTierData()
  }, [tierId, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    )
  }

  if (error || !tierId || !interval || !currency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Error en el Checkout
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || 'Parámetros inválidos'}
          </p>
          <button
            onClick={() => router.push('/membresia')}
            className="bg-brand hover:bg-brand-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Volver a Membresías
          </button>
        </div>
      </div>
    )
  }

  const price =
    interval === 'monthly'
      ? currency === 'COP'
        ? tierData?.pricing?.monthlyPrice
        : tierData?.pricing?.monthlyPriceUSD
      : currency === 'COP'
      ? tierData?.pricing?.yearlyPrice
      : tierData?.pricing?.yearlyPriceUSD

  const monthlyPrice =
    interval === 'yearly' && price ? Math.round(price / 12) : price

  const formatPrice = (amount: number) => {
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

  const paymentMethod = currency === 'COP' ? 'nequi' : 'stripe'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones')
      setSubmitting(false)
      return
    }

    if (paymentMethod === 'nequi' && !phoneNumber) {
      setError('Ingresa tu número de celular')
      setSubmitting(false)
      return
    }

    try {
      if (paymentMethod === 'stripe') {
        // Crear sesión de checkout de Stripe
        const response = await fetch('/api/checkout/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membershipTierId: tierId,
            membershipTierName: tierData.name,
            billingInterval: interval,
            amount: price,
            currency: 'USD',
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al crear sesión de pago')
        }

        const { url } = await response.json()
        window.location.href = url
      } else {
        // Crear suscripción de Nequi
        const response = await fetch('/api/checkout/nequi-recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membershipTierId: tierId,
            membershipTierName: tierData.name,
            billingInterval: interval,
            amount: price,
            currency: 'COP',
            phoneNumber,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al crear suscripción')
        }

        const { subscriptionId } = await response.json()
        router.push(`/membresia/checkout/nequi-pending?subscription_id=${subscriptionId}`)
      }
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl text-brand text-center mb-8">
          Finalizar Suscripción
        </h1>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Formulario de checkout */}
          <div className="md:col-span-3 bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Método de pago */}
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Método de Pago
                </h2>

                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 flex items-start gap-3">
                  {paymentMethod === 'nequi' ? (
                    <>
                      <Smartphone className="w-6 h-6 text-brand flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          Nequi Débito Automático
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          Cobros recurrentes automáticos desde tu cuenta Nequi
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6 text-brand flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          Tarjeta de Crédito/Débito
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          Procesado de forma segura por Stripe
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
                  Los cobros son recurrentes y automáticos cada{' '}
                  {interval === 'monthly' ? 'mes' : 'año'}. Puedes cancelar cuando quieras.
                </p>
              </div>

              {/* Número de celular (solo para Nequi) */}
              {paymentMethod === 'nequi' && (
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                  >
                    Número de Celular
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="3001234567"
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Tu número de celular registrado en Nequi
                  </p>
                </div>
              )}

              {/* Términos y condiciones */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-brand border-neutral-300 rounded focus:ring-brand"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Acepto que se realicen cobros automáticos recurrentes y he leído los{' '}
                    <a href="/terminos" className="text-brand hover:underline">
                      términos y condiciones
                    </a>
                  </span>
                </label>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>
                    {paymentMethod === 'nequi' ? 'Crear Suscripción' : 'Ir a Pago Seguro'}
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Resumen del pedido */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Resumen
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Plan</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {tierData?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Facturación
                  </p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {interval === 'monthly' ? 'Mensual' : 'Anual'}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Total {interval === 'monthly' ? 'mensual' : 'anual'}
                  </p>
                  <p className="text-3xl font-bold text-brand">
                    {formatPrice(price || 0)}
                  </p>
                  {interval === 'yearly' && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Equivale a {formatPrice(monthlyPrice || 0)}/mes
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Próximo cobro:{' '}
                    {new Date(
                      new Date().setMonth(
                        new Date().getMonth() + (interval === 'monthly' ? 1 : 12)
                      )
                    ).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
