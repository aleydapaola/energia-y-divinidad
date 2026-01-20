# Plan 09d: Actualizar Lógica de Suscripciones

## Objetivo
Eliminar lógica de Stripe de los servicios de suscripciones, manteniendo soporte para suscripciones históricas de Stripe en modo solo lectura.

## Prerequisito
Completar Plan 09c (actualizar checkout)

## Cambios

### 1. `lib/services/subscription-cancellation.ts`

**Eliminar import de Stripe (línea 9):**
```typescript
// ELIMINAR:
import { cancelStripeSubscription } from '@/lib/stripe'
```

**Modificar función cancelInProvider (líneas 265-268):**
```typescript
// ANTES:
if (provider === 'stripe' && subscription.stripeSubscriptionId) {
  // Cancelar en Stripe
  await cancelStripeSubscription(subscription.stripeSubscriptionId, immediate)
  return { success: true }
}

// DESPUÉS:
if (provider === 'stripe' && subscription.stripeSubscriptionId) {
  // LEGACY: Stripe ya no está soportado para nuevas suscripciones
  // Las suscripciones históricas de Stripe solo se marcan como canceladas localmente
  // El usuario debe cancelar manualmente en Stripe si aún tiene acceso
  console.warn(`LEGACY: Attempting to cancel Stripe subscription ${subscription.stripeSubscriptionId}. Manual cancellation may be required.`)
  return {
    success: true,
    error: 'Suscripción Stripe marcada como cancelada. Si el cobro continúa, contacta soporte.'
  }
}
```

### 2. `app/api/subscriptions/reactivate/route.ts`

**Eliminar import de Stripe (línea 4):**
```typescript
// ELIMINAR:
import { reactivateStripeSubscription } from '@/lib/stripe'
```

**Modificar bloque de reactivación Stripe (líneas 43-59):**
```typescript
// ANTES:
if (subscription.paymentProvider === 'stripe' && subscription.stripeSubscriptionId) {
  // Remover flag de cancelación en Stripe
  await reactivateStripeSubscription(subscription.stripeSubscriptionId)

  // Actualizar en DB
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cancelledAt: null,
      status: 'ACTIVE',
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Tu suscripción ha sido reactivada exitosamente',
  })
}

// DESPUÉS:
if (subscription.paymentProvider === 'stripe') {
  // LEGACY: Stripe ya no está soportado
  // Las suscripciones de Stripe no se pueden reactivar automáticamente
  return NextResponse.json(
    {
      error: 'Las suscripciones de Stripe no se pueden reactivar automáticamente. Por favor crea una nueva suscripción con Nequi o tarjeta.'
    },
    { status: 400 }
  )
}
```

### 3. Verificar `components/membership/subscription-manager.tsx`

Este archivo muestra información de suscripciones. **NO requiere cambios** porque solo lee datos existentes:

```typescript
// Líneas 90-91 - MANTENER (solo lectura para display)
if (subscription.paymentProvider === 'stripe') {
  return `Tarjeta ···${subscription.stripeCustomerId?.slice(-4) || ''}`
}
```

### 4. Verificar `app/admin/subscriptions/[id]/page.tsx`

**NO requiere cambios** - Solo muestra datos históricos:

```typescript
// Líneas 218-221 - MANTENER (solo lectura para admin)
{subscription.stripeSubscriptionId && (
  <>
    <p className="text-sm text-gray-500 font-dm-sans">ID de Suscripción (Stripe)</p>
    <p className="font-mono text-sm text-gray-900">{subscription.stripeSubscriptionId}</p>
  </>
)}
```

## Comportamiento Esperado Post-Cambios

| Escenario | Comportamiento |
|-----------|----------------|
| Cancelar suscripción Stripe existente | Marca como cancelada en DB local. Warning en logs. |
| Reactivar suscripción Stripe | Error con mensaje de crear nueva suscripción |
| Ver suscripción Stripe en admin | Muestra datos históricos normalmente |
| Ver suscripción Stripe como usuario | Muestra "Tarjeta ···XXXX" |
| Nueva suscripción | Solo Nequi/Wompi/ePayco disponibles |

## Verificación

```bash
# Verificar que no hay imports de stripe en subscriptions
grep -r "from '@/lib/stripe'" lib/services/
grep -r "from '@/lib/stripe'" app/api/subscriptions/

# Build
npm run build
```

## Siguiente Plan
09e-stripe-remove-pages.md
