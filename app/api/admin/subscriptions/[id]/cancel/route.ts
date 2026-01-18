import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function POST(
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

    const body = await request.json()
    const { reason, immediate = false } = body

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        entitlements: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    if (subscription.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'La suscripción ya está cancelada' },
        { status: 400 }
      )
    }

    const previousStatus = subscription.status
    const now = new Date()

    // Determinar nueva fecha de período según tipo de cancelación
    const newPeriodEnd = immediate ? now : subscription.currentPeriodEnd

    // Actualizar suscripción
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        currentPeriodEnd: newPeriodEnd,
      },
    })

    // Revocar entitlements si es cancelación inmediata
    if (immediate && subscription.entitlements.length > 0) {
      await prisma.entitlement.updateMany({
        where: {
          subscriptionId: id,
          revoked: false,
        },
        data: {
          revoked: true,
          revokedAt: now,
          revokedReason: reason || 'Cancelación administrativa de suscripción',
        },
      })
    }

    // Crear registro de auditoría
    await createAuditLog({
      actorId: session.user.id,
      actorEmail: session.user.email!,
      entityType: 'subscription',
      entityId: id,
      action: 'cancel',
      before: {
        status: previousStatus,
        cancelledAt: null,
      },
      after: {
        status: 'CANCELLED',
        cancelledAt: now.toISOString(),
        immediate,
      },
      reason: reason || 'Cancelación administrativa',
      metadata: {
        userId: subscription.userId,
        userEmail: subscription.user.email,
        membershipTier: subscription.membershipTierName,
        immediate,
      },
    })

    return NextResponse.json({
      success: true,
      message: immediate
        ? 'Suscripción cancelada inmediatamente'
        : 'Suscripción cancelada. El acceso continúa hasta el fin del período actual.',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelledAt: updatedSubscription.cancelledAt?.toISOString(),
        currentPeriodEnd: updatedSubscription.currentPeriodEnd.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Error al cancelar suscripción' },
      { status: 500 }
    )
  }
}
