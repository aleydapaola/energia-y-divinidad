# Plan 07: Unificar Endpoints de Checkout

## Objetivo
Consolidar los 3 endpoints de checkout separados en uno solo que use la interfaz de pasarelas de pago.

## Prerequisitos
- ✅ Plan 06 completado (Interfaz de pasarelas de pago)

## Contexto
Actualmente existen 3 endpoints casi idénticos:
- `app/api/checkout/wompi/route.ts`
- `app/api/checkout/epayco/route.ts`
- `app/api/checkout/stripe/route.ts`

Todos hacen lo mismo:
1. Validar autenticación (opcional para guest checkout)
2. Validar datos del request
3. Crear orden en la base de datos
4. Llamar a la pasarela de pago
5. Devolver URL de redirección

## Análisis Previo Requerido

```bash
# Leer los archivos actuales para entender diferencias específicas
cat app/api/checkout/wompi/route.ts
cat app/api/checkout/epayco/route.ts
cat app/api/checkout/stripe/route.ts
```

## Pasos de Implementación

### Paso 1: Crear validador de checkout

Crear `lib/checkout/validation.ts`:

```typescript
/**
 * Checkout Validation
 * Validaciones comunes para todos los checkouts
 */

import { z } from 'zod'

export const checkoutSchema = z.object({
  // Producto
  productType: z.enum(['SESSION', 'EVENT', 'MEMBERSHIP', 'COURSE', 'PRODUCT', 'PREMIUM_CONTENT']),
  productId: z.string().min(1),
  productName: z.string().min(1),

  // Precio
  amount: z.number().positive(),
  currency: z.enum(['COP', 'USD']),

  // Método de pago
  paymentMethod: z.enum(['CARD', 'NEQUI', 'PSE', 'PAYPAL', 'BANK_TRANSFER', 'CASH']),

  // Cliente (requerido para guest checkout)
  customerEmail: z.string().email().optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),

  // Datos específicos según tipo
  scheduledAt: z.string().datetime().optional(), // Para sesiones/eventos
  seats: z.number().int().positive().optional(), // Para eventos
  billingInterval: z.enum(['monthly', 'yearly']).optional(), // Para membresías

  // Descuentos
  discountCode: z.string().optional(),

  // Metadata adicional
  metadata: z.record(z.any()).optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

export interface CheckoutValidationResult {
  valid: boolean
  data?: CheckoutInput
  errors?: { field: string; message: string }[]
}

export function validateCheckoutRequest(body: unknown): CheckoutValidationResult {
  const result = checkoutSchema.safeParse(body)

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }
  }

  return {
    valid: true,
    data: result.data,
  }
}

/**
 * Validaciones adicionales según tipo de producto
 */
export function validateProductSpecificRequirements(data: CheckoutInput): string | null {
  switch (data.productType) {
    case 'SESSION':
      if (!data.scheduledAt && !data.metadata?.isPack) {
        return 'Las sesiones individuales requieren fecha programada'
      }
      break

    case 'EVENT':
      if (!data.seats || data.seats < 1) {
        return 'Debe especificar al menos 1 asiento'
      }
      break

    case 'MEMBERSHIP':
      if (!data.billingInterval) {
        return 'Debe especificar el intervalo de facturación'
      }
      break
  }

  return null
}
```

### Paso 2: Crear servicio de checkout

Crear `lib/checkout/checkout-service.ts`:

