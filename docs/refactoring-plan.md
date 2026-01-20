# Plan de Refactorización - Energía y Divinidad

## Resumen Ejecutivo

Este documento detalla el plan para eliminar funcionalidades duplicadas identificadas en el código y en los esquemas de Sanity. La refactorización se organiza en **5 fases** ordenadas por prioridad e impacto.

---

## Fase 1: Limpieza Inmediata (Bajo Riesgo)

### 1.1 Eliminar esquema `session.ts` no utilizado

**Problema**: Existe `sanity/schemas/session.ts` (365 líneas) que ya no se usa - solo `sessionConfig.ts` está registrado en el index.

**Archivos a modificar**:
- ❌ Eliminar: `sanity/schemas/session.ts`

**Verificación previa**:
```bash
# Buscar referencias al esquema session (no sessionConfig)
grep -r "from.*session['\"]" --include="*.ts" --include="*.tsx" | grep -v sessionConfig
grep -r "_type.*session['\"]" --include="*.ts" --include="*.tsx" | grep -v sessionConfig
```

**Riesgo**: Bajo - el esquema no está registrado en `index.ts`

---

### 1.2 Extraer función `generateOrderNumber` a utilidad compartida

**Problema**: Función duplicada en dos archivos con solo el prefijo diferente.

**Archivos afectados**:
- `app/api/bookings/route.ts` (líneas 5-14)
- `app/api/events/book/route.ts` (líneas 13-22)

**Solución**: Crear utilidad en `lib/order-utils.ts`

```typescript
// lib/order-utils.ts
export type OrderPrefix = 'ORD' | 'EVT' | 'MEM' | 'CRS'

export function generateOrderNumber(prefix: OrderPrefix = 'ORD'): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `${prefix}-${year}${month}${day}-${random}`
}
```

**Actualizar**:
- `app/api/bookings/route.ts`: Importar y usar `generateOrderNumber('ORD')`
- `app/api/events/book/route.ts`: Importar y usar `generateOrderNumber('EVT')`

**Riesgo**: Bajo

---

### 1.3 Extraer función `checkRateLimit` a utilidad compartida

**Problema**: Rate limiting implementado inline en `app/api/events/book/route.ts`

**Solución**: Mover a `lib/rate-limit.ts` para reutilizar en otros endpoints

```typescript
// lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  key: string,
  options?: { windowMs?: number; maxRequests?: number }
): boolean {
  const { windowMs = 60_000, maxRequests = 5 } = options || {}
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}
```

**Riesgo**: Bajo

---

## Fase 2: Consolidación de Servicios de Cancelación

### 2.1 Crear servicio unificado de cancelación de reservas

**Problema**: 3 endpoints con lógica de cancelación casi idéntica:
- `app/api/bookings/[id]/cancel/route.ts`
- `app/api/admin/bookings/[id]/cancel/route.ts`
- `app/api/events/[eventId]/cancel-booking/route.ts`

**Solución**: Crear `lib/services/booking-cancellation.ts`

```typescript
// lib/services/booking-cancellation.ts
import { prisma } from '@/lib/prisma'
import { refundCredit } from '@/lib/credits'
import { sendCancellationEmail } from '@/lib/email'

export interface CancellationOptions {
  bookingId: string
  cancelledBy: 'user' | 'admin'
  reason?: string
  skipEmail?: boolean
  refundCredits?: boolean
}

export interface CancellationResult {
  success: boolean
  booking?: any
  refunded?: {
    credits?: number
    packSessions?: number
  }
  error?: string
}

export async function cancelBooking(options: CancellationOptions): Promise<CancellationResult> {
  const { bookingId, cancelledBy, reason, skipEmail = false, refundCredits = true } = options

  try {
    // 1. Obtener booking con validaciones
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true }
    })

    if (!booking) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    if (booking.status === 'CANCELLED') {
      return { success: false, error: 'La reserva ya está cancelada' }
    }

    const refunded: CancellationResult['refunded'] = {}

    // 2. Reembolsar créditos si aplica
    if (refundCredits && booking.paidWithCredit) {
      await refundCredit(booking.userId!, booking.id)
      refunded.credits = 1
    }

    // 3. Reembolsar sesiones de pack si aplica
    if (booking.packCodeId) {
      await prisma.booking.update({
        where: { id: booking.packCodeId },
        data: { sessionsUsed: { decrement: 1 } }
      })
      refunded.packSessions = 1
    }

    // 4. Actualizar estado
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        metadata: {
          ...(booking.metadata as object || {}),
          cancelledBy,
          cancellationReason: reason,
        }
      }
    })

    // 5. Enviar email
    if (!skipEmail && booking.user?.email) {
      await sendCancellationEmail({
        email: booking.user.email,
        name: booking.user.name || 'Cliente',
        bookingType: booking.bookingType,
        resourceName: booking.resourceName,
        scheduledAt: booking.scheduledAt,
      })
    }

    return { success: true, booking: updatedBooking, refunded }
  } catch (error: any) {
    console.error('[BOOKING-CANCELLATION] Error:', error)
    return { success: false, error: error.message }
  }
}
```

