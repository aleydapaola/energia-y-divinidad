# Plan 09: Eliminar Stripe del Proyecto

## Contexto

Stripe no opera en Colombia como pasarela de pago para comerciantes. El código de Stripe es código muerto que nunca podrá usarse en producción. Las pasarelas activas son:
- **Wompi** (Colombia - tarjetas COP)
- **ePayco** (Internacional - PayPal, tarjetas USD/COP)
- **Nequi API** (Colombia - Nequi Push, pendiente de credenciales)

## Archivos a Eliminar

### Archivos principales de Stripe
| Archivo | Descripción |
|---------|-------------|
| `lib/stripe.ts` | Biblioteca de integración con Stripe |
| `app/api/checkout/stripe/route.ts` | Endpoint de checkout Stripe |
| `app/api/webhooks/stripe/route.ts` | Webhook de Stripe |
| `app/pago/stripe/[orderId]/page.tsx` | Página de pago Stripe |

### Directorios a eliminar
```bash
rm -rf app/api/checkout/stripe/
rm -rf app/api/webhooks/stripe/
rm -rf app/pago/stripe/
rm lib/stripe.ts
```

## Archivos a Modificar

### 1. `prisma/schema.prisma`

**Cambios:**
- Mantener `STRIPE` en `PaymentMethod` enum marcado como legacy (hay datos históricos)
- Mantener modelo `StripePayment` marcado como legacy (hay datos históricos)
- Mantener campos `stripeSubscriptionId` y `stripeCustomerId` en `Subscription` (hay datos históricos)
- Mantener campo `stripeSessionId` en `Booking` (hay datos históricos)

**Acción:** Agregar comentarios `// LEGACY - mantener para datos históricos` pero NO eliminar campos/tablas que pueden tener datos.

### 2. `lib/services/subscription-cancellation.ts`

**Líneas afectadas:**
```typescript
// Línea 9: import { cancelStripeSubscription } from '@/lib/stripe'
// Líneas 265-267: if (provider === 'stripe' && subscription.stripeSubscriptionId)
```

**Cambios:**
- Eliminar import de `cancelStripeSubscription`
- Modificar lógica para lanzar error si `provider === 'stripe'` (no soportado)

### 3. `lib/payments/types.ts`

**Línea afectada:**
```typescript
// Línea 6: export type PaymentGatewayName = 'stripe' | 'wompi' | 'epayco' | 'nequi'
```

**Cambio:**
```typescript
export type PaymentGatewayName = 'wompi' | 'epayco' | 'nequi'

// LEGACY - solo para datos históricos, no usar para nuevos pagos
export type LegacyPaymentGatewayName = 'stripe'
```

### 4. `types/membership.ts`

**Líneas afectadas:**
```typescript
// Líneas 200-201: stripeSubscriptionId, stripeCustomerId
// Línea 265: PaymentMethodType incluye 'stripe'
```

**Cambios:**
- Mantener campos como opcionales (datos históricos)
- Agregar comentario LEGACY al tipo `PaymentMethodType`

### 5. `lib/membership-access.ts`

**Líneas afectadas:**
```typescript
// Líneas 56-57: stripeSubscriptionId, stripeCustomerId
```

**Cambio:** Mantener (solo lee datos existentes, no crea nuevos)

### 6. `lib/email.ts`

**Línea afectada:**
```typescript
// Línea 2179: paymentMethod === 'STRIPE' ? 'Stripe'
```

**Cambio:** Mantener para mostrar correctamente emails de pagos históricos

### 7. `app/api/events/book/route.ts`

**Línea afectada:**
```typescript
// Línea 230: case 'stripe':
```

**Cambio:** Eliminar case 'stripe' o lanzar error "Método de pago no soportado"

### 8. `app/api/bookings/route.ts`

**Línea afectada:**
```typescript
// Línea 113: case 'stripe':
```

**Cambio:** Eliminar case 'stripe' o lanzar error "Método de pago no soportado"

### 9. `app/api/checkout/session/route.ts`

**Líneas afectadas:**
```typescript
// Línea 3: import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
// Línea 13: paymentMethod: 'nequi' | 'stripe' | 'paypal'
// Líneas 94-165: if (paymentMethod === 'stripe') { ... }
```

**Cambios:**
- Eliminar import de stripe
- Eliminar 'stripe' del tipo de paymentMethod
- Eliminar bloque completo de `if (paymentMethod === 'stripe')`

### 10. `app/api/checkout/pack-code/route.ts`

**Líneas afectadas:**
```typescript
// Línea 4: import { stripe } from '@/lib/stripe'
// Líneas 28-41: código que usa stripe.checkout.sessions.retrieve
```

**Análisis:** Este archivo obtiene pack codes después de checkout con Stripe. Si no hay nuevos checkouts con Stripe, este código es muerto.

**Cambio:** Eliminar completamente la lógica de Stripe. Los pack codes existentes seguirán funcionando porque ya están en la DB.

### 11. `app/api/subscriptions/reactivate/route.ts`

**Líneas afectadas:**
```typescript
// Línea 4: import { reactivateStripeSubscription } from '@/lib/stripe'
// Líneas 43-45: if (subscription.paymentProvider === 'stripe')
```

**Cambios:**
- Eliminar import
- Cambiar lógica para lanzar error si `paymentProvider === 'stripe'`

### 12. `app/checkout/success/page.tsx`

**Líneas afectadas:**
```typescript
// Línea 5: import { stripe } from '@/lib/stripe'
// Líneas 13-14: stripe.checkout.sessions.retrieve
```

