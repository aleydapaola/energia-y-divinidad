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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12">
        {/* Toggle de intervalo de facturación */}
        <div className="inline-flex items-center bg-white dark:bg-neutral-800 rounded-lg p-1.5 border border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
              billingInterval === 'monthly'
                ? 'bg-brand text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-brand'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all relative ${
              billingInterval === 'yearly'
                ? 'bg-brand text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-brand'
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              Ahorra
            </span>
          </button>
        </div>

        {/* Toggle de moneda */}
        <div className="inline-flex items-center bg-white dark:bg-neutral-800 rounded-lg p-1.5 border border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setCurrency('COP')}
            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
              currency === 'COP'
                ? 'bg-brand text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-brand'
            }`}
          >
            🇨🇴 COP
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
              currency === 'USD'
                ? 'bg-brand text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-brand'
            }`}
          >
            🌍 USD
          </button>
        </div>
      </div>

      {/* Grid de pricing cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto" id="pricing">
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
      <div className="text-center mt-12 text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          Todos los planes se renuevan automáticamente.{' '}
          <span className="font-medium">Puedes cancelar cuando quieras</span> desde tu panel de
          control.
        </p>
        <p className="mt-2">
          {currency === 'COP'
            ? 'Pagos en Colombia: Débito automático con Nequi'
            : 'Pagos internacionales: Tarjeta de crédito/débito con Stripe'}
        </p>
      </div>
    </div>
  )
}
