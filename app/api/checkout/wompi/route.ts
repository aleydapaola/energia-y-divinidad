import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createWompiPaymentLink,
  generateWompiReference,
} from '@/lib/wompi'
import { getAppUrl } from '@/lib/utils'

type WompiPaymentMethod = 'nequi' | 'card'

interface CheckoutBody {
  // Tipo de producto
  productType: 'membership' | 'session' | 'pack' | 'event'
  productId: string
  productName: string

  // Monto y método
  amount: number // en COP (ej: 150000)
  paymentMethod: WompiPaymentMethod

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
  scheduledAt?: string // ISO date string para la fecha/hora de la sesión
}

/**
 * POST /api/checkout/wompi
 * Crear pago con Wompi (Nequi o Tarjeta) - Solo Colombia (COP)
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
      paymentMethod,
      billingInterval,
      guestEmail,
      guestName,
      scheduledAt,
    } = body

    // DEBUG: Log para rastrear scheduledAt
    console.log('[CHECKOUT/WOMPI] Request body:', JSON.stringify({
      productType,
      productId,
      productName,
      scheduledAt,
      hasScheduledAt: !!scheduledAt,
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

    // Membresías requieren cuenta (por acceso recurrente a contenido)
    if (productType === 'membership' && !isAuthenticated) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para adquirir una membresía' },
        { status: 401 }
      )
    }

    // Validaciones básicas
    if (!productType || !productId || !productName || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Para membresías, verificar que no tenga una activa
    if (productType === 'membership' && session?.user?.id) {
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        },
      })

      if (existingSubscription) {
        return NextResponse.json(
          { error: 'Ya tienes una membresía activa' },
          { status: 400 }
        )
      }
    }

    const reference = generateWompiReference('EYD')
    const appUrl = getAppUrl()

    // Crear orden pendiente en la base de datos
    const orderMetadata = {
      productType,
      billingInterval: billingInterval || null,
      isGuestCheckout: !isAuthenticated,
      customerEmail: userEmail,
      customerName: guestName || session?.user?.name || null,
      scheduledAt: scheduledAt || null,
    }

    // DEBUG: Log metadata antes de guardar
    console.log('[CHECKOUT/WOMPI] Order metadata:', JSON.stringify(orderMetadata))

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
        currency: 'COP',
        paymentMethod: paymentMethod === 'nequi' ? 'WOMPI_NEQUI' : 'WOMPI_CARD',
        paymentStatus: 'PENDING',
        metadata: orderMetadata,
      },
    })

    // DEBUG: Log orden creada
    console.log('[CHECKOUT/WOMPI] Order created:', order.id, 'with scheduledAt:', (order.metadata as any)?.scheduledAt)

    // Usar checkout hospedado de Wompi (Payment Links) para todos los métodos
    // Wompi muestra tarjeta, Nequi, PSE, etc. automáticamente
    const amountInCents = Math.round(amount * 100)

    const { paymentLink, checkoutUrl } = await createWompiPaymentLink({
      name: productName,
      description: `${productName} - Energía y Divinidad`,
      amountInCents,
      singleUse: true,
      redirectUrl: `${appUrl}/pago/confirmacion?ref=${reference}`,
    })

    // Actualizar orden con ID del payment link
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...(order.metadata as object),
          wompiPaymentLinkId: paymentLink.id,
          preferredMethod: paymentMethod,
        },
      },
    })

    return NextResponse.json({
      success: true,
      reference,
      checkoutUrl,
      paymentLinkId: paymentLink.id,
    })
  } catch (error) {
    console.error('Error creating Wompi checkout:', error)
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 })
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
