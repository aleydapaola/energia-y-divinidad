'use client'

import {
  Loader2,
  CreditCard,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Globe,
  ArrowLeft,
  Shield,
  Check,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'

import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'

import type { PaymentMethodType } from '@/lib/membership-access'

type PaymentRegion = 'colombia' | 'international'

interface PaymentOption {
  method: PaymentMethodType
  label: string
  description: string
  icon: React.ReactNode
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const tierId = searchParams?.get('tier')
  const interval = searchParams?.get('interval') as 'monthly' | 'yearly' | null

  const [tierData, setTierData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Payment selection state (inline, no modal)
  const [selectedRegion, setSelectedRegion] = useState<PaymentRegion | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null)

  // Estado de membresía actual (para upgrade/downgrade)
  const [currentSubscription, setCurrentSubscription] = useState<{
    tierId: string
    tierName: string
    tierOrder?: number
  } | null>(null)
  const [newTierOrder, setNewTierOrder] = useState<number | null>(null)

  // Form data
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Payment method options - Solo métodos con pago recurrente automático
  const colombiaOptions: PaymentOption[] = [
    {
      method: 'wompi_card',
      label: 'Tarjeta de Crédito/Débito',
      description: 'Cobro automático mensual/anual',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: 'Cobro automático mensual/anual',
      icon: <PayPalIcon />,
    },
  ]

  const internationalOptions: PaymentOption[] = [
    {
      method: 'wompi_card',
      label: 'Tarjeta de Crédito/Débito',
      description: 'Cobro automático mensual/anual (en COP)',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: 'Cobro automático mensual/anual',
      icon: <PayPalIcon />,
    },
    {
      method: 'paypal_card',
      label: 'Credit/Debit Card (via PayPal)',
      description: 'Cobro automático vía PayPal',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ]

  const currentOptions = selectedRegion === 'colombia' ? colombiaOptions : internationalOptions

  // Auto-detect region based on timezone
  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (timezone.includes('Bogota') || timezone.includes('Colombia')) {
        setSelectedRegion('colombia')
        setSelectedMethod('wompi_card')
      }
    } catch {
      // Fallback: don't auto-select
    }
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(
        `/auth/signin?callbackUrl=/membresia/checkout?tier=${tierId}&interval=${interval}`
      )
    }
  }, [status, router, tierId, interval])

  // Check current membership status
  useEffect(() => {
    async function checkCurrentMembership() {
      if (status !== 'authenticated') {return}

      try {
        const response = await fetch('/api/membership/status')
        if (response.ok) {
          const data = await response.json()
          if (data.hasActiveMembership && data.subscription) {
            setCurrentSubscription({
              tierId: data.subscription.membershipTierId,
              tierName: data.subscription.membershipTierName,
              tierOrder: data.tier?.order,
            })
          }
        }
      } catch (error) {
        console.error('Error checking membership:', error)
      }
    }

    checkCurrentMembership()
  }, [status])

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
        setNewTierOrder(data.order)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTierData()
  }, [tierId, router])

  // Determinar tipo de cambio de plan
  const getPlanChangeType = () => {
    if (!currentSubscription) {return null}
    if (currentSubscription.tierId === tierId) {return 'same'}
    if (
      currentSubscription.tierOrder !== undefined &&
      newTierOrder !== null &&
      newTierOrder > currentSubscription.tierOrder
    ) {
      return 'upgrade'
    }
    if (
      currentSubscription.tierOrder !== undefined &&
      newTierOrder !== null &&
      newTierOrder < currentSubscription.tierOrder
    ) {
      return 'downgrade'
    }
    return 'change'
  }

  const planChangeType = getPlanChangeType()

  const handleRegionSelect = (region: PaymentRegion) => {
    setSelectedRegion(region)
    if (region === 'colombia') {
      setSelectedMethod('wompi_card')
    } else {
      setSelectedMethod('wompi_card')
    }
  }

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

  const handleSubmit = async () => {
    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones')
      return
    }

    if (!selectedMethod || !selectedRegion) {
      setError('Selecciona una región y método de pago')
      return
    }

    setError(null)
    setSubmitting(true)

    const currency = selectedRegion === 'colombia' ? 'COP' : 'USD'
    const amount = selectedRegion === 'colombia' ? priceCOP : priceUSD

    try {
      let endpoint: string
      let body: Record<string, unknown>

      if (selectedMethod === 'wompi_card') {
        // Pago automático con tarjeta via Wompi API (cobro recurrente)
        endpoint = '/api/checkout/wompi'
        body = {
          productType: 'membership',
          productId: tierId,
          productName: tierData.name,
          amount,
          currency,
          billingInterval: interval,
        }
      } else if (selectedMethod === 'paypal_direct' || selectedMethod === 'paypal_card') {
        endpoint = '/api/checkout/paypal'
        body = {
          productType: 'membership',
          productId: tierId,
          productName: tierData.name,
          amount,
          currency,
          billingInterval: interval,
        }
      } else {
        throw new Error('Método de pago no soportado')
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

      if (result.approvalUrl) {
        window.location.href = result.approvalUrl
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl)
      } else {
        throw new Error('Respuesta inesperada del servidor')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el pago'
      setError(errorMessage)
      setSubmitting(false)
    }
  }

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      </div>
    )
  }

  // Error state
  if (error && !tierData) {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32 px-4">
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
      </div>
    )
  }

  // Missing params
  if (!tierId || !interval) {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32 px-4">
          <div className="max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="font-gazeta text-2xl text-[#654177] mb-4">Parámetros inválidos</h1>
            <button
              onClick={() => router.push('/membresia')}
              className="bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Volver a Membresías
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si el usuario ya tiene este mismo plan
  if (planChangeType === 'same') {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32 px-4">
          <div className="max-w-md w-full text-center">
            <RefreshCw className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h1 className="font-gazeta text-2xl text-[#654177] mb-4">Ya tienes este plan</h1>
            <p className="font-dm-sans text-gray-600 mb-6">
              Ya estás suscrito al plan <strong>{currentSubscription?.tierName}</strong>.
              Si deseas cambiar de plan, selecciona uno diferente.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/membresia/publicaciones')}
                className="bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Ir a mi Membresía
              </button>
              <button
                onClick={() => router.push('/membresia')}
                className="bg-white border border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Ver otros planes
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Precios según intervalo
  const priceCOP =
    interval === 'monthly' ? tierData?.pricing?.monthlyPrice : tierData?.pricing?.yearlyPrice
  const priceUSD =
    interval === 'monthly' ? tierData?.pricing?.monthlyPriceUSD : tierData?.pricing?.yearlyPriceUSD

  const displayPrice = selectedRegion === 'international' ? priceUSD : priceCOP
  const displayCurrency = selectedRegion === 'international' ? 'USD' : 'COP'

  // Benefits list from tier data
  const benefits = tierData?.benefits || []

  return (
    <div className="min-h-screen bg-[#f8f0f5]">
      <CheckoutHeader />

      <main className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.push('/membresia')}
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] font-dm-sans text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a membresías
          </button>

          {/* Banner de cambio de plan */}
          {planChangeType && (
            <div
              className={`mb-6 rounded-xl p-4 flex items-center gap-4 ${
                planChangeType === 'upgrade'
                  ? 'bg-green-50 border border-green-200'
                  : planChangeType === 'downgrade'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {planChangeType === 'upgrade' ? (
                <ArrowUp className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : planChangeType === 'downgrade' ? (
                <ArrowDown className="w-8 h-8 text-amber-600 flex-shrink-0" />
              ) : (
                <RefreshCw className="w-8 h-8 text-blue-600 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`font-dm-sans font-semibold ${
                    planChangeType === 'upgrade'
                      ? 'text-green-700'
                      : planChangeType === 'downgrade'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}
                >
                  {planChangeType === 'upgrade'
                    ? 'Upgrade de Membresía'
                    : planChangeType === 'downgrade'
                    ? 'Downgrade de Membresía'
                    : 'Cambio de Plan'}
                </p>
                <p className="font-dm-sans text-sm text-gray-600">
                  Pasarás de <strong>{currentSubscription?.tierName}</strong> a{' '}
                  <strong>{tierData?.name}</strong>
                  {planChangeType === 'upgrade' &&
                    '. El cambio se aplicará inmediatamente.'}
                  {planChangeType === 'downgrade' &&
                    '. El cambio se aplicará al final de tu período actual.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Plan Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:sticky lg:top-8">
                <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6">
                  Resumen de tu suscripción
                </h2>

                <div className="space-y-4">
                  {/* Plan Name */}
                  <div className="pb-4 border-b border-gray-100">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-dm-sans font-medium mb-2"
                      style={{
                        backgroundColor: tierData?.color ? `${tierData.color}20` : '#8A4BAF20',
                        color: tierData?.color || '#8A4BAF',
                      }}
                    >
                      Plan {tierData?.name}
                    </span>
                    <h3 className="font-gazeta text-xl text-[#654177]">
                      Membresía {tierData?.name}
                    </h3>
                    <p className="font-dm-sans text-sm text-gray-600 mt-1">
                      Facturación {interval === 'monthly' ? 'mensual' : 'anual'}
                    </p>
                  </div>

                  {/* Benefits */}
                  {benefits.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-dm-sans text-sm text-gray-600">Incluye:</p>
                      {benefits.slice(0, 5).map((benefit: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="font-dm-sans text-sm text-gray-700">{benefit}</span>
                        </div>
                      ))}
                      {benefits.length > 5 && (
                        <p className="font-dm-sans text-xs text-gray-500">
                          + {benefits.length - 5} beneficios más
                        </p>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-baseline justify-between">
                      <span className="font-dm-sans text-gray-600">Total a pagar:</span>
                      <span className="font-gazeta text-2xl text-[#8A4BAF]">
                        {formatPrice(displayPrice || 0, displayCurrency)}
                      </span>
                    </div>
                    <p className="font-dm-sans text-xs text-gray-500 text-right mt-1">
                      /{interval === 'monthly' ? 'mes' : 'año'}
                    </p>
                    {interval === 'yearly' && (
                      <p className="font-dm-sans text-sm text-green-600 mt-2">
                        Ahorra pagando anualmente
                      </p>
                    )}
                  </div>

                  {/* Next billing */}
                  <div className="pt-4 border-t border-gray-100">
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

                  {/* Security Badge */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span className="font-dm-sans text-xs">
                        Pago 100% seguro. Cancela cuando quieras.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6">
                  Información de pago
                </h2>

                {/* Region Selection */}
                <div className="mb-6">
                  <p className="font-dm-sans text-sm text-gray-600 mb-3">
                    ¿Desde dónde realizas el pago?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleRegionSelect('colombia')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRegion === 'colombia'
                          ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                          : 'border-gray-200 hover:border-[#8A4BAF]/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">🇨🇴</span>
                        <span className="font-dm-sans font-medium text-gray-900">Colombia</span>
                        <span className="font-dm-sans text-sm text-gray-500">
                          {formatPrice(priceCOP || 0, 'COP')}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRegionSelect('international')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRegion === 'international'
                          ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                          : 'border-gray-200 hover:border-[#8A4BAF]/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Globe className="w-6 h-6 text-gray-600" />
                        <span className="font-dm-sans font-medium text-gray-900">Internacional</span>
                        <span className="font-dm-sans text-sm text-gray-500">
                          {formatPrice(priceUSD || 0, 'USD')}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Payment Method Selection */}
                {selectedRegion && (
                  <div className="mb-6">
                    <p className="font-dm-sans text-sm text-gray-600 mb-3">
                      Selecciona tu método de pago
                    </p>
                    <div className="space-y-3">
                      {currentOptions.map((option) => (
                        <button
                          key={option.method}
                          type="button"
                          onClick={() => setSelectedMethod(option.method)}
                          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                            selectedMethod === option.method
                              ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                              : 'border-gray-200 hover:border-[#8A4BAF]/50'
                          }`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              selectedMethod === option.method
                                ? 'bg-[#8A4BAF] text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {option.icon}
                          </div>
                          <div className="text-left">
                            <p className="font-dm-sans font-semibold text-gray-900">
                              {option.label}
                            </p>
                            <p className="font-dm-sans text-sm text-gray-500">
                              {option.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="font-dm-sans text-xs text-gray-500 mt-3">
                      Los cobros son recurrentes cada {interval === 'monthly' ? 'mes' : 'año'}.
                    </p>
                  </div>
                )}

                {/* Terms and Conditions */}
                {selectedMethod && (
                  <div className="mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#8A4BAF] border-gray-300 rounded focus:ring-[#8A4BAF]"
                      />
                      <span className="font-dm-sans text-sm text-gray-700">
                        Acepto que se realicen cobros automáticos recurrentes y he leído los{' '}
                        <a
                          href="/terminos"
                          target="_blank"
                          className="text-[#8A4BAF] hover:underline"
                        >
                          términos y condiciones
                        </a>
                      </span>
                    </label>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="font-dm-sans text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedMethod || !acceptedTerms || submitting}
                  className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
                    selectedMethod && acceptedTerms && !submitting
                      ? 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    `Suscribirme por ${formatPrice(displayPrice || 0, displayCurrency)}/${interval === 'monthly' ? 'mes' : 'año'}`
                  )}
                </button>

                {/* Gateway Info */}
                <p className="mt-4 font-dm-sans text-xs text-center text-gray-400">
                  {selectedMethod === 'wompi_card'
                    ? 'Pago recurrente procesado de forma segura por Wompi'
                    : selectedMethod?.startsWith('paypal')
                      ? 'Pago recurrente procesado de forma segura por PayPal'
                      : 'Selecciona una región y método de pago'}
                </p>
              </div>

              {/* Help Section */}
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
        </div>
      </main>
    </div>
  )
}

function PayPalIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
    </svg>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f0f5]">
          <CheckoutHeader />
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
