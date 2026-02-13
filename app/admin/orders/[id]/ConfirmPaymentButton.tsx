'use client'

import { CheckCircle, Loader2, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ConfirmPaymentButtonProps {
  orderId: string
  orderNumber: string
  paymentMethod: string | null
  paymentStatus: string
}

export function ConfirmPaymentButton({
  orderId,
  orderNumber,
  paymentMethod,
  paymentStatus,
}: ConfirmPaymentButtonProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [transactionReference, setTransactionReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Solo mostrar para pagos manuales pendientes
  const isManualPayment = paymentMethod === 'BREB_MANUAL' ||
    paymentMethod === 'MANUAL_NEQUI' ||
    paymentMethod === 'MANUAL_TRANSFER' ||
    paymentMethod === 'MANUAL_BANCOLOMBIA' ||
    paymentMethod === 'MANUAL_DAVIPLATA'

  const isPending = paymentStatus === 'PENDING'

  if (!isManualPayment || !isPending) {
    return null
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionReference: transactionReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar el pago')
      }

      setShowModal(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <>
      {/* Botón de confirmar pago */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-dm-sans font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" />
        Confirmar Pago Manual
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
                    Confirmar Pago
                  </h3>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    Orden #{orderNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-dm-sans">
                  <strong>Importante:</strong> Confirma solo si has verificado que el pago fue recibido correctamente.
                  Esta acción activará el acceso del cliente y enviará el email de confirmación.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-dm-sans">
                  Referencia de transacción (opcional)
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Ej: Comprobante #123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-dm-sans focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-dm-sans">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la confirmación..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-dm-sans focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

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
                disabled={isConfirming}
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
  )
}
