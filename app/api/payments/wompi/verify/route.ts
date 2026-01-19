import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWompiApiUrl, WOMPI_CONFIG } from '@/lib/wompi'
import { processApprovedPayment } from '@/lib/payment-processor'

/**
 * GET /api/payments/wompi/verify
 * Verificar estado de una transacción de Wompi y actualizar la orden
 *
 * Query params:
 * - transactionId: ID de la transacción de Wompi
 * - ref: Referencia de la orden (orderNumber)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const transactionId = searchParams.get('transactionId')
  const reference = searchParams.get('ref')

  console.log('[VERIFY/WOMPI] === INICIANDO VERIFICACIÓN ===')
  console.log('[VERIFY/WOMPI] transactionId:', transactionId)
  console.log('[VERIFY/WOMPI] reference:', reference)

  if (!transactionId || !reference) {
    return NextResponse.json(
      { error: 'Se requiere transactionId y ref' },
      { status: 400 }
    )
  }

  try {
    // 1. Obtener estado de la transacción desde Wompi
    const wompiUrl = `${getWompiApiUrl()}/transactions/${transactionId}`
    console.log('[VERIFY/WOMPI] Fetching from Wompi:', wompiUrl)

    const wompiResponse = await fetch(wompiUrl, {
      headers: {
        Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
      },
    })

    if (!wompiResponse.ok) {
      console.error('[VERIFY/WOMPI] Error respuesta Wompi:', wompiResponse.status)
      throw new Error(`Error consultando Wompi: ${wompiResponse.status}`)
    }

    const wompiData = await wompiResponse.json()
    const transaction = wompiData.data
    console.log('[VERIFY/WOMPI] Wompi response status:', transaction?.status)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transacción no encontrada en Wompi' },
        { status: 404 }
      )
    }

    // 2. Buscar la orden en nuestra BD
    const order = await prisma.order.findFirst({
      where: { orderNumber: reference },
      include: { user: true },
    })

    if (!order) {
      console.error('[VERIFY/WOMPI] Orden no encontrada:', reference)
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    console.log('[VERIFY/WOMPI] Orden encontrada:', order.id, 'Status actual:', order.paymentStatus)

    // 3. Actualizar estado de la orden según Wompi
    const newPaymentStatus = mapWompiStatus(transaction.status)
    const metadata = order.metadata as any

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: newPaymentStatus,
        metadata: {
          ...metadata,
          wompiTransactionId: transactionId,
          wompiStatus: transaction.status,
          wompiVerifiedAt: new Date().toISOString(),
        },
      },
      include: { user: true },
    })

    console.log('[VERIFY/WOMPI] Orden actualizada a:', newPaymentStatus)

    // 4. Si el pago fue aprobado, procesar con el servicio centralizado
    if (transaction.status === 'APPROVED' && order.paymentStatus !== 'COMPLETED') {
      console.log('[VERIFY/WOMPI] Pago aprobado, procesando...')

      const result = await processApprovedPayment(updatedOrder, {
        transactionId,
      })

      if (!result.success) {
        console.error('[VERIFY/WOMPI] Error procesando pago:', result.error)
      } else {
        console.log('[VERIFY/WOMPI] Pago procesado exitosamente')
      }
    }

    // 5. Devolver resultado
    return NextResponse.json({
      success: true,
      transactionStatus: transaction.status,
      paymentStatus: newPaymentStatus,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        orderType: updatedOrder.orderType,
        itemName: updatedOrder.itemName,
        amount: updatedOrder.amount,
        currency: updatedOrder.currency,
        paymentStatus: newPaymentStatus,
        paymentMethod: updatedOrder.paymentMethod,
      },
    })
  } catch (error: any) {
    console.error('[VERIFY/WOMPI] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error verificando transacción' },
      { status: 500 }
    )
  }
}

/**
 * Mapear status de Wompi a nuestro modelo
 */
function mapWompiStatus(
  status: string
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  switch (status) {
    case 'APPROVED':
      return 'COMPLETED'
    case 'PENDING':
      return 'PENDING'
    case 'DECLINED':
    case 'ERROR':
      return 'FAILED'
    case 'VOIDED':
      return 'CANCELLED'
    default:
      return 'PENDING'
  }
}
