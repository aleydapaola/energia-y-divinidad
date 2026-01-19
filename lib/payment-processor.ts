/**
 * Payment Processor Service
 * Servicio centralizado para procesar pagos aprobados
 *
 * Este servicio maneja toda la lógica post-pago:
 * - Crear entitlements según tipo de producto
 * - Crear bookings para sesiones/eventos
 * - Crear suscripciones para membresías
 * - Enviar emails de confirmación
 *
 * Es llamado desde:
 * - Webhooks de Wompi
 * - Webhooks de ePayco
 * - Endpoints de verificación manual
 */

import { prisma } from '@/lib/prisma'
import { createCourseEntitlement } from '@/lib/course-access'
import { recordDiscountUsage } from '@/lib/discount-codes'
import { sendPaymentConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { PaymentMethod } from '@prisma/client'

// Tipos
export interface OrderWithUser {
  id: string
  orderNumber: string
  userId: string | null
  guestEmail: string | null
  guestName: string | null
  orderType: 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'COURSE'
  itemId: string
  itemName: string
  amount: any // Decimal
  currency: string
  paymentMethod: string | null
  paymentStatus: string
  metadata: any
  discountCodeId?: string | null
  discountCode?: string | null
  discountAmount?: any | null
  user?: {
    id: string
    email: string | null
    name: string | null
  } | null
}

export interface ProcessPaymentResult {
  success: boolean
  error?: string
  userId?: string
  createdResources?: {
    type: string
    id: string
  }[]
}

/**
 * Procesa un pago aprobado
 * Esta es la función principal que debe ser llamada cuando un pago es confirmado
 */
export async function processApprovedPayment(
  order: OrderWithUser,
  options?: {
    skipEmail?: boolean
    transactionId?: string
  }
): Promise<ProcessPaymentResult> {
  const { skipEmail = false, transactionId } = options || {}
  const metadata = order.metadata || {}
  const createdResources: { type: string; id: string }[] = []

  try {
    // 1. Manejar guest checkout: crear/encontrar usuario si no hay userId
    let userId = order.userId
    const isGuestCheckout = metadata?.isGuestCheckout || (!userId && order.guestEmail)

    if (isGuestCheckout && order.guestEmail) {
      userId = await findOrCreateUserForGuest(order.guestEmail, order.guestName)

      // Actualizar orden con el userId
      await prisma.order.update({
        where: { id: order.id },
        data: {
          userId,
          metadata: {
            ...metadata,
            convertedFromGuest: true,
            convertedAt: new Date().toISOString(),
          },
        },
      })

      // Actualizar order object para las funciones siguientes
      order.userId = userId
    }

    if (!userId) {
      console.error(`[PAYMENT-PROCESSOR] No se pudo determinar usuario para orden ${order.id}`)
      return { success: false, error: 'No se pudo determinar el usuario' }
    }

    // 2. Verificar duplicados antes de crear recursos
    const isDuplicate = await checkForDuplicateProcessing(order, userId)
    if (isDuplicate) {
      console.log(`[PAYMENT-PROCESSOR] Orden ${order.id} ya fue procesada, saltando...`)
      return { success: true, userId, createdResources: [] }
    }

    // 3. Crear recursos según tipo de producto
    switch (order.orderType) {
      case 'MEMBERSHIP': {
        const subscription = await createMembershipFromOrder(order, metadata, userId)
        createdResources.push({ type: 'subscription', id: subscription.id })
        break
      }

      case 'SESSION': {
        const booking = await createSessionBookingFromOrder(order, metadata, userId)
        createdResources.push({ type: 'booking', id: booking.id })
        break
      }

      case 'EVENT': {
        const booking = await createEventBookingFromOrder(order, metadata, userId)
        createdResources.push({ type: 'booking', id: booking.id })
        break
      }

      case 'COURSE': {
        const entitlements = await createCourseEntitlementsFromOrder(order, metadata, userId)
        entitlements.forEach((id) => createdResources.push({ type: 'entitlement', id }))
        break
      }

      default:
        console.log(`[PAYMENT-PROCESSOR] Tipo de orden no manejado: ${order.orderType}`)
    }

    // 4. Registrar uso de código de descuento si existe
    if (order.discountCodeId && order.discountCode && order.discountAmount) {
      await recordDiscountUsage({
        discountCodeId: order.discountCodeId,
        discountCode: order.discountCode,
        userId,
        orderId: order.id,
        discountAmount: Number(order.discountAmount),
        currency: order.currency,
      })
      console.log(`[PAYMENT-PROCESSOR] Descuento registrado: ${order.discountCode}`)
    }

    // 5. Enviar email de confirmación al cliente
    if (!skipEmail) {
      await sendConfirmationEmail(order, userId, transactionId)
    }

    // 6. Enviar notificación al administrador
    await sendAdminSaleNotification(order, userId, transactionId)

    console.log(
      `[PAYMENT-PROCESSOR] Pago procesado exitosamente para orden ${order.id}` +
        `${isGuestCheckout ? ' (guest checkout)' : ''}`
    )

    return { success: true, userId, createdResources }
  } catch (error: any) {
    console.error(`[PAYMENT-PROCESSOR] Error procesando orden ${order.id}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Verifica si ya se procesó esta orden (evita duplicados)
 */
async function checkForDuplicateProcessing(order: OrderWithUser, userId: string): Promise<boolean> {
  // Verificar según tipo de producto
  switch (order.orderType) {
    case 'MEMBERSHIP': {
      const existingSub = await prisma.subscription.findFirst({
        where: {
          userId,
          membershipTierId: order.itemId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
      return !!existingSub
    }

    case 'SESSION':
    case 'EVENT': {
      const existingBooking = await prisma.booking.findFirst({
        where: {
          userId,
          resourceId: order.itemId,
          paymentStatus: 'COMPLETED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
      return !!existingBooking
    }

    case 'COURSE': {
      const metadata = order.metadata || {}
      const courseIds = metadata.courseIds as string[] | undefined
      if (!courseIds || courseIds.length === 0) return false

      const existingEntitlements = await prisma.entitlement.findMany({
        where: {
          userId,
          type: 'COURSE',
          resourceId: { in: courseIds },
          orderId: order.id,
        },
      })
      return existingEntitlements.length === courseIds.length
    }

    default:
      return false
  }
}

/**
 * Crear membresía desde orden aprobada
 */
async function createMembershipFromOrder(
  order: OrderWithUser,
  metadata: any,
  userId: string
): Promise<{ id: string }> {
  const billingInterval = metadata.billingInterval || 'monthly'

  // Calcular fecha de fin del período
  const periodEnd = new Date()
  if (billingInterval === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Determinar provider según método de pago
  let provider = 'unknown'
  if (order.paymentMethod?.includes('WOMPI')) {
    provider = order.paymentMethod.includes('NEQUI') ? 'wompi_nequi' : 'wompi_card'
  } else if (order.paymentMethod?.includes('EPAYCO')) {
    provider = order.paymentMethod.includes('PAYPAL') ? 'epayco_paypal' : 'epayco_card'
  }

  // Crear suscripción
  const subscription = await prisma.subscription.create({
    data: {
      userId,
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
      userId,
      type: 'MEMBERSHIP',
      resourceId: order.itemId,
      resourceName: order.itemName,
      expiresAt: periodEnd,
      subscriptionId: subscription.id,
      orderId: order.id,
    },
  })

  console.log(`[PAYMENT-PROCESSOR] Membresía creada: ${subscription.id} para usuario ${userId}`)

  return subscription
}

/**
 * Crear booking de sesión desde orden aprobada
 */
async function createSessionBookingFromOrder(
  order: OrderWithUser,
  metadata: any,
  userId: string
): Promise<{ id: string }> {
  const isPack = metadata.productType === 'pack'
  const sessionsTotal = isPack ? 8 : 1

  // Obtener la fecha programada desde metadata
  const scheduledAt = metadata.scheduledAt ? new Date(metadata.scheduledAt) : null

  // VALIDACIÓN: Las sesiones individuales DEBEN tener fecha programada
  if (!isPack && !scheduledAt) {
    console.error('[PAYMENT-PROCESSOR] ERROR: Sesión individual sin scheduledAt!')
    console.error('[PAYMENT-PROCESSOR] Order ID:', order.id)
    throw new Error('Las sesiones individuales requieren fecha programada (scheduledAt)')
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      bookingType: 'SESSION_1_ON_1',
      resourceId: order.itemId,
      resourceName: order.itemName,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: (order.paymentMethod as PaymentMethod) || undefined,
      amount: order.amount,
      currency: order.currency,
      sessionsTotal,
      sessionsRemaining: sessionsTotal,
      scheduledAt,
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

    console.log(`[PAYMENT-PROCESSOR] Pack de sesiones creado: ${booking.id} - Código: ${packCode}`)
  } else {
    console.log(`[PAYMENT-PROCESSOR] Sesión individual confirmada: ${booking.id} - Fecha: ${scheduledAt}`)
  }

  return booking
}

/**
 * Crear booking de evento desde orden aprobada
 */
async function createEventBookingFromOrder(
  order: OrderWithUser,
  metadata: any,
  userId: string
): Promise<{ id: string }> {
  // Obtener la fecha del evento desde metadata
  const scheduledAt = metadata.scheduledAt ? new Date(metadata.scheduledAt) : null
  const seats = metadata.seats || 1

  const booking = await prisma.booking.create({
    data: {
      userId,
      bookingType: 'EVENT',
      resourceId: order.itemId,
      resourceName: order.itemName,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: (order.paymentMethod as PaymentMethod) || undefined,
      amount: order.amount,
      currency: order.currency,
      scheduledAt,
      metadata: {
        seats,
      },
    },
  })

  // Crear Entitlement para acceso al evento
  await prisma.entitlement.create({
    data: {
      userId,
      type: 'EVENT',
      resourceId: order.itemId,
      resourceName: order.itemName,
      orderId: order.id,
    },
  })

  console.log(`[PAYMENT-PROCESSOR] Entrada a evento confirmada: ${booking.id}`)

  return booking
}

/**
 * Crear entitlements de cursos desde orden aprobada
 */
async function createCourseEntitlementsFromOrder(
  order: OrderWithUser,
  metadata: any,
  userId: string
): Promise<string[]> {
  const courseIds = metadata.courseIds as string[]
  const items = metadata.items as { id: string; name: string; price: number }[]

  if (!courseIds || courseIds.length === 0) {
    console.error(`[PAYMENT-PROCESSOR] No se encontraron courseIds en metadata para orden ${order.id}`)
    return []
  }

  const createdIds: string[] = []

  // Crear entitlement para cada curso
  for (const item of items) {
    await createCourseEntitlement({
      userId,
      courseId: item.id,
      courseName: item.name,
      orderId: order.id,
    })
    createdIds.push(item.id)
  }

  console.log(`[PAYMENT-PROCESSOR] Cursos asignados: ${items.map((i) => i.name).join(', ')}`)

  return createdIds
}

/**
 * Enviar email de confirmación de pago
 */
async function sendConfirmationEmail(
  order: OrderWithUser,
  userId: string,
  transactionId?: string
): Promise<void> {
  // Obtener email del usuario
  let customerEmail: string | null = null
  let customerName: string | null = null

  if (order.user?.email) {
    customerEmail = order.user.email
    customerName = order.user.name
  } else if (order.guestEmail) {
    customerEmail = order.guestEmail
    customerName = order.guestName
  } else {
    // Buscar usuario en BD
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    customerEmail = user?.email || null
    customerName = user?.name || null
  }

  // También verificar metadata
  const metadata = order.metadata || {}
  customerEmail = customerEmail || metadata.customerEmail
  customerName = customerName || metadata.customerName

  if (!customerEmail) {
    console.warn(`[PAYMENT-PROCESSOR] No se encontró email para orden ${order.id}, no se envía confirmación`)
    return
  }

  try {
    await sendPaymentConfirmationEmail({
      email: customerEmail,
      name: customerName || 'Cliente',
      orderNumber: order.orderNumber,
      orderType: order.orderType as any,
      itemName: order.itemName,
      amount: Number(order.amount),
      currency: order.currency as 'COP' | 'USD' | 'EUR',
      paymentMethod: order.paymentMethod || 'Tarjeta',
      transactionId,
    })
    console.log(`[PAYMENT-PROCESSOR] Email de confirmación enviado a ${customerEmail}`)
  } catch (error) {
    // No fallar el proceso si el email no se envía
    console.error(`[PAYMENT-PROCESSOR] Error enviando email de confirmación:`, error)
  }
}

/**
 * Encontrar o crear usuario para guest checkout
 */
async function findOrCreateUserForGuest(email: string, name?: string | null): Promise<string> {
  // Buscar usuario existente por email
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existingUser) {
    return existingUser.id
  }

  // Crear usuario nuevo sin contraseña
  const setPasswordToken = randomBytes(32).toString('hex')
  const setPasswordExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || null,
      password: null,
      emailVerified: null,
    },
  })

  // Guardar token para establecer contraseña
  await prisma.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token: setPasswordToken,
      expires: setPasswordExpires,
    },
  })

  console.log(`[PAYMENT-PROCESSOR] Usuario creado para guest checkout: ${newUser.id} (${email})`)

  return newUser.id
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
 * Enviar notificación de venta al administrador
 */
async function sendAdminSaleNotification(
  order: OrderWithUser,
  userId: string,
  transactionId?: string
): Promise<void> {
  // Obtener datos del cliente
  let customerEmail: string | null = null
  let customerName: string | null = null
  let customerPhone: string | undefined = undefined

  if (order.user?.email) {
    customerEmail = order.user.email
    customerName = order.user.name
  } else if (order.guestEmail) {
    customerEmail = order.guestEmail
    customerName = order.guestName
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    customerEmail = user?.email || null
    customerName = user?.name || null
  }

  // Verificar metadata para datos adicionales
  const metadata = order.metadata || {}
  customerEmail = customerEmail || metadata.customerEmail
  customerName = customerName || metadata.customerName
  customerPhone = customerPhone || metadata.customerPhone

  if (!customerEmail) {
    console.warn(`[PAYMENT-PROCESSOR] No se encontró email para notificación admin de orden ${order.id}`)
    return
  }

  // Mapear orderType a saleType
  const saleTypeMap: Record<string, 'SESSION' | 'SESSION_PACK' | 'MEMBERSHIP' | 'EVENT' | 'COURSE' | 'PREMIUM_CONTENT' | 'PRODUCT'> = {
    SESSION: metadata.productType === 'pack' ? 'SESSION_PACK' : 'SESSION',
    MEMBERSHIP: 'MEMBERSHIP',
    EVENT: 'EVENT',
    COURSE: 'COURSE',
    PREMIUM_CONTENT: 'PREMIUM_CONTENT',
    PRODUCT: 'PRODUCT',
  }

  const saleType = saleTypeMap[order.orderType] || 'PRODUCT'

  try {
    await sendAdminNotificationEmail({
      saleType,
      customerName: customerName || 'Cliente',
      customerEmail,
      customerPhone,
      itemName: order.itemName,
      amount: Number(order.amount),
      currency: order.currency as 'COP' | 'USD' | 'EUR',
      paymentMethod: order.paymentMethod || 'Tarjeta',
      orderNumber: order.orderNumber,
      transactionId,
      // Datos específicos según tipo
      sessionDate: metadata.scheduledAt ? new Date(metadata.scheduledAt) : undefined,
      sessionCount: saleType === 'SESSION_PACK' ? 8 : undefined,
      membershipPlan: saleType === 'MEMBERSHIP' ? order.itemName : undefined,
      membershipInterval: saleType === 'MEMBERSHIP' ? (metadata.billingInterval || 'monthly') : undefined,
      eventDate: saleType === 'EVENT' && metadata.scheduledAt ? new Date(metadata.scheduledAt) : undefined,
      eventSeats: saleType === 'EVENT' ? metadata.seats : undefined,
      eventType: saleType === 'EVENT' ? metadata.eventType : undefined,
    })
    console.log(`[PAYMENT-PROCESSOR] Notificación admin enviada para orden ${order.orderNumber}`)
  } catch (error) {
    // No fallar el proceso si la notificación no se envía
    console.error(`[PAYMENT-PROCESSOR] Error enviando notificación admin:`, error)
  }
}
