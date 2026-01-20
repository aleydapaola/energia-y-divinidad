# Plan 04: Crear Servicio Unificado de Cancelación de Reservas

## Objetivo
Consolidar la lógica de cancelación de reservas que está duplicada en 3 endpoints diferentes.

## Contexto
La lógica de cancelación está repetida en:
1. `app/api/bookings/[id]/cancel/route.ts` - Cancelación por usuario
2. `app/api/admin/bookings/[id]/cancel/route.ts` - Cancelación por admin
3. `app/api/events/[eventId]/cancel-booking/route.ts` - Cancelación de eventos

Todos hacen lo mismo:
- Validar que la reserva existe y no está cancelada
- Reembolsar créditos si aplica
- Reembolsar sesiones de pack si aplica
- Actualizar estado a CANCELLED
- Enviar email de notificación

## Análisis Previo Requerido

Antes de implementar, leer los 3 archivos para entender las diferencias específicas:

```bash
# Leer los archivos actuales
cat app/api/bookings/[id]/cancel/route.ts
cat app/api/admin/bookings/[id]/cancel/route.ts
cat app/api/events/[eventId]/cancel-booking/route.ts
```

## Pasos de Implementación

### Paso 1: Crear el servicio de cancelación

Crear `lib/services/booking-cancellation.ts`:

```typescript
/**
 * Booking Cancellation Service
 *
 * Servicio unificado para cancelar reservas de sesiones y eventos.
 * Maneja reembolsos de créditos, packs y notificaciones.
 */

import { prisma } from '@/lib/prisma'
import { refundCredit } from '@/lib/credits'
import { sendCancellationEmail } from '@/lib/email'
import { BookingStatus, BookingType } from '@prisma/client'

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
  /** Si se deben reembolsar créditos */
  refundCredits?: boolean
  /** Si se deben reembolsar sesiones de pack */
  refundPackSessions?: boolean
}

export interface CancellationResult {
  success: boolean
  booking?: {
    id: string
    resourceName: string
    bookingType: BookingType
    status: BookingStatus
  }
  refunded?: {
    credits?: number
    packSessions?: number
  }
  error?: string
  errorCode?: 'NOT_FOUND' | 'ALREADY_CANCELLED' | 'UNAUTHORIZED' | 'PAST_BOOKING' | 'INTERNAL_ERROR'
}

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
    refundCredits = true,
    refundPackSessions = true,
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

    // 3. Validar permisos si es cancelación de usuario
    if (cancelledBy === 'user' && requestingUserId) {
      if (booking.userId !== requestingUserId) {
        return {
          success: false,
          error: 'No tienes permiso para cancelar esta reserva',
          errorCode: 'UNAUTHORIZED',
        }
      }
    }

    // 4. Validar que no sea una reserva pasada (opcional según negocio)
    if (booking.scheduledAt && booking.scheduledAt < new Date()) {
      // Permitir a admins cancelar reservas pasadas
      if (cancelledBy === 'user') {
        return {
          success: false,
          error: 'No se puede cancelar una reserva pasada',
          errorCode: 'PAST_BOOKING',
        }
      }
    }

    const refunded: CancellationResult['refunded'] = {}

    // 5. Reembolsar créditos si aplica
    if (refundCredits && booking.paidWithCredit && booking.userId) {
      try {
        await refundCredit(booking.userId, booking.id)
        refunded.credits = 1
        console.log(`[CANCELLATION] Crédito reembolsado para booking ${bookingId}`)
      } catch (creditError) {
        console.error(`[CANCELLATION] Error reembolsando crédito:`, creditError)
        // Continuar con la cancelación aunque falle el reembolso de crédito
      }
    }

    // 6. Reembolsar sesiones de pack si aplica
    if (refundPackSessions && booking.packCodeId) {
      try {
        await prisma.booking.update({
          where: { id: booking.packCodeId },
          data: {
            sessionsUsed: { decrement: 1 },
          },
        })
        refunded.packSessions = 1
        console.log(`[CANCELLATION] Sesión de pack reembolsada para booking ${bookingId}`)
      } catch (packError) {
        console.error(`[CANCELLATION] Error reembolsando pack:`, packError)
      }
    }

    // 7. Actualizar estado de la reserva
    const currentMetadata = (booking.metadata as Record<string, any>) || {}
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        metadata: {
          ...currentMetadata,
          cancelledBy,
          cancellationReason: reason || null,
          cancellationTimestamp: new Date().toISOString(),
          refunded,
        },
      },
    })

    // 8. Enviar email de notificación
    if (!skipEmail && booking.user?.email) {
      try {
        await sendCancellationEmail({
          email: booking.user.email,
          name: booking.user.name || 'Cliente',
          bookingType: booking.bookingType,
          resourceName: booking.resourceName,
          scheduledAt: booking.scheduledAt,
        })
        console.log(`[CANCELLATION] Email enviado a ${booking.user.email}`)
      } catch (emailError) {
        console.error(`[CANCELLATION] Error enviando email:`, emailError)
        // No fallar la cancelación si el email falla
      }
    }

    console.log(`[CANCELLATION] Booking ${bookingId} cancelado por ${cancelledBy}`)

    return {
      success: true,
      booking: {
        id: updatedBooking.id,
        resourceName: updatedBooking.resourceName,
        bookingType: updatedBooking.bookingType,
        status: updatedBooking.status,
      },
      refunded,
    }
  } catch (error: any) {
    console.error(`[CANCELLATION] Error cancelando booking ${bookingId}:`, error)
    return {
      success: false,
      error: error.message || 'Error interno al cancelar la reserva',
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
```

