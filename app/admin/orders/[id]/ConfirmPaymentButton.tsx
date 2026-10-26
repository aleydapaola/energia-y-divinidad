"use client";

import { CheckCircle, Loader2, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ConfirmPaymentButtonProps {
  orderId: string;
  orderNumber: string;
  paymentMethod: string | null;
  paymentStatus: string;
  simulation?: boolean;
  expectedAmount?: number;
  currency?: string;
}

export function ConfirmPaymentButton({
  orderId,
  orderNumber,
  paymentMethod,
  paymentStatus,
  simulation = false,
  expectedAmount,
  currency = "COP",
}: ConfirmPaymentButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transactionReference, setTransactionReference] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [amountDiscrepancyReason, setAmountDiscrepancyReason] = useState("");
  const [verifiedInAccount, setVerifiedInAccount] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsedReceived = Number.parseFloat(receivedAmount.replace(",", "."));
  const hasReceived = Number.isFinite(parsedReceived) && parsedReceived > 0;
  // The static QR carries no amount, so the transferred total is checked here.
  const amountMatches =
    hasReceived && expectedAmount !== undefined
      ? Math.round(parsedReceived * 100) === Math.round(expectedAmount * 100)
      : true;
  const needsReason = hasReceived && !amountMatches;

  // Solo mostrar para pagos manuales pendientes
  const isManualPayment =
    paymentMethod === "BREB_MANUAL" ||
    paymentMethod === "MANUAL_NEQUI" ||
    paymentMethod === "MANUAL_TRANSFER" ||
    paymentMethod === "MANUAL_BANCOLOMBIA" ||
    paymentMethod === "MANUAL_DAVIPLATA";

  const isPending = paymentStatus === "PENDING";

  if (!isManualPayment || !isPending) {
    return null;
  }

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionReference: transactionReference.trim(),
          receivedAmount: parsedReceived,
          verifiedInAccount,
          amountDiscrepancyReason: needsReason ? amountDiscrepancyReason.trim() : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al confirmar el pago");
      }

      setShowModal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      {/* Botón de confirmar pago */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-dm-sans font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" />
        {simulation ? "Confirmar simulación" : "Confirmar Pago Manual"}
      </button>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Key className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-gazeta text-xl text-[#654177]">
                    {simulation ? "Confirmar simulación" : "Confirmar Pago"}
                  </h3>
                  <p className="text-sm text-gray-500 font-dm-sans">Orden #{orderNumber}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-dm-sans">
                  {simulation
                    ? "PRUEBA — NO REAL. Esta confirmación simula el ingreso, activa el acceso de prueba y envía el correo de Preview. No se recibe ni se mueve dinero."
                    : "Confirma solo si has verificado que el pago fue recibido correctamente. Esta acción activará el acceso del cliente y enviará el email de confirmación."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-dm-sans">
                  {simulation
                    ? "Referencia ficticia de la simulación"
                    : "Referencia del ingreso en Global66 / entidad receptora"}
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder={
                    simulation ? "PRUEBA-NO-REAL-..." : "Referencia del movimiento recibido"
                  }
                  maxLength={120}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-dm-sans focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-dm-sans">
                  Importe realmente recibido ({currency}) · obligatorio
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder={expectedAmount !== undefined ? String(expectedAmount) : "0.00"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-dm-sans focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 font-dm-sans mt-1">
                  {expectedAmount !== undefined
                    ? `El pedido es de ${expectedAmount} ${currency}. El QR y la llave no llevan importe, así que confirma la cantidad que aparece en el movimiento.`
                    : "Indica la cantidad que aparece en el movimiento recibido."}
                </p>
              </div>

              {needsReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-red-700 font-dm-sans font-semibold">
                    El importe no coincide con el del pedido
                    {expectedAmount !== undefined ? ` (${expectedAmount} ${currency})` : ""}.
                  </p>
                  <label className="block text-sm font-medium text-gray-700 font-dm-sans">
                    Motivo de la diferencia · obligatorio
                  </label>
                  <textarea
                    value={amountDiscrepancyReason}
                    onChange={(e) => setAmountDiscrepancyReason(e.target.value)}
                    placeholder="Por ejemplo: ingreso parcial acordado con la clienta, o devolución pendiente."
                    rows={2}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-dm-sans focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-dm-sans">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la confirmación..."
                  rows={2}
                  maxLength={2000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-dm-sans focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={verifiedInAccount}
                  onChange={(e) => setVerifiedInAccount(e.target.checked)}
                />
                {simulation
                  ? "He revisado los datos ficticios de esta simulación. No se ha recibido dinero real."
                  : "He comprobado el ingreso, el importe y la moneda en la cuenta receptora. Un comprobante del cliente no basta."}
              </label>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-dm-sans">{error}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isConfirming}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-dm-sans font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  isConfirming ||
                  !verifiedInAccount ||
                  transactionReference.trim().length < 3 ||
                  !hasReceived ||
                  (needsReason && amountDiscrepancyReason.trim().length < 5)
                }
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-dm-sans font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
