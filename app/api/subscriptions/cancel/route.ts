import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelUserActiveSubscription } from '@/lib/services/subscription-cancellation'

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

    const body = await request.json().catch(() => ({}))

    // Usar el servicio de cancelación
    const result = await cancelUserActiveSubscription(
      session.user.id,
      body.reason
    )

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
        UNAUTHORIZED: 403,
        NO_ACTIVE_SUBSCRIPTION: 404,
        PROVIDER_ERROR: 500,
        INTERNAL_ERROR: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      subscription: result.subscription,
    })
  } catch (error: unknown) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Error al cancelar suscripción' },
      { status: 500 }
    )
  }
}
