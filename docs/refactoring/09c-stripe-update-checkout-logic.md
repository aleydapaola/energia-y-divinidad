# Plan 09c: Actualizar Lógica de Checkout

## Objetivo
Eliminar lógica de Stripe de los endpoints de checkout manteniendo compatibilidad con otros métodos de pago.

## Prerequisito
Completar Plan 09b (eliminar rutas API de Stripe)

## Cambios

### 1. `app/api/checkout/session/route.ts`

**Eliminar import de Stripe (línea 3):**
```typescript
// ELIMINAR:
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
```

**Actualizar tipo CheckoutBody (línea 13):**
```typescript
// ANTES:
paymentMethod: 'nequi' | 'stripe' | 'paypal'

// DESPUÉS:
paymentMethod: 'nequi' | 'paypal' | 'epayco'
```

**Eliminar bloque completo de Stripe (líneas 94-167):**
```typescript
// ELIMINAR TODO ESTE BLOQUE:
if (paymentMethod === 'stripe') {
  // Stripe checkout for international payments
  const customer = await getOrCreateStripeCustomer(...)
  ...
  return NextResponse.json({
    url: checkoutSession.url,
    sessionId: checkoutSession.id,
    paymentMethod: 'stripe',
  })
}
```

**Actualizar validación de región (líneas 51-63):**
```typescript
// ANTES:
if (region === 'international' && paymentMethod === 'nequi') {
  return NextResponse.json(
    { error: 'Nequi solo está disponible para Colombia' },
    { status: 400 }
  )
}

// DESPUÉS:
if (region === 'international' && paymentMethod === 'nequi') {
  return NextResponse.json(
    { error: 'Nequi solo está disponible para Colombia' },
    { status: 400 }
  )
}

// Pagos internacionales van por ePayco
if (region === 'international' && paymentMethod !== 'epayco' && paymentMethod !== 'paypal') {
  return NextResponse.json(
    { error: 'Para pagos internacionales usa tarjeta o PayPal (ePayco)' },
    { status: 400 }
  )
}
```

**Agregar handler para ePayco (después del bloque de nequi):**
```typescript
if (paymentMethod === 'epayco') {
  // ePayco para pagos internacionales con tarjeta
  // TODO: Implementar cuando esté listo el flujo de ePayco para sesiones
  return NextResponse.json(
    { error: 'Pago con tarjeta internacional en desarrollo. Por favor contacta por WhatsApp.' },
    { status: 400 }
  )
}
```

### 2. `app/api/checkout/pack-code/route.ts`

Este endpoint solo servía para obtener pack codes después de checkout con Stripe. Los pack codes generados por otros métodos de pago se obtienen diferente.

**Opción A: Eliminar el archivo completo**
```bash
rm app/api/checkout/pack-code/route.ts
```

**Opción B: Refactorizar para buscar por bookingId en lugar de stripeSessionId**

Reemplazar contenido completo:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/checkout/pack-code?booking_id=xxx
 * Obtiene el código de pack asociado a un booking
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookingId = searchParams.get('booking_id')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Falta booking_id' },
        { status: 400 }
      )
    }

    // Verificar que el booking pertenece al usuario
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Buscar el código de pack asociado al booking
    const packCode = await prisma.sessionPackCode.findUnique({
      where: { originalBookingId: booking.id },
    })

    if (!packCode) {
      return NextResponse.json(
        { error: 'Código aún no generado. Revisa tu email en unos minutos.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: packCode.code,
      expiresAt: packCode.expiresAt?.toISOString(),
      sessionsTotal: packCode.sessionsTotal,
      sessionsUsed: packCode.sessionsUsed,
      amount: Number(packCode.priceAtPurchase),
      currency: packCode.currency,
    })
  } catch (error) {
    console.error('Error fetching pack code:', error)
    return NextResponse.json(
      { error: 'Error al obtener código de pack' },
      { status: 500 }
    )
  }
}
```

### 3. `app/api/events/book/route.ts`

**Modificar case 'stripe' (líneas 230-232):**
```typescript
// ANTES:
case 'stripe':
  paymentMethodEnum = 'EPAYCO_CARD'
  break

// DESPUÉS:
case 'stripe':
  // LEGACY: Redirigir a ePayco para compatibilidad
  console.warn('Payment method "stripe" is deprecated, mapping to EPAYCO_CARD')
  paymentMethodEnum = 'EPAYCO_CARD'
  break
```

O eliminar el case completamente si no hay clientes antiguos:
```typescript
// ELIMINAR:
case 'stripe':
  paymentMethodEnum = 'EPAYCO_CARD'
  break
```

### 4. `app/api/bookings/route.ts`

**Modificar case 'stripe' (líneas 113-115):**
```typescript
// ANTES:
case 'stripe':
  paymentMethodEnum = 'EPAYCO_CARD'
  break

// DESPUÉS:
case 'stripe':
  // LEGACY: Redirigir a ePayco para compatibilidad
  console.warn('Payment method "stripe" is deprecated, mapping to EPAYCO_CARD')
  paymentMethodEnum = 'EPAYCO_CARD'
  break
```

O eliminar el case completamente.

## Verificación

```bash
# Verificar que no hay imports de stripe en checkout
grep -r "from '@/lib/stripe'" app/api/checkout/

# Build
npm run build
```

## Siguiente Plan
09d-stripe-update-subscriptions.md
