import { nanoid } from 'nanoid'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { createPayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'
import { getAppUrl } from '@/lib/utils'

interface CheckoutBody {
  // Tipo de producto
  productType: 'membership' | 'session' | 'pack' | 'event'
  productId: string
  productName: string

  // Monto y moneda
  amount: number
  currency: 'USD' | 'COP'

  // Para membresías
  billingInterval?: 'monthly' | 'yearly'

  // Datos del cliente (para guest checkout)
  customerName?: string
  customerEmail?: string
  customerPhone?: string

  // Guest checkout fields
  guestEmail?: string
  guestName?: string

  // Para sesiones/eventos
  sessionSlug?: string
  eventId?: string
  scheduledAt?: string
}

/**
 * POST /api/checkout/paypal
 * Crear orden de PayPal - Colombia e Internacional (USD/COP)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal no está configurado' },
        { status: 500 }
      )
    }

    const session = await auth()

    const body: CheckoutBody = await request.json()
    const {
      productType,
      productId,
      productName,
      amount,
      currency,
      billingInterval,
      guestEmail,
      guestName,
      scheduledAt,
    } = body

    console.log('[CHECKOUT/PAYPAL] Request body:', JSON.stringify({
      productType,
      productId,
      productName,
      amount,
      currency,
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

    // Membresías requieren cuenta
    if (productType === 'membership' && !isAuthenticated) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para adquirir una membresía' },
        { status: 401 }
      )
    }

    // Validaciones básicas
    if (!productType || !productId || !productName || !amount || !currency) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Validar moneda
    if (!['USD', 'COP'].includes(currency)) {
      return NextResponse.json(
        { error: 'Moneda no soportada. Use USD o COP.' },
        { status: 400 }
      )
    }

    // Para membresías, verificar duplicados
    if (productType === 'membership' && session?.user?.id) {
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        },
      })

      if (existingSubscription) {
        if (existingSubscription.membershipTierId === productId) {
          return NextResponse.json(
            { error: 'Ya tienes este plan activo' },
            { status: 400 }
          )
        }
      }
    }

    // Generar referencia única
    const reference = `PP-${nanoid(10).toUpperCase()}`
    const appUrl = getAppUrl()

    // Crear orden pendiente en la base de datos
    const orderMetadata = {
      productType,
      billingInterval: billingInterval || null,
      isGuestCheckout: !isAuthenticated,
      customerEmail: userEmail,
      customerName: guestName || session?.user?.name || null,
      scheduledAt: scheduledAt || null,
      paypalOrderId: null, // Se actualizará después
    }

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
        currency: currency,
        paymentMethod: 'PAYPAL_DIRECT',
        paymentStatus: 'PENDING',
        metadata: orderMetadata,
      },
    })

    console.log('[CHECKOUT/PAYPAL] Order created:', order.id)

    // Crear orden en PayPal
    const paypalResult = await createPayPalOrder({
      amount,
      currency,
      description: `${productName} - Energía y Divinidad`,
      reference: reference,
      returnUrl: `${appUrl}/pago/confirmacion?ref=${reference}`,
      cancelUrl: `${appUrl}/pago/cancelado?ref=${reference}`,
      customerEmail: userEmail,
    })

    if (!paypalResult.success || !paypalResult.orderId || !paypalResult.approvalUrl) {
      // Marcar orden como fallida
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      })

      console.error('[CHECKOUT/PAYPAL] Failed to create PayPal order:', {
        error: paypalResult.error,
        amount,
        currency,
        productName,
      })

      return NextResponse.json(
        { error: paypalResult.error || 'Error al crear orden de PayPal' },
        { status: 500 }
      )
    }

    // Actualizar orden con ID de PayPal
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...(order.metadata as object),
          paypalOrderId: paypalResult.orderId,
        },
      },
    })

    console.log('[CHECKOUT/PAYPAL] PayPal order created:', paypalResult.orderId)

    return NextResponse.json({
      success: true,
      reference,
      paypalOrderId: paypalResult.orderId,
      approvalUrl: paypalResult.approvalUrl,
    })
  } catch (error) {
    console.error('[CHECKOUT/PAYPAL] Error:', error)
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    )
  }
}

function getOrderType(
  productType: string
): 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' {
  switch (productType) {
    case 'membership':
      return 'MEMBERSHIP'
    case 'session':
    case 'pack':
      return 'SESSION'
    case 'event':
      return 'EVENT'
    default:
      return 'PRODUCT'
  }
}
