"use client";

import { CreditCard, Lock, Loader2, ChevronLeft } from "lucide-react";
import { useState } from "react";

export interface WompiCardTokenData {
  cardToken: string;
  acceptanceToken: string;
  lastFour: string;
  brand: string;
  cardHolder: string;
}

interface WompiCardFormProps {
  onSuccess: (data: WompiCardTokenData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

interface CardState {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardHolder: string;
}

interface CardErrors {
  number?: string;
  expMonth?: string;
  expYear?: string;
  cvc?: string;
  cardHolder?: string;
  general?: string;
}

function detectBrand(number: string): string {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) {
    return "VISA";
  }
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) {
    return "MASTERCARD";
  }
  if (/^3[47]/.test(n)) {
    return "AMEX";
  }
  return "UNKNOWN";
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function validateCard(card: CardState): CardErrors {
  const errors: CardErrors = {};
  const digits = card.number.replace(/\s/g, "");

  if (!digits || digits.length < 13) {
    errors.number = "Número de tarjeta inválido";
  }
  if (!card.expMonth || Number(card.expMonth) < 1 || Number(card.expMonth) > 12) {
    errors.expMonth = "Mes inválido";
  }
  if (!card.expYear || card.expYear.length < 2) {
    errors.expYear = "Año inválido";
  }
  if (!card.cvc || card.cvc.length < 3) {
    errors.cvc = "CVV inválido";
  }
  if (!card.cardHolder.trim()) {
    errors.cardHolder = "Ingresa el nombre del titular";
  }

  return errors;
}

export function WompiCardForm({ onSuccess, onBack, isSubmitting = false }: WompiCardFormProps) {
  const [card, setCard] = useState<CardState>({
    number: "",
    expMonth: "",
    expYear: "",
    cvc: "",
    cardHolder: "",
  });
  const [errors, setErrors] = useState<CardErrors>({});
  const [loading, setLoading] = useState(false);

  const brand = detectBrand(card.number);
  const isBusy = loading || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateCard(card);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      // 1. Obtener acceptance token del backend
      const tokenRes = await fetch("/api/checkout/wompi-acceptance-token");
      if (!tokenRes.ok) {
        throw new Error("Error obteniendo token de pago");
      }
      const { acceptanceToken, publicKey, apiUrl } = await tokenRes.json();

      // 2. Tokenizar tarjeta directamente con Wompi (client-side, nunca pasan por nuestro servidor)
      const cardRes = await fetch(`${apiUrl}/tokens/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicKey}`,
        },
        body: JSON.stringify({
          number: card.number.replace(/\s/g, ""),
          exp_month: card.expMonth.padStart(2, "0"),
          exp_year: card.expYear.slice(-2),
          cvc: card.cvc,
          card_holder: card.cardHolder.trim(),
        }),
      });

      if (!cardRes.ok) {
        const errData = await cardRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Tarjeta rechazada. Verifica los datos.");
      }

      const cardData = await cardRes.json();
      const tokenData = cardData.data;

      onSuccess({
        cardToken: tokenData.id,
        acceptanceToken,
        lastFour: tokenData.last_four,
        brand: tokenData.brand || brand,
        cardHolder: card.cardHolder.trim(),
      });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Error procesando la tarjeta" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isBusy}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h3 className="font-gazeta text-lg sm:text-xl text-[#8A4BAF]">Datos de la tarjeta</h3>
          <p className="font-dm-sans text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Lock className="w-3 h-3" />
            Cifrado seguro — nunca almacenamos los datos de tu tarjeta
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Error general */}
        {errors.general && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="font-dm-sans text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Número de tarjeta */}
        <div>
          <label className="block font-dm-sans text-sm text-gray-600 mb-2">Número de tarjeta</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={card.number}
              onChange={(e) => {
                setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }));
                setErrors((er) => ({ ...er, number: undefined }));
              }}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className={`w-full pl-4 pr-16 py-3 sm:py-4 rounded-xl border-2 font-dm-sans text-base transition-colors focus:outline-none ${
                errors.number
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#8A4BAF]"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {brand !== "UNKNOWN" ? (
                <span className="font-dm-sans text-xs font-semibold text-[#4944a4]">{brand}</span>
              ) : (
                <CreditCard className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          {errors.number && (
            <p className="mt-1 font-dm-sans text-xs text-red-500">{errors.number}</p>
          )}
        </div>

        {/* Expiración + CVV */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block font-dm-sans text-sm text-gray-600 mb-2">Mes</label>
            <input
              type="text"
              inputMode="numeric"
              value={card.expMonth}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                setCard((c) => ({ ...c, expMonth: v }));
                setErrors((er) => ({ ...er, expMonth: undefined }));
              }}
              placeholder="MM"
              maxLength={2}
              className={`w-full px-3 py-3 sm:py-4 rounded-xl border-2 font-dm-sans text-base text-center transition-colors focus:outline-none ${
                errors.expMonth
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#8A4BAF]"
              }`}
            />
            {errors.expMonth && (
              <p className="mt-1 font-dm-sans text-xs text-red-500">{errors.expMonth}</p>
            )}
          </div>
          <div>
            <label className="block font-dm-sans text-sm text-gray-600 mb-2">Año</label>
            <input
              type="text"
              inputMode="numeric"
              value={card.expYear}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setCard((c) => ({ ...c, expYear: v }));
                setErrors((er) => ({ ...er, expYear: undefined }));
              }}
              placeholder="AA"
              maxLength={4}
              className={`w-full px-3 py-3 sm:py-4 rounded-xl border-2 font-dm-sans text-base text-center transition-colors focus:outline-none ${
                errors.expYear
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#8A4BAF]"
              }`}
            />
            {errors.expYear && (
              <p className="mt-1 font-dm-sans text-xs text-red-500">{errors.expYear}</p>
            )}
          </div>
          <div>
            <label className="block font-dm-sans text-sm text-gray-600 mb-2">CVV</label>
            <input
              type="text"
              inputMode="numeric"
              value={card.cvc}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setCard((c) => ({ ...c, cvc: v }));
                setErrors((er) => ({ ...er, cvc: undefined }));
              }}
              placeholder="123"
              maxLength={4}
              className={`w-full px-3 py-3 sm:py-4 rounded-xl border-2 font-dm-sans text-base text-center transition-colors focus:outline-none ${
                errors.cvc
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#8A4BAF]"
              }`}
            />
            {errors.cvc && <p className="mt-1 font-dm-sans text-xs text-red-500">{errors.cvc}</p>}
          </div>
        </div>

        {/* Nombre del titular */}
        <div>
          <label className="block font-dm-sans text-sm text-gray-600 mb-2">
            Nombre del titular (como aparece en la tarjeta)
          </label>
          <input
            type="text"
            value={card.cardHolder}
            onChange={(e) => {
              setCard((c) => ({ ...c, cardHolder: e.target.value.toUpperCase() }));
              setErrors((er) => ({ ...er, cardHolder: undefined }));
            }}
            placeholder="NOMBRE APELLIDO"
            className={`w-full px-4 py-3 sm:py-4 rounded-xl border-2 font-dm-sans text-base transition-colors focus:outline-none ${
              errors.cardHolder
                ? "border-red-400 focus:border-red-500"
                : "border-gray-200 focus:border-[#8A4BAF]"
            }`}
          />
          {errors.cardHolder && (
            <p className="mt-1 font-dm-sans text-xs text-red-500">{errors.cardHolder}</p>
          )}
        </div>

        {/* Aviso de cobro automático */}
        <div className="p-3 rounded-xl bg-[#eef1fa] border border-[#4944a4]/20">
          <p className="font-dm-sans text-xs text-[#4944a4]">
            <strong>Primer mes gratis:</strong> No cobraremos hoy. Tu primer cobro automático se
            realizará al terminar el mes gratis. Puedes cancelar en cualquier momento desde tu
            perfil.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-2">
        <button
          type="submit"
          disabled={isBusy}
          className={`w-full py-3 sm:py-4 rounded-xl font-dm-sans font-semibold text-base sm:text-lg transition-colors flex items-center justify-center gap-2 ${
            isBusy
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-[#4944a4] text-white hover:bg-[#3d3a8a]"
          }`}
        >
          {isBusy ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Activar 1 mes gratis
            </>
          )}
        </button>
      </div>
    </form>
  );
}
