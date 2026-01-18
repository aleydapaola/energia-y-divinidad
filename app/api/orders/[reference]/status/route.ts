import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWompiApiUrl, WOMPI_CONFIG } from '@/lib/wompi'

/**
 * GET /api/orders/[reference]/status
 * Consultar estado de una orden por su referencia (orderNumber)
 *
 * Query params:
 * - verify=true: Verificar con Wompi si el pago está pendiente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params
    const { searchParams } = new URL(request.url)
    const shouldVerify = searchParams.get('verify') === 'true'

    if (!reference) {
      return NextResponse.json({ error: 'Referencia requerida' }, { status: 400 })
    }

    // Buscar orden por orderNumber
    const order = await prisma.order.findFirst({
      where: { orderNumber: reference },
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        itemId: true,
        itemName: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        paymentStatus: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    let paymentStatus = order.paymentStatus
    const metadata = order.metadata as Record<string, any> | null

    // Si el pago está pendiente y es de Wompi, verificar directamente con Wompi
    if (shouldVerify && paymentStatus === 'PENDING' &&
        (order.paymentMethod === 'WOMPI_CARD' || order.paymentMethod === 'WOMPI_NEQUI')) {
      try {
        const paymentLinkId = metadata?.wompiPaymentLinkId
        if (paymentLinkId) {
          const wompiStatus = await verifyWompiPaymentLink(paymentLinkId)
          if (wompiStatus) {
            paymentStatus = wompiStatus
            // Actualizar en la base de datos si cambió
            if (wompiStatus !== 'PENDING') {
              await prisma.order.update({
                where: { id: order.id },
                data: { paymentStatus: wompiStatus },
              })
            }
          }
        }
      } catch (error) {
        console.error('Error verifying with Wompi:', error)
        // Continuar con el estado de la BD si falla la verificación
      }
    }

    return NextResponse.json({
      ...order,
      paymentStatus,
      amount: Number(order.amount),
    })
  } catch (error) {
    console.error('Error fetching order status:', error)
    return NextResponse.json({ error: 'Error al consultar orden' }, { status: 500 })
  }
}

/**
 * Verificar estado de un Payment Link en Wompi
 * Consulta las transacciones asociadas al payment link
 */
async function verifyWompiPaymentLink(
  paymentLinkId: string
): Promise<'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | null> {
  if (!WOMPI_CONFIG.privateKey) {
    return null
  }

  try {
    // Consultar transacciones del payment link
    const response = await fetch(
      `${getWompiApiUrl()}/payment_links/${paymentLinkId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Error fetching payment link:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    const paymentLink = data.data

    // Si no hay transacciones asociadas, sigue pendiente
    if (!paymentLink.transactions || paymentLink.transactions.length === 0) {
      return 'PENDING'
    }

    // Tomar la transacción más reciente
    const latestTransaction = paymentLink.transactions[paymentLink.transactions.length - 1]
    const wompiStatus = latestTransaction.status

    // Mapear status de Wompi a nuestro modelo
    switch (wompiStatus) {
      case 'APPROVED':
        return 'COMPLETED'
      case 'DECLINED':
      case 'ERROR':
        return 'FAILED'
      case 'VOIDED':
        return 'CANCELLED'
      case 'PENDING':
      default:
        return 'PENDING'
    }
  } catch (error) {
    console.error('Error calling Wompi API:', error)
    return null
  }
}
