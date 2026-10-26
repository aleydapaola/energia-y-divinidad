"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { BrebPaymentInstructions } from "@/components/pago/BrebPaymentInstructions";

type Order = {
  orderNumber: string;
  itemName: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderType: string;
  reported: boolean;
  reportedReference?: string;
  qrAvailable?: boolean;
  breb: {
    enabled: boolean;
    simulation: boolean;
    key: string;
    keyType: "phone" | "email" | "alias" | "document" | null;
    recipient: string;
    amountMode: "customer-entered";
  };
};
function Content() {
  const reference = useSearchParams().get("ref") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [transferReference, setTransferReference] = useState("");
  async function refresh() {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/status`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.breb) {
        throw new Error(data.error || "Pedido no disponible.");
      }
      setOrder(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo consultar el pedido.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (reference) {
      void refresh();
    } else {
      setLoading(false);
    }
  }, [reference]);
  // Keep polling only while the transfer is unverified. The static account QR
  // is served separately, so this refresh stays lightweight.
  useEffect(() => {
    if (!order || order.paymentStatus !== "PENDING") {
      return;
    }
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [order?.paymentStatus, reference]);
  async function report(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/report-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNumber: transferReference }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      setMessage(
        "Aviso registrado. Tu compra sigue pendiente de verificar el ingreso. No vuelvas a pagar."
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el aviso.");
    } finally {
      setBusy(false);
    }
  }
  const button = "rounded-xl bg-[#4944a4] text-white py-3 px-5 disabled:opacity-50 w-full";
  if (loading) {
    return <p className="p-8 text-center">Consultando pedido…</p>;
  }
  if (!order) {
    return (
      <div className="p-8 text-center">
        <h1>Pedido no disponible</h1>
        <p>
          {message ||
            "Abre el enlace en el navegador donde realizaste la compra o inicia sesión con tu cuenta."}
        </p>
        <Link href="/auth/signin">Iniciar sesión</Link>
      </div>
    );
  }
  return (
    <main className="bg-[#f8f0f5] min-h-screen py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        {order.paymentStatus === "COMPLETED" ? (
          <section className="bg-white p-6 rounded-2xl space-y-4">
            <h1 className="text-2xl">Pago confirmado</h1>
            <p>{order.itemName}</p>
            <p>
              La compra está verificada. Consulta tu correo y tu cuenta para acceder al contenido o
              gestionar la reserva.
            </p>
            <Link
              className="underline"
              href={`/pago/confirmacion?ref=${encodeURIComponent(reference)}`}
            >
              Ver confirmación e instrucciones
            </Link>
          </section>
        ) : order.paymentStatus !== "PENDING" ? (
          <section className="bg-white p-6 rounded-2xl">
            <h1>
              Estado del pedido:{" "}
              {order.paymentStatus === "PROCESSING"
                ? "Verificando y preparando tu compra"
                : "Pedido no disponible para pagar"}
            </h1>
            <p>No realices otra transferencia.</p>
          </section>
        ) : (
          <>
            <BrebPaymentInstructions {...order} configuration={order.breb} />
            <section className="bg-white rounded-2xl p-5 space-y-4">
              {order.reported ? (
                <div>
                  <h2 className="font-semibold">
                    Transferencia comunicada — pendiente de verificación
                  </h2>
                  <p className="break-all">Referencia: {order.reportedReference}</p>
                  <p>No tienes que enviar un mensaje por WhatsApp ni volver a pagar.</p>
                </div>
              ) : (
                <form onSubmit={report} className="space-y-3">
                  <h2 className="text-xl font-semibold">
                    {order.breb.simulation
                      ? "Simular aviso de transferencia"
                      : "Ya hice la transferencia"}
                  </h2>
                  <label className="block">
                    Referencia de la transferencia
                    <input
                      required
                      minLength={3}
                      maxLength={120}
                      className="block border rounded-lg p-3 w-full mt-2"
                      value={transferReference}
                      onChange={(e) => setTransferReference(e.target.value)}
                      placeholder={
                        order.breb.simulation
                          ? "PRUEBA-12345"
                          : "Referencia que muestra tu aplicación"
                      }
                    />
                  </label>
                  <p className="text-sm">
                    Sirve para localizar el ingreso. No activa la compra por sí sola.
                  </p>
                  <button className={button} disabled={busy || !order.breb.enabled}>
                    {busy ? "Registrando…" : "Comunicar transferencia"}
                  </button>
                </form>
              )}
            </section>
          </>
        )}
        <p role="status" className="text-sm">
          {message}
        </p>
        <button className={button} disabled={busy} onClick={() => void refresh()}>
          Actualizar estado del pedido
        </button>
        <Link className="block text-center underline" href="/mi-cuenta/compras">
          Mis compras
        </Link>
      </div>
    </main>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <Content />
    </Suspense>
  );
}
