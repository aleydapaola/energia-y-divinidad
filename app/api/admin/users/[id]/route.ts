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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            bookings: true,
            subscriptions: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        amount: true,
        currency: true,
        paymentStatus: true,
        createdAt: true,
      },
    })

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        resourceName: true,
        bookingType: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
      },
    })

    // Get active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        membershipTierName: true,
        status: true,
        billingInterval: true,
        amount: true,
        currency: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    })

    // Get audit logs related to this user
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'user',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const serialized = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      stats: {
        ordersCount: user._count.orders,
        bookingsCount: user._count.bookings,
        subscriptionsCount: user._count.subscriptions,
      },
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            membershipTierName: activeSubscription.membershipTierName,
            status: activeSubscription.status,
            billingInterval: activeSubscription.billingInterval,
            amount: Number(activeSubscription.amount),
            currency: activeSubscription.currency,
            currentPeriodStart: activeSubscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
            createdAt: activeSubscription.createdAt.toISOString(),
          }
        : null,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderType: o.orderType,
        amount: Number(o.amount),
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
      })),
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        resourceName: b.resourceName,
        bookingType: b.bookingType,
        status: b.status,
        scheduledAt: b.scheduledAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}
