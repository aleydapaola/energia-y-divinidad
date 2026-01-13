import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCancellationEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/bookings/[id]/cancel
 * Cancelar una sesión de canalización
 *
 * Body: { reason?: string }
 *
 * Reglas:
 * - Cliente: mínimo 24h antes, las sesiones de pack se devuelven
 * - Admin: sin restricciones, puede cancelar cualquier sesión
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
    const { reason } = body

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
        { error: 'No tienes permiso para cancelar esta sesión' },
        { status: 403 }
      )
    }

    // Restricciones para clientes (no admins)
    if (!isAdmin) {
      // Mínimo 24h antes de la sesión
      if (booking.scheduledAt) {
        const hoursUntilSession = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)
        if (hoursUntilSession < 24) {
          return NextResponse.json(
            { error: 'Las cancelaciones deben hacerse con al menos 24 horas de anticipación. Contacta con Aleyda para casos especiales.' },
            { status: 400 }
          )
        }
      }
    }

    // Solo se pueden cancelar sesiones CONFIRMED o PENDING
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      return NextResponse.json(
        { error: `No se puede cancelar una sesión con estado: ${booking.status}` },
        { status: 400 }
      )
    }

    // Si la sesión era parte de un pack, devolver la sesión al pack
    let packCodeUpdated = false
    if (booking.entitlementId) {
      // Buscar si hay un pack redemption asociado
      const redemption = await prisma.packRedemption.findUnique({
        where: { bookingId: booking.id },
        include: { packCode: true }
      })

      if (redemption && redemption.packCode.active) {
        // Decrementar sesiones usadas del pack
        await prisma.sessionPackCode.update({
          where: { id: redemption.packCode.id },
          data: {
            sessionsUsed: { decrement: 1 }
          }
        })

        // Eliminar el redemption
        await prisma.packRedemption.delete({
          where: { id: redemption.id }
        })

        packCodeUpdated = true
      }
    }

    // Actualizar booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || (isAdmin ? 'Cancelada por administrador' : 'Cancelada por el cliente'),
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    // Enviar email de confirmación de cancelación
    try {
      await sendCancellationEmail({
        email: booking.user.email,
        name: booking.user.name || 'Querida alma',
        sessionName: booking.resourceName,
        scheduledDate: booking.scheduledAt,
        cancelledBy: isAdmin ? 'admin' : 'client',
        reason: reason,
        packSessionReturned: packCodeUpdated,
      })
    } catch (emailError) {
      console.error('Error enviando email de cancelación:', emailError)
      // No fallar la operación si el email falla
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        cancelledAt: updatedBooking.cancelledAt,
      },
      packSessionReturned: packCodeUpdated,
      message: packCodeUpdated
        ? 'Sesión cancelada. La sesión ha sido devuelta a tu pack.'
        : 'Sesión cancelada exitosamente'
    })

  } catch (error) {
    console.error('Error cancelando sesión:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la sesión' },
      { status: 500 }
    )
  }
}
