import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, Copy, CheckCircle, AlertCircle, CreditCard, Calendar } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { CopyButton } from '@/components/pago/CopyButton'

interface NequiPaymentPageProps {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ orderNumber?: string }>
}

export const metadata: Metadata = {
  title: 'Instrucciones de Pago Nequi | Energía y Divinidad',
  description: 'Completa tu pago por Nequi',
}

export default async function NequiPaymentPage({
  params,
  searchParams,
}: NequiPaymentPageProps) {
  const { orderId } = await params
  const { orderNumber } = await searchParams

  // Get order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      manualPayment: true,
    },
  })

  if (!order) {
    notFound()
  }

  // Nequi account details (TODO: Move to env variables or database)
  const nequiNumber = process.env.NEQUI_NUMBER || '3001234567'
  const nequiName = process.env.NEQUI_NAME || 'Aleyda Vargas'

  const amount = order.amount.toString()
  const formattedAmount = Number(amount).toLocaleString('es-CO')

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-brand hover:text-brand/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-brand" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-brand mb-3">
              Instrucciones de Pago
            </h1>
            <p className="text-primary/70">
              Completa tu pago por Nequi para confirmar tu reserva
            </p>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary/10">
              <span className="text-sm text-primary/60">Número de Orden</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-primary">
                  {orderNumber || order.orderNumber}
                </span>
                <CopyButton text={orderNumber || order.orderNumber} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-primary/60">Total a Pagar</span>
              <span className="font-bold text-2xl text-brand">
                ${formattedAmount} {order.currency}
              </span>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-brand/5 rounded-lg p-6 mb-6">
            <h2 className="font-serif text-xl text-brand mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Pasos para Pagar con Nequi
            </h2>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-primary mb-1">
                    Abre tu app de Nequi
                  </p>
                  <p className="text-sm text-primary/70">
                    Ingresa a tu aplicación de Nequi en tu celular
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-primary mb-2">
                    Envía dinero a este número
                  </p>
                  <div className="bg-white rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-primary/60 mb-1">Número Nequi</p>
                        <p className="font-mono text-xl font-bold text-brand">
                          {nequiNumber}
                        </p>
                        <p className="text-sm text-primary/70 mt-1">{nequiName}</p>
                      </div>
                      <CopyButton text={nequiNumber} />
                    </div>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-primary mb-2">
                    Envía exactamente este monto
                  </p>
                  <div className="bg-white rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-primary/60 mb-1">Monto</p>
                        <p className="font-mono text-2xl font-bold text-brand">
                          ${formattedAmount} {order.currency}
                        </p>
                      </div>
                      <CopyButton text={amount} />
                    </div>
                  </div>
                  <p className="text-sm text-primary/60 mt-2">
                    ⚠️ Envía el monto exacto para facilitar la verificación
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium text-primary mb-2">
                    Incluye tu número de orden en el mensaje
                  </p>
                  <div className="bg-white rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-primary/60 mb-1">Mensaje sugerido</p>
                        <p className="font-mono text-sm text-primary">
                          Pago sesión {orderNumber || order.orderNumber}
                        </p>
                      </div>
                      <CopyButton
                        text={`Pago sesión ${orderNumber || order.orderNumber}`}
                      />
                    </div>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <p className="font-medium text-primary mb-1">
                    Toma un pantallazo del comprobante
                  </p>
                  <p className="text-sm text-primary/70">
                    Guarda el pantallazo de confirmación de Nequi para tus registros
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* What Happens Next */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="font-serif text-xl text-brand mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              ¿Qué Sigue Ahora?
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-primary/80">
                  <strong>Verificación:</strong> Revisaremos tu pago en un máximo de 24 horas
                </p>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-primary/80">
                  <strong>Confirmación:</strong> Recibirás un email de confirmación con los detalles de tu sesión
                </p>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-primary/80">
                  <strong>Recordatorio:</strong> Te enviaremos un recordatorio 24 horas antes de tu sesión
                </p>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-primary/80">
                  <strong>Instrucciones:</strong> Recibirás las instrucciones de preparación y el enlace de la sesión por email
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-brand/5 rounded-lg p-6 text-center">
            <p className="text-primary/80 mb-3">
              ¿Necesitas ayuda con tu pago?
            </p>
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contacto@energiaydivinidad.com'}?subject=Ayuda con pago - ${orderNumber || order.orderNumber}`}
              className="inline-flex items-center gap-2 text-brand hover:text-brand/80 font-medium transition-colors"
            >
              Contáctanos por Email
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </a>
          </div>

          {/* Go Back Home */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="text-primary/60 hover:text-brand transition-colors text-sm"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
