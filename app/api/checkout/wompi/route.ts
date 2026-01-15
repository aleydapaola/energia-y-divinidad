import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createWompiPaymentLink,
  generateWompiReference,
} from '@/lib/wompi'

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

  // Datos del cliente
  customerName?: string
  customerEmail?: string
  customerPhone?: string

  // Para sesiones/eventos
  sessionSlug?: string
  eventId?: string
}

/**
 * POST /api/checkout/wompi
 * Crear pago con Wompi (Nequi o Tarjeta) - Solo Colombia (COP)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body: CheckoutBody = await request.json()
    const {
      productType,
      productId,
      productName,
      amount,
      paymentMethod,
      billingInterval,
    } = body

    // Validaciones básicas
    if (!productType || !productId || !productName || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Para membresías, verificar que no tenga una activa
    if (productType === 'membership') {
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Crear orden pendiente en la base de datos
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        orderNumber: reference,
        orderType: getOrderType(productType),
        itemId: productId,
        itemName: productName,
        amount: amount,
        currency: 'COP',
        paymentMethod: paymentMethod === 'nequi' ? 'WOMPI_NEQUI' : 'WOMPI_CARD',
        paymentStatus: 'PENDING',
        metadata: {
          productType,
          billingInterval: billingInterval || null,
        },
      },
    })

    // Convertir a centavos para Wompi
    const amountInCents = Math.round(amount * 100)

    // Tanto Nequi como tarjeta usan el checkout hospedado de Wompi
    // El botón Nequi aparece automáticamente en el widget de Wompi
    // Si el usuario seleccionó Nequi, se puede pre-seleccionar en el checkout
    const { paymentLink, checkoutUrl } = await createWompiPaymentLink({
      name: productName,
      description: `${productName} - Energía y Divinidad`,
      amountInCents,
      singleUse: true,
      redirectUrl: `${appUrl}/pago/confirmacion?ref=${reference}`,
      // Wompi muestra todos los métodos disponibles (Nequi, tarjeta, PSE, etc.)
    })

    // Actualizar orden con ID del payment link
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...(order.metadata as object),
          wompiPaymentLinkId: paymentLink.id,
          preferredMethod: paymentMethod, // Guardar preferencia para analytics
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
