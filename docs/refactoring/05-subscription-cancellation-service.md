# Plan 05: Crear Servicio Unificado de Cancelación de Suscripciones

## Objetivo
Consolidar la lógica de cancelación de suscripciones que está duplicada en 2 endpoints.

## Contexto
La lógica de cancelación de suscripciones está en:
1. `app/api/subscriptions/cancel/route.ts` - Cancelación por usuario
2. `app/api/admin/subscriptions/[id]/cancel/route.ts` - Cancelación por admin

Ambos hacen operaciones similares:
- Validar estado de la suscripción
- Cancelar en el proveedor de pago (Stripe/Nequi)
- Actualizar estado a CANCELLED
- Revocar entitlements
- Enviar notificación

## Análisis Previo Requerido

```bash
# Leer los archivos actuales
cat app/api/subscriptions/cancel/route.ts
cat app/api/admin/subscriptions/[id]/cancel/route.ts
```

## Pasos de Implementación

### Paso 1: Crear el servicio de cancelación

Crear `lib/services/subscription-cancellation.ts`:

```typescript
/**
 * Subscription Cancellation Service
 *
 * Servicio unificado para cancelar suscripciones de membresía.
 * Maneja cancelación en proveedores de pago y revocación de accesos.
 */

import { prisma } from '@/lib/prisma'
import { cancelStripeSubscription } from '@/lib/stripe'
import { cancelNequiSubscription } from '@/lib/nequi'
import { sendSubscriptionCancelledEmail } from '@/lib/email'
import { SubscriptionStatus } from '@prisma/client'

export interface SubscriptionCancellationOptions {
  /** ID de la suscripción a cancelar */
  subscriptionId: string
  /** Quién inició la cancelación */
  cancelledBy: 'user' | 'admin' | 'system' | 'payment_failed'
  /** ID del usuario que solicita (para validación) */
  requestingUserId?: string
  /** Razón de la cancelación */
  reason?: string
  /** Si cancelar inmediatamente o al final del período */
  immediate?: boolean
  /** Si se debe revocar acceso inmediatamente */
  revokeAccessNow?: boolean
  /** Si se debe omitir el email */
  skipEmail?: boolean
}

export interface SubscriptionCancellationResult {
  success: boolean
  subscription?: {
    id: string
    status: SubscriptionStatus
    membershipTierName: string
    cancelledAt: Date | null
    accessEndsAt: Date | null
  }
  error?: string
  errorCode?: 'NOT_FOUND' | 'ALREADY_CANCELLED' | 'UNAUTHORIZED' | 'PROVIDER_ERROR' | 'INTERNAL_ERROR'
}

// Estados que permiten cancelación
const CANCELLABLE_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'PAST_DUE']

/**
 * Cancela una suscripción con todas las operaciones necesarias
 */
export async function cancelSubscription(
  options: SubscriptionCancellationOptions
): Promise<SubscriptionCancellationResult> {
  const {
    subscriptionId,
    cancelledBy,
    requestingUserId,
    reason,
    immediate = false,
    revokeAccessNow = false,
    skipEmail = false,
  } = options

  try {
    // 1. Obtener suscripción con usuario
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
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

    if (!subscription) {
      return {
        success: false,
        error: 'Suscripción no encontrada',
        errorCode: 'NOT_FOUND',
      }
    }

    // 2. Validar que no esté ya cancelada
    if (subscription.status === 'CANCELLED') {
      return {
        success: false,
        error: 'La suscripción ya está cancelada',
        errorCode: 'ALREADY_CANCELLED',
      }
    }

    // 3. Validar que esté en estado cancelable
    if (!CANCELLABLE_STATUSES.includes(subscription.status)) {
      return {
        success: false,
        error: `No se puede cancelar una suscripción en estado ${subscription.status}`,
        errorCode: 'INTERNAL_ERROR',
      }
    }

    // 4. Validar permisos si es cancelación de usuario
    if (cancelledBy === 'user' && requestingUserId) {
      if (subscription.userId !== requestingUserId) {
        return {
          success: false,
          error: 'No tienes permiso para cancelar esta suscripción',
          errorCode: 'UNAUTHORIZED',
        }
      }
    }

    // 5. Cancelar en el proveedor de pago
    const providerResult = await cancelInPaymentProvider(subscription, immediate)
    if (!providerResult.success) {
      console.error(`[SUB-CANCEL] Error cancelando en proveedor:`, providerResult.error)
      // Continuar con la cancelación local aunque falle el proveedor
      // (el webhook se encargará de sincronizar después)
    }

    // 6. Determinar cuándo termina el acceso
    const now = new Date()
    let accessEndsAt: Date

    if (immediate || revokeAccessNow) {
      accessEndsAt = now
    } else {
      // El acceso continúa hasta el final del período pagado
      accessEndsAt = subscription.currentPeriodEnd || now
    }

    // 7. Actualizar suscripción
    const currentMetadata = (subscription.metadata as Record<string, any>) || {}
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelAtPeriodEnd: !immediate,
        metadata: {
          ...currentMetadata,
          cancelledBy,
          cancellationReason: reason || null,
          cancellationTimestamp: now.toISOString(),
          accessEndsAt: accessEndsAt.toISOString(),
          providerCancellation: providerResult,
        },
      },
    })

    // 8. Revocar entitlements si es inmediato
    if (immediate || revokeAccessNow) {
      await revokeEntitlements(subscription.userId, subscriptionId)
    } else {
      // Programar revocación para el final del período
      await scheduleEntitlementRevocation(subscription.userId, subscriptionId, accessEndsAt)
    }

    // 9. Enviar email de notificación
    if (!skipEmail && subscription.user?.email) {
      try {
        await sendSubscriptionCancelledEmail({
          email: subscription.user.email,
          name: subscription.user.name || 'Cliente',
          membershipName: subscription.membershipTierName,
          accessEndsAt,
          immediate,
        })
        console.log(`[SUB-CANCEL] Email enviado a ${subscription.user.email}`)
      } catch (emailError) {
        console.error(`[SUB-CANCEL] Error enviando email:`, emailError)
      }
    }

    console.log(`[SUB-CANCEL] Suscripción ${subscriptionId} cancelada por ${cancelledBy}`)

    return {
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        membershipTierName: updatedSubscription.membershipTierName,
        cancelledAt: updatedSubscription.cancelledAt,
        accessEndsAt,
      },
    }
  } catch (error: any) {
    console.error(`[SUB-CANCEL] Error cancelando suscripción ${subscriptionId}:`, error)
    return {
      success: false,
      error: error.message || 'Error interno al cancelar la suscripción',
      errorCode: 'INTERNAL_ERROR',
    }
  }
}

/**
 * Cancela la suscripción en el proveedor de pago
 */
async function cancelInPaymentProvider(
  subscription: any,
  immediate: boolean
): Promise<{ success: boolean; error?: string }> {
  const provider = subscription.paymentProvider

  if (!provider || !subscription.externalSubscriptionId) {
    // Suscripción sin proveedor externo (pago manual, etc.)
    return { success: true }
  }

  try {
    if (provider.includes('stripe')) {
      await cancelStripeSubscription(subscription.externalSubscriptionId, {
        cancelAtPeriodEnd: !immediate,
      })
    } else if (provider.includes('nequi')) {
      await cancelNequiSubscription(subscription.externalSubscriptionId)
    } else if (provider.includes('wompi') || provider.includes('epayco')) {
      // Wompi y ePayco no tienen suscripciones recurrentes nativas
      // La cancelación es solo local
      return { success: true }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Revoca los entitlements asociados a la suscripción
 */
async function revokeEntitlements(userId: string, subscriptionId: string): Promise<void> {
  await prisma.entitlement.updateMany({
    where: {
      userId,
      subscriptionId,
      type: 'MEMBERSHIP',
    },
    data: {
      revokedAt: new Date(),
      expiresAt: new Date(),
    },
  })

  console.log(`[SUB-CANCEL] Entitlements revocados para suscripción ${subscriptionId}`)
}

/**
 * Programa la revocación de entitlements para una fecha futura
 * Nota: Esto podría usar un job scheduler en producción
 */
async function scheduleEntitlementRevocation(
  userId: string,
  subscriptionId: string,
  revokeAt: Date
): Promise<void> {
  // Por ahora, simplemente actualizamos la fecha de expiración
  await prisma.entitlement.updateMany({
    where: {
      userId,
      subscriptionId,
      type: 'MEMBERSHIP',
    },
    data: {
      expiresAt: revokeAt,
    },
  })

  console.log(`[SUB-CANCEL] Entitlements programados para expirar el ${revokeAt.toISOString()}`)
}

/**
 * Reactiva una suscripción cancelada (si está en período de gracia)
 */
export async function reactivateSubscription(
  subscriptionId: string,
  requestingUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) {
    return { success: false, error: 'Suscripción no encontrada' }
  }

  if (subscription.status !== 'CANCELLED') {
    return { success: false, error: 'Solo se pueden reactivar suscripciones canceladas' }
  }

  // Verificar que aún está en el período de acceso
  const metadata = subscription.metadata as Record<string, any>
  const accessEndsAt = metadata?.accessEndsAt ? new Date(metadata.accessEndsAt) : null

  if (!accessEndsAt || accessEndsAt < new Date()) {
    return { success: false, error: 'El período de acceso ha expirado' }
  }

  // Reactivar
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'ACTIVE',
      cancelledAt: null,
      cancelAtPeriodEnd: false,
    },
  })

  // Restaurar entitlements
  await prisma.entitlement.updateMany({
    where: {
      userId: subscription.userId,
      subscriptionId,
      type: 'MEMBERSHIP',
    },
    data: {
      revokedAt: null,
      expiresAt: subscription.currentPeriodEnd,
    },
  })

  return { success: true }
}
```

