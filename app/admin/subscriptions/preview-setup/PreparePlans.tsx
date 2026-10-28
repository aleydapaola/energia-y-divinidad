"use client";
import { useState } from "react";

export function PreparePlans() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function prepare() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/payments/paypal/membership-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledge: "EYD_PREVIEW_SANDBOX_ONLY" }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("No se pudo confirmar la preparación. Revisa antes de repetir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <p>
        Prepara únicamente los cuatro planes PayPal sandbox del catálogo Esencia/Divinidad en USD.
        Comprueba y reutiliza los existentes. Añade al receptor sandbox ya configurado los avisos de
        membresía probados, conservando su URL privada y los avisos de captura puntual. No autoriza
        suscripciones ni cobra a compradores. Los IDs devueltos deben configurarse solo en Vercel
        Preview.
      </p>
      <button
        disabled={busy}
        onClick={prepare}
        className="rounded-lg bg-[#4944a4] p-3 text-white disabled:opacity-50"
      >
        {busy ? "Preparando planes de pruebas…" : "Preparar planes y avisos EYD sandbox"}
      </button>
      {result && (
        <pre
          className="whitespace-pre-wrap break-all rounded-lg bg-white p-4 text-sm"
          role="status"
        >
          {result}
        </pre>
      )}
    </div>
  );
}
