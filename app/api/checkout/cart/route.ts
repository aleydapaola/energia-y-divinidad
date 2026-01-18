import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { client } from '@/sanity/lib/client'
import { COURSES_BY_IDS_QUERY } from '@/sanity/lib/queries'
import { validateDiscountCode, recordDiscountUsage } from '@/lib/discount-codes'
import { createCourseEntitlement } from '@/lib/course-access'
import {
  createWompiPaymentLink,
  generateWompiReference,
} from '@/lib/wompi'
import {
  createEpaycoCardPayment,
  createEpaycoPayPalPayment,
  generateEpaycoReference,
} from '@/lib/epayco'
import { getAppUrl } from '@/lib/utils'

type PaymentMethod = 'wompi_nequi' | 'wompi_card' | 'epayco_card' | 'epayco_paypal'

interface CartItem {
  courseId: string
  courseName: string
  price: number
}

interface CheckoutBody {
  items: CartItem[]
  currency: 'COP' | 'USD'
  paymentMethod: PaymentMethod
  discountCode?: string
}

/**
 * POST /api/checkout/cart
 * Procesa el checkout del carrito de la academia
 * Soporta múltiples cursos, descuentos, y pagos gratuitos (100% descuento)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body: CheckoutBody = await request.json()
    const { items, currency, paymentMethod, discountCode } = body

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
    }

    if (!currency || !['COP', 'USD'].includes(currency)) {
      return NextResponse.json({ error: 'Moneda no válida' }, { status: 400 })
    }

    // Verificar que todos los cursos existen y están activos
    const courseIds = items.map((item) => item.courseId)
    const courses = await client.fetch(COURSES_BY_IDS_QUERY, { ids: courseIds })

    if (courses.length !== items.length) {
      return NextResponse.json(
        { error: 'Algunos cursos no están disponibles' },
        { status: 400 }
      )
    }

    // Verificar que los cursos están publicados y activos
    for (const course of courses) {
      if (!course.published || course.status !== 'active') {
        return NextResponse.json(
          { error: `El curso "${course.title}" no está disponible` },
          { status: 400 }
        )
      }
    }

    // Verificar que el usuario no tiene ya acceso a alguno de los cursos
    const existingEntitlements = await prisma.entitlement.findMany({
      where: {
        userId: session.user.id,
        type: 'COURSE',
        resourceId: { in: courseIds },
        revoked: false,
      },
    })

    if (existingEntitlements.length > 0) {
      const ownedCourseIds = existingEntitlements.map((e) => e.resourceId)
      const ownedCourse = courses.find((c: any) => ownedCourseIds.includes(c._id))
      return NextResponse.json(
        { error: `Ya tienes acceso al curso "${ownedCourse?.title}"` },
        { status: 400 }
      )
    }

    // Calcular subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price, 0)

    // Validar y aplicar código de descuento si existe
    let discountAmount = 0
    let discountCodeId: string | undefined
    let discountCodeValue: string | undefined

    if (discountCode) {
      const discountResult = await validateDiscountCode({
        code: discountCode,
        userId: session.user.id,
        courseIds,
        amount: subtotal,
        currency,
      })

      if (!discountResult.valid) {
        return NextResponse.json(
          { error: discountResult.error },
          { status: 400 }
        )
      }

      discountAmount = discountResult.discountAmount || 0
      discountCodeId = discountResult.discountCode?._id
      discountCodeValue = discountResult.discountCode?.code
    }

    const finalAmount = Math.max(0, subtotal - discountAmount)

    // Generar referencia
    const isWompi = paymentMethod.startsWith('wompi')
    const reference = isWompi
      ? generateWompiReference('EYD')
      : generateEpaycoReference('EYD')

    // Crear nombre del pedido
    const orderName =
      items.length === 1
        ? items[0].courseName
        : `${items.length} cursos de la Academia`

    // ============================================
    // CASO ESPECIAL: Descuento 100% (gratis)
    // ============================================
    if (finalAmount === 0) {
      // Crear orden completada sin pasar por pasarela
      const order = await prisma.order.create({
        data: {
          userId: session.user.id,
          orderNumber: reference,
          orderType: 'COURSE',
          itemId: courseIds.join(','), // Múltiples IDs separados por coma
          itemName: orderName,
          amount: 0,
          originalAmount: subtotal,
          discountAmount: discountAmount,
          discountCodeId: discountCodeId,
          discountCode: discountCodeValue?.toUpperCase(),
          currency,
          paymentMethod: 'FREE',
          paymentStatus: 'COMPLETED',
          metadata: {
            courseIds,
            items: items.map((i) => ({ id: i.courseId, name: i.courseName, price: i.price })),
            freeOrder: true,
          },
        },
      })

      // Crear entitlements para cada curso
      for (const item of items) {
        await createCourseEntitlement({
          userId: session.user.id,
          courseId: item.courseId,
          courseName: item.courseName,
          orderId: order.id,
        })
      }

      // Registrar uso del código de descuento
      if (discountCodeId && discountCodeValue) {
        await recordDiscountUsage({
          discountCodeId,
          discountCode: discountCodeValue,
          userId: session.user.id,
          orderId: order.id,
          discountAmount,
          currency,
        })
      }

      console.log(`Free order completed: ${reference} for user ${session.user.id}`)

      return NextResponse.json({
        success: true,
        freeOrder: true,
        reference,
        redirectUrl: '/mi-cuenta/cursos',
      })
    }

    // ============================================
    // CASO NORMAL: Pago requerido
    // ============================================

    // Crear orden pendiente
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        orderNumber: reference,
        orderType: 'COURSE',
        itemId: courseIds.join(','),
        itemName: orderName,
        amount: finalAmount,
        originalAmount: subtotal,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        discountCodeId: discountCodeId || null,
        discountCode: discountCodeValue?.toUpperCase() || null,
        currency,
        paymentMethod: getPaymentMethodEnum(paymentMethod),
        paymentStatus: 'PENDING',
        metadata: {
          courseIds,
          items: items.map((i) => ({ id: i.courseId, name: i.courseName, price: i.price })),
        },
      },
    })

    const appUrl = getAppUrl()

    // Procesar según método de pago
    if (isWompi) {
      // Wompi (Colombia - COP)
      if (currency !== 'COP') {
        return NextResponse.json(
          { error: 'Wompi solo soporta pagos en COP' },
          { status: 400 }
        )
      }

      const amountInCents = Math.round(finalAmount * 100)

      const { paymentLink, checkoutUrl } = await createWompiPaymentLink({
        name: orderName,
        description: `${orderName} - Academia Energía y Divinidad`,
        amountInCents,
        singleUse: true,
        redirectUrl: `${appUrl}/pago/confirmacion?ref=${reference}`,
      })

      await prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...(order.metadata as object),
            wompiPaymentLinkId: paymentLink.id,
          },
        },
      })

      return NextResponse.json({
        success: true,
        reference,
        checkoutUrl,
      })
    } else {
      // ePayco (Internacional - COP/USD)
      const nameParts = (session.user.name || 'Usuario').split(' ')
      const firstName = nameParts[0] || 'Usuario'
      const lastName = nameParts.slice(1).join(' ') || 'Cliente'

      const responseUrl = `${appUrl}/pago/confirmacion?ref=${reference}`
      const confirmationUrl = `${appUrl}/api/webhooks/epayco`

      let checkoutResponse

      if (paymentMethod === 'epayco_paypal') {
        checkoutResponse = await createEpaycoPayPalPayment({
          amount: finalAmount,
          currency,
          description: `${orderName} - Academia Energía y Divinidad`,
          invoice: reference,
          customerName: firstName,
          customerLastName: lastName,
          customerEmail: session.user.email,
          responseUrl,
          confirmationUrl,
          metadata: {
            userId: session.user.id,
            productType: 'course',
            productId: reference, // Reference links to order with courseIds in metadata
          },
        })
      } else {
        checkoutResponse = await createEpaycoCardPayment({
          amount: finalAmount,
          currency,
          description: `${orderName} - Academia Energía y Divinidad`,
          invoice: reference,
          customerName: firstName,
          customerLastName: lastName,
          customerEmail: session.user.email,
          responseUrl,
          confirmationUrl,
          metadata: {
            userId: session.user.id,
            productType: 'course',
            productId: reference, // Reference links to order with courseIds in metadata
          },
        })
      }

      if (!checkoutResponse.success) {
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
    }
  } catch (error) {
    console.error('Error in cart checkout:', error)
    return NextResponse.json(
      { error: 'Error al procesar el pedido' },
      { status: 500 }
    )
  }
}

function getPaymentMethodEnum(method: PaymentMethod) {
  switch (method) {
    case 'wompi_nequi':
      return 'WOMPI_NEQUI'
    case 'wompi_card':
      return 'WOMPI_CARD'
    case 'epayco_card':
      return 'EPAYCO_CARD'
    case 'epayco_paypal':
      return 'EPAYCO_PAYPAL'
    default:
      return 'EPAYCO_CARD'
  }
}
