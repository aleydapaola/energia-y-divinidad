import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelBooking } from '@/lib/services/booking-cancellation'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

/**
 * PATCH /api/events/[eventId]/cancel-booking
 * Cancel a booking for an event
 *
 * Body: { bookingId: string, reason?: string }
 *
 * Rules:
 * - Client: minimum 24h before event, seats are released to waitlist
 * - Admin: no restrictions
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

    const { eventId } = await params
    const body = await request.json()
    const { bookingId, reason } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      )
    }

    // Get booking to verify it's for this event
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { resourceId: true, bookingType: true },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // Verify booking is for this event
    if (booking.resourceId !== eventId) {
      return NextResponse.json(
        { error: 'La reserva no corresponde a este evento' },
        { status: 400 }
      )
    }

    // Verify booking is for an event
    if (booking.bookingType !== 'EVENT') {
      return NextResponse.json(
        { error: 'Esta reserva no es para un evento' },
        { status: 400 }
      )
    }

    // Use the cancellation service
    const result = await cancelBooking({
      bookingId,
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
      seatsReleased: result.refunded?.seatsReleased || 0,
      message: result.message,
    })
  } catch (error) {
    console.error('Error cancelling event booking:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la reserva' },
      { status: 500 }
    )
  }
}
