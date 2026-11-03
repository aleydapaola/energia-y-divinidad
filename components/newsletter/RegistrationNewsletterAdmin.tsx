"use client";

import { useEffect, useState } from "react";

export function RegistrationNewsletterAdmin() {
  const [summary, setSummary] = useState<{
    enabled: boolean;
    securityConfigured: boolean;
    counts: Record<string, number>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const response = await fetch("/api/admin/newsletter/registrations", { cache: "no-store" });
    if (response.ok) {
      setSummary(await response.json());
    }
  };
  useEffect(() => {
    refresh().catch(() => setMessage("No se pudo consultar la newsletter."));
  }, []);
  const retry = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/newsletter/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        throw Error();
      }
      const result = await response.json();
      setMessage(
        `Se han revisado ${result.processed} solicitudes pendientes. Las bajas se conservan.`
      );
      await refresh();
    } catch {
      setMessage("No se pudo completar la revisión. Inténtalo más tarde.");
    } finally {
      setBusy(false);
    }
  };
  if (!summary && !message) {
    return null;
  }
  return (
    <section className="mb-6 rounded-xl border border-purple-100 bg-white p-5">
      <h2 className="font-semibold text-[#654177]">Newsletter desde el registro</h2>
      {summary && (
        <>
          <p className="mt-2 text-sm text-gray-600">
            {summary.enabled ? "Integración activada" : "Integración pausada"} ·{" "}
            {summary.securityConfigured
              ? "Protección configurada"
              : "Protección pendiente de configurar"}
          </p>
          <p className="my-2 text-sm text-gray-600">
            En espera: {(summary.counts.READY || 0) + (summary.counts.RETRY || 0)} · Completadas:{" "}
            {summary.counts.ACTIVE || 0} · Reinscripción necesaria:{" "}
            {summary.counts.RESUBSCRIBE_REQUIRED || 0} · Revisar entrega:{" "}
            {summary.counts.REVIEW_REQUIRED || 0}
          </p>
          <button
            type="button"
            disabled={busy || !summary.enabled}
            onClick={retry}
            className="rounded-lg bg-[#4944a4] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Revisando…" : "Reintentar solicitudes pendientes"}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Los reintentos no envían campañas. Los envíos inciertos requieren comprobar Resend antes
            de repetirlos.
          </p>
        </>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm text-gray-600">
          {message}
        </p>
      )}
    </section>
  );
}
