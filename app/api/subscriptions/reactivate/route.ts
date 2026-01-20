import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNequiSubscription } from '@/lib/nequi'

/**
 * POST /api/subscriptions/reactivate
 * Reactivar una suscripción cancelada
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar suscripción cancelada del usuario
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        cancelledAt: {
          not: null,
        },
        status: {
          in: ['ACTIVE', 'CANCELLED'],
        },
      },
      orderBy: {
        cancelledAt: 'desc',
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'No tienes una suscripción cancelada para reactivar' },
        { status: 404 }
      )
    }

    // Reactivar según el proveedor
    if (subscription.paymentProvider === 'stripe') {
      // LEGACY: Stripe ya no está soportado
      // Las suscripciones de Stripe no se pueden reactivar automáticamente
      return NextResponse.json(
        {
          error: 'Las suscripciones de Stripe no se pueden reactivar automáticamente. Por favor crea una nueva suscripción con Nequi o tarjeta.'
        },
        { status: 400 }
      )
    } else if (subscription.paymentProvider === 'nequi') {
      // Para Nequi, necesitamos crear una nueva suscripción
      // porque una vez cancelada no se puede reactivar
      if (!subscription.nequiPhoneNumber) {
        return NextResponse.json(
          { error: 'No se encontró el número de teléfono para reactivar' },
          { status: 400 }
        )
      }

      // Crear nueva suscripción en Nequi
      const nequiResponse = await createNequiSubscription(
        subscription.nequiPhoneNumber,
        subscription.amount.toNumber(),
        subscription.billingInterval === 'MONTHLY' ? 'monthly' : 'yearly',
        {
          userId: session.user.id,
          tierId: subscription.membershipTierId,
          tierName: subscription.membershipTierName,
        }
      )

      // Actualizar suscripción existente
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelledAt: null,
          status: 'TRIAL', // Hasta que el usuario apruebe en Nequi
          nequiSubscriptionId: nequiResponse.subscriptionId,
          nequiApprovedAt: null,
        },
      })

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message:
          'Por favor aprueba la nueva suscripción en tu app Nequi para completar la reactivación',
      })
    } else {
      return NextResponse.json(
        { error: 'Método de pago no soportado' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error reactivating subscription:', error)
    return NextResponse.json(
      { error: 'Error al reactivar suscripción' },
      { status: 500 }
    )
  }
}
