import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { sendEventBookingConfirmation, sendWaitlistJoinedEmail } from '@/lib/email'
import {
  getAvailableSpots,
  addToWaitlist,
  getWaitlistEntry,
} from '@/lib/events/seat-allocation'
import { generateOrderNumber } from '@/lib/order-utils'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'
import { getEventById } from '@/lib/sanity/queries/events'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = applyRateLimit(request, { maxRequests: 5, windowMs: 60_000 })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()

    const {
      eventId,
      seats = 1,
      customerName,
      customerEmail,
      customerPhone,
      country = 'colombia',
      paymentMethod,
      notes,
    } = body

    // Validación de campos requeridos
    if (!eventId || !customerName || !customerEmail || !customerPhone || !paymentMethod) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Validar teléfono (mínimo 7 dígitos)
    const phoneDigits = customerPhone.replace(/\D/g, '')
    if (phoneDigits.length < 7) {
      return NextResponse.json(
        { error: 'Número de teléfono inválido' },
        { status: 400 }
      )
    }

    // Obtener evento de Sanity
    const event = await getEventById(eventId)

    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    // Validar que el evento esté disponible para reservas
    if (event.status !== 'upcoming') {
      const statusMessages: Record<string, string> = {
        sold_out: 'Este evento tiene los cupos agotados',
        cancelled: 'Este evento ha sido cancelado',
        completed: 'Este evento ya finalizó',
      }
      return NextResponse.json(
        { error: statusMessages[event.status] || 'Este evento no está disponible' },
        { status: 400 }
      )
    }

    // Validar que el evento no haya pasado
    const eventDate = new Date(event.eventDate)
    const now = new Date()
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilEvent < 2) {
      return NextResponse.json(
        { error: 'Las reservas cierran 2 horas antes del evento' },
        { status: 400 }
      )
    }

    // Validar cantidad de cupos
    if (seats < 1 || seats > (event.maxPerBooking || 1)) {
      return NextResponse.json(
        { error: `Puedes reservar entre 1 y ${event.maxPerBooking || 1} cupos` },
        { status: 400 }
      )
    }

    // Validar disponibilidad de cupos usando el servicio de seat-allocation
    const availableSpots = await getAvailableSpots(eventId)

    if (availableSpots !== null && seats > availableSpots) {
      // No hay suficientes cupos - ofrecer unirse a la lista de espera
      // Solo si el usuario está autenticado
      const session = await auth()

      if (!session?.user?.id) {
        return NextResponse.json({
          success: false,
          soldOut: true,
          availableSpots,
          error: 'No hay cupos disponibles. Inicia sesión para unirte a la lista de espera.',
        }, { status: 200 })
      }

      // Verificar si ya está en la lista de espera
      const existingEntry = await getWaitlistEntry(eventId, session.user.id)

      if (existingEntry && ['WAITING', 'OFFER_PENDING'].includes(existingEntry.status)) {
        return NextResponse.json({
          success: false,
          waitlist: true,
          alreadyInWaitlist: true,
          position: existingEntry.position,
          status: existingEntry.status,
          offerExpiresAt: existingEntry.offerExpiresAt,
          message: existingEntry.status === 'OFFER_PENDING'
            ? `¡Tienes una oferta pendiente! Acepta tu cupo antes de que expire.`
            : `Ya estás en la lista de espera en posición ${existingEntry.position}`,
        }, { status: 200 })
      }

      // Añadir a la lista de espera
      try {
        const waitlistEntry = await addToWaitlist({
          eventId,
          userId: session.user.id,
          seatsRequested: seats,
          userEmail: customerEmail,
          userName: customerName,
        })

        // Enviar email de confirmación de waitlist
        try {
          await sendWaitlistJoinedEmail({
            email: customerEmail,
            name: customerName,
            eventTitle: event.title,
            eventDate: event.eventDate,
            position: waitlistEntry.position,
            seatsRequested: seats,
          })
        } catch (emailError) {
          console.error('Error sending waitlist joined email:', emailError)
        }

        return NextResponse.json({
          success: false,
          waitlist: true,
          position: waitlistEntry.position,
          waitlistEntryId: waitlistEntry.id,
          message: `Te has unido a la lista de espera en posición ${waitlistEntry.position}. Te notificaremos cuando haya un cupo disponible.`,
        }, { status: 200 })
      } catch (waitlistError) {
        console.error('Error adding to waitlist:', waitlistError)
        return NextResponse.json({
          success: false,
          soldOut: true,
          availableSpots,
          error: 'No hay cupos disponibles y no se pudo añadir a la lista de espera.',
        }, { status: 400 })
      }
    }

    // Verificar si requiere membresía (solo miembros pueden comprar)
    if (event.memberOnlyPurchase) {
      const session = await auth()
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Este evento requiere membresía activa. Por favor inicia sesión.' },
          { status: 401 }
        )
      }

      // Verificar membresía activa
      const userWithSubscription = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
        },
      })

      if (!userWithSubscription?.subscriptions?.length) {
        return NextResponse.json(
          { error: 'Este evento requiere membresía activa' },
          { status: 403 }
        )
      }
    }

    // Determinar método de pago
    type PaymentMethodEnum = 'WOMPI_NEQUI' | 'WOMPI_CARD' | 'EPAYCO_CARD' | 'EPAYCO_PAYPAL' | 'STRIPE' | 'MANUAL_NEQUI'
    let paymentMethodEnum: PaymentMethodEnum

    switch (paymentMethod) {
      case 'wompi_nequi':
        paymentMethodEnum = 'WOMPI_NEQUI'
        break
      case 'wompi_card':
        paymentMethodEnum = 'WOMPI_CARD'
        break
      case 'epayco_card':
        paymentMethodEnum = 'EPAYCO_CARD'
        break
      case 'epayco_paypal':
        paymentMethodEnum = 'EPAYCO_PAYPAL'
        break
      // Legacy methods for backwards compatibility
      case 'nequi':
        paymentMethodEnum = 'WOMPI_NEQUI'
        break
      case 'stripe':
        // LEGACY: Redirigir a ePayco para compatibilidad
        console.warn('Payment method "stripe" is deprecated, mapping to EPAYCO_CARD')
        paymentMethodEnum = 'EPAYCO_CARD'
        break
      default:
        return NextResponse.json(
          { error: 'Método de pago no soportado' },
          { status: 400 }
        )
    }

    // Calcular precio
    const isEarlyBird = event.earlyBirdPrice && event.earlyBirdDeadline &&
      new Date() <= new Date(event.earlyBirdDeadline)

    let unitPrice: number
    let currency: string

    if (country === 'colombia') {
      unitPrice = isEarlyBird ? event.earlyBirdPrice! : (event.price || 0)
      currency = 'COP'
    } else {
      unitPrice = event.priceUSD || 0
      currency = 'USD'
    }

    // Si está incluido en membresía y el usuario es miembro, precio = 0
    let isFreeForMember = false
    if (event.includedInMembership) {
      const session = await auth()
      if (session?.user?.email) {
        const userWithSubscription = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: {
            subscriptions: {
              where: { status: 'ACTIVE' },
            },
          },
        })

        if (userWithSubscription?.subscriptions?.length) {
          isFreeForMember = true
          unitPrice = 0
        }
      }
    }

    // Aplicar descuento de membresía si aplica
    if (!isFreeForMember && event.memberDiscount) {
      const session = await auth()
      if (session?.user?.email) {
        const userWithSubscription = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: {
            subscriptions: {
              where: { status: 'ACTIVE' },
            },
          },
        })

        if (userWithSubscription?.subscriptions?.length) {
          unitPrice = unitPrice * (1 - event.memberDiscount / 100)
        }
      }
    }

    const totalAmount = unitPrice * seats

    // Encontrar o crear usuario
    let user = await prisma.user.findUnique({
      where: { email: customerEmail },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customerEmail,
          name: customerName,
        },
      })
    }

    // Generar número de orden
    const orderNumber = generateOrderNumber('EVT')

    // Crear orden y booking en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear orden
      const order = await tx.order.create({
        data: {
          userId: user.id,
          orderNumber,
          orderType: 'EVENT',
          itemId: eventId,
          itemName: `${event.title} (${seats} cupo${seats > 1 ? 's' : ''})`,
          amount: new Prisma.Decimal(totalAmount),
          currency,
          paymentMethod: paymentMethodEnum,
          paymentStatus: isFreeForMember ? 'COMPLETED' : 'PENDING',
        },
      })

      // Crear booking
      const booking = await tx.booking.create({
        data: {
          userId: user.id,
          bookingType: 'EVENT',
          resourceId: eventId,
          resourceName: event.title,
          scheduledAt: new Date(event.eventDate),
          duration: event.endDate
            ? Math.round((new Date(event.endDate).getTime() - new Date(event.eventDate).getTime()) / 60000)
            : 120, // 2 horas por defecto
          status: isFreeForMember ? 'CONFIRMED' : 'PENDING_PAYMENT',
          amount: new Prisma.Decimal(totalAmount),
          currency,
          paymentMethod: paymentMethodEnum,
          paymentStatus: isFreeForMember ? 'COMPLETED' : 'PENDING',
          userNotes: notes || null,
          metadata: {
            seats,
            customerPhone,
          },
        },
      })

      // Manual payment records are no longer needed for Wompi/ePayco
      // Payments are handled via webhooks from the payment gateways

      // Crear entitlement para el evento
      await tx.entitlement.create({
        data: {
          userId: user.id,
          type: 'EVENT',
          resourceId: eventId,
          resourceName: event.title,
          orderId: order.id,
          expiresAt: event.endDate ? new Date(event.endDate) : new Date(event.eventDate),
          revoked: false,
        },
      })

      // Crear seat allocation para tracking de cupos
      await tx.seatAllocation.create({
        data: {
          eventId,
          bookingId: booking.id,
          userId: user.id,
          seats,
          status: 'ACTIVE',
        },
      })

      return { order, booking }
    })

    // Allocate perks if booking is confirmed (free for member)
    if (result.booking.status === 'CONFIRMED') {
      try {
        const { allocatePerks } = await import('@/lib/events/perks')
        await allocatePerks(result.booking.id)
      } catch (perkError) {
        console.error('Error allocating perks:', perkError)
        // Don't fail booking if perk allocation fails
      }
    }

    // Enviar email de confirmación
    try {
      await sendEventBookingConfirmation({
        email: customerEmail,
        name: customerName,
        eventTitle: event.title,
        eventDate: event.eventDate,
        eventType: event.locationType,
        orderNumber,
        seats,
        amount: totalAmount,
        currency,
        paymentStatus: isFreeForMember ? 'COMPLETED' : 'PENDING',
        // Zoom info solo si está confirmado
        ...(isFreeForMember && event.locationType === 'online' && event.zoom && {
          zoomUrl: event.zoom.meetingUrl,
          zoomId: event.zoom.meetingId,
          zoomPassword: event.zoom.password,
        }),
        // Venue info para presenciales
        ...(event.locationType === 'in_person' && event.venue && {
          venueName: event.venue.name,
          venueAddress: event.venue.address,
          venueCity: event.venue.city,
        }),
      })
    } catch (emailError) {
      console.error('Error sending booking confirmation email:', emailError)
      // No falla la reserva si el email falla
    }

    return NextResponse.json({
      success: true,
      bookingId: result.booking.id,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      eventTitle: event.title,
      eventDate: event.eventDate,
      locationType: event.locationType,
      seats,
      amount: totalAmount,
      currency,
      paymentMethod: paymentMethodEnum,
      paymentStatus: isFreeForMember ? 'COMPLETED' : 'PENDING',
      isFreeForMember,
      customerEmail,
      customerName,
      // Info de Zoom para eventos online (solo si está confirmado)
      ...(isFreeForMember && event.locationType === 'online' && event.zoom?.meetingUrl && {
        zoomUrl: event.zoom.meetingUrl,
        zoomId: event.zoom.meetingId,
        zoomPassword: event.zoom.password,
      }),
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating event booking:', error)

    return NextResponse.json(
      {
        error: 'Error al crear la reserva',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// GET: Obtener reservas de eventos de un usuario
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ bookings: [] })
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        bookingType: 'EVENT',
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    })

    // Enriquecer con información del evento de Sanity
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const event = await getEventById(booking.resourceId)
        return {
          ...booking,
          event: event ? {
            title: event.title,
            slug: event.slug.current,
            eventDate: event.eventDate,
            endDate: event.endDate,
            locationType: event.locationType,
            venue: event.venue,
            zoom: booking.status === 'CONFIRMED' ? event.zoom : undefined,
            recording: event.recording,
            mainImage: event.mainImage,
          } : null,
        }
      })
    )

    return NextResponse.json({ bookings: enrichedBookings })

  } catch (error) {
    console.error('Error fetching event bookings:', error)

    return NextResponse.json(
      { error: 'Error al obtener las reservas' },
      { status: 500 }
    )
  }
}
