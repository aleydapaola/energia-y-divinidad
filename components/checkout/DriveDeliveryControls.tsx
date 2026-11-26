"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DriveBuyerDeliveryControls({ orderId, productId, email, status, paid, verified }: { orderId: string; productId?: string; email: string; status: string; paid: boolean; verified: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="space-y-2 text-sm break-words">
    <p>El acceso en Drive es exclusivo de tu cuenta: <strong>{email}</strong>.</p>
    {!verified && <p>Verifica el correo de tu cuenta para recibir el acceso. El pago confirmado se conserva.</p>}
    {paid && status === "PENDING_ACCESS" && <button disabled={busy || !verified} className="min-h-11 rounded-lg border px-4 py-3 disabled:opacity-50" onClick={async () => {
        setBusy(true); setError("");
        try {
          const response = await fetch(`/api/mi-cuenta/pedidos/${encodeURIComponent(orderId)}/drive-delivery${productId ? `?producto=${encodeURIComponent(productId)}` : ""}`, { method: "POST" });
          const data = await response.json();
          if (!response.ok || !data.delivered) { throw new Error("Tu pago está confirmado. El acceso sigue pendiente; puedes reintentar solo la entrega o contactar con Aleyda."); }
          router.refresh();
        } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo completar la entrega."); }
        finally { setBusy(false); }
      }}>{busy ? "Comprobando entrega…" : "Reintentar entrega"}</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function AdminDriveDeliveryControls({ orderId, productId, title, revision, status, paymentStatus, recipientEmail, pendingEmail, folderUrl, retainReader }: {
  orderId: string; productId?: string; title?: string; revision: number; status: string; paymentStatus: string; recipientEmail: string;
  pendingEmail: string | null; folderUrl: string; retainReader: boolean;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function record(action: "retry" | "refund" | "revoke") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/drive-delivery`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, productId, revision, confirmed: action === "retry" || (action === "refund" ? refundConfirmed : confirmed), reference: reference || undefined }) });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error); }
      if (action === "retry" && !data.delivered) { throw new Error("La entrega sigue pendiente. Revisa el correo verificado del titular, los archivos y la conexión Drive. No confirmes de nuevo el pago."); }
      setConfirmed(false); setRefundConfirmed(false); setReference(""); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo registrar."); }
    finally { setBusy(false); }
  }
  const statusLabel = { GRANTED: "Acceso concedido", REVOKED: "Acceso retirado" }[status as "GRANTED" | "REVOKED"] || "Acceso pendiente";
  return <section className="rounded-xl border bg-white p-5 space-y-4 break-words">
    <h2 className="text-xl font-gazeta">Entrega privada en Google Drive{title && ` · ${title}`}</h2>
    <p>Cuenta de Google para el acceso: <strong>{recipientEmail}</strong></p>
    {pendingEmail && <p>Nueva cuenta solicitada: <strong>{pendingEmail}</strong></p>}
    <p>{statusLabel}</p>
    <a href={folderUrl} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 py-3 underline">Abrir carpeta privada</a>
    {status === "PENDING_ACCESS" && paymentStatus !== "COMPLETED" && <p>Confirma primero el pago. No concedas todavía acceso en Drive.</p>}
    {status === "PENDING_ACCESS" && paymentStatus === "COMPLETED" && <>
      <p>El servidor concede acceso de lector únicamente al correo verificado del titular. Si falló Drive, reintenta la entrega; el pago no se vuelve a confirmar.</p>
      <button disabled={busy} onClick={() => void record("retry")} className="min-h-11 rounded-lg bg-[#654177] px-4 py-3 text-white disabled:opacity-50">Reintentar entrega</button>
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
