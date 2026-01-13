import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

interface StripePaymentPageProps {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ orderNumber?: string }>
}

export const metadata: Metadata = {
  title: 'Pago con Tarjeta | Energía y Divinidad',
  description: 'Completa tu pago con tarjeta de crédito o débito',
}

export default async function StripePaymentPage({
  params,
  searchParams,
}: StripePaymentPageProps) {
  const { orderId } = await params
  const { orderNumber } = await searchParams

  // Get order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    notFound()
  }

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
              Pago con Tarjeta
            </h1>
            <p className="text-primary/70">
              Pago seguro con Stripe
            </p>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary/10">
              <span className="text-sm text-primary/60">Número de Orden</span>
              <span className="font-mono font-medium text-primary">
                {orderNumber || order.orderNumber}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-primary/60">Total a Pagar</span>
              <span className="font-bold text-2xl text-brand">
                ${formattedAmount} {order.currency}
              </span>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="bg-brand/5 rounded-lg p-8 text-center">
            <h2 className="font-serif text-2xl text-brand mb-4">
              Próximamente
            </h2>
            <p className="text-primary/70 mb-6">
              La integración con Stripe estará disponible muy pronto. Por ahora, puedes contactarnos directamente para coordinar tu pago.
            </p>
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contacto@energiaydivinidad.com'}?subject=Pago orden ${orderNumber || order.orderNumber}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              Contactar para Coordinar Pago
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
