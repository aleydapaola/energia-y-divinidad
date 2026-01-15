'use client'

import { Check } from 'lucide-react'
import type { MembershipTier } from '@/types/membership'

interface PricingCardProps {
  tier: MembershipTier
  currency: 'COP' | 'USD'
  billingInterval: 'monthly' | 'yearly'
  onSelect: (tierId: string) => void
  isPopular?: boolean
}

export function PricingCard({
  tier,
  currency,
  billingInterval,
  onSelect,
  isPopular,
}: PricingCardProps) {
  const price =
    billingInterval === 'monthly'
      ? currency === 'COP'
        ? tier.pricing.monthlyPrice
        : tier.pricing.monthlyPriceUSD
      : currency === 'COP'
      ? tier.pricing.yearlyPrice
      : tier.pricing.yearlyPriceUSD

  const monthlyPrice =
    billingInterval === 'yearly' && price
      ? Math.round(price / 12)
      : price

  const discount = billingInterval === 'yearly' ? tier.pricing.yearlyDiscount : null

  const formatPrice = (amount: number | undefined) => {
    if (!amount) return 'Gratis'

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

  const isPopularTier = isPopular || tier.popularityBadge === 'popular'

  // Color del borde: usa el color del tier para diferenciarlo
  const borderColor = tier.color || '#654177'

  return (
    <div
      className={`relative bg-white rounded-xl shadow-lg p-6 sm:p-8 border-2 transition-all hover:shadow-xl ${
        isPopularTier ? 'scale-100 lg:scale-105' : ''
      }`}
      style={{ borderColor }}
    >
      {/* Popular badge */}
      {isPopularTier && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-dm-sans font-semibold shadow-md bg-[#8A4BAF]">
          Más Popular
        </div>
      )}

      {/* Icon */}
      {tier.icon?.asset?.url && (
        <div className="w-16 h-16 mb-4">
          <img
            src={tier.icon.asset.url}
            alt={tier.icon.alt || tier.name}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Name & Tagline */}
      <h3
        className="font-gazeta text-2xl mb-2"
        style={{ color: tier.color || '#654177' }}
      >
        {tier.name}
      </h3>
      {tier.tagline && (
        <p className="text-[#654177]/70 font-dm-sans mb-6">{tier.tagline}</p>
      )}

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-[#654177] font-dm-sans">
            {formatPrice(monthlyPrice)}
          </span>
          <span className="text-[#654177]/60 font-dm-sans">/mes</span>
        </div>

        {billingInterval === 'yearly' && discount && (
          <p className="text-sm text-green-600 font-dm-sans mt-1">
            Ahorra {discount}% pagando anualmente
          </p>
        )}

        {billingInterval === 'yearly' && price && (
          <p className="text-sm text-[#654177]/50 font-dm-sans mt-1">
            {formatPrice(price)} facturado anualmente
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(tier._id)}
        className="w-full py-3 px-6 rounded-lg font-dm-sans font-semibold text-white transition-all bg-[#4944a4] hover:bg-[#3d3a8a] mb-6"
      >
        {tier.ctaButtonText || 'Comenzar Ahora'}
      </button>

      {/* Features */}
      <div className="space-y-3">
        <p className="text-sm font-dm-sans font-semibold text-[#654177]">
          Incluye:
        </p>
        {tier.features
          ?.filter((f) => f.included)
          .map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[#654177] font-dm-sans">
                  {feature.feature}
                </p>
                {feature.description && (
                  <p className="text-xs text-[#654177]/60 font-dm-sans mt-0.5">
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Trial Period */}
      {tier.trialPeriod?.enabled && tier.trialPeriod.durationDays && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-center text-[#8A4BAF] font-dm-sans font-medium">
            Prueba gratis por {tier.trialPeriod.durationDays} días
          </p>
        </div>
      )}
    </div>
  )
}
