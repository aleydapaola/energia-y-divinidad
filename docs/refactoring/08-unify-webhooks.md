# Plan 08: Unificar Procesamiento de Webhooks

## Objetivo
Crear un procesador de webhooks unificado que maneje la lógica común de todos los webhooks de pago.

## Prerequisitos
- ✅ Plan 06 completado (Interfaz de pasarelas de pago)

## Contexto
Los 4 webhooks actuales tienen lógica duplicada:
- `app/api/webhooks/wompi/route.ts`
- `app/api/webhooks/epayco/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/api/webhooks/nequi/route.ts`

Todos hacen:
1. Verificar firma del webhook
2. Parsear evento
3. Verificar idempotencia
4. Procesar según estado
5. Llamar a `processApprovedPayment` si aprobado
6. Marcar evento como procesado

## Análisis Previo Requerido

```bash
# Leer los webhooks actuales
cat app/api/webhooks/wompi/route.ts
cat app/api/webhooks/epayco/route.ts
```

## Pasos de Implementación

### Paso 1: Crear procesador de webhooks

Crear `lib/payments/webhook-processor.ts`:

```typescript
/**
 * Webhook Processor
 * Procesador unificado para webhooks de todas las pasarelas de pago
 */

import { prisma } from '@/lib/prisma'
import { processApprovedPayment, OrderWithUser } from '@/lib/payment-processor'
import { PaymentGateway, TransactionStatus } from './types'

export interface WebhookProcessingResult {
  /** Si el webhook fue procesado exitosamente */
  processed: boolean
  /** Si ya había sido procesado antes (idempotencia) */
  alreadyProcessed?: boolean
  /** Acción tomada */
  action?: 'payment_approved' | 'payment_declined' | 'payment_pending' | 'ignored'
  /** ID de la orden afectada */
  orderId?: string
  /** Error si falló */
  error?: string
}

export interface WebhookProcessorOptions {
  /** Gateway que recibió el webhook */
  gateway: PaymentGateway
  /** Request HTTP del webhook */
  request: Request
  /** Body crudo (para verificación de firma) */
  rawBody?: string
}

/**
 * Procesa un webhook de pago de cualquier pasarela
 */
export async function processWebhook(
  options: WebhookProcessorOptions
): Promise<WebhookProcessingResult> {
  const { gateway, request, rawBody } = options

  try {
    // 1. Verificar firma del webhook
    const verification = await gateway.verifyWebhook(request, rawBody)

    if (!verification.valid) {
      console.error(`[WEBHOOK-${gateway.name}] Invalid signature:`, verification.error)
      return {
        processed: false,
        error: verification.error || 'Invalid webhook signature',
      }
    }

    const { transactionId, status, reference, eventType, rawData } = verification

    if (!transactionId) {
      console.error(`[WEBHOOK-${gateway.name}] No transaction ID in webhook`)
      return {
        processed: false,
        error: 'No transaction ID in webhook payload',
      }
    }

    // 2. Verificar idempotencia
    const eventKey = `${gateway.name}_${transactionId}_${status}`
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: gateway.name,
          eventId: eventKey,
        },
      },
    })

    if (existingEvent?.processed) {
      console.log(`[WEBHOOK-${gateway.name}] Event ${eventKey} already processed`)
      return {
        processed: true,
        alreadyProcessed: true,
        action: 'ignored',
      }
    }

    // 3. Registrar evento
    await prisma.webhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: gateway.name,
          eventId: eventKey,
        },
      },
      create: {
        provider: gateway.name,
        eventId: eventKey,
        eventType: eventType || 'unknown',
        payload: rawData || {},
        processed: false,
      },
      update: {
        eventType: eventType || 'unknown',
        payload: rawData || {},
      },
    })

    // 4. Buscar orden asociada
    const order = await findOrderForWebhook(transactionId, reference)

    if (!order) {
      console.warn(`[WEBHOOK-${gateway.name}] Order not found for transaction ${transactionId}`)
      // Marcar como procesado para evitar reintentos
      await markEventProcessed(gateway.name, eventKey)
      return {
        processed: true,
        action: 'ignored',
        error: 'Order not found',
      }
    }

    // 5. Procesar según estado
    let action: WebhookProcessingResult['action']

    switch (status) {
      case 'APPROVED':
        // Verificar que no esté ya aprobado
        if (order.paymentStatus === 'COMPLETED') {
          console.log(`[WEBHOOK-${gateway.name}] Order ${order.id} already completed`)
          action = 'ignored'
        } else {
          await handleApprovedPayment(order, transactionId)
          action = 'payment_approved'
        }
        break

      case 'DECLINED':
        await handleDeclinedPayment(order, transactionId, rawData)
        action = 'payment_declined'
        break

      case 'PENDING':
        await handlePendingPayment(order, transactionId)
        action = 'payment_pending'
        break

      case 'VOIDED':
        await handleVoidedPayment(order, transactionId)
        action = 'payment_declined'
        break

      default:
        console.log(`[WEBHOOK-${gateway.name}] Unknown status: ${status}`)
        action = 'ignored'
    }

    // 6. Marcar evento como procesado
    await markEventProcessed(gateway.name, eventKey)

    console.log(`[WEBHOOK-${gateway.name}] Processed: ${action} for order ${order.id}`)

    return {
      processed: true,
      action,
      orderId: order.id,
    }
  } catch (error: any) {
    console.error(`[WEBHOOK-${gateway.name}] Processing error:`, error)
    return {
      processed: false,
      error: error.message || 'Internal processing error',
    }
  }
}

/**
 * Busca la orden asociada al webhook
 */
async function findOrderForWebhook(
  transactionId: string,
  reference?: string
): Promise<OrderWithUser | null> {
  // Primero buscar por transactionId
  let order = await prisma.order.findFirst({
    where: { transactionId },
    include: { user: true },
  })

  // Si no se encuentra, buscar por orderNumber (reference)
  if (!order && reference) {
    order = await prisma.order.findFirst({
      where: { orderNumber: reference },
      include: { user: true },
    })
  }

  return order as OrderWithUser | null
}

/**
 * Maneja un pago aprobado
 */
async function handleApprovedPayment(
  order: OrderWithUser,
  transactionId: string
): Promise<void> {
  // Actualizar estado de la orden
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'COMPLETED',
      transactionId,
      paidAt: new Date(),
    },
  })

  // Procesar pago (crear entitlements, enviar emails, etc.)
  const result = await processApprovedPayment(order, { transactionId })

  if (!result.success) {
    console.error(`[WEBHOOK] Error processing approved payment:`, result.error)
    // No lanzar error para evitar reintentos del webhook
  }
}

/**
 * Maneja un pago rechazado
 */
async function handleDeclinedPayment(
  order: OrderWithUser,
  transactionId: string,
  rawData?: any
): Promise<void> {
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'FAILED',
      transactionId,
      metadata: {
        ...(order.metadata as object || {}),
        declinedAt: new Date().toISOString(),
        declineReason: rawData?.reason || rawData?.error || 'Unknown',
      },
    },
  })
}

/**
 * Maneja un pago pendiente
 */
async function handlePendingPayment(
  order: OrderWithUser,
  transactionId: string
): Promise<void> {
  // Solo actualizar si no está ya completado
  if (order.paymentStatus !== 'COMPLETED') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PENDING',
        transactionId,
      },
    })
  }
}

/**
 * Maneja un pago anulado
 */
async function handleVoidedPayment(
  order: OrderWithUser,
  transactionId: string
): Promise<void> {
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'REFUNDED',
      transactionId,
      metadata: {
        ...(order.metadata as object || {}),
        voidedAt: new Date().toISOString(),
      },
    },
  })
}

/**
 * Marca un evento de webhook como procesado
 */
async function markEventProcessed(provider: string, eventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: {
      provider_eventId: {
        provider,
        eventId,
      },
    },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  })
}
```

