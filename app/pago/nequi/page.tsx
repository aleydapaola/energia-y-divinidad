'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Copy, AlertCircle, CreditCard, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Copiar"
    >
      {copied ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <Copy className="w-5 h-5 text-gray-400" />
      )}
    </button>
  )
}

function NequiPaymentContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const amount = searchParams.get('amount') || '0'
  const type = searchParams.get('type') || 'single'

  const nequiNumber = process.env.NEXT_PUBLIC_NEQUI_NUMBER || '3001234567'
  const nequiName = process.env.NEXT_PUBLIC_NEQUI_NAME || 'Aleyda Vargas'

  const formattedAmount = Number(amount).toLocaleString('es-CO')
  const productName = type === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión Individual'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Link
            href="/sesiones"
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] transition-colors mb-6 font-dm-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Sesiones</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-[#8A4BAF]" />
            </div>
            <h1 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mb-3">
              Pago con Nequi
            </h1>
            <p className="font-dm-sans text-[#654177]/70">
              Completa tu pago para confirmar tu {productName.toLowerCase()}
            </p>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-[#8A4BAF]/10">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <span className="font-dm-sans text-sm text-gray-500">Producto</span>
              <span className="font-dm-sans font-medium text-[#654177]">
                {productName}
              </span>
            </div>

            {bookingId && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <span className="font-dm-sans text-sm text-gray-500">Referencia</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[#654177]">
                    {bookingId.slice(0, 8).toUpperCase()}
                  </span>
                  <CopyButton text={bookingId.slice(0, 8).toUpperCase()} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-dm-sans text-sm text-gray-500">Total a Pagar</span>
              <span className="font-gazeta text-2xl text-[#8A4BAF]">
                ${formattedAmount} COP
              </span>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-[#8A4BAF]/5 rounded-2xl p-6 mb-6">
            <h2 className="font-gazeta text-xl text-[#8A4BAF] mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Pasos para Pagar
            </h2>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center font-dm-sans font-bold">
                  1
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-[#654177] mb-1">
                    Abre tu app de Nequi
                  </p>
                  <p className="font-dm-sans text-sm text-gray-600">
                    Ingresa a tu aplicación de Nequi en tu celular
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center font-dm-sans font-bold">
                  2
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-[#654177] mb-2">
                    Envía dinero a este número
                  </p>
                  <div className="bg-white rounded-xl p-4 mb-2 border border-[#8A4BAF]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-dm-sans text-sm text-gray-500 mb-1">Número Nequi</p>
                        <p className="font-mono text-xl font-bold text-[#8A4BAF]">
                          {nequiNumber}
                        </p>
                        <p className="font-dm-sans text-sm text-gray-600 mt-1">{nequiName}</p>
                      </div>
                      <CopyButton text={nequiNumber} />
                    </div>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center font-dm-sans font-bold">
                  3
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-[#654177] mb-2">
                    Envía exactamente este monto
                  </p>
                  <div className="bg-white rounded-xl p-4 mb-2 border border-[#8A4BAF]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-dm-sans text-sm text-gray-500 mb-1">Monto</p>
                        <p className="font-mono text-2xl font-bold text-[#8A4BAF]">
                          ${formattedAmount} COP
                        </p>
                      </div>
                      <CopyButton text={amount} />
                    </div>
                  </div>
                  <p className="font-dm-sans text-sm text-amber-600 mt-2">
                    ⚠️ Envía el monto exacto para facilitar la verificación
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center font-dm-sans font-bold">
                  4
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-[#654177] mb-2">
                    Incluye la referencia en el mensaje
                  </p>
                  <div className="bg-white rounded-xl p-4 mb-2 border border-[#8A4BAF]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-dm-sans text-sm text-gray-500 mb-1">Mensaje</p>
                        <p className="font-mono text-sm text-[#654177]">
                          {productName} {bookingId?.slice(0, 8).toUpperCase() || ''}
                        </p>
                      </div>
                      <CopyButton text={`${productName} ${bookingId?.slice(0, 8).toUpperCase() || ''}`} />
                    </div>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center font-dm-sans font-bold">
                  5
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-[#654177] mb-1">
                    Guarda el comprobante
                  </p>
                  <p className="font-dm-sans text-sm text-gray-600">
                    Toma un pantallazo de la confirmación de Nequi
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* What Happens Next */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-[#8A4BAF]/10">
            <h2 className="font-gazeta text-xl text-[#8A4BAF] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              ¿Qué Sigue?
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-0.5" />
                <p className="font-dm-sans text-gray-700">
                  <strong>Verificación:</strong> Revisaremos tu pago en máximo 24 horas
                </p>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-0.5" />
                <p className="font-dm-sans text-gray-700">
                  <strong>Confirmación:</strong> Recibirás un email con los detalles
                </p>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-0.5" />
                <p className="font-dm-sans text-gray-700">
                  <strong>Recordatorio:</strong> Te avisaremos 24h antes de tu sesión
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-[#8A4BAF]/5 rounded-2xl p-6 text-center">
            <p className="font-dm-sans text-gray-600 mb-3">
              ¿Necesitas ayuda con tu pago?
            </p>
            <a
              href="https://wa.me/573151165921"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] font-dm-sans font-medium transition-colors"
            >
              Escríbenos por WhatsApp
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </a>
          </div>

          {/* Go Back */}
          <div className="text-center mt-8">
            <Link
              href="/sesiones"
              className="font-dm-sans text-gray-500 hover:text-[#8A4BAF] transition-colors text-sm"
            >
              Volver a Sesiones
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NequiPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8A4BAF]"></div>
      </div>
    }>
      <NequiPaymentContent />
    </Suspense>
  )
}
