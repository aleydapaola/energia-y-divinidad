import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { sendWaitlistJoinedEmail } from '@/lib/email'
import {
  addToWaitlist,
  getWaitlistEntry,
  cancelWaitlistEntry,
  hasAvailableSpots,
} from '@/lib/events/seat-allocation'
import { prisma } from '@/lib/prisma'
import { getEventById } from '@/lib/sanity/queries/events'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

/**
 * POST /api/events/[eventId]/waitlist
 * Join the waitlist for an event
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para unirte a la lista de espera' },
        { status: 401 }
      )
    }

    const { eventId } = await params
    const body = await request.json()
    const { seats = 1 } = body

    // Validate event exists and is upcoming
    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    if (event.status !== 'upcoming') {
      return NextResponse.json(
        { error: 'Este evento no está disponible para reservas' },
        { status: 400 }
      )
    }

    // Check if event date hasn't passed
    const eventDate = new Date(event.eventDate)
    if (eventDate < new Date()) {
      return NextResponse.json(
        { error: 'Este evento ya ha pasado' },
        { status: 400 }
      )
    }

    // Validate seats
    if (seats < 1 || seats > (event.maxPerBooking || 1)) {
      return NextResponse.json(
        { error: `Puedes solicitar entre 1 y ${event.maxPerBooking || 1} cupos` },
        { status: 400 }
      )
    }

    // Check if there are actually available spots (shouldn't join waitlist if spots available)
    const spotsAvailable = await hasAvailableSpots(eventId, seats)
    if (spotsAvailable) {
      return NextResponse.json(
        { error: 'Hay cupos disponibles. Por favor realiza una reserva normal.' },
        { status: 400 }
      )
    }

    // Check if user is already in waitlist
    const existingEntry = await getWaitlistEntry(eventId, session.user.id)
    if (existingEntry && ['WAITING', 'OFFER_PENDING'].includes(existingEntry.status)) {
      return NextResponse.json({
        success: false,
        alreadyInWaitlist: true,
        position: existingEntry.position,
        status: existingEntry.status,
        message: `Ya estás en la lista de espera en posición ${existingEntry.position}`,
      })
    }

    // Get user info for email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    })

    if (!user?.email) {
      return NextResponse.json(
        { error: 'No se encontró tu información de usuario' },
        { status: 400 }
      )
    }

    // Add to waitlist
    const entry = await addToWaitlist({
      eventId,
      userId: session.user.id,
      seatsRequested: seats,
      userEmail: user.email,
      userName: user.name || undefined,
    })

    // Send confirmation email
    try {
      await sendWaitlistJoinedEmail({
        email: user.email,
        name: user.name || 'Querida alma',
        eventTitle: event.title,
        eventDate: event.eventDate,
        position: entry.position,
        seatsRequested: seats,
      })
    } catch (emailError) {
      console.error('Error sending waitlist joined email:', emailError)
      // Don't fail the operation if email fails
    }

    return NextResponse.json({
      success: true,
      waitlistEntryId: entry.id,
      position: entry.position,
      seatsRequested: entry.seatsRequested,
      message: `Te has unido a la lista de espera en posición ${entry.position}`,
    })
  } catch (error) {
    console.error('Error joining waitlist:', error)

    if (error instanceof Error) {
      if (error.message.includes('Ya estás en la lista')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Error al unirse a la lista de espera' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/events/[eventId]/waitlist
 * Get current user's waitlist entry for an event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { eventId } = await params

    const entry = await getWaitlistEntry(eventId, session.user.id)

    if (!entry) {
      return NextResponse.json({
        inWaitlist: false,
        entry: null,
      })
    }

    return NextResponse.json({
      inWaitlist: ['WAITING', 'OFFER_PENDING'].includes(entry.status),
      entry: {
        id: entry.id,
        position: entry.position,
        seatsRequested: entry.seatsRequested,
        status: entry.status,
        offerExpiresAt: entry.offerExpiresAt,
        createdAt: entry.createdAt,
      },
    })
  } catch (error) {
    console.error('Error getting waitlist entry:', error)
    return NextResponse.json(
      { error: 'Error al obtener estado de lista de espera' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[eventId]/waitlist
 * Leave the waitlist for an event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { eventId } = await params

    // Get user's waitlist entry
    const entry = await getWaitlistEntry(eventId, session.user.id)

    if (!entry || !['WAITING', 'OFFER_PENDING'].includes(entry.status)) {
      return NextResponse.json(
        { error: 'No estás en la lista de espera para este evento' },
        { status: 404 }
      )
    }

    // Cancel the entry
    await cancelWaitlistEntry(entry.id, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Has salido de la lista de espera',
    })
  } catch (error) {
    console.error('Error leaving waitlist:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al salir de la lista de espera' },
      { status: 500 }
    )
  }
}
