import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { sendEventBookingConfirmation } from '@/lib/email'
import { acceptWaitlistOffer } from '@/lib/events/seat-allocation'
import { prisma } from '@/lib/prisma'
import { getEventById } from '@/lib/sanity/queries/events'

interface RouteParams {
  params: Promise<{ entryId: string }>
}

/**
 * POST /api/waitlist/[entryId]/accept
 * Accept a waitlist offer and create booking
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para aceptar esta oferta' },
        { status: 401 }
      )
    }

    const { entryId } = await params

    if (!entryId) {
      return NextResponse.json(
        { error: 'ID de entrada requerido' },
        { status: 400 }
      )
    }

    // Accept the offer (this creates the booking)
    const result = await acceptWaitlistOffer(entryId, session.user.id)

    // Get booking and event details for confirmation
    const booking = await prisma.booking.findUnique({
      where: { id: result.bookingId },
      include: {
        user: { select: { email: true, name: true } },
      },
    })

    if (booking) {
      const event = await getEventById(booking.resourceId)

      if (event && booking.user.email) {
        // Send booking confirmation email
        try {
          const metadata = booking.metadata as Record<string, unknown> | null
          const seats = (metadata?.seats as number) || 1

          await sendEventBookingConfirmation({
            email: booking.user.email,
            name: booking.user.name || 'Querida alma',
            eventTitle: event.title,
            eventDate: event.eventDate,
            eventType: event.locationType,
            orderNumber: result.orderId,
            seats,
            amount: Number(booking.amount) || 0,
            currency: booking.currency || 'COP',
            paymentStatus: booking.paymentStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
            zoomUrl: event.zoom?.meetingUrl,
            zoomId: event.zoom?.meetingId,
            zoomPassword: event.zoom?.password,
            venueName: event.venue?.name,
            venueAddress: event.venue?.address,
            venueCity: event.venue?.city,
          })
        } catch (emailError) {
          console.error('Error sending booking confirmation email:', emailError)
          // Don't fail the operation if email fails
        }
      }
    }

    // Determine if payment is needed
    const needsPayment = booking?.paymentStatus === 'PENDING' && Number(booking.amount) > 0

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      orderId: result.orderId,
      needsPayment,
      message: needsPayment
        ? 'Cupo aceptado. Procede al pago para confirmar tu reserva.'
        : '¡Cupo aceptado! Tu reserva ha sido confirmada.',
      redirectUrl: needsPayment
        ? `/pago/evento/${result.bookingId}`
        : '/mi-cuenta/eventos',
    })
  } catch (error) {
    console.error('Error accepting waitlist offer:', error)

    if (error instanceof Error) {
      // Handle specific error messages
      if (error.message.includes('expirado') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'La oferta ha expirado. Se ha pasado al siguiente en la lista.' },
          { status: 410 } // Gone
        )
      }
      if (error.message.includes('no encontrada') || error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Oferta no encontrada' },
          { status: 404 }
        )
      }
      if (error.message.includes('permiso') || error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'No tienes permiso para esta acción' },
          { status: 403 }
        )
      }
      if (error.message.includes('disponibles')) {
        return NextResponse.json(
          { error: 'Los cupos ya no están disponibles' },
          { status: 409 } // Conflict
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al aceptar la oferta' },
      { status: 500 }
    )
  }
}