### Paso 2: Verificar dependencias

Asegurarse de que existen las funciones en los archivos de proveedores:

```typescript
// lib/stripe.ts
export async function cancelStripeSubscription(
  subscriptionId: string,
  options?: { cancelAtPeriodEnd?: boolean }
): Promise<void>

// lib/nequi.ts
export async function cancelNequiSubscription(
  subscriptionId: string
): Promise<void>

// lib/email.ts
export async function sendSubscriptionCancelledEmail(params: {
  email: string
  name: string
  membershipName: string
  accessEndsAt: Date
  immediate: boolean
}): Promise<void>
```

Si no existen, crearlas como stubs primero.

### Paso 3: Actualizar app/api/subscriptions/cancel/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelSubscription } from '@/lib/services/subscription-cancellation'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { subscriptionId, reason } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId es requerido' },
        { status: 400 }
      )
    }

    const result = await cancelSubscription({
      subscriptionId,
      cancelledBy: 'user',
      requestingUserId: session.user.id,
      reason,
      immediate: false, // Usuario siempre cancela al final del período
    })

    if (!result.success) {
      const statusMap = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
        UNAUTHORIZED: 403,
        INTERNAL_ERROR: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      message: 'Suscripción cancelada. Tu acceso continuará hasta el final del período actual.',
      subscription: result.subscription,
    })
  } catch (error: any) {
    console.error('[API] Error en cancelación de suscripción:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### Paso 4: Actualizar app/api/admin/subscriptions/[id]/cancel/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelSubscription } from '@/lib/services/subscription-cancellation'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const result = await cancelSubscription({
      subscriptionId: params.id,
      cancelledBy: 'admin',
      reason: body.reason,
      immediate: body.immediate || false,
      revokeAccessNow: body.revokeAccessNow || false,
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
      message: 'Suscripción cancelada exitosamente',
      subscription: result.subscription,
    })
  } catch (error: any) {
    console.error('[API-ADMIN] Error en cancelación de suscripción:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### Paso 5: Verificar que compila
```bash
npm run build
```

### Paso 6: Testing

1. **Usuario cancela su suscripción**:
   - Verificar que el estado cambia a CANCELLED
   - Verificar que `cancelAtPeriodEnd` es true
   - Verificar que el acceso continúa hasta el final del período

2. **Admin cancela inmediatamente**:
   - Verificar que el acceso se revoca inmediatamente
   - Verificar entitlements actualizados

3. **Intento de cancelar suscripción de otro usuario**:
   - Debería devolver 403

## Archivos a Crear
- ✅ `lib/services/subscription-cancellation.ts`

## Archivos a Modificar
- 📝 `app/api/subscriptions/cancel/route.ts`
- 📝 `app/api/admin/subscriptions/[id]/cancel/route.ts`

## Posibles Stubs Necesarios
- `lib/stripe.ts` - `cancelStripeSubscription`
- `lib/nequi.ts` - `cancelNequiSubscription`
- `lib/email.ts` - `sendSubscriptionCancelledEmail`

## Criterios de Éxito
- [ ] Servicio creado y funcional
- [ ] Ambos endpoints usan el servicio
- [ ] No hay lógica duplicada
- [ ] Tests manuales pasan
- [ ] Build completa sin errores

## Rollback
```bash
git checkout -- app/api/subscriptions/cancel/route.ts
git checkout -- app/api/admin/subscriptions/[id]/cancel/route.ts
rm lib/services/subscription-cancellation.ts
```

## Riesgo
**Medio** - Afecta funcionalidad de suscripciones.

## Tiempo Estimado
1.5 horas