**Cambio:** Eliminar lógica de Stripe. La página de éxito debe funcionar con las otras pasarelas.

### 13. `app/checkout/pack-success/PackSuccessContent.tsx`

**Línea afectada:**
```typescript
// Línea 33: Obtener datos del pack code asociado a esta sesión de Stripe
```

**Cambio:** Actualizar comentario y verificar que funcione sin Stripe

### 14. Archivos de Admin (UI)

| Archivo | Cambio |
|---------|--------|
| `app/admin/events/AdminEventsList.tsx` | Mantener 'STRIPE' en mapeo de labels (datos históricos) |
| `app/admin/orders/AdminOrdersList.tsx` | Mantener 'STRIPE' en mapeo de labels |
| `app/admin/orders/[id]/page.tsx` | Mantener 'STRIPE' en mapeo de labels |
| `app/admin/subscriptions/[id]/page.tsx` | Mantener sección de stripeSubscriptionId (datos históricos) |

### 15. `components/membership/subscription-manager.tsx`

**Líneas afectadas:**
```typescript
// Líneas 90-91: if (subscription.paymentProvider === 'stripe')
```

**Cambio:** Mantener para mostrar correctamente suscripciones históricas

### 16. `app/contacto/page.tsx`

**Línea afectada:**
```typescript
// Línea 229: mención de Stripe en FAQ
```

**Cambio:** Actualizar texto a "Los pagos internacionales se procesan en USD a través de PayPal."

### 17. `package.json`

**Cambio:** Eliminar dependencia `stripe`

```bash
npm uninstall stripe
```

### 18. `.env.example`

**Cambio:** Eliminar variables de Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (si existe)

### 19. `app/api/admin/subscriptions/[id]/route.ts`

**Línea afectada:**
```typescript
// Línea 92: stripeSubscriptionId: subscription.stripeSubscriptionId
```

**Cambio:** Mantener (solo lee datos existentes para display en admin)

## Orden de Ejecución

### Fase 1: Preparación (sin breaking changes)
1. Agregar comentarios LEGACY en `prisma/schema.prisma`
2. Actualizar tipos en `lib/payments/types.ts`
3. Actualizar texto en `app/contacto/page.tsx`

### Fase 2: Eliminar rutas de API
4. Eliminar `app/api/checkout/stripe/route.ts` (directorio completo)
5. Eliminar `app/api/webhooks/stripe/route.ts` (directorio completo)

### Fase 3: Actualizar lógica de negocio
6. Modificar `app/api/checkout/session/route.ts` - eliminar bloque Stripe
7. Modificar `app/api/checkout/pack-code/route.ts` - eliminar lógica Stripe
8. Modificar `app/api/events/book/route.ts` - eliminar case Stripe
9. Modificar `app/api/bookings/route.ts` - eliminar case Stripe
10. Modificar `app/api/subscriptions/reactivate/route.ts` - error si Stripe
11. Modificar `lib/services/subscription-cancellation.ts` - error si Stripe

### Fase 4: Eliminar páginas
12. Eliminar `app/pago/stripe/[orderId]/page.tsx` (directorio completo)
13. Modificar `app/checkout/success/page.tsx` - eliminar lógica Stripe

### Fase 5: Eliminar biblioteca
14. Eliminar `lib/stripe.ts`

### Fase 6: Limpieza de dependencias
15. `npm uninstall stripe`
16. Actualizar `.env.example`

### Fase 7: Verificación
17. `npm run build` - verificar compilación
18. `cd sanity && npm run build` - verificar Sanity
19. Grep final para confirmar no hay imports rotos

## Datos Históricos

**IMPORTANTE:** NO eliminar campos de la base de datos que pueden contener datos históricos:

- `Subscription.stripeSubscriptionId`
- `Subscription.stripeCustomerId`
- `Booking.stripeSessionId`
- `PaymentMethod.STRIPE` (enum value)
- Modelo `StripePayment`

Estos campos se mantienen como LEGACY para:
1. Mostrar correctamente pedidos/suscripciones antiguas en admin
2. No romper consultas existentes
3. Mantener trazabilidad de pagos históricos

## Migración de Base de Datos

**NO se requiere migración.** Los campos permanecen pero no se usan para nuevos registros.

Si en el futuro se quiere limpiar:
```sql
-- Solo ejecutar si se confirma que no hay datos de Stripe
-- ALTER TABLE subscriptions DROP COLUMN stripe_subscription_id;
-- ALTER TABLE subscriptions DROP COLUMN stripe_customer_id;
-- DROP TABLE stripe_payments;
```

## Rollback

Si algo sale mal:
1. `git checkout HEAD~1` para volver al commit anterior
2. `npm install stripe` para reinstalar dependencia
3. Restaurar archivos eliminados desde git

## Verificación Post-Eliminación

```bash
# Verificar que no hay imports rotos
grep -r "from '@/lib/stripe'" --include="*.ts" --include="*.tsx"
grep -r "from 'stripe'" --include="*.ts" --include="*.tsx"

# Verificar build
npm run build

# Verificar que las pasarelas activas funcionan
# - Probar checkout con Wompi
# - Probar checkout con ePayco
```

## Estimación de Impacto

- **Archivos a eliminar:** 4
- **Archivos a modificar:** ~15
- **Líneas de código eliminadas:** ~600
- **Riesgo:** Bajo (código no usado en producción)
- **Datos afectados:** Ninguno (campos históricos se mantienen)
