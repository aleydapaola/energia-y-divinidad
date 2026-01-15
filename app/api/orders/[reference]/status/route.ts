import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/orders/[reference]/status
 * Consultar estado de una orden por su referencia (orderNumber)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params

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
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      ...order,
      amount: Number(order.amount),
    })
  } catch (error) {
    console.error('Error fetching order status:', error)
    return NextResponse.json({ error: 'Error al consultar orden' }, { status: 500 })
  }
}
