import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getBookingPerks } from '@/lib/events/perks'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/events/[eventId]/perks
 * Get perks for user's booking of this event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { eventId } = await params

    // Find user's booking for this event
    const booking = await prisma.booking.findFirst({
      where: {
        userId: session.user.id,
        resourceId: eventId,
        bookingType: 'EVENT',
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'No tienes reserva para este evento' },
        { status: 404 }
      )
    }

    const perks = await getBookingPerks(booking.id)

    return NextResponse.json({ perks })
  } catch (error) {
    console.error('Error fetching event perks:', error)
    return NextResponse.json(
      { error: 'Error al obtener los perks' },
      { status: 500 }
    )
  }
}
