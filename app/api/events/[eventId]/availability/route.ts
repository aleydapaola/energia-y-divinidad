import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getEventAvailability, getWaitlistPosition } from '@/lib/events/seat-allocation'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

/**
 * GET /api/events/[eventId]/availability
 * Get event availability and waitlist status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Get availability info
    const availability = await getEventAvailability(eventId)

    // Check if current user is in waitlist
    let userWaitlistPosition: number | null = null
    const session = await auth()

    if (session?.user?.id) {
      userWaitlistPosition = await getWaitlistPosition(eventId, session.user.id)
    }

    return NextResponse.json({
      eventId: availability.eventId,
      capacity: availability.capacity,
      allocatedSeats: availability.allocatedSeats,
      availableSpots: availability.availableSpots,
      waitlistCount: availability.waitlistCount,
      hasWaitlist: availability.waitlistCount > 0,
      isSoldOut: availability.capacity !== null && availability.availableSpots === 0,
      userWaitlistPosition,
    })
  } catch (error) {
    console.error('Error getting event availability:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Error al obtener disponibilidad' },
      { status: 500 }
    )
  }
}
