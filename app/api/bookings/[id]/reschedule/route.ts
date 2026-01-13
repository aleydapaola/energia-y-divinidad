import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendRescheduleEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/bookings/[id]/reschedule
 * Reprogramar una sesión de canalización
 *
 * Body: { newDate: string (ISO), reason?: string }
 *
 * Reglas:
 * - Cliente: máximo 2 reprogramaciones, mínimo 24h antes
 * - Admin: sin restricciones
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

    const { id } = await params
    const body = await request.json()
    const { newDate, reason } = body

    if (!newDate) {
      return NextResponse.json(
        { error: 'Se requiere la nueva fecha' },
        { status: 400 }
      )
    }

    const newScheduledAt = new Date(newDate)

    // Validar que la fecha sea futura
    if (newScheduledAt <= new Date()) {
      return NextResponse.json(
        { error: 'La fecha debe ser futura' },
        { status: 400 }
      )
    }

    // Obtener booking con usuario
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true }
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true, name: true }
    })

    const isAdmin = currentUser?.role === 'ADMIN'
    const isOwner = booking.userId === session.user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para reprogramar esta sesión' },
        { status: 403 }
      )
    }

    // Restricciones para clientes (no admins)
    if (!isAdmin) {
      // Máximo 2 reprogramaciones
      if (booking.rescheduleCount >= 2) {
        return NextResponse.json(
          { error: 'Has alcanzado el límite de 2 reprogramaciones. Contacta con Aleyda para más cambios.' },
          { status: 400 }
        )
      }

      // Mínimo 24h antes de la sesión actual
      if (booking.scheduledAt) {
        const hoursUntilSession = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)
        if (hoursUntilSession < 24) {
          return NextResponse.json(
            { error: 'Las reprogramaciones deben hacerse con al menos 24 horas de anticipación' },
            { status: 400 }
          )
        }
      }
    }

    // Solo se pueden reprogramar sesiones CONFIRMED o PENDING
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      return NextResponse.json(
        { error: `No se puede reprogramar una sesión con estado: ${booking.status}` },
        { status: 400 }
      )
    }

    // Actualizar booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        previousScheduledAt: booking.scheduledAt,
        scheduledAt: newScheduledAt,
        rescheduledAt: new Date(),
        rescheduledBy: isAdmin ? session.user.id : null, // null = cliente, id = admin
        rescheduleCount: { increment: 1 },
        rescheduleReason: reason || null,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    // Enviar email de confirmación de reprogramación
    try {
      await sendRescheduleEmail({
        email: booking.user.email,
        name: booking.user.name || 'Querida alma',
        sessionName: booking.resourceName,
        previousDate: booking.scheduledAt,
        newDate: newScheduledAt,
        rescheduledBy: isAdmin ? 'admin' : 'client',
        reason: reason,
      })
    } catch (emailError) {
      console.error('Error enviando email de reprogramación:', emailError)
      // No fallar la operación si el email falla
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        scheduledAt: updatedBooking.scheduledAt,
        previousScheduledAt: updatedBooking.previousScheduledAt,
        rescheduleCount: updatedBooking.rescheduleCount,
        status: updatedBooking.status,
      },
      message: 'Sesión reprogramada exitosamente'
    })

  } catch (error) {
    console.error('Error reprogramando sesión:', error)
    return NextResponse.json(
      { error: 'Error al reprogramar la sesión' },
      { status: 500 }
    )
  }
}
