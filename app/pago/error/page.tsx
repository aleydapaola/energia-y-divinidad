"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const reasonLabels: Record<string, string> = {
  missing_order: "No encontramos la orden de pago.",
  order_not_found: "La orden de pago no existe o ya no está disponible.",
  missing_subscription: "PayPal no devolvió la suscripción.",
  subscription_not_found: "No pudimos consultar la suscripción en PayPal.",
  subscription_not_approved: "La suscripción no quedó aprobada en PayPal.",
  processing_failed: "El pago fue aprobado, pero no pudimos activar la membresía.",
  server_error: "Ocurrió un error inesperado procesando el pago.",
};

function PaymentErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams?.get("reason") || "server_error";
  const status = searchParams?.get("status");
  const message = reasonLabels[reason] || reasonLabels.server_error;

  return (
    <main className="min-h-screen bg-[#f8f0f5] px-4 py-16 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
        <h1 className="font-gazeta text-3xl text-[#654177] mb-3">No pudimos completar el pago</h1>
        <p className="font-dm-sans text-gray-600">{message}</p>
        {status && (
          <p className="mt-3 font-dm-sans text-sm text-gray-500">Estado recibido: {status}</p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/membresia"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4944a4] px-5 py-3 font-dm-sans font-semibold text-white hover:bg-[#3d3a8a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a membresía
          </Link>
          <Link
            href="https://wa.me/573151165921"
            className="inline-flex items-center justify-center rounded-lg border border-[#4944a4] px-5 py-3 font-dm-sans font-semibold text-[#4944a4] hover:bg-[#4944a4] hover:text-white"
          >
            Contactar soporte
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={null}>
      <PaymentErrorContent />
    </Suspense>
  );
}
