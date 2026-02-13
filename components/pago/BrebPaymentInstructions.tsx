'use client'

import { Copy, Check, QrCode, Key, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface BrebPaymentInstructionsProps {
  orderNumber: string
  amount: number
  currency: string
  itemName: string
  qrCodeUrl?: string // URL del QR de Bancolombia (opcional)
}

// Llave Bancolombia Negocios (configurada en variables de entorno)
const BANCOLOMBIA_BUSINESS_KEY = process.env.NEXT_PUBLIC_BANCOLOMBIA_BREB_KEY || ''
const BANCOLOMBIA_BUSINESS_NAME = process.env.NEXT_PUBLIC_BANCOLOMBIA_BUSINESS_NAME || 'Energía y Divinidad'

export function BrebPaymentInstructions({
  orderNumber,
  amount,
  currency,
  itemName,
  qrCodeUrl,
}: BrebPaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const formatAmount = (value: number, curr: string) => {
    return new Intl.NumberFormat(curr === 'COP' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="font-gazeta text-2xl text-[#654177] mb-2">
          Pago Pendiente con Bre-B
        </h2>
        <p className="font-dm-sans text-gray-600">
          Realiza el pago desde tu app bancaria usando Bre-B
        </p>
      </div>

      {/* Resumen del pedido */}
      <div className="bg-[#f8f0f5] rounded-xl p-4">
        <p className="font-dm-sans text-sm text-gray-600 mb-1">Producto</p>
        <p className="font-dm-sans font-medium text-[#654177]">{itemName}</p>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#e8d8e8]">
          <span className="font-dm-sans text-gray-600">Total a pagar:</span>
          <span className="font-dm-sans font-bold text-xl text-[#654177]">
            {formatAmount(amount, currency)}
          </span>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="space-y-4">
        <h3 className="font-gazeta text-lg text-[#654177]">
          Cómo realizar el pago
        </h3>

        <div className="space-y-3">
          {/* Paso 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-[#4944a4] text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-dm-sans font-medium text-gray-900">
                Abre tu app bancaria
              </p>
              <p className="font-dm-sans text-sm text-gray-600">
                Bancolombia, Nequi, Davivienda, u otra app que soporte Bre-B
              </p>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-[#4944a4] text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-dm-sans font-medium text-gray-900">
                Selecciona &quot;Transferir con Bre-B&quot; o &quot;Pagar con llave&quot;
              </p>
            </div>
          </div>

          {/* Paso 3 - Llave o QR */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-[#4944a4] text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <p className="font-dm-sans font-medium text-gray-900 mb-2">
                Usa nuestra llave Bre-B o escanea el QR
              </p>

              {/* Llave Bancolombia */}
              {BANCOLOMBIA_BUSINESS_KEY ? (
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-[#8A4BAF]" />
                    <span className="font-dm-sans text-sm text-gray-600">
                      Llave Bre-B ({BANCOLOMBIA_BUSINESS_NAME})
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-lg font-medium text-[#654177] break-all">
                      {BANCOLOMBIA_BUSINESS_KEY}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(BANCOLOMBIA_BUSINESS_KEY, 'key')}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-[#8A4BAF]/10 transition-colors"
                      title="Copiar llave"
                    >
                      {copiedField === 'key' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-[#8A4BAF]" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-dm-sans text-sm text-red-700">
                      Llave Bre-B no configurada. Por favor contacta soporte.
                    </span>
                  </div>
                </div>
              )}

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="w-4 h-4 text-[#8A4BAF]" />
                    <span className="font-dm-sans text-sm text-gray-600">
                      O escanea este código QR
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <Image
                      src={qrCodeUrl}
                      alt="Código QR Bre-B"
                      width={180}
                      height={180}
                      className="mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Paso 4 - Monto */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-[#4944a4] text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
              4
            </div>
            <div className="flex-1">
              <p className="font-dm-sans font-medium text-gray-900 mb-2">
                Ingresa el monto exacto
              </p>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="font-mono text-lg font-medium text-[#654177]">
                  {formatAmount(amount, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(amount.toString(), 'amount')}
                  className="p-2 rounded-lg hover:bg-[#8A4BAF]/10 transition-colors"
                  title="Copiar monto"
                >
                  {copiedField === 'amount' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-[#8A4BAF]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Paso 5 - Referencia */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-[#4944a4] text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
              5
            </div>
            <div className="flex-1">
              <p className="font-dm-sans font-medium text-gray-900 mb-2">
                En la descripción/nota, incluye tu número de orden
              </p>
              <div className="bg-yellow-50 rounded-lg p-3 flex items-center justify-between border border-yellow-200">
                <span className="font-mono text-lg font-bold text-[#654177]">
                  {orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(orderNumber, 'order')}
                  className="p-2 rounded-lg hover:bg-yellow-100 transition-colors"
                  title="Copiar número de orden"
                >
                  {copiedField === 'order' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-[#8A4BAF]" />
                  )}
                </button>
              </div>
              <p className="font-dm-sans text-xs text-yellow-700 mt-2 flex items-start gap-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Es importante incluir este número para identificar tu pago</span>
              </p>
            </div>
          </div>

          {/* Paso 6 - Confirmar */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-[#4944a4] text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
              6
            </div>
            <div>
              <p className="font-dm-sans font-medium text-gray-900">
                Confirma el pago en tu app
              </p>
              <p className="font-dm-sans text-sm text-gray-600">
                El pago se procesa instantáneamente con Bre-B
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enviar comprobante - Paso importante */}
      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center font-dm-sans font-bold text-sm">
            7
          </div>
          <div className="flex-1">
            <p className="font-dm-sans font-medium text-green-900 mb-2">
              Envía el comprobante por WhatsApp
            </p>
            <p className="font-dm-sans text-sm text-green-700 mb-3">
              Para confirmar tu pago más rápido, envíanos una captura del comprobante junto con tu número de orden:
            </p>
            <div className="bg-white rounded-lg p-3 border border-green-200 mb-3">
              <p className="font-mono text-sm text-gray-600">
                Orden: <span className="font-bold text-[#654177]">{orderNumber}</span>
              </p>
            </div>
            <a
              href={`https://wa.me/573151165921?text=Hola!%20Acabo%20de%20realizar%20un%20pago%20con%20Bre-B.%20Mi%20número%20de%20orden%20es:%20${orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              <svg className="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar comprobante
            </a>
          </div>
        </div>
      </div>

      {/* Nota importante */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-dm-sans font-medium text-blue-900 mb-1">
              ¿Qué pasa después?
            </p>
            <p className="font-dm-sans text-sm text-blue-700">
              Una vez verifiquemos tu pago, activaremos tu compra y recibirás un email de confirmación.
              Enviar el comprobante por WhatsApp acelera este proceso.
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp alternativo */}
      <div className="text-center pt-2">
        <p className="font-dm-sans text-sm text-gray-500">
          ¿Tienes problemas?{' '}
          <a
            href="https://wa.me/573151165921"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8A4BAF] hover:underline font-medium"
          >
            Contáctanos por WhatsApp
          </a>
        </p>
      </div>
    </div>
  )
}
