import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPackCode, getPackCodeByBookingId } from '@/lib/pack-codes'
import { sendPackCodeEmail } from '@/lib/email'

interface GeneratePackCodeBody {
  bookingId: string
  userId: string
  userEmail: string
  userName: string
  amount: number
  currency: 'COP' | 'USD' | 'EUR'
}

/**
 * POST /api/checkout/generate-pack-code
 * Generates a pack code after payment is confirmed
 * Called by webhooks (Stripe/Nequi) after successful payment
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal call (from webhooks)
    const authHeader = request.headers.get('x-internal-secret')
    const internalSecret = process.env.INTERNAL_API_SECRET

    // Allow calls without secret in development or if secret matches
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev && internalSecret && authHeader !== internalSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: GeneratePackCodeBody = await request.json()
    const { bookingId, userId, userEmail, userName, amount, currency } = body

    // Validate required fields
    if (!bookingId || !userId || !userEmail || !amount || !currency) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Check if booking exists and is a pack
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    if (booking.sessionsTotal !== 8) {
      return NextResponse.json(
        { error: 'Esta reserva no es un pack de sesiones' },
        { status: 400 }
      )
    }

    // Check if code already exists for this booking
    const existingCode = await getPackCodeByBookingId(bookingId)
    if (existingCode) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        packCode: existingCode.code,
        expiresAt: existingCode.expiresAt,
        sessionsTotal: existingCode.sessionsTotal,
      })
    }

    // Generate new pack code
    const packCodeResult = await createPackCode({
      userId,
      bookingId,
      amount,
      currency,
    })

    // Update booking to CONFIRMED
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
      },
    })

    // Send email with pack code
    await sendPackCodeEmail({
      email: userEmail,
      name: userName || 'Querida alma',
      packCode: packCodeResult.code,
      expiresAt: packCodeResult.expiresAt,
      sessionsTotal: packCodeResult.sessionsTotal,
      amount,
      currency,
    })

    return NextResponse.json({
      success: true,
      packCode: packCodeResult.code,
      expiresAt: packCodeResult.expiresAt,
      sessionsTotal: packCodeResult.sessionsTotal,
    })
  } catch (error) {
    console.error('Error generating pack code:', error)
    return NextResponse.json(
      { error: 'Error al generar código de pack' },
      { status: 500 }
    )
  }
}