```typescript
/**
 * Checkout Service
 * Servicio centralizado para procesar checkouts
 */

import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/order-utils'
import { getGatewayForPayment, PaymentGateway, CreatePaymentParams } from '@/lib/payments'
import { validateDiscountCode, calculateDiscount } from '@/lib/discount-codes'
import { CheckoutInput } from './validation'

export interface CheckoutOptions {
  /** Datos validados del checkout */
  data: CheckoutInput
  /** ID del usuario autenticado (null para guest) */
  userId: string | null
  /** IP del cliente */
  clientIP: string
  /** URL base para retorno */
  baseUrl: string
}

export interface CheckoutResult {
  success: boolean
  /** URL para redirigir al usuario */
  redirectUrl?: string
  /** Orden creada */
  order?: {
    id: string
    orderNumber: string
  }
  /** Error si falló */
  error?: string
  errorCode?: 'VALIDATION' | 'DUPLICATE' | 'DISCOUNT_INVALID' | 'GATEWAY_ERROR' | 'INTERNAL'
}

/**
 * Procesa un checkout completo
 */
export async function processCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  const { data, userId, clientIP, baseUrl } = options

  try {
    // 1. Verificar duplicados para membresías
    if (data.productType === 'MEMBERSHIP' && userId) {
      const existingMembership = await checkExistingMembership(userId, data.productId)
      if (existingMembership) {
        return {
          success: false,
          error: 'Ya tienes una membresía activa de este nivel',
          errorCode: 'DUPLICATE',
        }
      }
    }

    // 2. Procesar código de descuento si existe
    let finalAmount = data.amount
    let discountInfo: { id: string; code: string; amount: number } | null = null

    if (data.discountCode) {
      const discountResult = await validateDiscountCode(data.discountCode, {
        productType: data.productType,
        productId: data.productId,
        userId,
        amount: data.amount,
      })

      if (discountResult.valid) {
        discountInfo = {
          id: discountResult.discountCodeId!,
          code: data.discountCode,
          amount: discountResult.discountAmount!,
        }
        finalAmount = data.amount - discountResult.discountAmount!
      }
    }

    // 3. Determinar prefijo de orden según tipo
    const prefixMap: Record<string, 'ORD' | 'EVT' | 'MEM' | 'CRS'> = {
      SESSION: 'ORD',
      EVENT: 'EVT',
      MEMBERSHIP: 'MEM',
      COURSE: 'CRS',
      PRODUCT: 'ORD',
      PREMIUM_CONTENT: 'ORD',
    }
    const orderNumber = generateOrderNumber(prefixMap[data.productType] || 'ORD')

    // 4. Crear orden en base de datos
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        guestEmail: !userId ? data.customerEmail : null,
        guestName: !userId ? data.customerName : null,
        orderType: data.productType,
        itemId: data.productId,
        itemName: data.productName,
        amount: finalAmount,
        currency: data.currency,
        paymentMethod: `${getGatewayForPayment(data.paymentMethod as any, data.currency).name.toUpperCase()}_${data.paymentMethod}`,
        paymentStatus: 'PENDING',
        discountCodeId: discountInfo?.id,
        discountCode: discountInfo?.code,
        discountAmount: discountInfo?.amount,
        metadata: {
          originalAmount: data.amount,
          scheduledAt: data.scheduledAt,
          seats: data.seats,
          billingInterval: data.billingInterval,
          isGuestCheckout: !userId,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          clientIP,
          ...data.metadata,
        },
      },
    })

    // 5. Seleccionar gateway y crear pago
    const gateway = getGatewayForPayment(data.paymentMethod as any, data.currency)

    const paymentParams: CreatePaymentParams = {
      amount: finalAmount,
      currency: data.currency,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customer: {
        email: data.customerEmail || '',
        name: data.customerName || '',
        phone: data.customerPhone,
      },
      description: `${data.productName} - ${order.orderNumber}`,
      paymentMethod: data.paymentMethod as any,
      metadata: {
        productType: data.productType,
        productId: data.productId,
      },
      returnUrl: `${baseUrl}/pago/confirmacion?order=${order.orderNumber}`,
      webhookUrl: `${baseUrl}/api/webhooks/${gateway.name}`,
    }

    const paymentResult = await gateway.createPayment(paymentParams)

    if (!paymentResult.success) {
      // Marcar orden como fallida
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          metadata: {
            ...(order.metadata as object),
            gatewayError: paymentResult.error,
          },
        },
      })

      return {
        success: false,
        error: paymentResult.error || 'Error al crear el pago',
        errorCode: 'GATEWAY_ERROR',
      }
    }

    // 6. Actualizar orden con ID de transacción
    await prisma.order.update({
      where: { id: order.id },
      data: {
        transactionId: paymentResult.transactionId,
        metadata: {
          ...(order.metadata as object),
          gatewayReference: paymentResult.reference,
        },
      },
    })

    return {
      success: true,
      redirectUrl: paymentResult.redirectUrl,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
    }
  } catch (error: any) {
    console.error('[CHECKOUT] Error:', error)
    return {
      success: false,
      error: error.message || 'Error interno del servidor',
      errorCode: 'INTERNAL',
    }
  }
}

/**
 * Verifica si el usuario ya tiene una membresía activa del mismo nivel
 */
async function checkExistingMembership(userId: string, tierId: string): Promise<boolean> {
  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      membershipTierId: tierId,
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
  })
  return !!existing
}
```

### Paso 3: Crear endpoint unificado

Crear `app/api/checkout/route.ts`:

