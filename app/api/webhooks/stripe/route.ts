import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { getAppUrl } from '@/lib/utils'
import { sendAdminNotificationEmail } from '@/lib/email'

/**
 * POST /api/webhooks/stripe
 * Procesar eventos de webhooks de Stripe
 *
 * Eventos manejados:
 * - checkout.session.completed: Primera suscripción completada
 * - invoice.payment_succeeded: Pago de renovación exitoso
 * - customer.subscription.updated: Cambios en suscripción
 * - customer.subscription.deleted: Suscripción cancelada
 * - invoice.payment_failed: Fallo en pago
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Error verificando firma del webhook:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Idempotencia: verificar si ya procesamos este evento
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId: event.id },
  })

  if (existingEvent?.processed) {
    console.log(`Evento ${event.id} ya fue procesado`)
    return NextResponse.json({ received: true, processed: false })
  }

  // Registrar evento como recibido
  await prisma.webhookEvent.upsert({
    where: { eventId: event.id },
    create: {
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      payload: event as any,
      processed: false,
    },
    update: {},
  })

  try {
    // Procesar según tipo de evento
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

    // Marcar como procesado exitosamente
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })

    return NextResponse.json({ received: true, processed: true })
  } catch (error: any) {
    console.error(`Error procesando webhook ${event.type}:`, error)

    // Registrar error
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
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
 * Manejar checkout.session.completed
 * Se dispara cuando el usuario completa el checkout por primera vez
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const productType = session.metadata?.productType

  // Manejar packs de sesiones
  if (productType === 'session_pack') {
    await handleSessionPackCheckout(session)
    return
  }

  // Manejar membresías (código existente)
  const userId = session.metadata?.userId
  const membershipTierId = session.metadata?.membershipTierId
  const membershipTierName = session.metadata?.membershipTierName
  const billingInterval = session.metadata?.billingInterval

  if (!userId || !membershipTierId || !session.subscription) {
    console.error('Faltan datos en metadata del checkout session')
    return
  }

  // Obtener detalles de la suscripción de Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  // Verificar si ya existe una suscripción para este usuario
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      stripeSubscriptionId: stripeSubscription.id,
    },
  })

  if (existingSubscription) {
    console.log(`Suscripción ya existe para usuario ${userId}`)
    return
  }

  // Crear suscripción en DB
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      membershipTierId: membershipTierId || '',
      membershipTierName: membershipTierName || '',
      status: 'ACTIVE',
      paymentProvider: 'stripe',
      billingInterval: billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY',
      amount: (stripeSubscription.items.data[0].price.unit_amount || 0) / 100,
      currency: stripeSubscription.currency.toUpperCase(),
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      startDate: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    },
  })

  // Crear Entitlement para acceso a contenido de membresía
  await prisma.entitlement.create({
    data: {
      userId,
      type: 'MEMBERSHIP',
      resourceId: membershipTierId || '',
      resourceName: membershipTierName || '',
      expiresAt: new Date(stripeSubscription.current_period_end * 1000),
      subscriptionId: subscription.id,
    },
  })

  console.log(`Suscripción creada exitosamente para usuario ${userId}`)

  // Obtener datos del usuario para notificación
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  // Notificar al administrador
  if (user?.email) {
    try {
      await sendAdminNotificationEmail({
        saleType: 'MEMBERSHIP',
        customerName: user.name || 'Cliente',
        customerEmail: user.email,
        itemName: membershipTierName || 'Membresía',
        amount: (stripeSubscription.items.data[0].price.unit_amount || 0) / 100,
        currency: stripeSubscription.currency.toUpperCase() as 'COP' | 'USD' | 'EUR',
        paymentMethod: 'STRIPE',
        orderNumber: `SUB-${subscription.id.slice(0, 8).toUpperCase()}`,
        transactionId: stripeSubscription.id,
        membershipPlan: membershipTierName || undefined,
        membershipInterval: billingInterval === 'yearly' ? 'yearly' : 'monthly',
      })
      console.log(`Notificación admin enviada para nueva membresía ${subscription.id}`)
    } catch (error) {
      console.error('Error enviando notificación admin:', error)
    }
  }
}

/**
 * Manejar checkout de pack de sesiones
 * Genera código de pack y envía email
 */
