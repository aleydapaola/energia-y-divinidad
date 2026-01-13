import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Helper to generate order number: ORD-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `ORD-${year}${month}${day}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      sessionId,
      sessionSlug,
      scheduledDateTime,
      country,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      price,
      priceUSD,
      currency,
    } = body

    // Validation
    if (!sessionId || !scheduledDateTime || !country || !paymentMethod || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Parse scheduled date
    const scheduledAt = new Date(scheduledDateTime)
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: 'Fecha inválida' },
        { status: 400 }
      )
    }

    // Check if date is in the past
    if (scheduledAt < new Date()) {
      return NextResponse.json(
        { error: 'No puedes reservar una fecha pasada' },
        { status: 400 }
      )
    }

    // Check for existing booking at this time
    const existingBooking = await prisma.booking.findFirst({
      where: {
        resourceId: sessionId,
        scheduledAt: scheduledAt,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    })

    if (existingBooking) {
      return NextResponse.json(
        { error: 'Este horario ya está reservado. Por favor selecciona otro.' },
        { status: 409 }
      )
    }

    // Find or create guest user
    let user = await prisma.user.findUnique({
      where: { email: customerEmail },
    })

    if (!user) {
      // Create guest user
      user = await prisma.user.create({
        data: {
          email: customerEmail,
          name: customerName,
        },
      })
    }

    // Determine payment method enum
    let paymentMethodEnum: 'STRIPE' | 'MANUAL_NEQUI' | 'MANUAL_DAVIPLATA' | 'MANUAL_BANCOLOMBIA'
    if (paymentMethod === 'nequi') {
      paymentMethodEnum = 'MANUAL_NEQUI'
    } else if (paymentMethod === 'stripe') {
      paymentMethodEnum = 'STRIPE'
    } else {
      return NextResponse.json(
        { error: 'Método de pago no soportado' },
        { status: 400 }
      )
    }

    // Calculate amount
    const amount = country === 'colombia' ? price : (priceUSD || price)
    const finalCurrency = country === 'colombia' ? 'COP' : 'USD'

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Create order and booking in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId: user.id,
          orderNumber,
          orderType: 'SESSION',
          itemId: sessionId,
          itemName: `Sesión: ${sessionSlug}`,
          amount: new Prisma.Decimal(amount),
          currency: finalCurrency,
          paymentMethod: paymentMethodEnum,
          paymentStatus: 'PENDING',
        },
      })

      // Create booking
      const booking = await tx.booking.create({
        data: {
          userId: user.id,
          bookingType: 'SESSION_1_ON_1',
          resourceId: sessionId,
          resourceName: sessionSlug,
          scheduledAt,
          status: 'PENDING',
          userNotes: notes || null,
        },
      })

      // If Nequi payment, create manual payment record
      if (paymentMethodEnum === 'MANUAL_NEQUI') {
        await tx.manualPayment.create({
          data: {
            orderId: order.id,
            paymentMethod: 'MANUAL_NEQUI',
            approved: false,
          },
        })
      }

      return { order, booking }
    })

    // Return booking confirmation
    return NextResponse.json({
      success: true,
      bookingId: result.booking.id,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      paymentMethod: paymentMethodEnum,
      amount,
      currency: finalCurrency,
      customerEmail,
      customerName,
      customerPhone,
      scheduledAt: scheduledAt.toISOString(),
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating booking:', error)

    return NextResponse.json(
      {
        error: 'Error al crear la reserva',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch user's bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ bookings: [] })
    }

    // Get user's bookings
    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('Error fetching bookings:', error)

    return NextResponse.json(
      { error: 'Error al obtener las reservas' },
      { status: 500 }
    )
  }
}