```typescript
/**
 * Unified Checkout Endpoint
 * Endpoint único para todos los métodos de pago
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { validateCheckoutRequest, validateProductSpecificRequirements } from '@/lib/checkout/validation'
import { processCheckout } from '@/lib/checkout/checkout-service'
import { applyRateLimit, getClientIP } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = applyRateLimit(request, { maxRequests: 10, windowMs: 60_000 })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Autenticación (opcional para guest checkout)
    const session = await auth()
    const userId = session?.user?.id || null

    // Parsear y validar body
    const body = await request.json()
    const validation = validateCheckoutRequest(body)

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Validaciones específicas por producto
    const productError = validateProductSpecificRequirements(validation.data!)
    if (productError) {
      return NextResponse.json(
        { error: productError },
        { status: 400 }
      )
    }

    // Requerir datos de cliente si es guest checkout
    if (!userId) {
      if (!validation.data!.customerEmail || !validation.data!.customerName) {
        return NextResponse.json(
          { error: 'Email y nombre son requeridos para compras sin cuenta' },
          { status: 400 }
        )
      }
    }

    // Procesar checkout
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const clientIP = getClientIP(request)

    const result = await processCheckout({
      data: validation.data!,
      userId,
      clientIP,
      baseUrl,
    })

    if (!result.success) {
      const statusMap = {
        VALIDATION: 400,
        DUPLICATE: 409,
        DISCOUNT_INVALID: 400,
        GATEWAY_ERROR: 502,
        INTERNAL: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      redirectUrl: result.redirectUrl,
      order: result.order,
    })
  } catch (error: any) {
    console.error('[API-CHECKOUT] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### Paso 4: Deprecar endpoints antiguos

Actualizar cada endpoint antiguo para redirigir al nuevo:

`app/api/checkout/wompi/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated Use /api/checkout instead
 */
export async function POST(request: NextRequest) {
  console.warn('[DEPRECATED] /api/checkout/wompi is deprecated. Use /api/checkout')

  // Redirigir al endpoint unificado
  const body = await request.json()
  const newBody = {
    ...body,
    paymentMethod: body.paymentMethod || 'CARD',
  }

  const response = await fetch(new URL('/api/checkout', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(request.headers),
    },
    body: JSON.stringify(newBody),
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

Hacer lo mismo para `epayco` y `stripe`.

### Paso 5: Actualizar componentes del frontend

Buscar componentes que llamen a los endpoints antiguos:

```bash
grep -r "api/checkout/wompi\|api/checkout/epayco\|api/checkout/stripe" --include="*.tsx" --include="*.ts" components/ app/
```

Actualizar para usar el nuevo endpoint `/api/checkout`.

### Paso 6: Actualizar PaymentMethodSelector

Si existe `components/pago/PaymentMethodSelector.tsx`, actualizarlo para usar el endpoint unificado:

```typescript
// Antes
const endpoint = paymentMethod === 'NEQUI' ? '/api/checkout/wompi' : '/api/checkout/epayco'

// Después
const endpoint = '/api/checkout'
const body = { ...checkoutData, paymentMethod }
```

### Paso 7: Verificar que compila
```bash
npm run build
```

### Paso 8: Testing

1. **Checkout con tarjeta colombiana**:
   - Seleccionar tarjeta, moneda COP
   - Verificar que se usa Wompi
   - Verificar redirección correcta

2. **Checkout con PayPal**:
   - Seleccionar PayPal
   - Verificar que se usa ePayco

3. **Checkout internacional**:
   - Moneda USD, tarjeta
   - Verificar que se usa ePayco

4. **Guest checkout**:
   - Sin login
   - Ingresar email y nombre
   - Completar pago

5. **Checkout con descuento**:
   - Aplicar código de descuento
   - Verificar monto correcto

## Archivos a Crear
- ✅ `lib/checkout/validation.ts`
- ✅ `lib/checkout/checkout-service.ts`
- ✅ `app/api/checkout/route.ts`

## Archivos a Modificar
- 📝 `app/api/checkout/wompi/route.ts` - Deprecar, redirigir
- 📝 `app/api/checkout/epayco/route.ts` - Deprecar, redirigir
- 📝 `app/api/checkout/stripe/route.ts` - Deprecar, redirigir
- 📝 `components/pago/PaymentMethodSelector.tsx` - Usar nuevo endpoint

## Criterios de Éxito
- [ ] Endpoint `/api/checkout` funcional
- [ ] Todos los métodos de pago funcionan
- [ ] Guest checkout funciona
- [ ] Códigos de descuento funcionan
- [ ] Endpoints antiguos redirigen correctamente
- [ ] Frontend usa el nuevo endpoint
- [ ] Build completa sin errores

## Rollback
```bash
git checkout -- app/api/checkout/
rm -rf lib/checkout/
```

## Riesgo
**Alto** - Afecta flujo crítico de pagos. Testing exhaustivo requerido.

## Tiempo Estimado
3 horas

## Siguiente Paso
- Plan 08: Unificar Webhooks
