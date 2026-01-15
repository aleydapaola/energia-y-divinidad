'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PricingCard } from './pricing-card'
import type { MembershipTier } from '@/types/membership'

interface PricingSectionProps {
  tiers: MembershipTier[]
  isAuthenticated: boolean
}

export function PricingSection({ tiers, isAuthenticated }: PricingSectionProps) {
  const router = useRouter()
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD')
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  // Detectar país del usuario para establecer moneda por defecto
  useEffect(() => {
    async function detectCountry() {
      try {
        // Intentar detectar país usando API de geolocalización
        // Para Colombia → COP, para resto del mundo → USD
        const response = await fetch('https://ipapi.co/json/')
        if (response.ok) {
          const data = await response.json()
          if (data.country_code === 'CO') {
            setCurrency('COP')
          }
        }
      } catch (error) {
        console.error('Error detecting country:', error)
        // Por defecto dejar USD
      }
    }

    detectCountry()
  }, [])

  const handleSelectTier = (tierId: string) => {
    if (!isAuthenticated) {
      // Guardar selección y redirigir a login
      sessionStorage.setItem('selectedTier', tierId)
      sessionStorage.setItem('selectedInterval', billingInterval)
      sessionStorage.setItem('selectedCurrency', currency)
      router.push(`/auth/signin?callbackUrl=/membresia/checkout?tier=${tierId}&interval=${billingInterval}&currency=${currency}`)
      return
    }

    // Redirigir a checkout
    router.push(`/membresia/checkout?tier=${tierId}&interval=${billingInterval}&currency=${currency}`)
  }

  // Ordenar tiers por precio (para mostrar de menor a mayor)
  const sortedTiers = [...tiers].sort((a, b) => {
    const priceA = billingInterval === 'monthly'
      ? (currency === 'COP' ? a.pricing.monthlyPrice : a.pricing.monthlyPriceUSD) || 0
      : (currency === 'COP' ? a.pricing.yearlyPrice : a.pricing.yearlyPriceUSD) || 0

    const priceB = billingInterval === 'monthly'
      ? (currency === 'COP' ? b.pricing.monthlyPrice : b.pricing.monthlyPriceUSD) || 0
      : (currency === 'COP' ? b.pricing.yearlyPrice : b.pricing.yearlyPriceUSD) || 0

    return priceA - priceB
  })

  return (
    <div>
      {/* Controles de selección */}
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
        {/* Toggle de intervalo de facturación */}
        <div className="inline-flex items-center bg-white rounded-lg p-1 sm:p-1.5 border border-gray-200">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
              billingInterval === 'monthly'
                ? 'bg-[#4944a4] text-white shadow-sm'
                : 'text-[#654177] hover:text-[#8A4BAF]'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all relative ${
              billingInterval === 'yearly'
                ? 'bg-[#4944a4] text-white shadow-sm'
                : 'text-[#654177] hover:text-[#8A4BAF]'
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
              Ahorra
            </span>
          </button>
        </div>

        {/* Toggle de moneda */}
        <div className="inline-flex items-center bg-white rounded-lg p-1 sm:p-1.5 border border-gray-200">
          <button
            onClick={() => setCurrency('COP')}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
              currency === 'COP'
                ? 'bg-[#4944a4] text-white shadow-sm'
                : 'text-[#654177] hover:text-[#8A4BAF]'
            }`}
          >
            🇨🇴 COP
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
              currency === 'USD'
                ? 'bg-[#4944a4] text-white shadow-sm'
                : 'text-[#654177] hover:text-[#8A4BAF]'
            }`}
          >
            🌍 USD
          </button>
        </div>
      </div>

      {/* Grid de pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto px-2 sm:px-0" id="pricing">
        {sortedTiers.map((tier) => (
          <PricingCard
            key={tier._id}
            tier={tier}
            currency={currency}
            billingInterval={billingInterval}
            onSelect={handleSelectTier}
            isPopular={tier.popularityBadge === 'popular'}
          />
        ))}
      </div>

      {/* Información adicional */}
      <div className="text-center mt-12 text-sm text-[#654177]/70 font-dm-sans">
        <p>
          Todos los planes se renuevan automáticamente.{' '}
          <span className="font-medium text-[#654177]">Puedes cancelar cuando quieras</span> desde tu panel de
          control.
        </p>
        <p className="mt-2">
          {currency === 'COP'
            ? 'Pagos en Colombia: Nequi, tarjeta de crédito o débito'
            : 'Pagos internacionales: Tarjeta de crédito/débito o PayPal'}
        </p>
      </div>
    </div>
  )
}