**Actualizar endpoints**:
- `app/api/bookings/[id]/cancel/route.ts`: Usar servicio + validar que el usuario sea dueño
- `app/api/admin/bookings/[id]/cancel/route.ts`: Usar servicio + validar rol admin
- `app/api/events/[eventId]/cancel-booking/route.ts`: Usar servicio

**Riesgo**: Medio - requiere testing exhaustivo

---

### 2.2 Crear servicio unificado de cancelación de suscripciones

**Problema**: 2 endpoints con lógica similar:
- `app/api/subscriptions/cancel/route.ts`
- `app/api/admin/subscriptions/[id]/cancel/route.ts`

**Solución**: Crear `lib/services/subscription-cancellation.ts` con patrón similar

**Riesgo**: Medio

---

## Fase 3: Unificación de Checkout y Webhooks

### 3.1 Crear interfaz abstracta para pasarelas de pago

**Problema**: 4 integraciones de pago con patrones repetidos:
- `lib/stripe.ts`
- `lib/wompi.ts`
- `lib/epayco.ts`
- `lib/nequi.ts`

**Solución**: Crear `lib/payments/gateway-interface.ts`

```typescript
// lib/payments/gateway-interface.ts
export interface PaymentGateway {
  name: string
  supportedCurrencies: string[]
  supportedMethods: string[]

  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  verifyWebhook(request: Request): Promise<WebhookVerificationResult>
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>
}

export interface CreatePaymentParams {
  amount: number
  currency: 'COP' | 'USD'
  orderId: string
  customerEmail: string
  customerName: string
  description: string
  metadata?: Record<string, any>
  returnUrl: string
}

export interface CreatePaymentResult {
  success: boolean
  redirectUrl?: string
  transactionId?: string
  error?: string
}

export interface WebhookVerificationResult {
  valid: boolean
  eventType?: string
  transactionId?: string
  status?: 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED'
  rawData?: any
}

export interface TransactionStatus {
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR'
  transactionId: string
  amount?: number
  currency?: string
}
```

**Implementar adaptadores**:
- `lib/payments/adapters/stripe-adapter.ts`
- `lib/payments/adapters/wompi-adapter.ts`
- `lib/payments/adapters/epayco-adapter.ts`
- `lib/payments/adapters/nequi-adapter.ts`

**Riesgo**: Alto - es código crítico de pagos, requiere testing en sandbox

---

### 3.2 Unificar endpoints de checkout

**Problema**: 3 endpoints casi idénticos:
- `app/api/checkout/wompi/route.ts`
- `app/api/checkout/epayco/route.ts`
- `app/api/checkout/stripe/route.ts`

**Solución**: Crear endpoint único `app/api/checkout/route.ts`

```typescript
// app/api/checkout/route.ts
import { getGatewayForMethod } from '@/lib/payments/gateway-selector'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { paymentMethod, ...checkoutData } = body

  // Seleccionar gateway según método de pago
  const gateway = getGatewayForMethod(paymentMethod)

  // Validaciones comunes (extraídas a función)
  const validation = validateCheckoutRequest(checkoutData)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Crear orden
  const order = await createOrder(checkoutData)

  // Procesar con gateway
  const result = await gateway.createPayment({
    ...checkoutData,
    orderId: order.id,
  })

  return NextResponse.json(result)
}
```

