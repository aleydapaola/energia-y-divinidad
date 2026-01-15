import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  verifyWompiWebhookSignature,
  type WompiWebhookEvent,
  type WompiTransactionStatus,
} from '@/lib/wompi'
import { createCourseEntitlement } from '@/lib/course-access'
import { recordDiscountUsage } from '@/lib/discount-codes'

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

  console.log(`Procesando transacción Wompi: ${transactionId} - ${reference} - ${status}`)

  // Buscar la orden por referencia (orderNumber)
  const order = await prisma.order.findFirst({
    where: { orderNumber: reference },
  })

  if (!order) {
    console.error(`No se encontró orden con referencia ${reference}`)
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

  // Si el pago fue aprobado, procesar según tipo de producto
  if (status === 'APPROVED') {
    await handleApprovedPayment(order)
  } else if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
    console.log(`Pago rechazado/fallido para orden ${order.id}: ${status}`)
    // TODO: Enviar notificación al usuario
  }
}

/**
 * Procesar pago aprobado según tipo de producto
 */
async function handleApprovedPayment(order: any) {
  const metadata = order.metadata as any

  switch (order.orderType) {
    case 'MEMBERSHIP':
      await createMembershipFromOrder(order, metadata)
      break

    case 'SESSION':
      await createBookingFromOrder(order, metadata)
      break

    case 'EVENT':
      await createEventBookingFromOrder(order, metadata)
      break

    case 'COURSE':
      await createCourseEntitlementsFromOrder(order, metadata)
      break

    default:
      console.log(`Tipo de orden no manejado: ${order.orderType}`)
  }

  console.log(`Pago aprobado procesado para orden ${order.id}`)
}

/**
 * Crear membresía desde orden aprobada
 */
async function createMembershipFromOrder(order: any, metadata: any) {
  const billingInterval = metadata.billingInterval || 'monthly'

  // Calcular fecha de fin del período
  const periodEnd = new Date()
  if (billingInterval === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Crear suscripción
  const subscription = await prisma.subscription.create({
    data: {
      userId: order.userId,
      membershipTierId: order.itemId,
      membershipTierName: order.itemName,
      status: 'ACTIVE',
      paymentProvider: order.paymentMethod.includes('NEQUI') ? 'wompi_nequi' : 'wompi_card',
      billingInterval: billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY',
      amount: order.amount,
      currency: order.currency,
      startDate: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  })

  // Crear Entitlement
  await prisma.entitlement.create({
    data: {
      userId: order.userId,
      type: 'MEMBERSHIP',
      resourceId: order.itemId,
      resourceName: order.itemName,
      expiresAt: periodEnd,
      subscriptionId: subscription.id,
      orderId: order.id,
    },
  })

  console.log(`Membresía creada: ${subscription.id} para usuario ${order.userId}`)

  // TODO: Enviar email de bienvenida
}

/**
 * Crear booking de sesión desde orden aprobada
 */
async function createBookingFromOrder(order: any, metadata: any) {
  const isPack = metadata.productType === 'pack'
  const sessionsTotal = isPack ? 8 : 1

  const booking = await prisma.booking.create({
    data: {
      userId: order.userId,
      bookingType: 'SESSION_1_ON_1',
      resourceId: order.itemId,
      resourceName: order.itemName,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      currency: order.currency,
      sessionsTotal,
      sessionsRemaining: sessionsTotal,
    },
  })

  // Si es pack, generar código
  if (isPack) {
    const packCode = `PACK-${generatePackCode()}`

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        metadata: {
          packCode,
          generatedAt: new Date().toISOString(),
        },
      },
    })

    console.log(`Pack de sesiones creado: ${booking.id} - Código: ${packCode}`)
    // TODO: Enviar email con código de pack
  } else {
    console.log(`Sesión individual confirmada: ${booking.id}`)
    // TODO: Enviar email de confirmación
  }
}

/**
 * Crear booking de evento desde orden aprobada
 */
async function createEventBookingFromOrder(order: any, metadata: any) {
  const booking = await prisma.booking.create({
    data: {
      userId: order.userId,
      bookingType: 'EVENT',
      resourceId: order.itemId,
      resourceName: order.itemName,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      currency: order.currency,
    },
  })

  // Crear Entitlement para acceso al evento
  await prisma.entitlement.create({
    data: {
      userId: order.userId,
      type: 'EVENT',
      resourceId: order.itemId,
      resourceName: order.itemName,
      orderId: order.id,
    },
  })

  console.log(`Entrada a evento confirmada: ${booking.id}`)
  // TODO: Enviar email con entrada/QR
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

/**
 * Generar código de pack aleatorio
 */
function generatePackCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Crear entitlements de cursos desde orden aprobada
 */
async function createCourseEntitlementsFromOrder(order: any, metadata: any) {
  const courseIds = metadata.courseIds as string[]
  const items = metadata.items as { id: string; name: string; price: number }[]

  if (!courseIds || courseIds.length === 0) {
    console.error(`No se encontraron courseIds en metadata para orden ${order.id}`)
    return
  }

  // Crear entitlement para cada curso
  for (const item of items) {
    await createCourseEntitlement({
      userId: order.userId,
      courseId: item.id,
      courseName: item.name,
      orderId: order.id,
    })
  }

  // Registrar uso del código de descuento si existe
  if (order.discountCodeId && order.discountCode && order.discountAmount) {
    await recordDiscountUsage({
      discountCodeId: order.discountCodeId,
      discountCode: order.discountCode,
      userId: order.userId,
      orderId: order.id,
      discountAmount: Number(order.discountAmount),
      currency: order.currency,
    })
  }

  console.log(`Cursos asignados para orden ${order.id}: ${courseIds.join(', ')}`)
  // TODO: Enviar email de bienvenida con acceso a los cursos
}
