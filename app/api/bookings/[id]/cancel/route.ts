import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelBooking } from '@/lib/services/booking-cancellation'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/bookings/[id]/cancel
 * Cancelar una sesión de canalización
 *
 * Body: { reason?: string }
 *
 * Reglas:
 * - Cliente: mínimo 24h antes, las sesiones de pack se devuelven
 * - Admin: sin restricciones, puede cancelar cualquier sesión
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    // Usar el servicio de cancelación
    const result = await cancelBooking({
      bookingId: id,
      cancelledBy: 'user',
      requestingUserId: session.user.id,
      reason,
    })

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
        UNAUTHORIZED: 403,
        TOO_LATE: 400,
        INVALID_STATUS: 400,
        INTERNAL_ERROR: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      packSessionReturned: result.refunded?.packSessions || false,
      creditRefunded: result.refunded?.credits || false,
      message: result.message,
    })

  } catch (error) {
    console.error('Error cancelando sesión:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la sesión' },
      { status: 500 }
    )
  }
}
