import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            country: true,
          },
        },
        booking: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            resourceName: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Obtener audit logs relacionados
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'order',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Obtener email logs relacionados
    const emailLogs = await prisma.emailLog.findMany({
      where: {
        entityType: 'order',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const serialized = {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      user: order.user,
      guestEmail: order.guestEmail,
      guestName: order.guestName,
      orderType: order.orderType,
      itemName: order.itemName,
      sanityProductId: order.sanityProductId,
      amount: Number(order.amount),
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      providerTransactionId: order.providerTransactionId,
      discountCode: order.discountCode,
      discountAmount: order.discountAmount ? Number(order.discountAmount) : null,
      metadata: order.metadata,
      booking: order.booking,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
      })),
      emailLogs: emailLogs.map((log) => ({
        id: log.id,
        template: log.template,
        status: log.status,
        sentAt: log.sentAt?.toISOString(),
        createdAt: log.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Error al obtener orden' },
      { status: 500 }
    )
  }
}
