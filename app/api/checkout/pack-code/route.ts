import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * GET /api/checkout/pack-code?session_id=xxx
 * Obtiene el código de pack asociado a una sesión de Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Falta session_id' },
        { status: 400 }
      )
    }

    // Obtener la sesión de Stripe para verificar que pertenece al usuario
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (!stripeSession || stripeSession.metadata?.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Buscar el booking asociado
    const booking = await prisma.booking.findFirst({
      where: {
        stripeSessionId: sessionId,
        userId: session.user.id,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // Buscar el código de pack asociado al booking
    const packCode = await prisma.sessionPackCode.findUnique({
      where: { originalBookingId: booking.id },
    })

    if (!packCode) {
      // El código aún no se ha generado (puede estar procesándose)
      return NextResponse.json(
        { error: 'Código aún no generado. Revisa tu email en unos minutos.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: packCode.code,
      expiresAt: packCode.expiresAt?.toISOString(),
      sessionsTotal: packCode.sessionsTotal,
      sessionsUsed: packCode.sessionsUsed,
      amount: Number(packCode.priceAtPurchase),
      currency: packCode.currency,
    })
  } catch (error) {
    console.error('Error fetching pack code:', error)
    return NextResponse.json(
      { error: 'Error al obtener código de pack' },
      { status: 500 }
    )
  }
}
