"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { usesEuro } from "@/lib/euro-countries";

import { PricingCard } from "./pricing-card";

import type { MembershipTier } from "@/types/membership";

interface PricingSectionProps {
  tiers: MembershipTier[];
  isAuthenticated: boolean;
  currentTierId?: string; // ID del tier actual si el usuario ya tiene membresía
}

export function PricingSection({ tiers, isAuthenticated, currentTierId }: PricingSectionProps) {
  const router = useRouter();
  const [currency, setCurrency] = useState<"COP" | "USD" | "EUR">("USD");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const hasEURPricing = tiers.some(
    (tier) => tier.pricing.monthlyPriceEUR || tier.pricing.yearlyPriceEUR
  );

  // Detectar país del usuario para establecer moneda por defecto
  useEffect(() => {
    async function detectCountry() {
      try {
        // Intentar detectar país usando API de geolocalización
        // Para Colombia → COP, eurozona → EUR si está configurado, resto del mundo → USD
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.country_code === "CO") {
            setCurrency("COP");
          } else if (hasEURPricing && usesEuro(data.country_code)) {
            setCurrency("EUR");
          }
        }
      } catch (error) {
        console.error("Error detecting country:", error);
        // Por defecto dejar USD
      }
    }

    detectCountry();
  }, [hasEURPricing]);

  const handleSelectTier = (tierId: string) => {
    const checkoutUrl = `/membresia/checkout?tier=${tierId}&interval=${billingInterval}&currency=${currency}`;

    if (!isAuthenticated) {
      // Guardar selección y redirigir a login
      sessionStorage.setItem("selectedTier", tierId);
      sessionStorage.setItem("selectedInterval", billingInterval);
      sessionStorage.setItem("selectedCurrency", currency);
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(checkoutUrl)}`);
      return;
    }

    // Redirigir a checkout
    router.push(checkoutUrl);
  };

  // Ordenar tiers por precio (para mostrar de menor a mayor)
  const sortedTiers = [...tiers].sort((a, b) => {
    const getPrice = (tier: MembershipTier) => {
      if (billingInterval === "monthly") {
        if (currency === "COP") {
          return tier.pricing.monthlyPrice || 0;
        }
        if (currency === "EUR") {
          return tier.pricing.monthlyPriceEUR || 0;
        }
        return tier.pricing.monthlyPriceUSD || 0;
      }

      if (currency === "COP") {
        return tier.pricing.yearlyPrice || 0;
      }
      if (currency === "EUR") {
        return tier.pricing.yearlyPriceEUR || 0;
      }
      return tier.pricing.yearlyPriceUSD || 0;
    };

    const priceA = getPrice(a);
    const priceB = getPrice(b);

    return priceA - priceB;
  });

  return (
    <div>
      {/* Controles de selección */}
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
        {/* Toggle de intervalo de facturación */}
        <div className="inline-flex items-center bg-white rounded-lg p-1 sm:p-1.5 border border-gray-200">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
              billingInterval === "monthly"
                ? "bg-[#4944a4] text-white shadow-sm"
                : "text-[#654177] hover:text-[#8A4BAF]"
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all relative ${
              billingInterval === "yearly"
                ? "bg-[#4944a4] text-white shadow-sm"
                : "text-[#654177] hover:text-[#8A4BAF]"
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
            onClick={() => setCurrency("COP")}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
              currency === "COP"
                ? "bg-[#4944a4] text-white shadow-sm"
                : "text-[#654177] hover:text-[#8A4BAF]"
            }`}
          >
            🇨🇴 COP
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
              currency === "USD"
                ? "bg-[#4944a4] text-white shadow-sm"
                : "text-[#654177] hover:text-[#8A4BAF]"
            }`}
          >
            🌍 USD
          </button>
          {hasEURPricing && (
            <button
              onClick={() => setCurrency("EUR")}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-dm-sans font-medium text-xs sm:text-sm transition-all ${
                currency === "EUR"
                  ? "bg-[#4944a4] text-white shadow-sm"
                  : "text-[#654177] hover:text-[#8A4BAF]"
              }`}
            >
              🇪🇺 EUR
            </button>
          )}
        </div>
      </div>

      {/* Grid de pricing cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto px-2 sm:px-0"
        id="pricing"
      >
        {sortedTiers.map((tier) => {
          // Obtener el tierLevel del plan actual del usuario
          const currentTier = currentTierId ? tiers.find((t) => t._id === currentTierId) : null;
          const currentTierOrder = currentTier?.tierLevel;

          return (
            <PricingCard
              key={tier._id}
              tier={tier}
              currency={currency}
              billingInterval={billingInterval}
              onSelect={handleSelectTier}
              isPopular={tier.popularityBadge === "popular"}
              isCurrentPlan={currentTierId === tier._id}
              currentTierOrder={currentTierOrder}
            />
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="text-center mt-12 text-sm text-[#654177]/70 font-dm-sans">
        <p>
          Todos los planes se renuevan automáticamente.{" "}
          <span className="font-medium text-[#654177]">Puedes cancelar cuando quieras</span> desde
          tu panel de control.
        </p>
        <p className="mt-2">
          {currency === "COP"
            ? "Pagos en Colombia: Nequi, tarjeta de crédito o débito"
            : "Pagos internacionales: Tarjeta de crédito/débito o PayPal"}
        </p>
      </div>
    </div>
  );
}
