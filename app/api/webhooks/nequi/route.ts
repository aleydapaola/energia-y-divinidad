import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyNequiWebhookSignature } from '@/lib/nequi'
import { prisma } from '@/lib/prisma'
import { getAppUrl } from '@/lib/utils'

/**
 * POST /api/webhooks/nequi
 * Procesar eventos de webhooks de Nequi API Conecta
 *
 * Eventos esperados:
 * - subscription.approved: Usuario aprobó la suscripción en la app
 * - payment.succeeded: Cobro automático exitoso
 * - payment.failed: Fallo en cobro automático
 * - subscription.cancelled: Suscripción cancelada por el usuario o por Nequi
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('x-nequi-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // Verificar firma del webhook
  const isValid = verifyNequiWebhookSignature(body, signature)

  if (!isValid) {
    console.error('Firma de webhook de Nequi inválida')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any

  try {
    event = JSON.parse(body)
  } catch (err) {
    console.error('Error parseando webhook de Nequi:', err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Estructura esperada del evento:
  // {
  //   eventId: string,
  //   eventType: string,
  //   subscriptionId: string,
  //   data: { ... }
  // }

  const { eventId, eventType, subscriptionId, data } = event

  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'Missing event data' }, { status: 400 })
  }

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
      provider: 'nequi',
      eventId,
      eventType,
      payload: event,
      processed: false,
    },
    update: {},
  })

  try {
    // Procesar según tipo de evento
    switch (eventType) {
      case 'subscription.approved':
        await handleSubscriptionApproved(subscriptionId, data)
        break

      case 'payment.succeeded':
        await handlePaymentSucceeded(subscriptionId, data)
        break

      case 'payment.failed':
        await handlePaymentFailed(subscriptionId, data)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(subscriptionId, data)
        break

      // Pagos únicos (no suscripciones)
      case 'single_payment.completed':
      case 'payment.single.completed':
        await handleSinglePaymentCompleted(data)
        break

      default:
        console.log(`Evento de Nequi no manejado: ${eventType}`)
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
    console.error(`Error procesando webhook de Nequi ${eventType}:`, error)

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

/**
 * Manejar subscription.approved
 * El usuario aprobó la suscripción en su app Nequi
 */
async function handleSubscriptionApproved(subscriptionId: string, data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con nequiSubscriptionId ${subscriptionId}`)
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

  console.log(`Suscripción ${subscription.id} aprobada y activada`)

  // TODO: Enviar email de bienvenida
}

/**
 * Manejar payment.succeeded
 * Cobro automático exitoso (renovación)
 */
async function handlePaymentSucceeded(subscriptionId: string, data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con nequiSubscriptionId ${subscriptionId}`)
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

  // TODO: Registrar orden de renovación cuando se implemente el flujo de órdenes para Nequi
  // El modelo Order actual requiere campos específicos que no aplican para renovaciones automáticas de Nequi

  console.log(`Renovación exitosa para suscripción ${subscription.id}`)
}

/**
 * Manejar payment.failed
 * Fallo en cobro automático
 */
async function handlePaymentFailed(subscriptionId: string, data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con nequiSubscriptionId ${subscriptionId}`)
    return
  }

  // Cambiar estado a PAST_DUE
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
    },
  })

  console.log(`Pago fallido para suscripción ${subscription.id}`)

  // TODO: Enviar notificación al usuario
}

/**
 * Manejar subscription.cancelled
 * Suscripción cancelada
 */
async function handleSubscriptionCancelled(subscriptionId: string, data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { nequiSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con nequiSubscriptionId ${subscriptionId}`)
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

  console.log(`Suscripción ${subscription.id} cancelada y entitlements revocados`)
}

/**
 * Manejar single_payment.completed / payment.single.completed
 * Pago único completado (para sesiones individuales o packs)
 */
async function handleSinglePaymentCompleted(data: any) {
  // Estructura esperada:
  // data: { bookingId: string, transactionId: string, amount: number, ... }
  const { bookingId, transactionId } = data

  if (!bookingId) {
    console.error('Falta bookingId en evento de pago único')
    return
  }

  // Buscar el booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: { id: true, email: true, name: true }
      }
    }
  })

  if (!booking) {
    console.error(`No se encontró booking con ID ${bookingId}`)
    return
  }

  // Si ya está procesado, ignorar
  if (booking.paymentStatus === 'COMPLETED') {
    console.log(`Booking ${bookingId} ya tiene pago completado`)
    return
  }

  // Actualizar booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      adminNotes: transactionId ? `Nequi Transaction ID: ${transactionId}` : undefined,
    },
  })

  // Si es un pack de sesiones (8 sesiones), generar código
  if (booking.sessionsTotal === 8) {
    const appUrl = getAppUrl()
    const internalSecret = process.env.INTERNAL_API_SECRET

    try {
      const response = await fetch(`${appUrl}/api/checkout/generate-pack-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': internalSecret || '',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          userId: booking.userId,
          userEmail: booking.user?.email || '',
          userName: booking.user?.name || 'Querida alma',
          amount: Number(booking.amount),
          currency: booking.currency as 'COP' | 'USD' | 'EUR',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Error generando código de pack (Nequi):', error)
        return
      }

      const result = await response.json()
      console.log(`Código de pack generado (Nequi): ${result.packCode} para booking ${bookingId}`)
    } catch (error) {
      console.error('Error llamando a generate-pack-code (Nequi):', error)
    }
  } else {
    // Para sesión individual, solo confirmar
    console.log(`Pago único completado para booking ${bookingId}`)
    // TODO: Enviar email de confirmación de sesión individual
  }
}
