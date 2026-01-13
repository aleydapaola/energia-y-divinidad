import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelStripeSubscription } from '@/lib/stripe'
import { cancelNequiSubscription } from '@/lib/nequi'

/**
 * POST /api/subscriptions/cancel
 * Cancelar suscripción activa del usuario
 * La suscripción permanecerá activa hasta el final del período pagado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar suscripción activa del usuario
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['ACTIVE', 'TRIAL', 'PAST_DUE'],
        },
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'No tienes una suscripción activa' },
        { status: 404 }
      )
    }

    // Ya está cancelada
    if (subscription.cancelledAt) {
      return NextResponse.json(
        { error: 'Esta suscripción ya está cancelada' },
        { status: 400 }
      )
    }

    // Cancelar según el proveedor
    if (subscription.paymentProvider === 'stripe' && subscription.stripeSubscriptionId) {
      // Cancelar en Stripe (al final del período)
      await cancelStripeSubscription(subscription.stripeSubscriptionId, false)
    } else if (
      subscription.paymentProvider === 'nequi' &&
      subscription.nequiSubscriptionId
    ) {
      // Cancelar en Nequi
      await cancelNequiSubscription(subscription.nequiSubscriptionId)
    }

    // Actualizar en DB
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelledAt: new Date(),
        // El status se mantiene ACTIVE hasta que expire el período
      },
    })

    return NextResponse.json({
      success: true,
      message: `Tu suscripción ha sido cancelada. Mantendrás acceso hasta ${subscription.currentPeriodEnd.toLocaleDateString('es-ES')}`,
    })
  } catch (error: any) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Error al cancelar suscripción' },
      { status: 500 }
    )
  }
}