**Deprecar** (no eliminar inmediatamente):
- `app/api/checkout/wompi/route.ts` → redirigir a `/api/checkout`
- `app/api/checkout/epayco/route.ts` → redirigir a `/api/checkout`
- `app/api/checkout/stripe/route.ts` → redirigir a `/api/checkout`

**Riesgo**: Alto

---

### 3.3 Unificar procesamiento de webhooks

**Problema**: 4 webhooks con lógica de idempotencia y procesamiento duplicada

**Solución**: Crear `lib/payments/webhook-processor.ts`

```typescript
// lib/payments/webhook-processor.ts
import { prisma } from '@/lib/prisma'
import { processApprovedPayment } from '@/lib/payment-processor'

export async function processWebhook(
  gateway: PaymentGateway,
  request: Request
): Promise<{ processed: boolean; error?: string }> {
  // 1. Verificar firma del webhook
  const verification = await gateway.verifyWebhook(request)
  if (!verification.valid) {
    return { processed: false, error: 'Invalid webhook signature' }
  }

  // 2. Check idempotencia
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: gateway.name,
        eventId: verification.transactionId!,
      }
    }
  })

  if (existingEvent?.processed) {
    return { processed: true } // Ya procesado, OK
  }

  // 3. Registrar evento
  await prisma.webhookEvent.upsert({
    where: {
      provider_eventId: {
        provider: gateway.name,
        eventId: verification.transactionId!,
      }
    },
    create: {
      provider: gateway.name,
      eventId: verification.transactionId!,
      eventType: verification.eventType,
      payload: verification.rawData,
      processed: false,
    },
    update: {}
  })

  // 4. Procesar según status
  if (verification.status === 'APPROVED') {
    const order = await prisma.order.findFirst({
      where: { transactionId: verification.transactionId },
      include: { user: true }
    })

    if (order) {
      await processApprovedPayment(order, {
        transactionId: verification.transactionId
      })
    }
  }

  // 5. Marcar como procesado
  await prisma.webhookEvent.update({
    where: {
      provider_eventId: {
        provider: gateway.name,
        eventId: verification.transactionId!,
      }
    },
    data: { processed: true, processedAt: new Date() }
  })

  return { processed: true }
}
```

**Simplificar webhooks**:
```typescript
// app/api/webhooks/wompi/route.ts (simplificado)
import { processWebhook } from '@/lib/payments/webhook-processor'
import { WompiAdapter } from '@/lib/payments/adapters/wompi-adapter'

export async function POST(request: Request) {
  const result = await processWebhook(new WompiAdapter(), request)
  return NextResponse.json(result)
}
```

**Riesgo**: Alto

---

## Fase 4: Consolidación de Esquemas Sanity

### 4.1 Crear objetos reutilizables para campos comunes

**Problema**: Campos idénticos repetidos en 14+ esquemas

**Solución**: Crear objetos en `sanity/schemas/objects/`

#### 4.1.1 Objeto SEO

```typescript
// sanity/schemas/objects/seo.ts
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Título',
      type: 'string',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Descripción',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(160),
    }),
  ],
})
```

#### 4.1.2 Objeto Pricing

```typescript
// sanity/schemas/objects/pricing.ts
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'pricing',
  title: 'Precios',
  type: 'object',
  fields: [
    defineField({
      name: 'price',
      title: 'Precio en Pesos (COP)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio en Dólares (USD)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Precio Anterior COP (tachado)',
      type: 'number',
      description: 'Mostrar precio anterior para indicar descuento',
    }),
    defineField({
      name: 'compareAtPriceUSD',
      title: 'Precio Anterior USD (tachado)',
      type: 'number',
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
    }),
  ],
})
```

#### 4.1.3 Objeto Membership Access

```typescript
// sanity/schemas/objects/membershipAccess.ts
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'object',
  fields: [
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en Membresía?',
      type: 'boolean',
      description: 'Los miembros pueden acceder sin pago adicional',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía con Acceso',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: ({ parent }) => !parent?.includedInMembership,
    }),
  ],
})
```

#### 4.1.4 Objeto Cover Image

