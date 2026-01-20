import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyNequiWebhookSignature } from '@/lib/nequi'
import { prisma } from '@/lib/prisma'
import { processPaymentWebhook } from '@/lib/payments'
import { sendAdminNotificationEmail } from '@/lib/email'

/**
 * POST /api/webhooks/nequi
 * Procesar eventos de webhooks de Nequi API Conecta
 *
 * Este endpoint maneja dos tipos de eventos:
 * 1. Suscripciones (lógica específica de Nequi)
 * 2. Pagos únicos (usa el procesador unificado)
 *
 * Eventos de suscripción:
 * - subscription.approved: Usuario aprobó la suscripción en la app
 * - payment.succeeded: Cobro automático exitoso
 * - payment.failed: Fallo en cobro automático
 * - subscription.cancelled: Suscripción cancelada
 *
 * Eventos de pago único:
 * - single_payment.completed / payment.single.completed
 * - payment.status (procesado por el adaptador unificado)
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headersList = await headers()
  const signature = headersList.get('x-nequi-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // Verificar firma del webhook
  const isValid = verifyNequiWebhookSignature(rawBody, signature)

  if (!isValid) {
    console.error('[WEBHOOK-NEQUI] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: WebhookEvent

  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    console.error('[WEBHOOK-NEQUI] Error parsing JSON:', err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { eventId, eventType, subscriptionId, data } = event

  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'Missing event data' }, { status: 400 })
  }

  // Determinar si es un evento de suscripción o pago único
  const isSubscriptionEvent = [
    'subscription.approved',
    'subscription.cancelled',
    'payment.succeeded',
    'payment.failed',
  ].includes(eventType)

  // Para pagos únicos, usar el procesador unificado
  if (!isSubscriptionEvent) {
    const clonedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: rawBody,
    })

    const result = await processPaymentWebhook('nequi', clonedRequest, rawBody)

    if (!result.success && !result.processed) {
      console.error('[WEBHOOK-NEQUI] Failed to process:', result.error)
    }

    return NextResponse.json({
      received: true,
      processed: result.processed,
      eventId: result.eventId,
    })
  }

  // Para eventos de suscripción, usar lógica específica
  // Idempotencia: verificar si ya procesamos este evento
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  })

  if (existingEvent?.processed) {
    console.log(`[WEBHOOK-NEQUI] Event ${eventId} already processed`)
    return NextResponse.json({ received: true, processed: false })
  }

  // Registrar evento como recibido
  await prisma.webhookEvent.upsert({
    where: { eventId },
    create: {
      provider: 'nequi',
      eventId,
      eventType,
      payload: JSON.parse(rawBody),
      processed: false,
    },
    update: {},
  })

  try {
    // Procesar según tipo de evento de suscripción
    switch (eventType) {
      case 'subscription.approved':
        await handleSubscriptionApproved(subscriptionId!, data)
        break

      case 'payment.succeeded':
        await handlePaymentSucceeded(subscriptionId!, data)
        break

      case 'payment.failed':
        await handlePaymentFailed(subscriptionId!, data)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(subscriptionId!, data)
        break
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[WEBHOOK-NEQUI] Error processing ${eventType}:`, error)

    // Registrar error
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        failed: true,
        errorMessage,
        retryCount: { increment: 1 },
      },
    })

    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 })
  }
}

// Types
interface WebhookEvent {
  eventId: string
  eventType: string
  subscriptionId?: string
  data?: Record<string, unknown>
}

/**
 * Manejar subscription.approved
 * El usuario aprobó la suscripción en su app Nequi
 */
async function handleSubscriptionApproved(
  subscriptionId: string,
  _data: Record<string, unknown> | undefined
) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`[WEBHOOK-NEQUI] Subscription not found: ${subscriptionId}`)
    return
  }

  // Actualizar estado a ACTIVE
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      nequiApprovedAt: new Date(),
    },
  })

  // Crear Entitlement para acceso a contenido
  await prisma.entitlement.create({
    data: {
      userId: subscription.userId,
      type: 'MEMBERSHIP',
      resourceId: subscription.membershipTierId,
      resourceName: subscription.membershipTierName,
      expiresAt: subscription.currentPeriodEnd,
      subscriptionId: subscription.id,
    },
  })

  console.log(`[WEBHOOK-NEQUI] Subscription ${subscription.id} approved and activated`)

  // Obtener datos del usuario para notificación
  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { email: true, name: true },
  })

  // Notificar al administrador
  if (user?.email) {
    try {
      await sendAdminNotificationEmail({
        saleType: 'MEMBERSHIP',
        customerName: user.name || 'Cliente',
        customerEmail: user.email,
        itemName: subscription.membershipTierName,
        amount: Number(subscription.amount),
        currency: subscription.currency as 'COP' | 'USD' | 'EUR',
        paymentMethod: 'NEQUI_PUSH',
        orderNumber: `SUB-${subscription.id.slice(0, 8).toUpperCase()}`,
        transactionId: subscriptionId,
        membershipPlan: subscription.membershipTierName,
        membershipInterval: subscription.billingInterval === 'YEARLY' ? 'yearly' : 'monthly',
      })
      console.log(`[WEBHOOK-NEQUI] Admin notification sent for membership ${subscription.id}`)
    } catch (error) {
      console.error('[WEBHOOK-NEQUI] Error sending admin notification:', error)
    }
  }
}

/**
 * Manejar payment.succeeded
 * Cobro automático exitoso (renovación)
 */
async function handlePaymentSucceeded(
  subscriptionId: string,
  _data: Record<string, unknown> | undefined
) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`[WEBHOOK-NEQUI] Subscription not found: ${subscriptionId}`)
    return
  }

  // Calcular nuevo período
  const newPeriodStart = new Date()
  const newPeriodEnd = new Date()

  if (subscription.billingInterval === 'MONTHLY') {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
  } else {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
  }

  // Actualizar suscripción
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
    },
  })

  // Extender Entitlement
  await prisma.entitlement.updateMany({
    where: {
      subscriptionId: subscription.id,
      type: 'MEMBERSHIP',
    },
    data: {
      expiresAt: newPeriodEnd,
    },
  })

  console.log(`[WEBHOOK-NEQUI] Renewal successful for subscription ${subscription.id}`)
}

/**
 * Manejar payment.failed
 * Fallo en cobro automático
 */
async function handlePaymentFailed(
  subscriptionId: string,
  _data: Record<string, unknown> | undefined
) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`[WEBHOOK-NEQUI] Subscription not found: ${subscriptionId}`)
    return
  }

  // Cambiar estado a PAST_DUE
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
    },
  })

  console.log(`[WEBHOOK-NEQUI] Payment failed for subscription ${subscription.id}`)

  // TODO: Enviar notificación al usuario
}

/**
 * Manejar subscription.cancelled
 * Suscripción cancelada
 */
async function handleSubscriptionCancelled(
  subscriptionId: string,
  _data: Record<string, unknown> | undefined
) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`[WEBHOOK-NEQUI] Subscription not found: ${subscriptionId}`)
    return
  }

  // Cambiar estado a CANCELLED
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  })

  // Revocar Entitlements
  await prisma.entitlement.updateMany({
    where: {
      subscriptionId: subscription.id,
      type: 'MEMBERSHIP',
    },
    data: {
      revoked: true,
      revokedAt: new Date(),
      revokedReason: 'Subscription cancelled',
    },
  })

  console.log(`[WEBHOOK-NEQUI] Subscription ${subscription.id} cancelled and entitlements revoked`)
}
