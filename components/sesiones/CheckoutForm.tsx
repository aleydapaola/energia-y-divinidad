"use client"

import { Mail, Phone, User, MapPin, CreditCard, AlertCircle, Loader2, Coins, CheckCircle, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { Session } from '@/lib/sanity/queries/sessions'


import type { PaymentMethodType } from '@/lib/membership-access'

interface CheckoutFormProps {
  session: Session
  scheduledDateTime: Date
  formattedDate: string
  formattedTime: string
}

type Country = 'colombia' | 'internacional' | ''

export function CheckoutForm({
  session,
  scheduledDateTime,
  formattedDate,
  formattedTime,
}: CheckoutFormProps) {
  const router = useRouter()
  const [country, setCountry] = useState<Country>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | ''>('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Credit payment state
  const [payWithCredit, setPayWithCredit] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [loadingCredits, setLoadingCredits] = useState(true)

  // Fetch credit balance on mount
  useEffect(() => {
    async function fetchCredits() {
      try {
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          setCreditBalance(data.balance.available || 0)
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
      } finally {
        setLoadingCredits(false)
      }
    }

    fetchCredits()
  }, [])

  // Auto-select recommended method when country is selected
  const handleCountryChange = (selectedCountry: Country) => {
    setCountry(selectedCountry)
    if (selectedCountry === 'colombia') {
      setPaymentMethod('wompi_manual')
    } else {
      setPaymentMethod('wompi_manual')
    }
    // Clear country error when selected
    if (errors.country) {
      setErrors(prev => ({ ...prev, country: '' }))
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Skip country/payment validation when using credits
    if (!payWithCredit) {
      if (!country) {
        newErrors.country = 'Debes seleccionar tu país'
      }

      if (!paymentMethod) {
        newErrors.paymentMethod = 'Debes seleccionar un método de pago'
      }

      if (!formData.name.trim()) {
        newErrors.name = 'El nombre es obligatorio'
      }

      if (!formData.email.trim()) {
        newErrors.email = 'El email es obligatorio'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido'
      }

      if (!formData.phone.trim()) {
        newErrors.phone = 'El teléfono es obligatorio'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Handle credit payment
      if (payWithCredit) {
        const response = await fetch('/api/sessions/book-with-credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionSlug: session.slug.current,
            scheduledAt: scheduledDateTime.toISOString(),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al reservar con crédito')
        }

        // Redirect to confirmation page
        router.push(`/pago/confirmacion?bookingId=${data.booking.id}&credit=true`)
        return
      }

      // Regular payment flow
      const currency = country === 'colombia' ? 'COP' : 'USD'
      const amount = country === 'colombia' ? session.price : session.priceUSD

      // Determinar endpoint según método de pago
      let endpoint: string
      let body: any

      if (paymentMethod === 'wompi_manual') {
        // Pago manual via Wompi - Link de pago genérico
        endpoint = '/api/checkout/wompi-manual'
        body = {
          productType: 'session',
          productId: session._id,
          productName: session.title,
          amount,
          currency,
          guestEmail: formData.email,
          guestName: formData.name,
          guestPhone: formData.phone,
          sessionSlug: session.slug.current,
          scheduledAt: scheduledDateTime.toISOString(),
        }
      } else if (paymentMethod === 'breb_manual') {
        // Pago manual via Bre-B (Colombia) - Transferencia con llave
        endpoint = '/api/checkout/breb'
        body = {
          productType: 'session',
          productId: session._id,
          productName: session.title,
          amount,
          guestEmail: formData.email,
          guestName: formData.name,
          scheduledAt: scheduledDateTime.toISOString(),
        }
      } else {
        // Pago via PayPal (Internacional)
        endpoint = '/api/checkout/paypal'
        body = {
          productType: 'session',
          productId: session._id,
          productName: session.title,
          amount,
          currency,
          guestEmail: formData.email,
          guestName: formData.name,
          sessionSlug: session.slug.current,
          scheduledAt: scheduledDateTime.toISOString(),
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

      // Redirect según respuesta
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.redirectUrl) {
        router.push(data.redirectUrl)
      }
    } catch (error) {
      console.error('Error submitting booking:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Opciones de pago según país
  const paymentOptions = country === 'colombia'
    ? [
        { value: 'wompi_manual' as PaymentMethodType, label: 'Wompi (Tarjeta, PSE, Nequi, etc.)', description: 'Todos los métodos de pago colombianos', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'breb_manual' as PaymentMethodType, label: 'Bre-B (Llave Bancolombia)', description: 'Transferencia instantánea sin comisión', icon: <Key className="w-5 h-5" /> },
        { value: 'paypal_direct' as PaymentMethodType, label: 'PayPal', description: 'Paga con tu cuenta PayPal', icon: <PayPalIcon /> },
      ]
    : [
        { value: 'wompi_manual' as PaymentMethodType, label: 'Wompi (Tarjeta, PSE, Nequi, etc.)', description: 'Pagos con tarjeta o desde Colombia', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'paypal_card' as PaymentMethodType, label: 'Credit/Debit Card', description: 'Visa, Mastercard, American Express', icon: <CreditCard className="w-5 h-5" /> },
        { value: 'paypal_direct' as PaymentMethodType, label: 'PayPal', description: 'Pay with your PayPal account', icon: <PayPalIcon /> },
      ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Credit Payment Option - Only show if user has credits */}
        {!loadingCredits && creditBalance > 0 && (
          <div
            className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
              payWithCredit
                ? 'bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 border-[#8A4BAF]'
                : 'bg-gray-50 border-gray-200 hover:border-[#8A4BAF]/30'
            }`}
            onClick={() => setPayWithCredit(!payWithCredit)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    payWithCredit ? 'bg-[#8A4BAF] text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-gray-900">
                    Usar crédito de membresía
                  </p>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    Tienes {creditBalance} {creditBalance === 1 ? 'crédito disponible' : 'créditos disponibles'}
                  </p>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  payWithCredit
                    ? 'bg-[#8A4BAF] border-[#8A4BAF]'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {payWithCredit && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
            </div>
            {payWithCredit && (
              <div className="mt-3 pt-3 border-t border-[#8A4BAF]/20">
                <p className="text-sm text-[#654177] font-dm-sans">
                  Tu reserva se confirmará inmediatamente sin necesidad de pago adicional.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Country Selection - Only show if not paying with credit */}
        {!payWithCredit && (
        <div>
          <label className="block text-sm font-medium text-[#654177] mb-3">
            País <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleCountryChange('colombia')}
              className={`p-4 rounded-lg border-2 transition-all ${
                country === 'colombia'
                  ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                  : 'border-gray-200 hover:border-[#8A4BAF]/30'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">🇨🇴</span>
                <span className="font-dm-sans font-medium text-gray-900">Colombia</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCountryChange('internacional')}
              className={`p-4 rounded-lg border-2 transition-all ${
                country === 'internacional'
                  ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                  : 'border-gray-200 hover:border-[#8A4BAF]/30'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <MapPin className="w-6 h-6 text-gray-600" />
                <span className="font-dm-sans font-medium text-gray-900">Internacional</span>
              </div>
            </button>
          </div>
          {errors.country && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.country}
            </p>
          )}
        </div>
        )}

        {/* Payment Method Selection */}
        {!payWithCredit && country && (
          <div className="bg-[#eef1fa] rounded-lg p-4">
            <label className="block text-sm font-medium text-[#654177] mb-3">
              Método de Pago <span className="text-red-500">*</span>
            </label>

            <div className="space-y-3">
              {paymentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentMethod(option.value)}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    paymentMethod === option.value
                      ? 'border-[#8A4BAF] bg-white'
                      : 'border-gray-200 hover:border-[#8A4BAF]/30 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    paymentMethod === option.value ? 'bg-[#8A4BAF] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-dm-sans font-medium text-gray-900">{option.label}</p>
                    <p className="font-dm-sans text-sm text-gray-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {errors.paymentMethod && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.paymentMethod}
              </p>
            )}

            {/* Info de pasarela */}
            <p className="mt-3 text-xs text-gray-500 text-center">
              {paymentMethod === 'wompi_manual'
                ? 'Link de pago seguro de Wompi - Tarjeta, PSE, Nequi, Daviplata y más'
                : paymentMethod === 'breb_manual'
                  ? 'Transferencia directa con Bre-B - Sin comisiones'
                  : 'Pago procesado de forma segura por PayPal'}
            </p>
          </div>
        )}

        {/* Contact Information - Only show if not paying with credit */}
        {!payWithCredit && (
        <div className="space-y-4">
          <h3 className="font-gazeta text-lg text-[#8A4BAF]">
            Información de Contacto
          </h3>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#654177] mb-2">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] transition-colors ${
                  errors.name ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="Tu nombre completo"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#654177] mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] transition-colors ${
                  errors.email ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="tu@email.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#654177] mb-2">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] transition-colors ${
                  errors.phone ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="+57 300 123 4567"
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Incluye código de país (ej: +57 para Colombia)
            </p>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[#654177] mb-2">
              Notas Adicionales <span className="text-gray-400">(Opcional)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] transition-colors resize-none"
              placeholder="¿Hay algo que debamos saber antes de la sesión?"
            />
          </div>
        </div>
        )}

        {/* Summary */}
        <div className="bg-[#f8f0f5] rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-dm-sans text-gray-600">Sesión:</span>
            <span className="font-dm-sans font-medium text-gray-900">{session.title}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-dm-sans text-gray-600">Fecha:</span>
            <span className="font-dm-sans font-medium text-gray-900">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-dm-sans text-gray-600">Hora:</span>
            <span className="font-dm-sans font-medium text-gray-900">{formattedTime}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
            <span className="font-dm-sans text-gray-600">Total a pagar:</span>
            {payWithCredit ? (
              <div className="text-right">
                <span className="font-dm-sans font-bold text-[#8A4BAF] text-lg">
                  1 crédito
                </span>
                <p className="text-xs text-gray-500 line-through">
                  ${session.price.toLocaleString('es-CO')} COP
                </p>
              </div>
            ) : (
            <span className="font-dm-sans font-bold text-[#8A4BAF] text-lg">
              {country === 'colombia'
                ? `$${session.price.toLocaleString('es-CO')} COP`
                : `$${session.priceUSD || session.price} USD`
              }
            </span>
            )}
          </div>
        </div>

        {/* Error message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="font-dm-sans text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || (!payWithCredit && (!country || !paymentMethod))}
          className={`w-full py-4 rounded-lg font-dm-sans text-lg font-semibold transition-all ${
            isSubmitting || (!payWithCredit && (!country || !paymentMethod))
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-[#4944a4] text-white hover:bg-[#3d3a8a] shadow-md hover:shadow-lg'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando...
            </span>
          ) : payWithCredit ? (
            'Reservar con Crédito'
          ) : (
            'Continuar al Pago'
          )}
        </button>

        <p className="text-xs text-center text-gray-500 font-dm-sans">
          Al continuar, aceptas nuestros términos y condiciones de servicio
        </p>
      </form>
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