### Paso 2: Simplificar webhook de Wompi

`app/api/webhooks/wompi/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/payments/webhook-processor'
import { WompiAdapter } from '@/lib/payments/adapters/wompi-adapter'

const wompiGateway = new WompiAdapter()

export async function POST(request: NextRequest) {
  // Obtener body crudo para verificación de firma
  const rawBody = await request.text()

  // Crear nuevo request con el body
  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  })

  const result = await processWebhook({
    gateway: wompiGateway,
    request: clonedRequest,
    rawBody,
  })

  if (!result.processed && !result.alreadyProcessed) {
    console.error('[WEBHOOK-WOMPI] Failed to process:', result.error)
    // Devolver 200 para evitar reintentos excesivos
    // (los errores se registran en logs)
  }

  return NextResponse.json({
    received: true,
    processed: result.processed,
    action: result.action,
  })
}
```

### Paso 3: Simplificar webhook de ePayco

`app/api/webhooks/epayco/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/payments/webhook-processor'
import { EpaycoAdapter } from '@/lib/payments/adapters/epayco-adapter'

const epaycoGateway = new EpaycoAdapter()

export async function POST(request: NextRequest) {
  const result = await processWebhook({
    gateway: epaycoGateway,
    request,
  })

  if (!result.processed && !result.alreadyProcessed) {
    console.error('[WEBHOOK-EPAYCO] Failed to process:', result.error)
  }

  // ePayco espera respuesta específica
  return new NextResponse('OK', { status: 200 })
}

// ePayco también puede enviar GET
export async function GET(request: NextRequest) {
  return POST(request)
}
```

