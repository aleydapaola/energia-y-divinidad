/**
 * Booking Cancellation Service
 *
 * Servicio unificado para cancelar reservas de sesiones y eventos.
 * Maneja reembolsos de créditos, packs, asientos de eventos y notificaciones.
 */

import { BookingStatus, BookingType } from '@prisma/client'

import { createAuditLog, AuditAction } from '@/lib/audit'
import { refundCredit } from '@/lib/credits'
import { sendCancellationEmail } from '@/lib/email'
import { releaseSeats } from '@/lib/events/seat-allocation'
import { prisma } from '@/lib/prisma'


// ============================================
// TYPES
// ============================================

export interface CancellationOptions {
  /** ID de la reserva a cancelar */
  bookingId: string
  /** Quién inició la cancelación */
  cancelledBy: 'user' | 'admin' | 'system'
  /** ID del usuario que solicita (para validación de permisos) */
  requestingUserId?: string
  /** Razón de la cancelación */
  reason?: string
  /** Si se debe omitir el envío de email */
  skipEmail?: boolean
  /** Si se debe omitir la validación de 24h para usuarios */
  skipTimeRestriction?: boolean
  /** Email del admin que realiza la acción (para audit log) */
  adminEmail?: string
}

export interface CancellationResult {
  success: boolean
  booking?: {
    id: string
    resourceName: string
    bookingType: BookingType
    status: BookingStatus
    cancelledAt: Date | null
  }
  refunded?: {
    credits?: boolean
    packSessions?: boolean
    seatsReleased?: number
  }
  message?: string
  error?: string
  errorCode?: 'NOT_FOUND' | 'ALREADY_CANCELLED' | 'UNAUTHORIZED' | 'TOO_LATE' | 'INVALID_STATUS' | 'INTERNAL_ERROR'
}

// Estados que permiten cancelación
const CANCELLABLE_STATUSES: BookingStatus[] = ['CONFIRMED', 'PENDING', 'PENDING_PAYMENT']

// ============================================
// MAIN CANCELLATION FUNCTION
// ============================================

/**
 * Cancela una reserva con todas las operaciones necesarias
 */
