import { NextRequest, NextResponse } from 'next/server'
import { processPaymentWebhook } from '@/lib/payments'
import { getAppUrl } from '@/lib/utils'

/**
 * POST /api/webhooks/epayco
 * Procesar confirmaciones de pago de ePayco
 *
 * Este endpoint usa el procesador unificado de webhooks.
 * ePayco envía una confirmación POST cuando se completa una transacción.
 */
export async function POST(request: NextRequest) {
  // ePayco puede enviar como form-data o JSON, así que no podemos clonar el request
  // El adaptador maneja ambos formatos internamente
  const result = await processPaymentWebhook('epayco', request)

  // ePayco espera respuesta 200 incluso con errores para evitar reintentos infinitos
  return NextResponse.json({
    received: true,
    processed: result.processed,
    eventId: result.eventId,
    error: result.error,
  })
}

/**
 * GET /api/webhooks/epayco
 * ePayco también puede enviar confirmación por GET (redirect)
 * Este handler redirige al usuario a la página de confirmación
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Extraer parámetros de la URL
  const refPayco = searchParams.get('x_ref_payco') || searchParams.get('ref_payco') || ''
  const invoice = searchParams.get('x_id_invoice') || searchParams.get('x_invoice') || ''

  const appUrl = getAppUrl()
  const redirectUrl = `${appUrl}/pago/confirmacion?ref=${invoice}&ref_payco=${refPayco}`

  return NextResponse.redirect(redirectUrl)
}
