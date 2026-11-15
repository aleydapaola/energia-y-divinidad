"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DriveRecipientForm({ orderId, email, pendingEmail, status }: { orderId: string; email: string; pendingEmail: string | null; status: string }) {
  const router = useRouter();
  const [recipient, setRecipient] = useState(email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="space-y-2 text-sm break-words">
    <p>Cuenta de Google para el acceso: <strong>{email}</strong></p>
    {pendingEmail && <p>Cuenta nueva solicitada: {pendingEmail}. Aleyda debe revisar los permisos anteriores.</p>}
    {!["REVOKED", "PENDING_REVOCATION"].includes(status) && <details>
      <summary className="cursor-pointer py-3 underline">Usar otra cuenta de Google</summary>
      <form className="space-y-3 py-3" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        try {
          const response = await fetch(`/api/mi-cuenta/pedidos/${encodeURIComponent(orderId)}/drive-email`, { method: "POST",
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recipient }) });
          const data = await response.json();
          if (!response.ok) { throw new Error(data.error); }
          router.refresh();
        } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo cambiar la cuenta."); }
        finally { setBusy(false); }
      }}>
        <label className="block">Correo de tu cuenta de Google
          <input required type="email" maxLength={254} autoCapitalize="none" autoCorrect="off" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="block w-full max-w-md rounded-lg border p-3" />
        </label>
        <p>Abre Drive con esta cuenta. Si ya tenías acceso, el enlace quedará pendiente mientras Aleyda revisa el cambio de permisos.</p>
        <button disabled={busy} className="min-h-11 rounded-lg border px-4 py-3 disabled:opacity-50">{busy ? "Guardando…" : "Guardar cuenta de Google"}</button>
      </form>
    </details>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function AdminDriveDeliveryControls({ orderId, revision, status, paymentStatus, recipientEmail, pendingEmail, folderUrl, retainReader }: {
  orderId: string; revision: number; status: string; paymentStatus: string; recipientEmail: string;
  pendingEmail: string | null; folderUrl: string; retainReader: boolean;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function record(action: "grant" | "refund" | "revoke") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/drive-delivery`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, revision, confirmed: action === "refund" ? refundConfirmed : confirmed, reference: reference || undefined }) });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error); }
      setConfirmed(false); setRefundConfirmed(false); setReference(""); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo registrar."); }
    finally { setBusy(false); }
  }
  const statusLabel = { GRANTED: "Acceso concedido", REVOKED: "Acceso retirado" }[status as "GRANTED" | "REVOKED"] || "Acceso pendiente";
  return <section className="rounded-xl border bg-white p-5 space-y-4 break-words">
    <h2 className="text-xl font-gazeta">Entrega privada en Google Drive</h2>
    <p>Cuenta de Google para el acceso: <strong>{recipientEmail}</strong></p>
    {pendingEmail && <p>Nueva cuenta solicitada: <strong>{pendingEmail}</strong></p>}
    <p>{statusLabel}</p>
    <a href={folderUrl} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 py-3 underline">Abrir carpeta privada</a>
    {status === "PENDING_ACCESS" && paymentStatus !== "COMPLETED" && <p>Confirma primero el pago. No concedas todavía acceso en Drive.</p>}
    {status === "PENDING_ACCESS" && paymentStatus === "COMPLETED" && <>
      <p>En Drive: Compartir → añade esta cuenta como Lector → Enviar o Compartir. Mantén Acceso general: Restringido. Después registra la entrega aquí.</p>
      <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />He compartido esta carpeta con la cuenta indicada como Lector, con acceso general Restringido.</label>
      <button disabled={busy || !confirmed} onClick={() => void record("grant")} className="min-h-11 rounded-lg bg-[#654177] px-4 py-3 text-white disabled:opacity-50">Marcar acceso concedido</button>
    </>}
    {status === "PENDING_REVOCATION" && <>
      <p>{retainReader ? "Otra compra vigente mantiene el permiso de esta cuenta. No lo retires de Drive." : "En Drive: Compartir → cuenta anterior → Quitar acceso → Guardar. La web por sí sola no retira ese permiso."}</p>
      <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />He revisado el permiso en Drive y las otras compras vigentes.</label>
      <button disabled={busy || !confirmed} onClick={() => void record("revoke")} className="min-h-11 rounded-lg border px-4 py-3 disabled:opacity-50">Verificar retirada de acceso</button>
    </>}
    {paymentStatus === "COMPLETED" && <details>
      <summary className="cursor-pointer py-3 underline">Registrar un reembolso total ya realizado</summary>
      <div className="space-y-3 py-3">
        <p>Este registro no devuelve dinero. Registra únicamente un reembolso total ya efectuado conforme a la política vigente; después habrá que revisar y retirar el permiso de Drive.</p>
        <label className="block">Referencia del reembolso verificado<input maxLength={250} value={reference} onChange={(e) => setReference(e.target.value)} className="block w-full rounded-lg border p-3" /></label>
        <label className="flex items-start gap-3"><input type="checkbox" checked={refundConfirmed} onChange={(e) => setRefundConfirmed(e.target.checked)} className="mt-1" />He verificado que el reembolso total ya se ha realizado.</label>
        <button disabled={busy || !refundConfirmed || reference.trim().length < 3} onClick={() => void record("refund")} className="min-h-11 rounded-lg border px-4 py-3 disabled:opacity-50">Registrar reembolso y retirada pendiente</button>
      </div>
    </details>}
    {busy && <p role="status">Comprobando y registrando…</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
