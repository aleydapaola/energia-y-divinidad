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

  return (
    <div
      className={`relative bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 border-2 transition-all ${
        isPopular || tier.popularityBadge === 'popular'
          ? 'border-amber-500 scale-105'
          : 'border-neutral-200 dark:border-neutral-700'
      }`}
      style={
        tier.color
          ? {
              borderColor: isPopular || tier.popularityBadge === 'popular' ? tier.color : undefined,
            }
          : undefined
      }
    >
      {/* Popular badge */}
      {(isPopular || tier.popularityBadge === 'popular') && (
        <div
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-semibold shadow-md"
          style={{ backgroundColor: tier.color || '#8B6F47' }}
        >
          ✨ Más Popular
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
        className="text-2xl font-bold mb-2"
        style={{ color: tier.color || '#8B6F47' }}
      >
        {tier.name}
      </h3>
      {tier.tagline && (
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{tier.tagline}</p>
      )}

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-neutral-900 dark:text-white">
            {formatPrice(monthlyPrice)}
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">/mes</span>
        </div>

        {billingInterval === 'yearly' && discount && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Ahorra {discount}% pagando anualmente
          </p>
        )}

        {billingInterval === 'yearly' && price && (
          <p className="text-sm text-neutral-500 mt-1">
            {formatPrice(price)} facturado anualmente
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(tier._id)}
        className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all hover:opacity-90 mb-6"
        style={{ backgroundColor: tier.color || '#8B6F47' }}
      >
        {tier.ctaButtonText || 'Comenzar Ahora'}
      </button>

      {/* Features */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Incluye:
        </p>
        {tier.features
          ?.filter((f) => f.included)
          .map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {feature.feature}
                </p>
                {feature.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Trial Period */}
      {tier.trialPeriod?.enabled && tier.trialPeriod.durationDays && (
        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-center text-neutral-600 dark:text-neutral-400">
            🎁 Prueba gratis por {tier.trialPeriod.durationDays} días
          </p>
        </div>
      )}
    </div>
  )
}
