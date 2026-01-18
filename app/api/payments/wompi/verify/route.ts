import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWompiApiUrl, WOMPI_CONFIG } from '@/lib/wompi'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

/**
 * GET /api/payments/wompi/verify
 * Verificar estado de una transacción de Wompi y actualizar la orden
 *
 * Query params:
 * - transactionId: ID de la transacción de Wompi
 * - ref: Referencia de la orden (orderNumber)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')
    const reference = searchParams.get('ref')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID requerido' }, { status: 400 })
    }

    // Consultar transacción en Wompi
    const wompiResponse = await fetch(
      `${getWompiApiUrl()}/transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
        },
      }
    )

    if (!wompiResponse.ok) {
      console.error('Error fetching Wompi transaction:', wompiResponse.status)
      return NextResponse.json(
        { error: 'Error consultando transacción' },
        { status: 500 }
      )
    }

    const wompiData = await wompiResponse.json()
    const transaction = wompiData.data

    // Buscar y actualizar la orden si tenemos la referencia
    let order = null
    if (reference) {
      order = await prisma.order.findFirst({
        where: { orderNumber: reference },
      })

      if (order && order.paymentStatus === 'PENDING') {
        // Mapear status de Wompi a nuestro modelo
        let paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' = 'PENDING'
        switch (transaction.status) {
          case 'APPROVED':
            paymentStatus = 'COMPLETED'
            break
          case 'DECLINED':
          case 'ERROR':
            paymentStatus = 'FAILED'
            break
          case 'VOIDED':
            paymentStatus = 'CANCELLED'
            break
        }

        // Actualizar orden si el estado cambió
        if (paymentStatus !== 'PENDING') {
          order = await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus,
              metadata: {
                ...(order.metadata as object),
                wompiTransactionId: transactionId,
                wompiStatus: transaction.status,
                verifiedAt: new Date().toISOString(),
              },
            },
            include: {
              user: true,
            },
          })

          // Si el pago fue exitoso, procesar según tipo de producto
          if (paymentStatus === 'COMPLETED') {
            // Procesar el pago aprobado (crear booking, membresía, etc.)
            await handleApprovedPayment(order)

            const metadata = order.metadata as Record<string, any> | null
            const customerEmail = order.user?.email || order.guestEmail || metadata?.customerEmail
            const customerName = order.user?.name || order.guestName || metadata?.customerName || 'Cliente'

            if (customerEmail) {
              // Enviar email en background (no bloquear la respuesta)
              sendPaymentConfirmationEmail({
                email: customerEmail,
                name: customerName,
                orderNumber: order.orderNumber,
                orderType: order.orderType as 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT',
                itemName: order.itemName,
                amount: Number(order.amount),
                currency: order.currency as 'COP' | 'USD' | 'EUR',
                paymentMethod: order.paymentMethod || 'WOMPI_CARD',
                transactionId: transactionId,
              }).catch((err) => {
                console.error('Error sending payment confirmation email:', err)
              })
            }
          }
        }
      }
    }

    return NextResponse.json({
      transactionId: transaction.id,
      transactionStatus: transaction.status,
      statusMessage: transaction.status_message,
      amount: transaction.amount_in_cents / 100,
      currency: transaction.currency,
      paymentMethod: transaction.payment_method_type,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            itemName: order.itemName,
            amount: Number(order.amount),
            currency: order.currency,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
          }
        : null,
    })
  } catch (error) {
    console.error('Error verifying Wompi payment:', error)
    return NextResponse.json(
      { error: 'Error verificando pago' },
      { status: 500 }
    )
  }
}

/**
 * Procesar pago aprobado según tipo de producto
 */
async function handleApprovedPayment(order: any) {
  const metadata = order.metadata as any

  // Manejar guest checkout: crear/encontrar usuario si no hay userId
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

    order.userId = userId
  }

  if (!userId) {
    console.error(`No se pudo determinar usuario para orden ${order.id}`)
    return
  }

  // Verificar si ya existe un booking para esta orden (evitar duplicados)
  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      resourceId: order.itemId,
      paymentStatus: 'COMPLETED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
      },
    },
  })

  if (existingBooking) {
    console.log(`Booking ya existe para orden ${order.id}: ${existingBooking.id}`)
    return
  }

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

    default:
      console.log(`Tipo de orden no manejado: ${order.orderType}`)
  }

  console.log(`Pago aprobado procesado para orden ${order.id}${isGuestCheckout ? ' (guest checkout)' : ''}`)
}

/**
 * Encontrar o crear usuario para guest checkout
 */
async function findOrCreateUserForGuest(
  email: string,
  name?: string | null
): Promise<string> {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existingUser) {
    return existingUser.id
  }

  const setPasswordToken = randomBytes(32).toString('hex')
  const setPasswordExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || null,
      password: null,
      emailVerified: null,
    },
  })

  await prisma.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token: setPasswordToken,
      expires: setPasswordExpires,
    },
  })

  console.log(`Usuario creado para guest checkout: ${newUser.id} (${email})`)
  return newUser.id
}

/**
 * Crear membresía desde orden aprobada
 */
async function createMembershipFromOrder(order: any, metadata: any) {
  const billingInterval = metadata.billingInterval || 'monthly'

  const periodEnd = new Date()
  if (billingInterval === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: order.userId,
      membershipTierId: order.itemId,
      membershipTierName: order.itemName,
      status: 'ACTIVE',
      paymentProvider: order.paymentMethod?.includes('NEQUI') ? 'wompi_nequi' : 'wompi_card',
      billingInterval: billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY',
      amount: order.amount,
      currency: order.currency,
      startDate: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  })

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
  } else {
    console.log(`Sesión individual confirmada: ${booking.id}`)
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
