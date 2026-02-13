import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RedeemRequest {
  packCodeId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
}

/**
 * POST /api/sessions/redeem-pack
 * Redeems a session from a pack code (books a session without payment)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body: RedeemRequest = await request.json()
    const { packCodeId, date, time } = body

    // Validate input
    if (!packCodeId || !date || !time) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get the pack code with lock
      const packCode = await tx.sessionPackCode.findUnique({
        where: { id: packCodeId },
      })

      if (!packCode) {
        throw new Error('Pack no encontrado')
      }

      // Verify ownership
      if (packCode.userId !== session.user!.id) {
        throw new Error('Este pack pertenece a otro usuario')
      }

      // Check if active
      if (!packCode.active) {
        throw new Error('Este pack ya no está activo')
      }

      // Check expiration
      if (packCode.expiresAt && new Date() > packCode.expiresAt) {
        throw new Error('Este pack ha expirado')
      }

      // Check remaining sessions
      const sessionsRemaining = packCode.sessionsTotal - packCode.sessionsUsed
      if (sessionsRemaining <= 0) {
        throw new Error('Ya has usado todas las sesiones de este pack')
      }

      // Parse and validate date/time
      const scheduledAt = new Date(`${date}T${time}:00`)
      if (isNaN(scheduledAt.getTime())) {
        throw new Error('Fecha/hora inválida')
      }

      // Check if the slot is still available
      const existingBooking = await tx.booking.findFirst({
        where: {
          scheduledAt,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
      })

      if (existingBooking) {
        throw new Error('Este horario ya está reservado. Por favor selecciona otro.')
      }

      // Create the booking (already paid via pack)
      const booking = await tx.booking.create({
        data: {
          userId: session.user!.id,
          bookingType: 'SESSION_1_ON_1',
          resourceId: 'session-flexible',
          resourceName: 'Sesión de Acompañamiento (Pack)',
          scheduledAt,
          duration: 60,
          status: 'CONFIRMED', // Already paid
          amount: 0, // No payment needed
          currency: packCode.currency,
          paymentMethod: null,
          paymentStatus: 'COMPLETED',
        },
      })

      // Create redemption record
      await tx.packRedemption.create({
        data: {
          packCodeId: packCode.id,
          bookingId: booking.id,
        },
      })

      // Increment sessions used
      await tx.sessionPackCode.update({
        where: { id: packCode.id },
        data: {
          sessionsUsed: packCode.sessionsUsed + 1,
        },
      })

      return {
        booking,
        sessionsRemaining: sessionsRemaining - 1,
      }
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: result.booking.id,
        scheduledAt: result.booking.scheduledAt,
        status: result.booking.status,
      },
      sessionsRemaining: result.sessionsRemaining,
      message: `Sesión reservada exitosamente. Te quedan ${result.sessionsRemaining} sesiones en tu pack.`,
    })
  } catch (error: any) {
    console.error('Error redeeming pack session:', error)
    return NextResponse.json(
      { error: error.message || 'Error al canjear la sesión' },
      { status: 400 }
    )
  }
}
