"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReleaseReservationButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-4 text-red-700 underline">
        Rechazar aviso sin ingreso y liberar reserva
      </button>
    );
  }
  return (
    <form
      className="mt-4 space-y-3 border border-red-200 rounded-lg p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const response = await fetch(`/api/admin/orders/${orderId}/release-reservation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ verifiedNoIncomingPayment: checked, reason }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error);
          }
          router.refresh();
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo liberar la reserva.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Solo para pedidos sin ingreso recibido. Cancela el pedido y libera la hora o plaza; conserva
        el aviso y no realiza una devolución.
      </p>
      <label className="block">
        Motivo
        <textarea
          required
          minLength={5}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="block w-full border rounded p-2"
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        He comprobado en la cuenta que no se ha recibido el ingreso.
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy || !checked || reason.trim().length < 5}
        className="rounded bg-red-700 text-white p-2 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Cancelar pedido sin ingreso y liberar"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(false)}
        className="ml-4 underline"
      >
        Volver
      </button>
    </form>
  );
}
