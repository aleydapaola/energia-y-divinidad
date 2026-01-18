import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createEpaycoCardPayment,
  createEpaycoPayPalPayment,
  generateEpaycoReference,
  getEpaycoCheckoutConfig,
  type EpaycoCurrency,
} from '@/lib/epayco'
import { getAppUrl } from '@/lib/utils'

type EpaycoPaymentMethod = 'card' | 'paypal'

interface CheckoutBody {
  // Tipo de producto
  productType: 'membership' | 'session' | 'pack' | 'event'
  productId: string
  productName: string

  // Monto y método
  amount: number // en USD o COP
  currency: EpaycoCurrency
  paymentMethod: EpaycoPaymentMethod

  // Para membresías
  billingInterval?: 'monthly' | 'yearly'

  // Información del cliente (opcional, se toma de la sesión si no se proporciona)
  customerName?: string
  customerLastName?: string
  customerPhone?: string
}

/**
 * POST /api/checkout/epayco
 * Crear pago con ePayco (Tarjeta internacional o PayPal)
 * Soporta COP y USD
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
      currency,
      paymentMethod,
      billingInterval,
      customerName,
      customerLastName,
      customerPhone,
    } = body

    // Validaciones básicas
    if (!productType || !productId || !productName || !amount || !currency || !paymentMethod) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Validar moneda
    if (currency !== 'COP' && currency !== 'USD') {
      return NextResponse.json({ error: 'Moneda no soportada' }, { status: 400 })
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

    const reference = generateEpaycoReference('EYD')
    const appUrl = getAppUrl()

    // Extraer nombre y apellido del usuario
    const nameParts = (session.user.name || 'Usuario').split(' ')
    const firstName = customerName || nameParts[0] || 'Usuario'
    const lastName = customerLastName || nameParts.slice(1).join(' ') || 'Cliente'

    // Crear orden pendiente en la base de datos
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        orderNumber: reference,
        orderType: getOrderType(productType),
        itemId: productId,
        itemName: productName,
        amount: amount,
        currency: currency,
        paymentMethod: paymentMethod === 'paypal' ? 'EPAYCO_PAYPAL' : 'EPAYCO_CARD',
        paymentStatus: 'PENDING',
        metadata: {
          productType,
          billingInterval: billingInterval || null,
        },
      },
    })

    // URLs de respuesta
    const responseUrl = `${appUrl}/pago/confirmacion?ref=${reference}`
    const confirmationUrl = `${appUrl}/api/webhooks/epayco`

    let checkoutResponse

    if (paymentMethod === 'paypal') {
      checkoutResponse = await createEpaycoPayPalPayment({
        amount,
        currency,
        description: `${productName} - Energía y Divinidad`,
        invoice: reference,
        customerName: firstName,
        customerLastName: lastName,
        customerEmail: session.user.email,
        responseUrl,
        confirmationUrl,
        metadata: {
          userId: session.user.id,
          productType,
          productId,
        },
      })
    } else {
      // Tarjeta internacional
      checkoutResponse = await createEpaycoCardPayment({
        amount,
        currency,
        description: `${productName} - Energía y Divinidad`,
        invoice: reference,
        customerName: firstName,
        customerLastName: lastName,
        customerEmail: session.user.email,
        customerPhone,
        responseUrl,
        confirmationUrl,
        metadata: {
          userId: session.user.id,
          productType,
          productId,
        },
      })
    }

    if (!checkoutResponse.success) {
      // Actualizar orden como fallida
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      })

      return NextResponse.json(
        { error: checkoutResponse.error || 'Error al procesar pago' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      reference,
      checkoutUrl: checkoutResponse.checkoutUrl,
    })
  } catch (error) {
    console.error('Error creating ePayco checkout:', error)
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 })
  }
}

/**
 * GET /api/checkout/epayco
 * Obtener configuración del checkout para el widget de ePayco
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const amount = parseFloat(searchParams.get('amount') || '0')
    const currency = (searchParams.get('currency') || 'USD') as EpaycoCurrency
    const productName = searchParams.get('name') || 'Producto'
    const productId = searchParams.get('productId') || ''

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const reference = generateEpaycoReference('EYD')
    const appUrl = getAppUrl()

    const config = getEpaycoCheckoutConfig({
      amount,
      name: productName,
      description: `${productName} - Energía y Divinidad`,
      currency,
      invoice: reference,
      responseUrl: `${appUrl}/pago/confirmacion?ref=${reference}`,
      confirmationUrl: `${appUrl}/api/webhooks/epayco`,
      external: true,
    })

    return NextResponse.json({
      config,
      reference,
    })
  } catch (error) {
    console.error('Error getting ePayco config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
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
