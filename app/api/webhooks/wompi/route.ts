import { NextRequest, NextResponse } from 'next/server'

import { processPaymentWebhook } from '@/lib/payments'

/**
 * POST /api/webhooks/wompi
 * Procesar eventos de webhooks de Wompi
 *
 * Este endpoint usa el procesador unificado de webhooks.
 * Eventos manejados automáticamente por el adaptador:
 * - transaction.updated: Actualización de estado de transacción
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Clonar request con el body original para que el procesador pueda leer headers
  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  })

  const result = await processPaymentWebhook('wompi', clonedRequest, rawBody)

  if (!result.success) {
    // Wompi espera 200 en la mayoría de casos para no reintentar innecesariamente
    return NextResponse.json(
      { received: true, error: result.error },
      { status: result.error?.includes('Invalid') ? 401 : 500 }
    )
  }

  return NextResponse.json({
    received: true,
    processed: result.processed,
    eventId: result.eventId,
  })
}
