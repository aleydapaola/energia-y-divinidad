"use client";
import { useEffect, useState } from "react";

type Summary = {
  captures: Array<{
    source: string;
    variant: string;
    device: string;
    status: string;
    _count: number;
  }>;
  metrics: Array<{
    source: string;
    variant: string;
    device: string;
    event: string;
    _sum: { count: number };
  }>;
};
const labels: Record<string, string> = {
  home: "Inicio",
  footer: "Pie de página",
  landing: "Página de regalo",
  invitation: "Invitación",
  blog: "Blog",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};
export function NewsletterCaptureAdmin() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void fetch("/api/admin/newsletter/capture", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw Error("Unavailable");
        }
        setSummary(await response.json());
      })
      .catch(() => setError(true));
  }, []);
  return (
    <section className="mb-6 space-y-4 rounded-xl border border-purple-100 bg-white p-5">
      <h2 className="font-semibold text-[#654177]">Captación de newsletter · últimos 30 días</h2>
      <p className="text-xs leading-relaxed text-gray-600">
        Altas únicas de los formularios independientes. Confirmadas significa que Mailchimp verificó
        la suscripción; no solo un formulario enviado. Las direcciones ya suscritas no son altas
        nuevas. Contadores orientativos por pestaña, día y ubicación; no representan personas
        únicas. La variante compara invitación frente a control en páginas públicas; no mide
        reservas o ventas.
      </p>
      {error && (
        <p role="status" className="text-sm text-gray-600">
          No se pudieron consultar los datos. Recarga para reintentar.
        </p>
      )}
      {summary && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {["control", "invitation"].map((variant) => {
              const visits = summary.metrics
                .filter(
                  (row) =>
                    row.source === "invitation" && row.variant === variant && row.event === "visit"
                )
                .reduce((sum, row) => sum + (row._sum.count || 0), 0);
              const confirmed = summary.captures
                .filter((row) => row.variant === variant && row.status === "CONFIRMED")
                .reduce((sum, row) => sum + row._count, 0);
              return (
                <div key={variant} className="rounded-lg bg-[#f8f0f5] p-4 text-sm text-[#654177]">
                  <h3 className="font-semibold">
                    {variant === "control" ? "Sin invitación" : "Con invitación"}
                  </h3>
                  <p className="mt-2">
                    {visits} visitas contadas · {confirmed} altas confirmadas
                  </p>
                  <p className="mt-1 text-xs">
                    {visits
                      ? `${((100 * confirmed) / visits).toFixed(1)} confirmadas por cada 100 visitas contadas`
                      : "Todavía sin muestra"}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(labels).map(([source, label]) => {
              const rows = summary.captures.filter((row) => row.source === source);
              const count = (status: string) =>
                rows
                  .filter((row) => row.status === status)
                  .reduce((sum, row) => sum + row._count, 0);
              return (
                <div key={source} className="rounded-lg border border-gray-100 p-3 text-sm">
                  <h3 className="font-medium text-[#654177]">{label}</h3>
                  <p className="mt-1 text-gray-600">
                    Confirmadas: {count("CONFIRMED")} · Pendientes: {count("PENDING")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Ya suscritas: {count("EXISTING")} · Reinscripción: {count("INACTIVE")}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            Estas cifras no demuestran todavía qué variante funciona mejor. La asignación es por
            pestaña; no hay seguimiento entre dispositivos. Las confirmaciones conservan el primer
            origen registrado. No incluyen altas anteriores ni una consulta del estado actual tras
            una baja.
          </p>
        </>
      )}
    </section>
  );
}
