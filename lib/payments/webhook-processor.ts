/**
 * Webhook Processor
 * Procesamiento unificado de webhooks de todas las pasarelas
 */

import { processApprovedPayment, type OrderWithUser } from '@/lib/payment-processor'
import { prisma } from '@/lib/prisma'

import { getGateway, type GatewayName } from './gateway-selector'
import {
  type PaymentGatewayName,
  type TransactionStatus,
  type WebhookVerificationResult,
} from './types'

export interface WebhookProcessingResult {
  success: boolean
  processed: boolean
  eventId?: string
  error?: string
}

/**
 * Mapea el status normalizado al PaymentStatus de Prisma
 */
function mapToPaymentStatus(
  status: TransactionStatus
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  const statusMap: Record<
    TransactionStatus,
    'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED'
  > = {
    PENDING: 'PENDING',
    APPROVED: 'COMPLETED',
    DECLINED: 'FAILED',
    VOIDED: 'CANCELLED',
    ERROR: 'FAILED',
    EXPIRED: 'CANCELLED',
  }
  return statusMap[status] || 'PENDING'
}

/**
 * Genera un ID único para el evento de webhook
 */
function generateEventId(
  provider: PaymentGatewayName,
  verificationResult: WebhookVerificationResult
): string {
  const transactionId = verificationResult.transactionId || 'unknown'
  const timestamp = Date.now()
  return `${provider}_${transactionId}_${timestamp}`
}

/**
 * Verifica si el evento ya fue procesado (idempotencia)
 */
async function checkIdempotency(eventId: string): Promise<boolean> {
  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId },
  })
  return existing?.processed ?? false
}

/**
 * Registra el evento de webhook
 */
async function registerWebhookEvent(
  eventId: string,
  provider: PaymentGatewayName,
  eventType: string,
  payload: unknown
): Promise<void> {
  await prisma.webhookEvent.upsert({
    where: { eventId },
    create: {
      provider,
      eventId,
      eventType,
      payload: payload as object,
      processed: false,
    },
    update: {},
  })
}

/**
 * Marca el evento como procesado
 */
async function markEventProcessed(eventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { eventId },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  })
}

/**
 * Marca el evento como fallido
 */
async function markEventFailed(eventId: string, error: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { eventId },
    data: {
      failed: true,
      errorMessage: error,
      retryCount: { increment: 1 },
    },
  })
}

/**
 * Procesa un webhook de pago de forma unificada
 */
export async function processPaymentWebhook(
  gatewayName: GatewayName,
  request: Request,
  rawBody?: string
): Promise<WebhookProcessingResult> {
  const gateway = getGateway(gatewayName)

  // 1. Verificar el webhook
  let verificationResult: WebhookVerificationResult
  try {
    verificationResult = await gateway.verifyWebhook(request, rawBody)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`[WEBHOOK/${gatewayName.toUpperCase()}] Verification error:`, error)
    return {
      success: false,
      processed: false,
      error: errorMessage,
    }
  }

  if (!verificationResult.valid) {
    console.error(`[WEBHOOK/${gatewayName.toUpperCase()}] Invalid webhook:`, verificationResult.error)
    return {
      success: false,
      processed: false,
      error: verificationResult.error || 'Invalid webhook',
    }
  }

  // 2. Generar ID de evento para idempotencia
  const eventId = generateEventId(gateway.name, verificationResult)

  // 3. Verificar idempotencia
  const alreadyProcessed = await checkIdempotency(eventId)
  if (alreadyProcessed) {
    console.log(`[WEBHOOK/${gatewayName.toUpperCase()}] Event ${eventId} already processed`)
    return {
      success: true,
      processed: false,
      eventId,
    }
  }

  // 4. Registrar evento
  await registerWebhookEvent(
    eventId,
    gateway.name,
    verificationResult.eventType || 'unknown',
    verificationResult.rawData
  )

  // 5. Buscar la orden asociada
  const reference = verificationResult.reference
  if (!reference) {
    console.warn(`[WEBHOOK/${gatewayName.toUpperCase()}] No reference in webhook`)
    return {
      success: true,
      processed: false,
      eventId,
    }
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber: reference },
    include: { user: true },
  })

  if (!order) {
    console.error(`[WEBHOOK/${gatewayName.toUpperCase()}] Order not found: ${reference}`)
    return {
      success: true,
      processed: false,
      eventId,
      error: `Order not found: ${reference}`,
    }
  }

  try {
    // 6. Actualizar orden con estado del webhook
    const paymentStatus = mapToPaymentStatus(verificationResult.status || 'PENDING')

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        metadata: {
          ...(order.metadata as object),
          [`${gatewayName}TransactionId`]: verificationResult.transactionId,
          [`${gatewayName}Status`]: verificationResult.status,
          [`${gatewayName}UpdatedAt`]: new Date().toISOString(),
        },
      },
    })

    // 7. Si el pago fue aprobado, procesar
    if (verificationResult.status === 'APPROVED') {
      const result = await processApprovedPayment(order as unknown as OrderWithUser, {
        transactionId: verificationResult.transactionId,
      })

      if (!result.success) {
        console.error(
          `[WEBHOOK/${gatewayName.toUpperCase()}] Payment processing error:`,
          result.error
        )
        await markEventFailed(eventId, result.error || 'Unknown error')
        return {
          success: false,
          processed: false,
          eventId,
          error: result.error,
        }
      }
    } else if (
      verificationResult.status === 'DECLINED' ||
      verificationResult.status === 'ERROR' ||
      verificationResult.status === 'VOIDED'
    ) {
      console.log(
        `[WEBHOOK/${gatewayName.toUpperCase()}] Payment failed/declined for order ${order.id}: ${verificationResult.status}`
      )
      // TODO: Enviar notificación al usuario sobre el pago fallido
    }

    // 8. Marcar como procesado
    await markEventProcessed(eventId)

    console.log(
      `[WEBHOOK/${gatewayName.toUpperCase()}] Successfully processed event ${eventId} for order ${order.orderNumber}`
    )

    return {
      success: true,
      processed: true,
      eventId,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`[WEBHOOK/${gatewayName.toUpperCase()}] Processing error:`, error)
    await markEventFailed(eventId, errorMessage)
    return {
      success: false,
      processed: false,
      eventId,
      error: errorMessage,
    }
  }
}
