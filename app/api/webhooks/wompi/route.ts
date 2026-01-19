import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  verifyWompiWebhookSignature,
  type WompiWebhookEvent,
  type WompiTransactionStatus,
} from '@/lib/wompi'
import { processApprovedPayment } from '@/lib/payment-processor'

/**
 * POST /api/webhooks/wompi
 * Procesar eventos de webhooks de Wompi
 *
 * Eventos manejados:
 * - transaction.updated: Actualización de estado de transacción
 * - nequi_token.updated: Actualización de token de Nequi (para suscripciones)
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()

  // Wompi envía la firma en el header x-event-checksum
  const signature = headersList.get('x-event-checksum') || ''
  const timestamp = headersList.get('x-event-timestamp') || Date.now().toString()

  // Verificar firma
  if (!verifyWompiWebhookSignature(body, signature, timestamp)) {
    console.error('Firma de webhook Wompi inválida')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: WompiWebhookEvent

  try {
    event = JSON.parse(body)
  } catch (err) {
    console.error('Error parseando webhook Wompi:', err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Generar ID único para el evento
  const eventId = `wompi_${event.timestamp}_${event.data.transaction?.id || 'unknown'}`

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
      provider: 'wompi',
      eventId,
      eventType: event.event,
      payload: event as any,
      processed: false,
    },
    update: {},
  })

  try {
    switch (event.event) {
      case 'transaction.updated':
        if (event.data.transaction) {
          await handleTransactionUpdated(event.data.transaction)
        }
        break

      case 'nequi_token.updated':
        // Manejar actualizaciones de token Nequi para suscripciones
        console.log('Token Nequi actualizado:', event.data.nequi_token)
        break

      default:
        console.log(`Evento Wompi no manejado: ${event.event}`)
    }

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
    console.error(`Error procesando webhook Wompi ${event.event}:`, error)

    // Registrar error
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        failed: true,
        errorMessage: error.message,
        retryCount: { increment: 1 },
      },
    })

    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 })
  }
}

interface WompiTransactionData {
  id: string
  reference: string
  status: WompiTransactionStatus
  amountInCents: number
  currency: string
  paymentMethodType: string
  customerEmail: string
}

/**
 * Manejar transaction.updated
 * Se dispara cuando cambia el estado de una transacción
 */
async function handleTransactionUpdated(transaction: WompiTransactionData) {
  const { reference, status, id: transactionId } = transaction

  console.log(`[WEBHOOK/WOMPI] Procesando transacción: ${transactionId} - ${reference} - ${status}`)

  // Buscar la orden por referencia (orderNumber)
  const order = await prisma.order.findFirst({
    where: { orderNumber: reference },
    include: { user: true },
  })

  if (!order) {
    console.error(`[WEBHOOK/WOMPI] No se encontró orden con referencia ${reference}`)
    return
  }

  // Mapear status de Wompi a nuestro modelo
  const paymentStatus = mapWompiStatus(status)

  // Actualizar orden
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus,
      metadata: {
        ...(order.metadata as object),
        wompiTransactionId: transactionId,
        wompiStatus: status,
        wompiUpdatedAt: new Date().toISOString(),
      },
    },
  })

  // Si el pago fue aprobado, usar el servicio centralizado
  if (status === 'APPROVED') {
    const result = await processApprovedPayment(order, {
      transactionId,
    })

    if (!result.success) {
      console.error(`[WEBHOOK/WOMPI] Error procesando pago: ${result.error}`)
      throw new Error(result.error)
    }
  } else if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
    console.log(`[WEBHOOK/WOMPI] Pago rechazado/fallido para orden ${order.id}: ${status}`)
    // TODO: Enviar notificación al usuario
  }
}

/**
 * Mapear status de Wompi a nuestro modelo
 */
function mapWompiStatus(
  status: WompiTransactionStatus
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  switch (status) {
    case 'APPROVED':
      return 'COMPLETED'
    case 'PENDING':
      return 'PENDING'
    case 'DECLINED':
    case 'ERROR':
      return 'FAILED'
    case 'VOIDED':
      return 'CANCELLED'
    default:
      return 'PENDING'
  }
}
