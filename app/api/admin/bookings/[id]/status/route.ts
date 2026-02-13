import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/admin/bookings/[id]/status
 * Admin only: cambiar el estado de una sesión
 *
 * Body: { status: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify admin role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado: se requiere rol de administrador' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PENDING_PAYMENT']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Estado inválido. Estados válidos: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // Update data
    const updateData: any = { status }

    // If cancelling, add cancellation timestamp
    if (status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      updateData.cancelledAt = new Date()
      updateData.cancellationReason = updateData.cancellationReason || 'Estado cambiado por administrador'
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
      },
      message: `Estado actualizado a ${status}`
    })

  } catch (error) {
    console.error('Error cambiando estado de booking:', error)
    return NextResponse.json(
      { error: 'Error al cambiar el estado de la sesión' },
      { status: 500 }
    )
  }
}
