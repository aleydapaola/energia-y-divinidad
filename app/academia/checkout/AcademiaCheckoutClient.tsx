'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Trash2, ArrowLeft, Loader2, Lock, Gift } from 'lucide-react'
import { useCartStore, useCartSummary, formatPrice } from '@/lib/stores/cart-store'
import { DiscountCodeInput } from '@/components/cart'
import { PaymentMethodSelector, type PaymentRegion } from '@/components/pago/PaymentMethodSelector'
import type { PaymentMethodType } from '@/lib/membership-access'
import { urlFor } from '@/sanity/lib/image'

export function AcademiaCheckoutClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const { subtotal, discountAmount, total, discount, currency, isEmpty, isFree } =
    useCartSummary()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if cart is empty
  useEffect(() => {
    if (mounted && isEmpty) {
      router.push('/academia')
    }
  }, [mounted, isEmpty, router])

  const handleCheckout = async () => {
    // Check auth
    if (!session?.user?.id) {
      // Store current path and redirect to sign in
      signIn(undefined, { callbackUrl: '/academia/checkout' })
      return
    }

    // If free, process directly
    if (isFree) {
      await processFreeOrder()
      return
    }

    // Show payment modal
    setShowPaymentModal(true)
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

      // Clear cart and redirect
      clearCart()
      router.push(data.redirectUrl || '/academia/mis-cursos')
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pedido')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentMethodSelect = async (
    method: PaymentMethodType,
    region: PaymentRegion,
    phoneNumber?: string
  ) => {
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
            price: region === 'colombia' ? item.price : item.priceUSD,
          })),
          currency: region === 'colombia' ? 'COP' : 'USD',
          paymentMethod: method,
          discountCode: discount?.code,
          phoneNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago')
      }

      // Handle different checkout flows
      if (data.freeOrder) {
        clearCart()
        router.push(data.redirectUrl || '/academia/mis-cursos')
      } else if (data.checkoutUrl) {
        // Redirect to payment gateway
        window.location.href = data.checkoutUrl
      } else if (data.nequiPending) {
        // For Nequi, redirect to pending page
        router.push(`/pago/nequi-pending?ref=${data.orderNumber}`)
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago')
      setShowPaymentModal(false)
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading / Hydration
  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f0f5] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4944a4]" />
      </div>
    )
  }

  // Empty cart (while redirecting)
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#f8f0f5] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4944a4]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f0f5]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/academia"
            className="flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Volver a Academia</span>
          </Link>

          <h1 className="font-gazeta text-xl text-[#654177]">Checkout</h1>

          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="font-gazeta text-xl text-[#654177] mb-6 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Tu Carrito ({items.length})
                </h2>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4">
                      {/* Image */}
                      <div className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {item.coverImage ? (
                          <Image
                            src={urlFor(item.coverImage).width(192).height(128).url()}
                            alt={item.title}
                            width={96}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingCart className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-dm-sans font-medium text-gray-900 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-[#4944a4] font-dm-sans font-semibold mt-1">
                          {formatPrice(
                            currency === 'COP' ? item.price : item.priceUSD,
                            currency
                          )}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Code */}
              <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                <h3 className="font-dm-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#8A4BAF]" />
                  Código de Descuento
                </h3>
                <DiscountCodeInput />
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="font-gazeta text-xl text-[#654177] mb-6">
                  Resumen
                </h2>

                <div className="space-y-3 font-dm-sans">
                  {/* Subtotal */}
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>

                  {/* Discount */}
                  {discount && discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({discount.code})</span>
                      <span>-{formatPrice(discountAmount, currency)}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <hr className="my-4 border-gray-200" />

                  {/* Total */}
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-[#4944a4]">
                      {isFree ? 'Gratis' : formatPrice(total, currency)}
                    </span>
                  </div>
                </div>

                {/* Auth warning */}
                {!session && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-dm-sans flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Deberás iniciar sesión para completar la compra
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 font-dm-sans">{error}</p>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full mt-6 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : isFree ? (
                    'Obtener Gratis'
                  ) : (
                    'Continuar al Pago'
                  )}
                </button>

                {/* Security note */}
                <p className="mt-4 text-xs text-gray-400 font-dm-sans text-center flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Pago seguro con encriptación SSL
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <PaymentMethodSelector
          onMethodSelect={handlePaymentMethodSelect}
          onCancel={() => setShowPaymentModal(false)}
          isLoading={isProcessing}
          pricesCOP={subtotal - discountAmount}
          pricesUSD={
            items.reduce((sum, item) => sum + (item.priceUSD || 0), 0) -
            (discount?.discountType === 'percentage'
              ? (items.reduce((sum, item) => sum + (item.priceUSD || 0), 0) *
                  discount.discountValue) /
                100
              : discountAmount)
          }
          productName={`${items.length} ${items.length === 1 ? 'curso' : 'cursos'}`}
        />
      )}
    </div>
  )
}
