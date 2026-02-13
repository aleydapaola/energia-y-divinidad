'use client'

import { CreditCard, Globe, Loader2, Key } from 'lucide-react'
import { useState, useEffect } from 'react'

import type { PaymentMethodType } from '@/lib/membership-access'

export type PaymentRegion = 'colombia' | 'international'

interface PaymentMethodSelectorProps {
  onMethodSelect: (method: PaymentMethodType, region: PaymentRegion, phoneNumber?: string, guestEmail?: string, guestName?: string) => void
  onCancel?: () => void
  isLoading?: boolean
  pricesCOP: number
  pricesUSD: number
  productName: string
  isAuthenticated?: boolean
  userEmail?: string
}

interface PaymentOption {
  method: PaymentMethodType
  label: string
  description: string
  icon: React.ReactNode
  requiresPhone?: boolean
}

export function PaymentMethodSelector({
  onMethodSelect,
  onCancel,
  isLoading = false,
  pricesCOP,
  pricesUSD,
  productName,
  isAuthenticated = false,
  userEmail,
}: PaymentMethodSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState<PaymentRegion | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Guest checkout fields
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [emailError, setEmailError] = useState('')

  // Auto-detect region based on timezone (Colombia is UTC-5)
  useEffect(() => {
    const detectRegion = () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        // Colombian timezones
        if (timezone.includes('Bogota') || timezone.includes('Colombia')) {
          setSelectedRegion('colombia')
        }
      } catch {
        // Fallback: don't auto-select
      }
    }
    detectRegion()
  }, [])

  // Métodos de pago para Colombia (COP)
  const colombiaOptions: PaymentOption[] = [
    {
      method: 'wompi_manual',
      label: 'Wompi (Tarjeta, PSE, Nequi, etc.)',
      description: 'Múltiples métodos de pago colombianos',
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      method: 'breb_manual',
      label: 'Bre-B (Llave Bancolombia)',
      description: 'Transferencia instantánea sin comisión',
      icon: <Key className="w-6 h-6" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: 'Paga con tu cuenta PayPal',
      icon: <PayPalIcon />,
    },
  ]

  // Métodos de pago internacionales
  const internationalOptions: PaymentOption[] = [
    {
      method: 'wompi_manual',
      label: 'Wompi (Credit/Debit Card)',
      description: 'Pay with Visa, Mastercard, American Express',
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      method: 'paypal_direct',
      label: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: <PayPalIcon />,
    },
  ]

  const currentOptions = selectedRegion === 'colombia' ? colombiaOptions : internationalOptions
  const selectedOption = currentOptions.find((o) => o.method === selectedMethod)

  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s|-/g, '')
    // Colombian phone: 10 digits starting with 3
    if (!/^3\d{9}$/.test(cleanPhone)) {
      setPhoneError('Ingresa un número Nequi válido (10 dígitos)')
      return false
    }
    setPhoneError('')
    return true
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Ingresa un email válido')
      return false
    }
    setEmailError('')
    return true
  }

  // Check if guest email is required (not authenticated and no userEmail)
  const needsGuestEmail = !isAuthenticated && !userEmail

  const handleConfirm = () => {
    if (!selectedMethod || !selectedRegion) {return}

    // Validar email si es guest checkout
    if (needsGuestEmail) {
      if (!guestEmail.trim()) {
        setEmailError('El email es requerido')
        return
      }
      if (!validateEmail(guestEmail)) {return}
    }

    // Validar teléfono si es Nequi
    if (selectedOption?.requiresPhone) {
      if (!validatePhoneNumber(phoneNumber)) {return}
      const cleanPhone = phoneNumber.replace(/\s|-/g, '')
      onMethodSelect(selectedMethod, selectedRegion, cleanPhone, needsGuestEmail ? guestEmail : undefined, needsGuestEmail ? guestName : undefined)
    } else {
      onMethodSelect(selectedMethod, selectedRegion, undefined, needsGuestEmail ? guestEmail : undefined, needsGuestEmail ? guestName : undefined)
    }
  }

  const handleRegionSelect = (region: PaymentRegion) => {
    setSelectedRegion(region)
    // Auto-seleccionar el método recomendado (Wompi manual para ambas regiones)
    setSelectedMethod('wompi_manual')
    setPhoneNumber('')
    setPhoneError('')
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="font-gazeta text-xl sm:text-2xl text-[#8A4BAF]">Método de Pago</h2>
          <p className="font-dm-sans text-sm sm:text-base text-gray-600 mt-1">{productName}</p>
        </div>

        {/* Region Selection */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <p className="font-dm-sans text-sm text-gray-600 mb-3 sm:mb-4">
            ¿Desde dónde realizas el pago?
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleRegionSelect('colombia')}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                selectedRegion === 'colombia'
                  ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                  : 'border-gray-200 hover:border-[#8A4BAF]/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <span className="text-xl sm:text-2xl">🇨🇴</span>
                <span className="font-dm-sans font-medium text-sm sm:text-base text-gray-900">Colombia</span>
                <span className="font-dm-sans text-xs sm:text-sm text-gray-500">
                  {formatPrice(pricesCOP, 'COP')}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRegionSelect('international')}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                selectedRegion === 'international'
                  ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                  : 'border-gray-200 hover:border-[#8A4BAF]/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                <span className="font-dm-sans font-medium text-sm sm:text-base text-gray-900">Internacional</span>
                <span className="font-dm-sans text-xs sm:text-sm text-gray-500">
                  {formatPrice(pricesUSD, 'USD')}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Payment Method Selection */}
        {selectedRegion && (
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <p className="font-dm-sans text-sm text-gray-600 mb-3 sm:mb-4">
              Selecciona tu método de pago
            </p>
            <div className="space-y-2 sm:space-y-3">
              {currentOptions.map((option) => (
                <button
                  key={option.method}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(option.method)
                    if (!option.requiresPhone) {
                      setPhoneNumber('')
                      setPhoneError('')
                    }
                  }}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center gap-3 sm:gap-4 ${
                    selectedMethod === option.method
                      ? 'border-[#8A4BAF] bg-[#8A4BAF]/5'
                      : 'border-gray-200 hover:border-[#8A4BAF]/50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      selectedMethod === option.method
                        ? 'bg-[#8A4BAF] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-dm-sans font-semibold text-sm sm:text-base text-gray-900">{option.label}</p>
                    <p className="font-dm-sans text-xs sm:text-sm text-gray-500 truncate">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guest Email Input - shown when not authenticated */}
        {needsGuestEmail && selectedMethod && (
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <p className="font-dm-sans text-sm text-gray-600 mb-3">
              Ingresa tus datos para recibir la confirmación
            </p>
            <div className="space-y-3">
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
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 font-dm-sans text-base transition-colors ${
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
                  className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 font-dm-sans text-base transition-colors focus:border-[#8A4BAF] focus:outline-none"
                />
              </div>
            </div>
            <p className="mt-3 font-dm-sans text-xs text-gray-500">
              Recibirás la confirmación de tu compra en este email. Después podrás crear una cuenta para acceder a tu historial.
            </p>
          </div>
        )}

        {/* Phone Number Input for Nequi */}
        {selectedOption?.requiresPhone && (
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <label className="block font-dm-sans text-sm text-gray-600 mb-2">
              Número de celular Nequi
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                setPhoneError('')
              }}
              placeholder="3001234567"
              className={`w-full p-3 sm:p-4 rounded-xl border-2 font-dm-sans text-base sm:text-lg transition-colors ${
                phoneError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-[#8A4BAF]'
              } focus:outline-none`}
              maxLength={10}
            />
            {phoneError && (
              <p className="mt-2 font-dm-sans text-sm text-red-500">{phoneError}</p>
            )}
            <p className="mt-2 font-dm-sans text-xs text-gray-500">
              Recibirás una notificación en tu app Nequi para aprobar el pago.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedMethod || isLoading}
            className={`w-full py-3 sm:py-4 rounded-xl font-dm-sans font-semibold text-base sm:text-lg transition-colors ${
              selectedMethod && !isLoading
                ? 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </span>
            ) : (
              'Continuar al Pago'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 rounded-xl font-dm-sans text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Gateway Info */}
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <p className="font-dm-sans text-xs text-center text-gray-400">
            {selectedMethod === 'wompi_manual'
              ? 'Pago procesado de forma segura por Wompi (Bancolombia)'
              : selectedMethod?.startsWith('paypal')
                ? 'Pago procesado de forma segura por PayPal'
                : selectedMethod === 'breb_manual'
                  ? 'Transferencia directa con Bre-B - Sin comisiones'
                  : 'Selecciona un método de pago para continuar'}
          </p>
        </div>
      </div>
    </div>
  )
}

function PayPalIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
    </svg>
  )
}
