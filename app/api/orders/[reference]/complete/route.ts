import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/orders/[reference]/complete
 * Marcar una orden como completada después de un pago exitoso con el Widget
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params
    const body = await request.json()
    const { transactionId, status } = body

    if (!reference) {
      return NextResponse.json({ error: 'Referencia requerida' }, { status: 400 })
    }

    // Buscar orden
    const order = await prisma.order.findFirst({
      where: { orderNumber: reference },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Mapear status de Wompi
    let paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED'
    switch (status) {
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
      case 'PENDING':
      default:
        paymentStatus = 'PENDING'
    }

    // Actualizar orden
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        metadata: {
          ...(order.metadata as object),
          wompiTransactionId: transactionId,
          wompiStatus: status,
          completedAt: new Date().toISOString(),
        },
      },
    })

    // Si el pago fue aprobado, crear los recursos correspondientes
    if (paymentStatus === 'COMPLETED') {
      // Nota: En producción, esto debería hacerse via webhook para mayor seguridad
      // Por ahora, confiamos en el resultado del widget para demos
      console.log(`Orden ${reference} completada exitosamente - Transacción: ${transactionId}`)
    }

    return NextResponse.json({
      success: true,
      paymentStatus,
      transactionId,
    })
  } catch (error) {
    console.error('Error completing order:', error)
    return NextResponse.json({ error: 'Error completando orden' }, { status: 500 })
  }
}
