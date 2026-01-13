'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Smartphone, Globe, Loader2 } from 'lucide-react'

export type PaymentRegion = 'colombia' | 'international'
export type PaymentMethod = 'nequi' | 'stripe' | 'paypal'

interface PaymentMethodSelectorProps {
  onMethodSelect: (method: PaymentMethod, region: PaymentRegion) => void
  onCancel?: () => void
  isLoading?: boolean
  pricesCOP: number
  pricesUSD: number
  productName: string
}

interface PaymentOption {
  method: PaymentMethod
  label: string
  description: string
  icon: React.ReactNode
  region: PaymentRegion
}

export function PaymentMethodSelector({
  onMethodSelect,
  onCancel,
  isLoading = false,
  pricesCOP,
  pricesUSD,
  productName,
}: PaymentMethodSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState<PaymentRegion | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

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

  const colombiaOptions: PaymentOption[] = [
    {
      method: 'nequi',
      label: 'Nequi',
      description: 'Paga desde tu app Nequi',
      icon: <Smartphone className="w-6 h-6" />,
      region: 'colombia',
    },
  ]

  const internationalOptions: PaymentOption[] = [
    {
      method: 'stripe',
      label: 'Tarjeta de Crédito',
      description: 'Visa, Mastercard, American Express',
      icon: <CreditCard className="w-6 h-6" />,
      region: 'international',
    },
    {
      method: 'paypal',
      label: 'PayPal',
      description: 'Paga con tu cuenta PayPal',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
        </svg>
      ),
      region: 'international',
    },
  ]

  const handleConfirm = () => {
    if (selectedMethod && selectedRegion) {
      onMethodSelect(selectedMethod, selectedRegion)
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-gazeta text-2xl text-[#8A4BAF]">
            Método de Pago
          </h2>
          <p className="font-dm-sans text-gray-600 mt-1">
            {productName}
          </p>
        </div>

        {/* Region Selection */}
        <div className="p-6 border-b border-gray-100">
          <p className="font-dm-sans text-sm text-gray-600 mb-4">
            ¿Desde dónde realizas el pago?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedRegion('colombia')
                setSelectedMethod('nequi')
              }}
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
              onClick={() => {
                setSelectedRegion('international')
                setSelectedMethod('stripe')
              }}
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
          <div className="p-6 border-b border-gray-100">
            <p className="font-dm-sans text-sm text-gray-600 mb-4">
              Selecciona tu método de pago
            </p>
            <div className="space-y-3">
              {(selectedRegion === 'colombia' ? colombiaOptions : internationalOptions).map(
                (option) => (
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
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
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
                )
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 space-y-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedMethod || isLoading}
            className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
              selectedMethod && !isLoading
                ? 'bg-[#8A4BAF] text-white hover:bg-[#7B3D9E]'
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
              className="w-full py-3 rounded-xl font-dm-sans text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