export async function cancelBooking(options: CancellationOptions): Promise<CancellationResult> {
  const {
    bookingId,
    cancelledBy,
    requestingUserId,
    reason,
    skipEmail = false,
    skipTimeRestriction = false,
    adminEmail,
  } = options

  try {
    // 1. Obtener booking con usuario
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })

    if (!booking) {
      return {
        success: false,
        error: 'Reserva no encontrada',
        errorCode: 'NOT_FOUND',
      }
    }

    // 2. Validar que no esté ya cancelada
    if (booking.status === 'CANCELLED') {
      return {
        success: false,
        error: 'La reserva ya está cancelada',
        errorCode: 'ALREADY_CANCELLED',
      }
    }

    // 3. Validar que esté en estado cancelable
    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      return {
        success: false,
        error: `No se puede cancelar una reserva con estado: ${booking.status}`,
        errorCode: 'INVALID_STATUS',
      }
    }

    // 4. Validar permisos si es cancelación de usuario
    const isAdmin = cancelledBy === 'admin'
    const isOwner = booking.userId === requestingUserId

    if (cancelledBy === 'user' && requestingUserId) {
      if (!isOwner) {
        return {
          success: false,
          error: 'No tienes permiso para cancelar esta reserva',
          errorCode: 'UNAUTHORIZED',
        }
      }
    }

    // 5. Validar restricción de 24h para usuarios (no admins)
    if (!isAdmin && !skipTimeRestriction && booking.scheduledAt) {
      const hoursUntilBooking = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursUntilBooking < 24) {
        return {
          success: false,
          error: 'Las cancelaciones deben hacerse con al menos 24 horas de anticipación. Contacta con Aleyda para casos especiales.',
          errorCode: 'TOO_LATE',
        }
      }
    }

    const refunded: CancellationResult['refunded'] = {}
    const previousStatus = booking.status

    // 6. Reembolsar sesiones de pack si aplica (para sesiones)
    if (booking.entitlementId) {
      const packRedemption = await prisma.packRedemption.findUnique({
        where: { bookingId: booking.id },
        include: { packCode: true },
      })

      if (packRedemption && packRedemption.packCode.active) {
        await prisma.sessionPackCode.update({
          where: { id: packRedemption.packCode.id },
          data: {
            sessionsUsed: { decrement: 1 },
          },
        })

        await prisma.packRedemption.delete({
          where: { id: packRedemption.id },
        })

        refunded.packSessions = true
        console.log(`[CANCELLATION] Sesión de pack reembolsada para booking ${bookingId}`)
      }
    }

    // 7. Reembolsar créditos si aplica
    const creditRefundResult = await refundCredit(booking.userId, booking.id)
    if (creditRefundResult.refunded) {
      refunded.credits = true
      console.log(`[CANCELLATION] Crédito reembolsado para booking ${bookingId}`)
    }

    // 8. Liberar asientos si es un evento
    if (booking.bookingType === 'EVENT') {
      try {
        const seatsReleased = await releaseSeats(bookingId)
        if (seatsReleased > 0) {
          refunded.seatsReleased = seatsReleased
          console.log(`[CANCELLATION] ${seatsReleased} asiento(s) liberado(s) para booking ${bookingId}`)
        }
      } catch (releaseError) {
        console.error(`[CANCELLATION] Error liberando asientos:`, releaseError)
        // No fallar la cancelación si falla la liberación de asientos
      }
    }

    // 9. Actualizar estado de la reserva
    const cancellationReason = reason || (isAdmin ? 'Cancelada por administrador' : 'Cancelada por el cliente')

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    // 10. Crear audit log si es cancelación de admin
    if (isAdmin && requestingUserId && adminEmail) {
      try {
        await createAuditLog({
          actorId: requestingUserId,
          actorEmail: adminEmail,
          entityType: 'booking',
          entityId: bookingId,
          action: 'cancel' as AuditAction,
          before: { status: previousStatus },
          after: { status: 'CANCELLED' },
          reason: cancellationReason,
          metadata: {
            packSessionReturned: refunded.packSessions || false,
            creditRefunded: refunded.credits || false,
            seatsReleased: refunded.seatsReleased || 0,
          },
        })
      } catch (auditError) {
        console.error(`[CANCELLATION] Error creando audit log:`, auditError)
        // No fallar la cancelación si falla el audit log
      }
    }

    // 11. Enviar email de notificación
    if (!skipEmail && booking.user?.email) {
      try {
        await sendCancellationEmail({
          email: booking.user.email,
          name: booking.user.name || 'Querida alma',
          sessionName: booking.resourceName,
          scheduledDate: booking.scheduledAt,
          cancelledBy: isAdmin ? 'admin' : 'client',
          reason: reason,
          packSessionReturned: refunded.packSessions || false,
          creditRefunded: refunded.credits || false,
        })
        console.log(`[CANCELLATION] Email enviado a ${booking.user.email}`)
      } catch (emailError) {
        console.error(`[CANCELLATION] Error enviando email:`, emailError)
        // No fallar la cancelación si el email falla
      }
    }

    console.log(`[CANCELLATION] Booking ${bookingId} cancelado por ${cancelledBy}`)

    // 12. Construir mensaje de respuesta
    let message = 'Reserva cancelada exitosamente'
    if (booking.bookingType === 'EVENT' && refunded.seatsReleased) {
      message = `Reserva cancelada. ${refunded.seatsReleased} cupo(s) liberado(s) y ofrecido(s) a la lista de espera.`
    } else if (refunded.packSessions && refunded.credits) {
      message = 'Sesión cancelada. La sesión ha sido devuelta a tu pack y tu crédito ha sido reembolsado.'
    } else if (refunded.packSessions) {
      message = 'Sesión cancelada. La sesión ha sido devuelta a tu pack.'
    } else if (refunded.credits) {
      message = 'Sesión cancelada. Tu crédito ha sido reembolsado.'
    }

    return {
      success: true,
      booking: {
        id: updatedBooking.id,
        resourceName: updatedBooking.resourceName,
        bookingType: updatedBooking.bookingType,
        status: updatedBooking.status,
        cancelledAt: updatedBooking.cancelledAt,
      },
      refunded,
      message,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`[CANCELLATION] Error cancelando booking ${bookingId}:`, error)
    return {
      success: false,
      error: errorMessage || 'Error interno al cancelar la reserva',
      errorCode: 'INTERNAL_ERROR',
    }
  }
}

/**
 * Cancela múltiples reservas (útil para admin bulk actions)
 */
export async function cancelMultipleBookings(
  bookingIds: string[],
  options: Omit<CancellationOptions, 'bookingId'>
): Promise<{
  successful: string[]
  failed: { id: string; error: string }[]
}> {
  const successful: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const bookingId of bookingIds) {
    const result = await cancelBooking({ ...options, bookingId })
    if (result.success) {
      successful.push(bookingId)
    } else {
      failed.push({ id: bookingId, error: result.error || 'Unknown error' })
    }
  }

  return { successful, failed }
}
