import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkNequiSubscriptionStatus } from '@/lib/nequi'

/**
 * GET /api/subscriptions/[id]/status
 * Obtener estado actual de una suscripción
 * Útil para polling desde el frontend mientras el usuario aprueba en Nequi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentProvider: true,
        nequiSubscriptionId: true,
        nequiApprovedAt: true,
        membershipTierId: true,
        membershipTierName: true,
        billingInterval: true,
        amount: true,
        currency: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que la suscripción pertenece al usuario
    if (subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver esta suscripción' },
        { status: 403 }
      )
    }

    // Si es Nequi y aún está pendiente, consultar API de Nequi
    if (
      subscription.paymentProvider === 'nequi' &&
      subscription.status === 'TRIAL' &&
      subscription.nequiSubscriptionId &&
      !subscription.nequiApprovedAt
    ) {
      try {
        const nequiStatus = await checkNequiSubscriptionStatus(
          subscription.nequiSubscriptionId
        )

        // Si Nequi reporta que está activa, actualizar en DB
        if (nequiStatus === 'active') {
          const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'ACTIVE',
              nequiApprovedAt: new Date(),
            },
          })

          // Crear Entitlement si no existe
          const existingEntitlement = await prisma.entitlement.findFirst({
            where: {
              subscriptionId: subscription.id,
              type: 'MEMBERSHIP',
            },
          })

          if (!existingEntitlement) {
            await prisma.entitlement.create({
              data: {
                userId: subscription.userId,
                type: 'MEMBERSHIP',
                resourceId: subscription.membershipTierId,
                resourceName: subscription.membershipTierName,
                expiresAt: subscription.currentPeriodEnd,
                subscriptionId: subscription.id,
              },
            })
          }

          return NextResponse.json({
            ...updatedSubscription,
            amount: updatedSubscription.amount.toNumber(),
            statusChanged: true,
          })
        }
      } catch (error) {
        console.error('Error consultando estado en Nequi:', error)
        // Continuar con el estado actual en DB si falla la consulta
      }
    }

    return NextResponse.json({
      ...subscription,
      amount: subscription.amount.toNumber(),
      statusChanged: false,
    })
  } catch (error) {
    console.error('Error obteniendo estado de suscripción:', error)
    return NextResponse.json(
      { error: 'Error al obtener estado de suscripción' },
      { status: 500 }
    )
  }
}
