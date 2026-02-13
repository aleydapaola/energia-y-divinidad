'use client'

import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Loader2,
  Lock,
  Gift,
  CreditCard,
  Globe,
  Shield,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'

import { DiscountCodeInput } from '@/components/cart'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { useCartStore, useCartSummary, formatPrice } from '@/lib/stores/cart-store'
import { urlFor } from '@/sanity/lib/image'

import type { PaymentMethodType } from '@/lib/membership-access'

type PaymentRegion = 'colombia' | 'international'

interface PaymentOption {
  method: PaymentMethodType
  label: string
  description: string
  icon: React.ReactNode
}

export function AcademiaCheckoutClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const { subtotal, discountAmount, total, discount, currency, isEmpty, isFree } =
    useCartSummary()

  // Payment selection state (inline, no modal)
  const [selectedRegion, setSelectedRegion] = useState<PaymentRegion | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Payment method options
  const colombiaOptions: PaymentOption[] = [
    {
      method: 'wompi_manual',
      label: 'Wompi (Tarjeta, PSE, Nequi, etc.)',
      description: 'Todos los métodos de pago colombianos',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: 'Paga con tu cuenta PayPal',
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
    {
      method: 'paypal_card',
      label: 'Credit/Debit Card',
      description: 'Visa, Mastercard, American Express (via PayPal)',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ]

  const currentOptions = selectedRegion === 'colombia' ? colombiaOptions : internationalOptions

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-detect region based on timezone
  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (timezone.includes('Bogota') || timezone.includes('Colombia')) {
        setSelectedRegion('colombia')
        setSelectedMethod('wompi_manual')
      }
    } catch {
      // Fallback: don't auto-select
    }
  }, [])

  // Redirect if cart is empty
  useEffect(() => {
    if (mounted && isEmpty) {
      router.push('/academia')
    }
  }, [mounted, isEmpty, router])

  const handleRegionSelect = (region: PaymentRegion) => {
    setSelectedRegion(region)
    if (region === 'colombia') {
      setSelectedMethod('wompi_manual')
    } else {
      setSelectedMethod('wompi_manual')
    }
  }

  const handleCheckout = async () => {
    // Check auth
    if (!session?.user?.id) {
      signIn(undefined, { callbackUrl: '/academia/checkout' })
      return
    }

    // If free, process directly
    if (isFree) {
      await processFreeOrder()
      return
    }

    // Validate payment method selected
    if (!selectedMethod || !selectedRegion) {
      setError('Selecciona una región y método de pago')
      return
    }

    await processPayment()
  }

  const processFreeOrder = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            courseId: item.id,
            courseName: item.title,
            price: currency === 'COP' ? item.price : item.priceUSD,
          })),
          currency,
          paymentMethod: 'FREE',
          discountCode: discount?.code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pedido')
      }

      clearCart()
      router.push(data.redirectUrl || '/academia/mis-cursos')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el pedido'
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const processPayment = async () => {
    if (!selectedMethod || !selectedRegion) {return}

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            courseId: item.id,
            courseName: item.title,
            price: selectedRegion === 'colombia' ? item.price : item.priceUSD,
          })),
          currency: selectedRegion === 'colombia' ? 'COP' : 'USD',
          paymentMethod: selectedMethod,
          discountCode: discount?.code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago')
      }

      if (data.freeOrder) {
        clearCart()
        router.push(data.redirectUrl || '/academia/mis-cursos')
      } else if (data.redirectUrl) {
        // Wompi manual or other redirect
        router.push(data.redirectUrl)
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.approvalUrl) {
        // PayPal redirect
        window.location.href = data.approvalUrl
      } else if (data.nequiPending) {
        router.push(`/pago/nequi-pending?ref=${data.orderNumber}`)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el pago'
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate prices for display
  const pricesCOP = subtotal - discountAmount
  const pricesUSD =
    items.reduce((sum, item) => sum + (item.priceUSD || 0), 0) -
    (discount?.discountType === 'percentage'
      ? (items.reduce((sum, item) => sum + (item.priceUSD || 0), 0) * discount.discountValue) / 100
      : discountAmount)

  const displayPrice = selectedRegion === 'international' ? pricesUSD : pricesCOP
  const displayCurrency = selectedRegion === 'international' ? 'USD' : 'COP'

  // Loading / Hydration
  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#4944a4]" />
        </div>
      </div>
    )
  }

  // Empty cart (while redirecting)
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#4944a4]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f0f5]">
      <CheckoutHeader />

      <main className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link
            href="/academia"
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] font-dm-sans text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Academia
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2">
              {/* Cart Items */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="font-gazeta text-xl text-[#654177] mb-6 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Tu Carrito ({items.length})
                </h2>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4">
                      {/* Image */}
                      <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {item.coverImage ? (
                          <Image
                            src={urlFor(item.coverImage).width(160).height(112).url()}
                            alt={item.title}
                            width={80}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingCart className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-dm-sans font-medium text-sm text-gray-900 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-[#4944a4] font-dm-sans font-semibold text-sm mt-1">
                          {formatPrice(
                            selectedRegion === 'international'
                              ? item.priceUSD
                              : item.price,
                            selectedRegion === 'international' ? 'USD' : 'COP'
                          )}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Code */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-dm-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#8A4BAF]" />
                  Código de Descuento
                </h3>
                <DiscountCodeInput />
              </div>

              {/* Summary Card (Mobile) */}
              <div className="lg:hidden bg-white rounded-2xl shadow-lg p-6 mt-6">
                <h2 className="font-gazeta text-xl text-[#654177] mb-4">Resumen</h2>
                <div className="space-y-3 font-dm-sans">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(displayPrice, displayCurrency)}</span>
                  </div>
                  {discount && discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({discount.code})</span>
                      <span>-{formatPrice(discountAmount, displayCurrency)}</span>
                    </div>
                  )}
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-[#4944a4]">
                      {isFree ? 'Gratis' : formatPrice(displayPrice - discountAmount, displayCurrency)}
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

                {/* Auth warning */}
                {!session && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800 font-dm-sans flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Deberás iniciar sesión para completar la compra
                    </p>
                  </div>
                )}

                {/* If free, show simple checkout */}
                {isFree ? (
                  <div className="text-center py-8">
                    <Gift className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="font-gazeta text-xl text-[#654177] mb-2">
                      Tu pedido es gratis
                    </h3>
                    <p className="font-dm-sans text-gray-600 mb-6">
                      El código de descuento cubre el total de tu compra.
                    </p>
                  </div>
                ) : (
                  <>
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
                              {formatPrice(pricesCOP, 'COP')}
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
                              {formatPrice(pricesUSD, 'USD')}
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
                  </>
                )}

                {/* Summary (Desktop) */}
                <div className="hidden lg:block mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="space-y-2 font-dm-sans text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({items.length} {items.length === 1 ? 'curso' : 'cursos'})</span>
                      <span>{formatPrice(displayPrice, displayCurrency)}</span>
                    </div>
                    {discount && discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento ({discount.code})</span>
                        <span>-{formatPrice(discountAmount, displayCurrency)}</span>
                      </div>
                    )}
                    <hr className="border-gray-200" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span className="text-[#4944a4]">
                        {isFree ? 'Gratis' : formatPrice(displayPrice - discountAmount, displayCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-dm-sans text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={(!isFree && !selectedMethod) || isProcessing}
                  className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
                    (isFree || selectedMethod) && !isProcessing
                      ? 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </span>
                  ) : isFree ? (
                    'Obtener Gratis'
                  ) : (
                    `Pagar ${formatPrice(displayPrice - discountAmount, displayCurrency)}`
                  )}
                </button>

                {/* Gateway Info */}
                {!isFree && (
                  <p className="mt-4 font-dm-sans text-xs text-center text-gray-400">
                    {selectedMethod === 'wompi_manual'
                      ? 'Link de pago seguro de Wompi - Tarjeta, PSE, Nequi, Daviplata y más'
                      : selectedMethod?.startsWith('paypal')
                        ? 'Pago procesado de forma segura por PayPal'
                        : 'Selecciona una región y método de pago'}
                  </p>
                )}

                {/* Security Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
                  <Shield className="w-4 h-4" />
                  <span className="font-dm-sans text-xs">Pago 100% seguro y protegido</span>
                </div>
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
