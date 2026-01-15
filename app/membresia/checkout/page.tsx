'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, CreditCard, Smartphone, AlertCircle } from 'lucide-react'
import { PaymentMethodSelector, type PaymentRegion } from '@/components/pago/PaymentMethodSelector'
import type { PaymentMethodType } from '@/lib/membership-access'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const tierId = searchParams?.get('tier')
  const interval = searchParams?.get('interval') as 'monthly' | 'yearly' | null

  const [tierData, setTierData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentSelector, setShowPaymentSelector] = useState(false)

  // Form data
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(
        `/auth/signin?callbackUrl=/membresia/checkout?tier=${tierId}&interval=${interval}`
      )
    }
  }, [status, router, tierId, interval])

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
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
      </div>
    )
  }

  if (error || !tierId || !interval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5] px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="font-gazeta text-2xl text-[#654177] mb-4">Error en el Checkout</h1>
          <p className="font-dm-sans text-gray-600 mb-6">{error || 'Parámetros inválidos'}</p>
          <button
            onClick={() => router.push('/membresia')}
            className="bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Volver a Membresías
          </button>
        </div>
      </div>
    )
  }

  // Precios según intervalo
  const priceCOP =
    interval === 'monthly' ? tierData?.pricing?.monthlyPrice : tierData?.pricing?.yearlyPrice
  const priceUSD =
    interval === 'monthly' ? tierData?.pricing?.monthlyPriceUSD : tierData?.pricing?.yearlyPriceUSD

  const formatPrice = (amount: number, currency: 'COP' | 'USD') => {
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

  const handlePaymentMethodSelect = async (
    method: PaymentMethodType,
    region: PaymentRegion,
    phoneNumber?: string
  ) => {
    setError(null)
    setSubmitting(true)

    const currency = region === 'colombia' ? 'COP' : 'USD'
    const amount = region === 'colombia' ? priceCOP : priceUSD

    try {
      // Determinar endpoint según método de pago
      let endpoint: string
      let body: any

      if (method === 'wompi_nequi' || method === 'wompi_card') {
        // Pago via Wompi (Colombia - COP)
        endpoint = '/api/checkout/wompi'
        body = {
          productType: 'membership',
          productId: tierId,
          productName: tierData.name,
          amount,
          paymentMethod: method === 'wompi_nequi' ? 'nequi' : 'card',
          billingInterval: interval,
          phoneNumber,
        }
      } else {
        // Pago via ePayco (Internacional o PayPal)
        endpoint = '/api/checkout/epayco'
        body = {
          productType: 'membership',
          productId: tierId,
          productName: tierData.name,
          amount,
          currency,
          paymentMethod: method === 'epayco_paypal' ? 'paypal' : 'card',
          billingInterval: interval,
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al procesar el pago')
      }

      const result = await response.json()

      // Redirigir según respuesta
      if (result.checkoutUrl) {
        // ePayco o Wompi card - redirigir a checkout externo
        window.location.href = result.checkoutUrl
      } else if (result.redirectUrl) {
        // Nequi push - redirigir a página de espera
        router.push(result.redirectUrl)
      } else {
        throw new Error('Respuesta inesperada del servidor')
      }
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
      setShowPaymentSelector(false)
    }
  }

  const handleContinue = () => {
    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones')
      return
    }
    setError(null)
    setShowPaymentSelector(true)
  }

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] text-center mb-8">
          Finalizar Suscripción
        </h1>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Formulario de checkout */}
          <div className="md:col-span-3 bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="space-y-6">
              {/* Info del plan */}
              <div>
                <h2 className="font-gazeta text-xl text-[#654177] mb-4">Plan Seleccionado</h2>
                <div className="bg-[#eef1fa] rounded-lg p-4">
                  <p className="font-dm-sans font-semibold text-[#4b316c]">{tierData?.name}</p>
                  <p className="font-dm-sans text-sm text-gray-600 mt-1">
                    Facturación {interval === 'monthly' ? 'mensual' : 'anual'}
                  </p>
                </div>
              </div>

              {/* Métodos de pago disponibles */}
              <div>
                <h2 className="font-gazeta text-xl text-[#654177] mb-4">Métodos de Pago</h2>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                    <span className="text-2xl">🇨🇴</span>
                    <div>
                      <p className="font-dm-sans font-medium text-gray-900">Colombia</p>
                      <p className="font-dm-sans text-sm text-gray-600">
                        Nequi, Tarjeta de crédito/débito, PayPal
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                    <CreditCard className="w-6 h-6 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-dm-sans font-medium text-gray-900">Internacional</p>
                      <p className="font-dm-sans text-sm text-gray-600">
                        Tarjeta de crédito/débito, PayPal
                      </p>
                    </div>
                  </div>
                </div>
                <p className="font-dm-sans text-xs text-gray-500 mt-3">
                  Los cobros son recurrentes cada {interval === 'monthly' ? 'mes' : 'año'}. Puedes
                  cancelar cuando quieras.
                </p>
              </div>

              {/* Términos y condiciones */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#8A4BAF] border-gray-300 rounded focus:ring-[#8A4BAF]"
                  />
                  <span className="font-dm-sans text-sm text-gray-700">
                    Acepto que se realicen cobros automáticos recurrentes y he leído los{' '}
                    <a href="/terminos" className="text-[#8A4BAF] hover:underline">
                      términos y condiciones
                    </a>
                  </span>
                </label>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="font-dm-sans text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={submitting}
                className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>Continuar al Pago</span>
                )}
              </button>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="font-gazeta text-xl text-[#654177] mb-4">Resumen</h2>

              <div className="space-y-4">
                <div>
                  <p className="font-dm-sans text-sm text-gray-600">Plan</p>
                  <p className="font-dm-sans font-semibold text-gray-900">{tierData?.name}</p>
                </div>

                <div>
                  <p className="font-dm-sans text-sm text-gray-600">Facturación</p>
                  <p className="font-dm-sans font-semibold text-gray-900">
                    {interval === 'monthly' ? 'Mensual' : 'Anual'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="font-dm-sans text-sm text-gray-600 mb-2">Precio</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-dm-sans text-sm text-gray-600">🇨🇴 Colombia</span>
                      <span className="font-dm-sans font-bold text-[#8A4BAF]">
                        {formatPrice(priceCOP || 0, 'COP')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-dm-sans text-sm text-gray-600">🌍 Internacional</span>
                      <span className="font-dm-sans font-bold text-[#8A4BAF]">
                        {formatPrice(priceUSD || 0, 'USD')}
                      </span>
                    </div>
                  </div>
                  {interval === 'yearly' && (
                    <p className="font-dm-sans text-sm text-green-600 mt-3">
                      Ahorra pagando anualmente
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="font-dm-sans text-xs text-gray-500">
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

      {/* Modal de selección de método de pago */}
      {showPaymentSelector && (
        <PaymentMethodSelector
          onMethodSelect={handlePaymentMethodSelect}
          onCancel={() => setShowPaymentSelector(false)}
          isLoading={submitting}
          pricesCOP={priceCOP || 0}
          pricesUSD={priceUSD || 0}
          productName={`Membresía ${tierData?.name} - ${interval === 'monthly' ? 'Mensual' : 'Anual'}`}
        />
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
