"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { PurchasePolicy } from "@/components/checkout/PurchasePolicy";

type Quote = {
  tierId: string;
  tierName: string;
  amount: number;
  currency: "USD" | "EUR";
  billingInterval: "monthly" | "yearly";
  trialDays: number;
  available: boolean;
  termsVersion: string;
};

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const tier = params?.get("tier") || "";
  const interval = params?.get("interval") === "yearly" ? "yearly" : "monthly";
  const currency = params?.get("currency") === "EUR" ? "EUR" : "USD";
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRecurring, setAcceptedRecurring] = useState(false);
  const callback = `/membresia/checkout?tier=${encodeURIComponent(tier)}&interval=${interval}&currency=${currency}`;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
    }
  }, [status, router, callback]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setQuote(null);
    setError("");
    setAcceptedTerms(false);
    setAcceptedRecurring(false);
    fetch(
      `/api/checkout/paypal-subscription?tier=${encodeURIComponent(tier)}&interval=${interval}&currency=${currency}`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo cargar el plan");
        }
        setQuote(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "No se pudo cargar el plan");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [status, tier, interval, currency]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!quote || !acceptedTerms || !acceptedRecurring || busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/paypal-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: quote.tierId,
          amount: quote.amount,
          currency: quote.currency,
          billingInterval: quote.billingInterval,
          trialDays: quote.trialDays,
          acceptedTerms,
          acceptedRecurring,
          termsVersion: quote.termsVersion,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.approvalUrl) {
        throw new Error(data.error || "No se pudo preparar la autorización");
      }
      window.location.assign(data.approvalUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo preparar la autorización");
      setBusy(false);
    }
  }

  const period = quote?.billingInterval === "yearly" ? "año" : "mes";
  const price = quote ? `${quote.amount.toFixed(2)} ${quote.currency}` : "";
  return (
    <>
      <CheckoutHeader />
      <main className="min-h-screen bg-[#f8f0f5] px-4 py-8 text-[#654177]">
        <form
          onSubmit={submit}
          className="mx-auto max-w-xl space-y-6 rounded-2xl bg-white p-5 sm:p-8"
        >
          <Link href="/membresia" className="inline-block underline">
            Volver a los planes
          </Link>
          <h1 className="font-gazeta text-3xl">Tu membresía</h1>
          {loading || status === "loading" ? (
            <p role="status" className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando tu oferta…
            </p>
          ) : (
            quote && (
              <>
                <h2 className="text-2xl font-semibold">{quote.tierName}</h2>
                <div className="rounded-xl bg-[#eef1fa] p-4 space-y-2">
                  <p className="text-xl font-semibold">
                    {price} / {period}
                  </p>
                  <p>
                    Facturación{" "}
                    {quote.billingInterval === "yearly"
                      ? "anual, en un único cobro cada año"
                      : "mensual"}{" "}
                    en {quote.currency}, también para clientes de Colombia.
                  </p>
                  {quote.trialDays > 0 ? (
                    <>
                      <p>
                        Prueba inicial de {quote.trialDays} días. Hoy:{" "}
                        <strong>0 {quote.currency}</strong>.
                      </p>
                      <p>
                        PayPal mostrará la fecha exacta del primer cobro antes de autorizar. Después
                        de la prueba: {price} / {period}, hasta que desactives la renovación.
                      </p>
                    </>
                  ) : (
                    <p>
                      Hoy: <strong>{price}</strong>. Esta cuenta ya no dispone de una prueba
                      gratuita. Se renovará por el mismo importe cada {period} hasta que desactives
                      la renovación.
                    </p>
                  )}
                </div>
                <p>
                  PayPal gestiona la autorización y los próximos cobros. Podrás desactivar la
                  renovación desde la configuración de tu membresía.
                </p>
                <PurchasePolicy kind="membership" />
                {!quote.available && (
                  <p role="status" className="rounded-xl bg-amber-50 p-4">
                    Estamos preparando este plan recurrente en el entorno de pruebas. La
                    autorización todavía no está disponible.
                  </p>
                )}
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    He leído y acepto los{" "}
                    <Link
                      href="/terminos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      términos y condiciones
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedRecurring}
                    onChange={(e) => setAcceptedRecurring(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Autorizo la renovación recurrente de {price} cada {period}
                    {quote.trialDays > 0
                      ? " al terminar la prueba indicada"
                      : " desde esta contratación"}
                    , hasta que la desactive antes del siguiente cobro.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={busy || !quote.available || !acceptedTerms || !acceptedRecurring}
                  className="w-full rounded-xl bg-[#4944a4] px-4 py-4 text-white font-semibold disabled:opacity-50"
                >
                  {busy ? "Preparando autorización…" : "Continuar con PayPal"}
                </button>
              </>
            )
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          )}
          <p className="text-sm">
            Dudas:{" "}
            <a href="mailto:contacto@energiaydivinidad.com" className="underline">
              contacto@energiaydivinidad.com
            </a>
          </p>
        </form>
      </main>
    </>
  );
}

export default function MembershipCheckoutPage() {
  return (
    <Suspense fallback={<p className="p-8">Cargando membresía…</p>}>
      <CheckoutContent />
    </Suspense>
  );
}
