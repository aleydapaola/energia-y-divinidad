import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getCreditsBalance, redeemCredit } from '@/lib/credits'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { getSessionBySlug } from '@/lib/sanity/queries/sessions'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 })
    }

    const { sessionSlug, scheduledAt } = await request.json()

    if (!sessionSlug || !scheduledAt) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Parse and validate scheduled date
    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }

    // Check if date is in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'La fecha debe ser en el futuro' },
        { status: 400 }
      )
    }

    // Verify credit balance
    const balance = await getCreditsBalance(session.user.id)

    if (balance.available < 1) {
      return NextResponse.json(
        { error: 'No tienes créditos disponibles', balance },
        { status: 400 }
      )
    }

    // Get session details from Sanity
    const sessionData = await getSessionBySlug(sessionSlug)

    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    if (sessionData.status !== 'active') {
      return NextResponse.json(
        { error: 'Esta sesión no está disponible actualmente' },
        { status: 400 }
      )
    }

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    })

    if (!user?.email) {
      return NextResponse.json(
        { error: 'No se pudo obtener información del usuario' },
        { status: 400 }
      )
    }

    // Create booking with credit payment
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        bookingType: 'SESSION_1_ON_1',
        resourceId: sessionData._id,
        resourceName: sessionData.title,
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'FREE', // Indicates credit redemption
        amount: 0,
        currency: 'COP',
        scheduledAt: scheduledDate,
        duration: sessionData.duration,
        metadata: {
          paidWithCredit: true,
          originalPrice: sessionData.price,
          originalPriceUSD: sessionData.priceUSD,
          sessionSlug: sessionSlug,
        },
      },
    })

    // Redeem credit
    const redemption = await redeemCredit(session.user.id, booking.id)

    if (!redemption.success) {
      // Rollback booking if credit redemption fails
      await prisma.booking.delete({ where: { id: booking.id } })
      return NextResponse.json({ error: redemption.error }, { status: 400 })
    }

    // Get updated balance
    const newBalance = await getCreditsBalance(session.user.id)

    // Send confirmation email
    try {
      await sendBookingConfirmationEmail({
        email: user.email,
        name: user.name || 'Cliente',
        sessionName: sessionData.title,
        scheduledAt: scheduledDate,
        duration: sessionData.duration,
        deliveryMethod: sessionData.deliveryMethod,
        bookingId: booking.id,
        paidWithCredit: true,
      })
    } catch (emailError) {
      // Don't fail the booking if email fails
      console.error('[API/book-with-credit] Error sending confirmation email:', emailError)
    }

    console.log(
      `[API/book-with-credit] Booking created with credit: ${booking.id} for user ${session.user.id}`
    )

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        resourceName: booking.resourceName,
        duration: booking.duration,
      },
      creditsRemaining: newBalance.available,
    })
  } catch (error) {
    console.error('[API/book-with-credit] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
