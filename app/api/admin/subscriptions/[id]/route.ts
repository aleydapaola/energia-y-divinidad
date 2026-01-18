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

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        entitlements: {
          select: {
            id: true,
            type: true,
            revoked: true,
            expiresAt: true,
            resourceName: true,
          },
        },
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    // Obtener audit logs relacionados
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'subscription',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Obtener órdenes relacionadas con membresía del usuario
    const relatedOrders = await prisma.order.findMany({
      where: {
        userId: subscription.userId,
        orderType: 'MEMBERSHIP',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        amount: true,
        currency: true,
        paymentStatus: true,
        createdAt: true,
      },
    })

    const serialized = {
      id: subscription.id,
      userId: subscription.userId,
      user: subscription.user,
      membershipTierName: subscription.membershipTierName,
      membershipTierId: subscription.membershipTierId,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      amount: Number(subscription.amount),
      currency: subscription.currency,
      paymentProvider: subscription.paymentProvider,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      nequiSubscriptionId: subscription.nequiSubscriptionId,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelledAt: subscription.cancelledAt?.toISOString() || null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
      entitlements: subscription.entitlements.map((e) => ({
        id: e.id,
        type: e.type,
        resourceName: e.resourceName,
        revoked: e.revoked,
        expiresAt: e.expiresAt?.toISOString() || null,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
      })),
      relatedOrders: relatedOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        amount: Number(o.amount),
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Error al obtener suscripción' },
      { status: 500 }
    )
  }
}
