import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/checkout/pack-code?booking_id=xxx
 * Obtiene el código de pack asociado a un booking
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookingId = searchParams.get('booking_id')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Falta booking_id' },
        { status: 400 }
      )
    }

    // Verificar que el booking pertenece al usuario
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Buscar el código de pack asociado al booking
    const packCode = await prisma.sessionPackCode.findUnique({
      where: { originalBookingId: booking.id },
    })

    if (!packCode) {
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