```typescript
// sanity/schemas/objects/coverImage.ts
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'coverImage',
  title: 'Imagen de Portada',
  type: 'image',
  options: {
    hotspot: true,
  },
  fields: [
    defineField({
      name: 'alt',
      title: 'Texto Alternativo',
      type: 'string',
      description: 'Importante para accesibilidad y SEO',
    }),
  ],
})
```

**Registrar objetos** en `sanity/schemas/index.ts`:
```typescript
import seo from './objects/seo'
import pricing from './objects/pricing'
import membershipAccess from './objects/membershipAccess'
import coverImage from './objects/coverImage'

export const schemaTypes = [
  // Objetos reutilizables
  seo,
  pricing,
  membershipAccess,
  coverImage,

  // ... resto de esquemas
]
```

**Riesgo**: Medio - requiere migración de datos en Sanity

---

### 4.2 Migrar esquemas existentes a usar objetos

**Ejemplo de migración para `course.ts`**:

**Antes**:
```typescript
defineField({
  name: 'price',
  title: 'Precio en Pesos (COP)',
  type: 'number',
}),
defineField({
  name: 'priceUSD',
  title: 'Precio en Dólares (USD)',
  type: 'number',
}),
defineField({
  name: 'memberDiscount',
  title: 'Descuento para Miembros (%)',
  type: 'number',
}),
// ... más campos SEO, membership, etc.
```

**Después**:
```typescript
defineField({
  name: 'pricing',
  title: 'Precios',
  type: 'pricing',
  group: 'pricing',
}),
defineField({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'membershipAccess',
  group: 'access',
}),
defineField({
  name: 'seo',
  title: 'SEO',
  type: 'seo',
  group: 'seo',
}),
```

**Esquemas a migrar** (en orden):
1. `course.ts`
2. `event.ts`
3. `product.ts`
4. `premiumContent.ts`
5. `blogPost.ts`
6. `freeContent.ts`
7. `membershipPost.ts`
8. `page.ts`

**Script de migración** (ejecutar en Sanity Studio):
```typescript
// migrations/consolidate-pricing-fields.ts
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'production',
  token: 'YOUR_TOKEN',
  apiVersion: '2024-01-01',
})

async function migratePricing() {
  const types = ['course', 'event', 'product', 'premiumContent']

  for (const type of types) {
    const docs = await client.fetch(`*[_type == "${type}"]`)

    for (const doc of docs) {
      await client
        .patch(doc._id)
        .set({
          pricing: {
            price: doc.price,
            priceUSD: doc.priceUSD,
            memberDiscount: doc.memberDiscount,
            compareAtPrice: doc.compareAtPrice,
            compareAtPriceUSD: doc.compareAtPriceUSD,
          }
        })
        .unset(['price', 'priceUSD', 'memberDiscount', 'compareAtPrice', 'compareAtPriceUSD'])
        .commit()
    }
  }
}
```

**Riesgo**: Alto - afecta datos en producción

---

### 4.3 Resolver ambigüedad en campos de eventos

**Problema**: `event.ts` tiene `includedInMembership` Y `requiresMembership`

**Solución**: Consolidar en objeto `membershipAccess` y eliminar ambigüedad

```typescript
// En event.ts - usar solo membershipAccess
defineField({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'membershipAccess',
}),
// Eliminar: includedInMembership, requiresMembership
```

**Actualizar queries** en `lib/sanity/queries/events.ts`:
```typescript
// Antes
includedInMembership,
requiresMembership,

// Después
"membershipAccess": membershipAccess {
  includedInMembership,
  membershipTiers[]->{ _id, name, slug }
}
```

**Riesgo**: Medio

---

## Fase 5: Consolidación de Queries Sanity

### 5.1 Crear query builder con proyecciones reutilizables

**Problema**: Proyecciones duplicadas en múltiples queries

**Solución**: Crear `sanity/lib/projections.ts`

```typescript
// sanity/lib/projections.ts

export const seoProjection = `
  "seo": seo {
    metaTitle,
    metaDescription
  }
`

export const pricingProjection = `
  "pricing": pricing {
    price,
    priceUSD,
    compareAtPrice,
    compareAtPriceUSD,
    memberDiscount
  }
