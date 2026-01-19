import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseEpaycoWebhook,
  type EpaycoWebhookPayload,
  type EpaycoTransactionStatus,
} from '@/lib/epayco'
import { processApprovedPayment } from '@/lib/payment-processor'
import { getAppUrl } from '@/lib/utils'

/**
 * POST /api/webhooks/epayco
 * Procesar confirmaciones de pago de ePayco
 *
 * ePayco envía una confirmación POST cuando se completa una transacción
 * con todos los datos del pago incluyendo la firma para validación
 */
export async function POST(request: NextRequest) {
  let payload: EpaycoWebhookPayload

  try {
    // ePayco puede enviar como form-data o JSON
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const body: Record<string, string> = {}
      formData.forEach((value, key) => {
        body[key] = value.toString()
      })
      payload = body as unknown as EpaycoWebhookPayload
    } else {
      payload = await request.json()
    }
  } catch (err) {
    console.error('Error parseando webhook ePayco:', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Validar payload y firma
  const parsed = parseEpaycoWebhook(payload as unknown as Record<string, string>)

  if (!parsed.valid) {
    console.error('Webhook ePayco inválido:', parsed.error)
    // ePayco espera respuesta 200 incluso si hay error
    return NextResponse.json({ received: true, error: parsed.error })
  }

  const validPayload = parsed.payload!

  // Generar ID único para el evento
  const eventId = `epayco_${validPayload.x_ref_payco}_${validPayload.x_transaction_id}`

  // Idempotencia: verificar si ya procesamos este evento
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  })

  if (existingEvent?.processed) {
    console.log(`Evento ${eventId} ya fue procesado`)
    return NextResponse.json({ received: true, processed: false })
  }

  // Registrar evento como recibido
  await prisma.webhookEvent.upsert({
    where: { eventId },
    create: {
      provider: 'epayco',
      eventId,
      eventType: `transaction.${validPayload.x_response}`,
      payload: validPayload as any,
      processed: false,
    },
    update: {},
  })

  try {
    await handleEpaycoTransaction(validPayload, parsed.normalizedStatus!)

    // Marcar como procesado exitosamente
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })

    return NextResponse.json({ received: true, processed: true })
  } catch (error: any) {
    console.error(`Error procesando webhook ePayco:`, error)

    // Registrar error
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        failed: true,
        errorMessage: error.message,
        retryCount: { increment: 1 },
      },
    })

    // ePayco espera 200 incluso con errores
    return NextResponse.json({ received: true, error: error.message })
  }
}

/**
 * GET /api/webhooks/epayco
 * ePayco también puede enviar confirmación por GET (redirect)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Convertir searchParams a objeto
  const payload: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    payload[key] = value
  })

  // Redirigir a página de confirmación con los datos
  const refPayco = payload.x_ref_payco || payload.ref_payco || ''
  const invoice = payload.x_id_invoice || payload.x_invoice || ''

  const appUrl = getAppUrl()
  const redirectUrl = `${appUrl}/pago/confirmacion?ref=${invoice}&ref_payco=${refPayco}`

  return NextResponse.redirect(redirectUrl)
}

/**
 * Procesar transacción de ePayco
 */
async function handleEpaycoTransaction(
  payload: EpaycoWebhookPayload,
  normalizedStatus: 'pending' | 'approved' | 'declined' | 'error'
) {
  const reference = payload.x_id_invoice
  const refPayco = payload.x_ref_payco
  const transactionId = payload.x_transaction_id
  const status = payload.x_response

  console.log(`[WEBHOOK/EPAYCO] Procesando transacción: ${refPayco} - ${reference} - ${status}`)

  // Buscar la orden por referencia (orderNumber)
  const order = await prisma.order.findFirst({
    where: { orderNumber: reference },
    include: { user: true },
  })

  if (!order) {
    console.error(`[WEBHOOK/EPAYCO] No se encontró orden con referencia ${reference}`)
    return
  }

  // Mapear status
  const paymentStatus = mapEpaycoStatus(status)

  // Actualizar orden
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus,
      metadata: {
        ...(order.metadata as object),
        epaycoRefPayco: refPayco,
        epaycoTransactionId: transactionId,
        epaycoStatus: status,
        epaycoResponse: payload.x_response_reason_text,
        epaycoUpdatedAt: new Date().toISOString(),
      },
    },
  })

  // Si el pago fue aprobado, usar el servicio centralizado
  if (normalizedStatus === 'approved') {
    const result = await processApprovedPayment(order, {
      transactionId,
    })

    if (!result.success) {
      console.error(`[WEBHOOK/EPAYCO] Error procesando pago: ${result.error}`)
      throw new Error(result.error)
    }
  } else if (normalizedStatus === 'declined' || normalizedStatus === 'error') {
    console.log(`[WEBHOOK/EPAYCO] Pago rechazado/fallido para orden ${order.id}: ${status}`)
    // TODO: Enviar notificación al usuario
  }
}

/**
 * Mapear status de ePayco a nuestro modelo
 */
function mapEpaycoStatus(
  status: EpaycoTransactionStatus
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  switch (status) {
    case 'Aceptada':
      return 'COMPLETED'
    case 'Pendiente':
    case 'Iniciada':
    case 'Retenida':
      return 'PENDING'
    case 'Rechazada':
    case 'Fallida':
    case 'Antifraude':
      return 'FAILED'
    case 'Reversada':
      return 'REFUNDED'
    case 'Cancelada':
    case 'Abandonada':
    case 'Expirada':
      return 'CANCELLED'
    default:
      return 'PENDING'
  }
}