### Paso 4: Simplificar webhook de Stripe

`app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/payments/webhook-processor'
import { StripeAdapter } from '@/lib/payments/adapters/stripe-adapter'

const stripeGateway = new StripeAdapter()

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  })

  const result = await processWebhook({
    gateway: stripeGateway,
    request: clonedRequest,
    rawBody,
  })

  if (!result.processed && !result.alreadyProcessed) {
    console.error('[WEBHOOK-STRIPE] Failed to process:', result.error)
  }

  return NextResponse.json({ received: true })
}
```

### Paso 5: Simplificar webhook de Nequi

`app/api/webhooks/nequi/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/payments/webhook-processor'
import { NequiAdapter } from '@/lib/payments/adapters/nequi-adapter'

const nequiGateway = new NequiAdapter()

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  })

  const result = await processWebhook({
    gateway: nequiGateway,
    request: clonedRequest,
    rawBody,
  })

  if (!result.processed && !result.alreadyProcessed) {
    console.error('[WEBHOOK-NEQUI] Failed to process:', result.error)
  }

  return NextResponse.json({
    success: true,
    message: result.action || 'processed',
  })
}
```

### Paso 6: Verificar modelo WebhookEvent en Prisma

Asegurar que el modelo existe en `prisma/schema.prisma`:

```prisma
model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String
  eventId     String
  eventType   String
  payload     Json
  processed   Boolean  @default(false)
  processedAt DateTime?
  createdAt   DateTime @default(now())

  @@unique([provider, eventId])
  @@index([provider])
  @@index([processed])
}
```

Si no existe, agregar y ejecutar migración:
```bash
npx prisma migrate dev --name add_webhook_events
```

### Paso 7: Verificar que compila
```bash
npm run build
```

### Paso 8: Testing

1. **Test webhook Wompi**:
   - Usar herramienta de testing de Wompi
   - Enviar evento de transacción aprobada
   - Verificar que la orden se actualiza
   - Verificar idempotencia (enviar mismo evento 2 veces)

2. **Test webhook ePayco**:
   - Similar a Wompi

3. **Test webhook rechazado**:
   - Enviar evento de transacción rechazada
   - Verificar que la orden se marca como FAILED

4. **Test idempotencia**:
   - Enviar el mismo webhook 3 veces
   - Verificar que solo se procesa 1 vez
   - Verificar que no hay errores en las duplicadas

## Archivos a Crear
- ✅ `lib/payments/webhook-processor.ts`

## Archivos a Modificar
- 📝 `app/api/webhooks/wompi/route.ts`
- 📝 `app/api/webhooks/epayco/route.ts`
- 📝 `app/api/webhooks/stripe/route.ts`
- 📝 `app/api/webhooks/nequi/route.ts`
- 📝 `prisma/schema.prisma` (si WebhookEvent no existe)

## Criterios de Éxito
- [x] Procesador unificado funcional
- [x] Todos los webhooks usan el procesador (Wompi, ePayco, Nequi para pagos únicos)
- [x] Idempotencia funciona correctamente
- [x] Pagos aprobados crean entitlements
- [x] Pagos rechazados actualizan estado
- [x] Build completa sin errores

## Notas de Implementación

### Estado Final (2026-01-20)

El sistema de webhooks ya estaba parcialmente unificado:
- `lib/payments/webhook-processor.ts` - Procesador unificado existente
- `lib/payments/types.ts` - Tipos compartidos
- `lib/payments/gateway-selector.ts` - Selector de pasarelas

**Webhooks actualizados:**
1. **Wompi** (`app/api/webhooks/wompi/route.ts`) - Ya usaba procesador unificado
2. **ePayco** (`app/api/webhooks/epayco/route.ts`) - Ya usaba procesador unificado
3. **Nequi** (`app/api/webhooks/nequi/route.ts`) - Refactorizado para:
   - Usar procesador unificado para pagos únicos
   - Mantener lógica específica para eventos de suscripción

**Stripe removido:** No existe webhook de Stripe (fue eliminado del sistema)

## Rollback
```bash
git checkout -- app/api/webhooks/
rm lib/payments/webhook-processor.ts
```

## Riesgo
**Alto** - Afecta procesamiento de pagos. Testing exhaustivo requerido.

## Tiempo Estimado
3 horas