### Paso 2: Actualizar app/api/bookings/[id]/cancel/route.ts

**Después**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelBooking } from '@/lib/services/booking-cancellation'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))

    // Usar el servicio de cancelación
    const result = await cancelBooking({
      bookingId: params.id,
      cancelledBy: 'user',
      requestingUserId: session.user.id,
      reason: body.reason,
    })

    if (!result.success) {
      const statusMap = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
        UNAUTHORIZED: 403,
        PAST_BOOKING: 400,
        INTERNAL_ERROR: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      message: 'Reserva cancelada exitosamente',
      booking: result.booking,
      refunded: result.refunded,
    })
  } catch (error: any) {
    console.error('[API] Error en cancelación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### Paso 3: Actualizar app/api/admin/bookings/[id]/cancel/route.ts

**Después**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelBooking } from '@/lib/services/booking-cancellation'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación de admin
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))

    // Usar el servicio de cancelación (admin puede cancelar cualquier reserva)
    const result = await cancelBooking({
      bookingId: params.id,
      cancelledBy: 'admin',
      reason: body.reason,
      skipEmail: body.skipEmail || false,
    })

    if (!result.success) {
      const statusMap = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
        INTERNAL_ERROR: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      message: 'Reserva cancelada exitosamente',
      booking: result.booking,
      refunded: result.refunded,
    })
  } catch (error: any) {
    console.error('[API-ADMIN] Error en cancelación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### Paso 4: Actualizar app/api/events/[eventId]/cancel-booking/route.ts

Similar a los anteriores, adaptando para el contexto de eventos.

### Paso 5: Verificar imports de email

Asegurarse de que `sendCancellationEmail` existe en `lib/email.ts` y tiene la firma correcta:

```typescript
interface CancellationEmailParams {
  email: string
  name: string
  bookingType: string
  resourceName: string
  scheduledAt: Date | null
}
```

### Paso 6: Verificar que compila
```bash
npm run build
```

### Paso 7: Testing

1. **Test usuario cancela su propia reserva**:
   - Login como usuario
   - Crear reserva
   - Cancelar reserva
   - Verificar estado CANCELLED
   - Verificar email recibido

2. **Test usuario intenta cancelar reserva de otro**:
   - Debería devolver 403

3. **Test admin cancela cualquier reserva**:
   - Login como admin
   - Cancelar reserva de cualquier usuario
   - Verificar estado CANCELLED

4. **Test reembolso de créditos**:
   - Crear reserva pagada con crédito
   - Cancelar
   - Verificar crédito devuelto

5. **Test reembolso de pack**:
   - Usar sesión de pack
   - Cancelar
   - Verificar sessionsUsed decrementado

## Archivos a Crear
- ✅ `lib/services/booking-cancellation.ts`

## Archivos a Modificar
- 📝 `app/api/bookings/[id]/cancel/route.ts`
- 📝 `app/api/admin/bookings/[id]/cancel/route.ts`
- 📝 `app/api/events/[eventId]/cancel-booking/route.ts`

## Dependencias
- `lib/credits.ts` - función `refundCredit`
- `lib/email.ts` - función `sendCancellationEmail`
- `lib/prisma.ts` - cliente Prisma

## Criterios de Éxito
- [ ] Servicio `lib/services/booking-cancellation.ts` creado
- [ ] Los 3 endpoints usan el servicio
- [ ] No hay lógica de cancelación duplicada
- [ ] Tests manuales pasan
- [ ] `npm run build` completa sin errores

## Rollback
```bash
git checkout -- app/api/bookings/[id]/cancel/route.ts
git checkout -- app/api/admin/bookings/[id]/cancel/route.ts
git checkout -- app/api/events/[eventId]/cancel-booking/route.ts
rm lib/services/booking-cancellation.ts
```

## Riesgo
**Medio** - Afecta funcionalidad crítica de cancelaciones. Requiere testing exhaustivo.

## Tiempo Estimado
2 horas