async function handleSessionPackCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const userEmail = session.metadata?.userEmail
  const userName = session.metadata?.userName
  const sessionType = session.metadata?.sessionType

  if (!userId || !userEmail || sessionType !== 'pack') {
    console.error('Faltan datos en metadata para pack de sesiones')
    return
  }

  // Buscar el booking asociado a esta sesión de Stripe
  const booking = await prisma.booking.findFirst({
    where: {
      stripeSessionId: session.id,
      userId,
    },
  })

  if (!booking) {
    console.error(`No se encontró booking para session ${session.id}`)
    return
  }

  // Obtener el monto pagado
  const amountTotal = session.amount_total || 0
  const currency = (session.currency?.toUpperCase() || 'USD') as 'USD' | 'EUR' | 'COP'

  // Llamar a la API interna para generar el código
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
        userId,
        userEmail,
        userName: userName || 'Querida alma',
        amount: amountTotal / 100, // Convertir de centavos
        currency,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error generando código de pack:', error)
      return
    }

    const result = await response.json()
    console.log(`Código de pack generado: ${result.packCode} para usuario ${userId}`)

    // Notificar al administrador
    try {
      await sendAdminNotificationEmail({
        saleType: 'SESSION_PACK',
        customerName: userName || 'Cliente',
        customerEmail: userEmail,
        itemName: 'Pack de 8 Sesiones',
        amount: amountTotal / 100,
        currency,
        paymentMethod: 'STRIPE',
        orderNumber: booking.id.slice(0, 8).toUpperCase(),
        transactionId: session.id,
        sessionCount: 8,
      })
      console.log(`Notificación admin enviada para pack de sesiones`)
    } catch (emailError) {
      console.error('Error enviando notificación admin:', emailError)
    }
  } catch (error) {
    console.error('Error llamando a generate-pack-code:', error)
  }
}

/**
 * Manejar invoice.payment_succeeded
 * Se dispara en cada renovación exitosa
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return // No es una suscripción
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  )

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con ID ${stripeSubscription.id}`)
    return
  }

  // Actualizar período actual
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    },
  })

  // Extender Entitlement
  await prisma.entitlement.updateMany({
    where: {
      subscriptionId: subscription.id,
      type: 'MEMBERSHIP',
    },
    data: {
      expiresAt: new Date(stripeSubscription.current_period_end * 1000),
    },
  })

  // TODO: Registrar orden de renovación cuando se implemente el flujo de órdenes para Stripe
  // El modelo Order actual requiere campos específicos que no aplican para renovaciones automáticas

  console.log(`Renovación procesada para suscripción ${subscription.id}`)
}

/**
 * Manejar customer.subscription.updated
 * Se dispara cuando hay cambios en la suscripción (cambio de plan, cancelación programada, etc.)
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con ID ${stripeSubscription.id}`)
    return
  }

  // Mapear status de Stripe a nuestro modelo
  let status = subscription.status

  if (stripeSubscription.status === 'active') {
    status = 'ACTIVE'
  } else if (stripeSubscription.status === 'past_due') {
    status = 'PAST_DUE'
  } else if (stripeSubscription.status === 'canceled') {
    status = 'CANCELLED'
  } else if (stripeSubscription.status === 'trialing') {
    status = 'TRIAL'
  }

  // Actualizar suscripción
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelledAt: stripeSubscription.cancel_at_period_end
        ? new Date()
        : subscription.cancelledAt,
    },
  })

  console.log(`Suscripción ${subscription.id} actualizada a status ${status}`)
}

/**
 * Manejar customer.subscription.deleted
 * Se dispara cuando una suscripción es cancelada
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con ID ${stripeSubscription.id}`)
    return
  }

  // Cambiar status a CANCELLED
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
 * Manejar invoice.payment_failed
 * Se dispara cuando falla un pago de renovación
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  )

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  })

  if (!subscription) {
    console.error(`No se encontró suscripción con ID ${stripeSubscription.id}`)
    return
  }

  // Cambiar status a PAST_DUE
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
    },
  })

  console.log(`Pago fallido para suscripción ${subscription.id}`)

  // TODO: Enviar notificación al usuario
}
