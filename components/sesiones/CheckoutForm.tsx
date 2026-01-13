"use client"

import { useState } from 'react'
import { Session } from '@/lib/sanity/queries/sessions'
import { Mail, Phone, User, MapPin, CreditCard, AlertCircle } from 'lucide-react'

interface CheckoutFormProps {
  session: Session
  scheduledDateTime: Date
  formattedDate: string
  formattedTime: string
}

type Country = 'colombia' | 'internacional' | ''
type PaymentMethod = 'nequi' | 'stripe' | 'paypal' | ''

export function CheckoutForm({
  session,
  scheduledDateTime,
  formattedDate,
  formattedTime,
}: CheckoutFormProps) {
  const [country, setCountry] = useState<Country>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-select Nequi when Colombia is selected
  const handleCountryChange = (selectedCountry: Country) => {
    setCountry(selectedCountry)
    if (selectedCountry === 'colombia') {
      setPaymentMethod('nequi')
    } else {
      setPaymentMethod('')
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

    if (!country) {
      newErrors.country = 'Debes seleccionar tu país'
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

    if (country === 'internacional' && !paymentMethod) {
      newErrors.paymentMethod = 'Debes seleccionar un método de pago'
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
      // Create booking via API
      const bookingData = {
        sessionId: session._id,
        sessionSlug: session.slug.current,
        scheduledDateTime: scheduledDateTime.toISOString(),
        country,
        paymentMethod,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        notes: formData.notes,
        price: session.price,
        priceUSD: session.priceUSD,
        currency: country === 'colombia' ? 'COP' : 'USD',
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la reserva')
      }

      // Redirect based on payment method
      if (paymentMethod === 'nequi') {
        // Redirect to Nequi payment instructions page
        window.location.href = `/pago/nequi/${data.orderId}?orderNumber=${data.orderNumber}`
      } else if (paymentMethod === 'stripe') {
        // Redirect to Stripe checkout page
        window.location.href = `/pago/stripe/${data.orderId}?orderNumber=${data.orderNumber}`
      } else if (paymentMethod === 'paypal') {
        // Redirect to PayPal checkout page
        window.location.href = `/pago/paypal/${data.orderId}?orderNumber=${data.orderNumber}`
      }
    } catch (error) {
      console.error('Error submitting booking:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Hubo un error al procesar tu reserva: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Country Selection - MANDATORY */}
        <div>
          <label className="block text-sm font-medium text-primary mb-3">
            País <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleCountryChange('colombia')}
              className={`p-4 rounded-lg border-2 transition-all ${
                country === 'colombia'
                  ? 'border-brand bg-brand/5'
                  : 'border-gray-200 hover:border-brand/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand" />
                <span className="font-medium text-primary">Colombia</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCountryChange('internacional')}
              className={`p-4 rounded-lg border-2 transition-all ${
                country === 'internacional'
                  ? 'border-brand bg-brand/5'
                  : 'border-gray-200 hover:border-brand/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand" />
                <span className="font-medium text-primary">Internacional</span>
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

        {/* Payment Method Selection - Only show if country is selected */}
        {country && (
          <div className="bg-brand/5 rounded-lg p-4">
            <label className="block text-sm font-medium text-primary mb-3">
              Método de Pago {country === 'internacional' && <span className="text-red-500">*</span>}
            </label>

            {country === 'colombia' ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-brand">
                <CreditCard className="w-5 h-5 text-brand" />
                <div>
                  <p className="font-medium text-primary">Nequi</p>
                  <p className="text-sm text-primary/60">
                    Pago por transferencia Nequi
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    paymentMethod === 'stripe'
                      ? 'border-brand bg-white'
                      : 'border-gray-200 hover:border-brand/30 bg-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-brand" />
                  <div className="text-left">
                    <p className="font-medium text-primary">Tarjeta de Crédito/Débito</p>
                    <p className="text-sm text-primary/60">
                      Pago seguro con Stripe
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    paymentMethod === 'paypal'
                      ? 'border-brand bg-white'
                      : 'border-gray-200 hover:border-brand/30 bg-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-brand" />
                  <div className="text-left">
                    <p className="font-medium text-primary">PayPal</p>
                    <p className="text-sm text-primary/60">
                      Pago con tu cuenta PayPal
                    </p>
                  </div>
                </button>
              </div>
            )}
            {errors.paymentMethod && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.paymentMethod}
              </p>
            )}
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg text-brand">
            Información de Contacto
          </h3>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/40" />
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
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
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/40" />
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
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
            <label htmlFor="phone" className="block text-sm font-medium text-primary mb-2">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/40" />
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+57 300 123 4567"
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
            <p className="mt-1 text-xs text-primary/60">
              Incluye código de país (ej: +57 para Colombia)
            </p>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-primary mb-2">
              Notas Adicionales <span className="text-primary/60">(Opcional)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
              placeholder="¿Hay algo que debamos saber antes de la sesión?"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-primary/70">Sesión:</span>
            <span className="font-medium text-primary">{session.title}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-primary/70">Fecha:</span>
            <span className="font-medium text-primary">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-primary/70">Hora:</span>
            <span className="font-medium text-primary">{formattedTime}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-primary/10">
            <span className="text-primary/70">Total a pagar:</span>
            <span className="font-bold text-brand text-lg">
              {country === 'colombia'
                ? `$${session.price.toLocaleString('es-CO')} COP`
                : `$${session.priceUSD || session.price} USD`
              }
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !country}
          className={`w-full py-4 rounded-lg text-lg font-medium transition-all ${
            isSubmitting || !country
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-brand text-white hover:bg-brand/90 shadow-md hover:shadow-lg'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </span>
          ) : (
            'Continuar al Pago'
          )}
        </button>

        <p className="text-xs text-center text-primary/60">
          Al continuar, aceptas nuestros términos y condiciones de servicio
        </p>
      </form>
    </div>
  )
}
