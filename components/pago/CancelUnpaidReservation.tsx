"use client";
import Link from "next/link";
import { useState } from "react";

export function CancelUnpaidReservation({
  reference,
  onCancelled,
}: {
  reference: string;
  onCancelled?: () => void;
}) {
  const [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="rounded-xl border bg-white p-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch(
            `/api/orders/${encodeURIComponent(reference)}/cancel-reservation`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirmNoPayment: checked }),
            }
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error);
          }
          setMessage("Pedido sin pagar cancelado. La hora o plaza queda disponible de nuevo.");
          onCancelled?.();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "No se pudo liberar la reserva.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>Si quieres elegir otra hora o plaza, puedes liberar esta reserva sin pagar.</p>
      <label className="flex gap-2">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        No he realizado ninguna transferencia ni completado el pago de este pedido.
      </label>
      <button disabled={!checked || busy} className="underline disabled:opacity-50">
        {busy ? "Liberando…" : "Cancelar pedido sin pagar y liberar reserva"}
      </button>
      {message && <p role="status">{message}</p>}
      <Link className="block underline" href="/contacto">
        Ya pagué o necesito ayuda
      </Link>
    </form>
  );
}
