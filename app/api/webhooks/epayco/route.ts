import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseEpaycoWebhook,
  normalizeEpaycoStatus,
  type EpaycoWebhookPayload,
  type EpaycoTransactionStatus,
} from '@/lib/epayco'
import { createCourseEntitlement } from '@/lib/course-access'
import { recordDiscountUsage } from '@/lib/discount-codes'
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

  console.log(`Procesando transacción ePayco: ${refPayco} - ${reference} - ${status}`)

  // Buscar la orden por referencia (orderNumber)
  const order = await prisma.order.findFirst({
    where: { orderNumber: reference },
  })

  if (!order) {
    console.error(`No se encontró orden con referencia ${reference}`)
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

  // Si el pago fue aprobado, procesar según tipo de producto
  if (normalizedStatus === 'approved') {
    await handleApprovedPayment(order, payload)
  } else if (normalizedStatus === 'declined' || normalizedStatus === 'error') {
    console.log(`Pago rechazado/fallido para orden ${order.id}: ${status}`)
    // TODO: Enviar notificación al usuario
  }
}

/**
 * Procesar pago aprobado según tipo de producto
 */
async function handleApprovedPayment(order: any, payload: EpaycoWebhookPayload) {
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

  console.log(`Pago ePayco aprobado procesado para orden ${order.id}`)
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

  // Determinar provider
  const isPayPal = order.paymentMethod === 'EPAYCO_PAYPAL'
  const provider = isPayPal ? 'epayco_paypal' : 'epayco_card'

  // Crear suscripción
  const subscription = await prisma.subscription.create({
    data: {
      userId: order.userId,
      membershipTierId: order.itemId,
      membershipTierName: order.itemName,
      status: 'ACTIVE',
      paymentProvider: provider,
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

  console.log(`Membresía creada via ePayco: ${subscription.id} para usuario ${order.userId}`)

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

    console.log(`Pack de sesiones creado via ePayco: ${booking.id} - Código: ${packCode}`)
    // TODO: Enviar email con código de pack
  } else {
    console.log(`Sesión individual confirmada via ePayco: ${booking.id}`)
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

  console.log(`Entrada a evento confirmada via ePayco: ${booking.id}`)
  // TODO: Enviar email con entrada/QR
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

  console.log(`Cursos asignados via ePayco para orden ${order.id}: ${courseIds.join(', ')}`)
  // TODO: Enviar email de bienvenida con acceso a los cursos
}
