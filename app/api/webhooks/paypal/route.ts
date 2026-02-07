import { NextRequest, NextResponse } from 'next/server'
import { processPaymentWebhook } from '@/lib/payments'

/**
 * POST /api/webhooks/paypal
 * Procesar eventos de webhooks de PayPal
 *
 * Eventos importantes:
 * - CHECKOUT.ORDER.APPROVED: Usuario aprobó el pago
 * - PAYMENT.CAPTURE.COMPLETED: Pago capturado exitosamente
 * - PAYMENT.CAPTURE.DENIED: Pago rechazado
 * - PAYMENT.CAPTURE.REFUNDED: Pago reembolsado
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  console.log('[WEBHOOK/PAYPAL] Received webhook')

  // Clonar request con el body original para que el procesador pueda leer headers
  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  })

  const result = await processPaymentWebhook('paypal', clonedRequest, rawBody)

  if (!result.success) {
    console.error('[WEBHOOK/PAYPAL] Error processing webhook:', result.error)
    // PayPal espera 200 para no reintentar
    return NextResponse.json(
      { received: true, error: result.error },
      { status: result.error?.includes('Invalid') ? 401 : 200 }
    )
  }

  console.log('[WEBHOOK/PAYPAL] Webhook processed successfully:', result.eventId)

  return NextResponse.json({
    received: true,
    processed: result.processed,
    eventId: result.eventId,
  })
}

/**
 * GET /api/webhooks/paypal
 * PayPal puede enviar GET para verificar el endpoint
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
