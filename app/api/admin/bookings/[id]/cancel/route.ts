import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelBooking } from '@/lib/services/booking-cancellation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    // Usar el servicio de cancelación (admin puede cancelar cualquier reserva)
    const result = await cancelBooking({
      bookingId: id,
      cancelledBy: 'admin',
      requestingUserId: session.user.id,
      adminEmail: currentUser.email || undefined,
      reason: body.reason,
      skipEmail: body.skipEmail || false,
      skipTimeRestriction: true, // Admin no tiene restricción de 24h
    })

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
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
      packSessionReturned: result.refunded?.packSessions || false,
      creditRefunded: result.refunded?.credits || false,
      seatsReleased: result.refunded?.seatsReleased || 0,
      message: result.message,
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la sesión' },
      { status: 500 }
    )
  }
}
