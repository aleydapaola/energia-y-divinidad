import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWompiReference } from '@/lib/wompi'

interface CheckoutBody {
  // Tipo de producto
  productType: 'session' | 'pack' | 'event' | 'course' // No soporta membership (requiere recurrencia)
  productId: string
  productName: string

  // Monto (solo COP)
  amount: number

  // Guest checkout fields
  guestEmail?: string
  guestName?: string

  // Para sesiones/eventos
  scheduledAt?: string // ISO date string para la fecha/hora de la sesión
}

/**
 * Mapeo de montos a links de pago de Wompi
 * Los links de pago se crean desde el dashboard de Wompi con montos específicos
 * Configurar en variables de entorno:
 * - WOMPI_PAYMENT_LINK_270000 para sesión individual
 * - WOMPI_PAYMENT_LINK_DEFAULT para monto variable (si existe)
 * etc.
 */
function getWompiPaymentLink(amount: number, productType: string): string | null {
  // Intentar obtener link específico por monto
  const linkByAmount = process.env[`WOMPI_PAYMENT_LINK_${amount}`]
  if (linkByAmount) {
    return linkByAmount
  }

  // Intentar obtener link por tipo de producto
  const productTypeUpper = productType.toUpperCase()
  const linkByType = process.env[`WOMPI_PAYMENT_LINK_${productTypeUpper}`]
  if (linkByType) {
    return linkByType
  }

  // Usar link por defecto (monto variable) si existe
  const defaultLink = process.env.WOMPI_PAYMENT_LINK_DEFAULT
  if (defaultLink) {
    return defaultLink
  }

  return null
}

/**
 * POST /api/checkout/wompi-manual
 * Crear orden pendiente para pago manual con Wompi (link de pago genérico)
 * Solo para Colombia (COP) - pagos no recurrentes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    const body: CheckoutBody = await request.json()
    const {
      productType,
      productId,
      productName,
      amount,
      guestEmail,
      guestName,
      scheduledAt,
    } = body

    console.log('[CHECKOUT/WOMPI-MANUAL] Request body:', JSON.stringify({
      productType,
      productId,
      productName,
      amount,
      scheduledAt,
    }))

    // Determinar si es usuario autenticado o guest checkout
    const isAuthenticated = !!session?.user?.id
    const userEmail = session?.user?.email || guestEmail

    // Si no está autenticado, requiere email de invitado
    if (!isAuthenticated && !guestEmail) {
      return NextResponse.json(
        { error: 'Se requiere email para continuar' },
        { status: 400 }
      )
    }

    // Validaciones básicas
    if (!productType || !productId || !productName || !amount) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Validar que el monto sea positivo
    if (amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    // Obtener el link de pago de Wompi correspondiente
    const paymentLinkUrl = getWompiPaymentLink(amount, productType)

    if (!paymentLinkUrl) {
      console.error('[CHECKOUT/WOMPI-MANUAL] No payment link configured for amount:', amount)
      return NextResponse.json(
        { error: 'No hay link de pago configurado para este monto. Por favor contacta soporte.' },
        { status: 400 }
      )
    }

    // Generar referencia única
    const reference = generateWompiReference('WPM') // Wompi Manual

    // Crear orden pendiente en la base de datos
    const orderMetadata = {
      productType,
      isGuestCheckout: !isAuthenticated,
      customerEmail: userEmail,
      customerName: guestName || session?.user?.name || null,
      scheduledAt: scheduledAt || null,
      paymentMethod: 'wompi_manual',
      awaitingManualConfirmation: true,
      wompiPaymentLinkUrl: paymentLinkUrl,
    }

    console.log('[CHECKOUT/WOMPI-MANUAL] Creating order with metadata:', JSON.stringify(orderMetadata))

    const order = await prisma.order.create({
      data: {
        userId: isAuthenticated ? session!.user!.id : undefined,
        guestEmail: !isAuthenticated ? guestEmail : undefined,
        guestName: !isAuthenticated ? guestName : undefined,
        orderNumber: reference,
        orderType: getOrderType(productType),
        itemId: productId,
        itemName: productName,
        amount: amount,
        currency: 'COP', // Wompi manual solo opera en COP
        paymentMethod: 'WOMPI_MANUAL',
        paymentStatus: 'PENDING',
        metadata: orderMetadata,
      },
    })

    console.log('[CHECKOUT/WOMPI-MANUAL] Order created:', order.id, 'reference:', reference)

    return NextResponse.json({
      success: true,
      reference,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentLinkUrl,
      // URL a la que redirigir para mostrar instrucciones de pago
      redirectUrl: `/pago/wompi-pending?ref=${reference}`,
    })
  } catch (error) {
    console.error('[CHECKOUT/WOMPI-MANUAL] Error creating order:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[CHECKOUT/WOMPI-MANUAL] Error message:', errorMessage)
    return NextResponse.json(
      { error: `Error al crear la orden: ${errorMessage}` },
      { status: 500 }
    )
  }
}

function getOrderType(
  productType: string
): 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'COURSE' {
  switch (productType) {
    case 'session':
    case 'pack':
      return 'SESSION'
    case 'event':
      return 'EVENT'
    case 'course':
      return 'COURSE'
    default:
      return 'PRODUCT'
  }
}
