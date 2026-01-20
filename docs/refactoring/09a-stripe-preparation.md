# Plan 09a: Preparación para Eliminar Stripe

## Objetivo
Marcar código legacy y actualizar tipos sin romper funcionalidad existente.

## Cambios

### 1. `prisma/schema.prisma`

Agregar comentarios LEGACY:

```prisma
enum PaymentMethod {
  // Wompi (Colombia - COP)
  WOMPI_NEQUI
  WOMPI_CARD
  WOMPI_PSE

  // ePayco (Internacional - USD y COP)
  EPAYCO_CARD
  EPAYCO_PAYPAL
  EPAYCO_PSE

  // Gratis (descuento 100%)
  FREE

  // LEGACY - mantener para datos históricos, no usar para nuevos pagos
  STRIPE
  NEQUI
  MANUAL_NEQUI
  MANUAL_DAVIPLATA
  MANUAL_BANCOLOMBIA
}
```

En modelo `StripePayment`:
```prisma
// LEGACY - Mantener para datos históricos de pagos con Stripe
// No se crean nuevos registros desde que Stripe fue deprecado
model StripePayment {
```

En modelo `Subscription`:
```prisma
  // LEGACY - Stripe (mantener para suscripciones históricas)
  stripeSubscriptionId String? @unique
  stripeCustomerId     String?
```

En modelo `Booking`:
```prisma
  // LEGACY - Stripe payment (mantener para bookings históricos)
  stripeSessionId String? @unique
```

### 2. `lib/payments/types.ts`

Cambiar línea 6:

**Antes:**
```typescript
export type PaymentGatewayName = 'stripe' | 'wompi' | 'epayco' | 'nequi'
```

**Después:**
```typescript
// Pasarelas de pago activas
export type PaymentGatewayName = 'wompi' | 'epayco' | 'nequi'

// LEGACY - Solo para datos históricos, no usar para nuevos pagos
export type LegacyPaymentGatewayName = 'stripe'
export type AllPaymentGatewayNames = PaymentGatewayName | LegacyPaymentGatewayName
```

### 3. `types/membership.ts`

En línea 265, agregar comentario:

**Antes:**
```typescript
export type PaymentMethodType = 'nequi_recurring' | 'nequi_manual' | 'stripe' | 'paypal'
```

**Después:**
```typescript
// LEGACY: 'stripe' se mantiene para datos históricos
export type PaymentMethodType = 'nequi_recurring' | 'nequi_manual' | 'stripe' | 'paypal'
```

### 4. `app/contacto/page.tsx`

En línea 229, actualizar texto FAQ:

**Antes:**
```typescript
Los pagos internacionales se procesan en USD a través de Stripe o PayPal.
```

**Después:**
```typescript
Los pagos internacionales se procesan en USD a través de PayPal.
```

## Verificación

```bash
npm run build
```

## Siguiente Plan
09b-stripe-remove-api-routes.md
