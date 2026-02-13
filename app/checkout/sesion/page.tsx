'use client'

import { Clock, Video, Calendar, CreditCard, Globe, Loader2, Key, ArrowLeft, Shield } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
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

function SessionCheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get booking data from URL params
  const type = searchParams?.get('type') as 'single' | 'pack' || 'single'
  const dateParam = searchParams?.get('date') || ''
  const time = searchParams?.get('time') || ''
  const timezone = searchParams?.get('timezone') || 'America/Bogota'

  // Parse date
  const selectedDate = dateParam ? new Date(dateParam) : null

  // State
  const [selectedRegion, setSelectedRegion] = useState<PaymentRegion | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prices
  const PRICES = {
    single: { COP: 270000, USD: 70, EUR: 65 },
    pack: { COP: 1850000, USD: 450, EUR: 420 },
  }

  // Auto-detect region based on timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz.includes('Bogota') || tz.includes('Colombia')) {
        setSelectedRegion('colombia')
        setSelectedMethod('wompi_manual')
      }
    } catch {
      // Fallback: don't auto-select
    }
  }, [])

  // Validate that we have required data for single session
  useEffect(() => {
    if (type === 'single' && (!dateParam || !time)) {
      router.push('/sesiones')
    }
  }, [type, dateParam, time, router])

  // Payment method options
  const colombiaOptions: PaymentOption[] = [
    {
      method: 'wompi_manual',
      label: 'Wompi (Tarjeta, PSE, Nequi, etc.)',
      description: 'Todos los métodos de pago colombianos',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      method: 'breb_manual',
      label: 'Bre-B (Llave Bancolombia)',
      description: 'Transferencia instantánea sin comisión',
      icon: <Key className="w-5 h-5" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: `Paga con tu cuenta PayPal ($${PRICES[type].USD} USD)`,
      icon: <PayPalIcon />,
    },
  ]

  const internationalOptions: PaymentOption[] = [
    {
      method: 'wompi_manual',
      label: 'Wompi (Tarjeta, PSE, Nequi, etc.)',
      description: 'Pagos con tarjeta o desde Colombia',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: <PayPalIcon />,
    },
  ]

  const currentOptions = selectedRegion === 'colombia' ? colombiaOptions : internationalOptions

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Ingresa un email válido')
      return false
    }
    setEmailError('')
    return true
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

  const handleRegionSelect = (region: PaymentRegion) => {
    setSelectedRegion(region)
    // Wompi manual como método por defecto para ambas regiones
    setSelectedMethod('wompi_manual')
  }

  const handleSubmit = async () => {
    if (!selectedMethod || !selectedRegion) {return}

    // Validate email
    if (!guestEmail.trim()) {
      setEmailError('El email es requerido')
      return
    }
    if (!validateEmail(guestEmail)) {return}

    setIsProcessing(true)
    setError(null)

    try {
      // Build scheduled date/time
      let scheduledAt: string | undefined
      if (type === 'single' && selectedDate && time) {
        const [hours, minutes] = time.split(':').map(Number)
        const scheduledDateTime = new Date(selectedDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)
        scheduledAt = scheduledDateTime.toISOString()
      }

      // Determine endpoint and body
      let endpoint: string
      let body: Record<string, unknown>

      if (selectedMethod === 'wompi_manual') {
        // Pago manual via Wompi - Link de pago genérico
        endpoint = '/api/checkout/wompi-manual'
        body = {
          productType: type === 'pack' ? 'pack' : 'session',
          productId: 'session-canalizacion',
          productName: type === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión de Canalización',
          amount: PRICES[type].COP,
          currency: 'COP',
          guestEmail,
          guestName: guestName || undefined,
          sessionSlug: type === 'single' ? 'sesion-canalizacion' : undefined,
          scheduledAt,
        }
      } else if (selectedMethod === 'breb_manual') {
        endpoint = '/api/checkout/breb'
        body = {
          productType: type === 'pack' ? 'pack' : 'session',
          productId: 'session-canalizacion',
          productName: type === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión de Canalización',
          amount: PRICES[type].COP,
          guestEmail,
          guestName: guestName || undefined,
          scheduledAt,
        }
      } else {
        // PayPal - IMPORTANT: PayPal does NOT support COP, so we always use USD
        endpoint = '/api/checkout/paypal'
        body = {
          productType: type === 'pack' ? 'pack' : 'session',
          productId: 'session-canalizacion',
          productName: type === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión de Canalización',
          amount: PRICES[type].USD, // Always USD - PayPal doesn't support COP
          currency: 'USD',
          guestEmail,
          guestName: guestName || undefined,
          sessionSlug: type === 'single' ? 'sesion-canalizacion' : undefined,
          scheduledAt,
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pago')
      }

      // Redirect based on response
      if (data.approvalUrl) {
        // PayPal approval URL
        window.location.href = data.approvalUrl
      } else if (data.checkoutUrl) {
        // Wompi checkout URL
        window.location.href = data.checkoutUrl
      } else if (data.redirectUrl) {
        // Internal redirect (e.g., Bre-B pending page)
        router.push(data.redirectUrl)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el pago'
      setError(errorMessage)
      setIsProcessing(false)
    }
  }

  const currentPrice = PRICES[type]
  // Wompi manual procesa COP, PayPal procesa USD
  // Si es Wompi manual o Bre-B → COP, si es PayPal → USD
  const isPayPalSelected = selectedMethod === 'paypal_direct'
  const useUSD = isPayPalSelected
  const displayPrice = useUSD ? currentPrice.USD : currentPrice.COP
  const displayCurrency: 'COP' | 'USD' = useUSD ? 'USD' : 'COP'

  return (
    <div className="min-h-screen bg-[#f8f0f5]">
      <CheckoutHeader />

      <main className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.push('/sesiones')}
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] font-dm-sans text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a sesiones
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Session Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:sticky lg:top-8">
                <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6">
                  Resumen de tu compra
                </h2>

                <div className="space-y-4">
                  {/* Product Name */}
                  <div className="pb-4 border-b border-gray-100">
                    <h3 className="font-gazeta text-xl text-[#654177]">
                      {type === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión Individual'}
                    </h3>
                    <p className="font-dm-sans text-sm text-gray-600 mt-1">
                      {type === 'pack'
                        ? 'Proceso de acompañamiento profundo (7+1 gratis)'
                        : 'Sesión de Canalización y Sanación'}
                    </p>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#8A4BAF]" />
                      <span className="font-dm-sans text-gray-700">
                        Duración: 90 minutos
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-[#8A4BAF]" />
                      <span className="font-dm-sans text-gray-700">
                        Modalidad: Videollamada
                      </span>
                    </div>

                    {type === 'single' && selectedDate && time && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#8A4BAF]" />
                        <span className="font-dm-sans text-gray-700">
                          {selectedDate.toLocaleDateString('es-CO', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })} a las {time}
                        </span>
                      </div>
                    )}

                    {type === 'pack' && (
                      <div className="bg-[#8A4BAF]/5 rounded-lg p-3 mt-2">
                        <p className="font-dm-sans text-sm text-[#654177]">
                          Recibirás un código único para reservar tus 8 sesiones cuando quieras.
                          Validez: 1 año.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-baseline justify-between">
                      <span className="font-dm-sans text-gray-600">Total a pagar:</span>
                      <span className="font-gazeta text-2xl text-[#8A4BAF]">
                        {formatPrice(displayPrice, displayCurrency)}
                      </span>
                    </div>
                    {!isPayPalSelected && (
                      <p className="font-dm-sans text-xs text-gray-500 text-right mt-1">
                        ~${currentPrice.USD} USD
                      </p>
                    )}
                    {selectedRegion === 'international' && selectedMethod === 'wompi_manual' && (
                      <p className="font-dm-sans text-xs text-[#8A4BAF] text-right mt-1">
                        Tu banco convertirá de COP a tu moneda local
                      </p>
                    )}
                    {selectedMethod === 'wompi_manual' && (
                      <p className="font-dm-sans text-xs text-green-600 text-right mt-1">
                        Podrás elegir: Tarjeta, PSE, Nequi, Daviplata...
                      </p>
                    )}
                  </div>
                </div>

                {/* Security Badge */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span className="font-dm-sans text-xs">
                      Pago 100% seguro y protegido
                    </span>
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
                          {formatPrice(currentPrice.COP, 'COP')}
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
                          {formatPrice(currentPrice.USD, 'USD')}
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
                  </div>
                )}

                {/* Contact Info */}
                {selectedMethod && (
                  <div className="mb-6">
                    <p className="font-dm-sans text-sm text-gray-600 mb-3">
                      Datos para la confirmación
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-dm-sans text-sm text-gray-600 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => {
                            setGuestEmail(e.target.value)
                            setEmailError('')
                          }}
                          placeholder="tu@email.com"
                          className={`w-full p-4 rounded-xl border-2 font-dm-sans transition-colors ${
                            emailError
                              ? 'border-red-400 focus:border-red-500'
                              : 'border-gray-200 focus:border-[#8A4BAF]'
                          } focus:outline-none`}
                        />
                        {emailError && (
                          <p className="mt-2 font-dm-sans text-sm text-red-500">{emailError}</p>
                        )}
                      </div>
                      <div>
                        <label className="block font-dm-sans text-sm text-gray-600 mb-2">
                          Nombre (opcional)
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full p-4 rounded-xl border-2 border-gray-200 font-dm-sans transition-colors focus:border-[#8A4BAF] focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="mt-3 font-dm-sans text-xs text-gray-500">
                      Recibirás la confirmación y el enlace de Zoom en este email.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-dm-sans text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedMethod || isProcessing}
                  className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
                    selectedMethod && !isProcessing
                      ? 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    `Pagar ${formatPrice(displayPrice, displayCurrency)}`
                  )}
                </button>

                {/* Gateway Info */}
                <p className="mt-4 font-dm-sans text-xs text-center text-gray-400">
                  {selectedMethod === 'wompi_manual'
                    ? 'Link de pago seguro de Wompi - Tarjeta, PSE, Nequi, Daviplata y más'
                    : selectedMethod?.startsWith('paypal')
                      ? 'Pago procesado de forma segura por PayPal'
                      : selectedMethod === 'breb_manual'
                        ? 'Transferencia directa con Bre-B - Sin comisiones'
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

export default function SessionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      }
    >
      <SessionCheckoutContent />
    </Suspense>
  )
}