`

export const membershipAccessProjection = `
  "membershipAccess": membershipAccess {
    includedInMembership,
    membershipTiers[]->{ _id, name, slug }
  }
`

export const coverImageProjection = `
  "coverImage": coverImage {
    asset->{ url, metadata },
    alt
  }
`

export const authorProjection = `
  "author": author-> {
    name,
    "image": image.asset->url
  }
`
```

**Usar en queries**:
```typescript
// sanity/lib/queries.ts
import {
  seoProjection,
  pricingProjection,
  membershipAccessProjection
} from './projections'

export const COURSE_BY_SLUG_QUERY = groq`
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    ${pricingProjection},
    ${membershipAccessProjection},
    ${seoProjection},
    // ... resto de campos específicos
  }
`
```

**Riesgo**: Bajo

---

### 5.2 Parametrizar límites en queries

**Problema**: Límites hardcodeados (`[0...6]`, `[0...4]`, etc.)

**Solución**: Usar parámetros GROQ

```typescript
// Antes
export const FEATURED_EVENTS_QUERY = groq`
  *[_type == "event" && published && featured] | order(eventDate asc)[0...6]
`

// Después
export const FEATURED_EVENTS_QUERY = groq`
  *[_type == "event" && published && featured] | order(eventDate asc)[0...$limit]
`

// Uso
const events = await client.fetch(FEATURED_EVENTS_QUERY, { limit: 6 })
```

**Riesgo**: Bajo

---

## Orden de Implementación Recomendado

| # | Tarea | Fase | Riesgo | Tiempo Est. |
|---|-------|------|--------|-------------|
| 1 | Eliminar `session.ts` | 1.1 | Bajo | 15 min |
| 2 | Extraer `generateOrderNumber` | 1.2 | Bajo | 30 min |
| 3 | Extraer `checkRateLimit` | 1.3 | Bajo | 20 min |
| 4 | Crear objetos Sanity reutilizables | 4.1 | Medio | 2 hrs |
| 5 | Crear proyecciones GROQ | 5.1 | Bajo | 1 hr |
| 6 | Servicio cancelación bookings | 2.1 | Medio | 2 hrs |
| 7 | Servicio cancelación suscripciones | 2.2 | Medio | 1.5 hrs |
| 8 | Interfaz abstracta de pagos | 3.1 | Alto | 4 hrs |
| 9 | Unificar checkout | 3.2 | Alto | 3 hrs |
| 10 | Unificar webhooks | 3.3 | Alto | 3 hrs |
| 11 | Migrar esquemas a objetos | 4.2 | Alto | 4 hrs |
| 12 | Resolver ambigüedad eventos | 4.3 | Medio | 1 hr |
| 13 | Parametrizar queries | 5.2 | Bajo | 1 hr |

---

## Checklist de Testing

### Para cada cambio:
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] Probar en ambiente de desarrollo
- [ ] Probar flujos de pago en sandbox (Wompi, ePayco)
- [ ] Verificar webhooks con herramientas de testing
- [ ] Verificar que Sanity Studio funciona correctamente
- [ ] Validar datos migrados en Sanity

### Específico para pagos:
- [ ] Checkout con tarjeta colombiana (Wompi)
- [ ] Checkout con PayPal (ePayco)
- [ ] Checkout internacional (ePayco)
- [ ] Webhook de pago aprobado
- [ ] Webhook de pago rechazado
- [ ] Idempotencia de webhooks (enviar mismo evento 2 veces)

---

## Rollback Plan

Para cada fase, mantener la capacidad de rollback:

1. **Fase 1-2**: Git revert es suficiente
2. **Fase 3**: Mantener endpoints antiguos funcionando durante transición
3. **Fase 4-5**: Crear backup de dataset Sanity antes de migración

```bash
# Backup de Sanity antes de migración
npx sanity dataset export production backup-pre-migration.tar.gz
```

---

## Métricas de Éxito

- Reducción de líneas de código duplicado: **objetivo -30%**
- Reducción de archivos en `/api/checkout/`: de 3 a 1
- Reducción de archivos en `/api/webhooks/`: lógica compartida
- Tiempo de onboarding para nuevos devs: más fácil de entender
- Cobertura de tests: mantener o mejorar
