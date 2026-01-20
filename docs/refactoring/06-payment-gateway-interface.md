# Plan 06: Crear Interfaz Abstracta de Pasarelas de Pago

## Objetivo
Crear una interfaz común para todas las pasarelas de pago (Stripe, Wompi, ePayco, Nequi) que permita unificar el checkout y los webhooks.

## Contexto
Actualmente hay 4 integraciones de pago separadas:
- `lib/stripe.ts`
- `lib/wompi.ts`
- `lib/epayco.ts`
- `lib/nequi.ts`

Cada una tiene su propia estructura y no hay una interfaz común, lo que causa:
- Código duplicado en endpoints de checkout
- Lógica diferente en cada webhook
- Dificultad para agregar nuevas pasarelas

## Prerequisitos
- Este plan debe completarse ANTES de los planes 07 (Unificar Checkout) y 08 (Unificar Webhooks)

## Pasos de Implementación

### Paso 1: Crear estructura de carpetas

```bash
mkdir -p lib/payments/adapters
```

### Paso 2: Crear tipos e interfaz base

Crear `lib/payments/types.ts`:

```typescript
/**
 * Payment Gateway Types
 * Tipos compartidos para todas las pasarelas de pago
 */

export type PaymentGatewayName = 'stripe' | 'wompi' | 'epayco' | 'nequi'
export type PaymentMethodType =
  | 'CARD'           // Tarjeta de crédito/débito
  | 'NEQUI'          // Nequi directo
  | 'PSE'            // PSE (transferencia bancaria Colombia)
  | 'PAYPAL'         // PayPal
  | 'BANK_TRANSFER'  // Transferencia bancaria
  | 'CASH'           // Efectivo (Efecty, Baloto, etc.)

export type TransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'
  | 'EXPIRED'

export type Currency = 'COP' | 'USD' | 'EUR'

export interface CustomerInfo {
  email: string
  name: string
  phone?: string
  documentType?: string
  documentNumber?: string
}

export interface CreatePaymentParams {
  /** Monto en la unidad más pequeña (centavos para USD, pesos para COP) */
  amount: number
  /** Moneda */
  currency: Currency
  /** ID interno de la orden */
  orderId: string
  /** Número de orden visible */
  orderNumber: string
  /** Información del cliente */
  customer: CustomerInfo
  /** Descripción del pago */
  description: string
  /** Método de pago específico */
  paymentMethod?: PaymentMethodType
  /** Metadata adicional */
  metadata?: Record<string, any>
  /** URL de retorno después del pago */
  returnUrl: string
  /** URL para webhooks (si la pasarela lo requiere) */
  webhookUrl?: string
}

export interface CreatePaymentResult {
  success: boolean
  /** URL para redirigir al usuario (checkout hosted) */
  redirectUrl?: string
  /** ID de transacción de la pasarela */
  transactionId?: string
  /** Referencia de pago */
  reference?: string
  /** Si el pago fue procesado inmediatamente */
  processedImmediately?: boolean
  /** Estado inicial */
  status?: TransactionStatus
  /** Error si falló */
  error?: string
  errorCode?: string
}

export interface WebhookVerificationResult {
  /** Si la firma del webhook es válida */
  valid: boolean
  /** Tipo de evento (transaction.updated, payment.success, etc.) */
  eventType?: string
  /** ID de la transacción */
  transactionId?: string
  /** Estado de la transacción */
  status?: TransactionStatus
  /** Referencia/ID de orden */
  reference?: string
  /** Monto */
  amount?: number
  /** Moneda */
  currency?: Currency
  /** Datos crudos del webhook */
  rawData?: any
  /** Error si la verificación falló */
  error?: string
}

export interface TransactionStatusResult {
  success: boolean
  status?: TransactionStatus
  transactionId?: string
  amount?: number
  currency?: Currency
  paidAt?: Date
  metadata?: Record<string, any>
  error?: string
}

export interface RefundParams {
  transactionId: string
  amount?: number // Partial refund if specified
  reason?: string
}

export interface RefundResult {
  success: boolean
  refundId?: string
  status?: 'PENDING' | 'COMPLETED' | 'FAILED'
  error?: string
}
```

### Paso 3: Crear interfaz de gateway

Crear `lib/payments/gateway-interface.ts`:

```typescript
/**
 * Payment Gateway Interface
 * Interfaz abstracta que todas las pasarelas deben implementar
 */

import {
  PaymentGatewayName,
  PaymentMethodType,
  Currency,
  CreatePaymentParams,
  CreatePaymentResult,
  WebhookVerificationResult,
  TransactionStatusResult,
  RefundParams,
  RefundResult,
} from './types'

export interface PaymentGateway {
  /** Nombre identificador de la pasarela */
  readonly name: PaymentGatewayName

  /** Monedas soportadas */
  readonly supportedCurrencies: Currency[]

  /** Métodos de pago soportados */
  readonly supportedMethods: PaymentMethodType[]

  /** Si la pasarela está configurada correctamente */
  isConfigured(): boolean

  /**
   * Crea un nuevo pago/transacción
   * @returns URL de redirección o resultado del pago
   */
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>

  /**
   * Verifica y parsea un webhook entrante
   * @param request - Request HTTP del webhook
   * @param rawBody - Body crudo para verificación de firma
   */
  verifyWebhook(
    request: Request,
    rawBody?: string
  ): Promise<WebhookVerificationResult>

  /**
   * Consulta el estado de una transacción
   * @param transactionId - ID de la transacción en la pasarela
   */
  getTransactionStatus(transactionId: string): Promise<TransactionStatusResult>

  /**
   * Procesa un reembolso
   * @param params - Parámetros del reembolso
   */
  refund?(params: RefundParams): Promise<RefundResult>
}

/**
 * Clase base con implementaciones por defecto
 */
export abstract class BasePaymentGateway implements PaymentGateway {
  abstract readonly name: PaymentGatewayName
  abstract readonly supportedCurrencies: Currency[]
  abstract readonly supportedMethods: PaymentMethodType[]

  abstract isConfigured(): boolean
  abstract createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  abstract verifyWebhook(request: Request, rawBody?: string): Promise<WebhookVerificationResult>
  abstract getTransactionStatus(transactionId: string): Promise<TransactionStatusResult>

  // Implementación por defecto de refund (no soportado)
  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      success: false,
      error: `Refunds not supported by ${this.name}`,
    }
  }

  /**
   * Helper para validar que la pasarela está configurada
   */
  protected assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(`Payment gateway ${this.name} is not properly configured`)
    }
  }

  /**
   * Helper para validar moneda soportada
   */
  protected validateCurrency(currency: Currency): void {
    if (!this.supportedCurrencies.includes(currency)) {
      throw new Error(
        `Currency ${currency} not supported by ${this.name}. ` +
        `Supported: ${this.supportedCurrencies.join(', ')}`
      )
    }
  }

  /**
   * Helper para validar método de pago soportado
   */
  protected validatePaymentMethod(method?: PaymentMethodType): void {
    if (method && !this.supportedMethods.includes(method)) {
      throw new Error(
        `Payment method ${method} not supported by ${this.name}. ` +
        `Supported: ${this.supportedMethods.join(', ')}`
      )
    }
  }
}
```

### Paso 4: Crear adaptador de Wompi

Crear `lib/payments/adapters/wompi-adapter.ts`:

```typescript
/**
 * Wompi Payment Gateway Adapter
 */

import { BasePaymentGateway } from '../gateway-interface'
import {
  PaymentGatewayName,
  PaymentMethodType,
  Currency,
  CreatePaymentParams,
  CreatePaymentResult,
  WebhookVerificationResult,
  TransactionStatusResult,
  TransactionStatus,
} from '../types'
import {
  WOMPI_CONFIG,
  createWompiPaymentLink,
  verifyWompiWebhookSignature,
  getWompiTransaction,
  mapWompiStatus,
} from '@/lib/wompi'

export class WompiAdapter extends BasePaymentGateway {
  readonly name: PaymentGatewayName = 'wompi'
  readonly supportedCurrencies: Currency[] = ['COP']
  readonly supportedMethods: PaymentMethodType[] = ['CARD', 'NEQUI', 'PSE', 'BANK_TRANSFER']

  isConfigured(): boolean {
    return !!(
      WOMPI_CONFIG.publicKey &&
      WOMPI_CONFIG.privateKey &&
      WOMPI_CONFIG.integritySecret
    )
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    this.assertConfigured()
    this.validateCurrency(params.currency)

    try {
      const result = await createWompiPaymentLink({
        amountInCents: params.amount * 100, // Wompi usa centavos
        currency: params.currency,
        customerEmail: params.customer.email,
        reference: params.orderNumber,
        redirectUrl: params.returnUrl,
        description: params.description,
        metadata: {
          orderId: params.orderId,
          ...params.metadata,
        },
      })

      return {
        success: true,
        redirectUrl: result.paymentUrl,
        transactionId: result.transactionId,
        reference: params.orderNumber,
      }
    } catch (error: any) {
      console.error('[WOMPI-ADAPTER] Error creating payment:', error)
      return {
        success: false,
        error: error.message,
        errorCode: 'WOMPI_CREATE_ERROR',
      }
    }
  }

  async verifyWebhook(request: Request, rawBody?: string): Promise<WebhookVerificationResult> {
    try {
      const body = rawBody || await request.text()
      const signature = request.headers.get('x-wompi-signature') || ''
      const timestamp = request.headers.get('x-wompi-timestamp') || ''

      const isValid = verifyWompiWebhookSignature(body, signature, timestamp)
      if (!isValid) {
        return { valid: false, error: 'Invalid signature' }
      }

      const data = JSON.parse(body)
      const transaction = data.data?.transaction || data.transaction

      return {
        valid: true,
        eventType: data.event || 'transaction.updated',
        transactionId: transaction?.id,
        status: this.mapStatus(transaction?.status),
        reference: transaction?.reference,
        amount: transaction?.amount_in_cents ? transaction.amount_in_cents / 100 : undefined,
        currency: transaction?.currency as Currency,
        rawData: data,
      }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResult> {
    this.assertConfigured()

    try {
      const transaction = await getWompiTransaction(transactionId)

      return {
        success: true,
        status: this.mapStatus(transaction.status),
        transactionId: transaction.id,
        amount: transaction.amount_in_cents / 100,
        currency: transaction.currency as Currency,
        paidAt: transaction.finalized_at ? new Date(transaction.finalized_at) : undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private mapStatus(wompiStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      APPROVED: 'APPROVED',
      DECLINED: 'DECLINED',
      VOIDED: 'VOIDED',
      PENDING: 'PENDING',
      ERROR: 'ERROR',
    }
    return statusMap[wompiStatus] || 'PENDING'
  }
}
```

### Paso 5: Crear adaptador de ePayco

Crear `lib/payments/adapters/epayco-adapter.ts`:

```typescript
/**
 * ePayco Payment Gateway Adapter
 */

import { BasePaymentGateway } from '../gateway-interface'
import {
  PaymentGatewayName,
  PaymentMethodType,
  Currency,
  CreatePaymentParams,
  CreatePaymentResult,
  WebhookVerificationResult,
  TransactionStatusResult,
  TransactionStatus,
} from '../types'
import {
  EPAYCO_CONFIG,
  createEpaycoCheckout,
  verifyEpaycoSignature,
  getEpaycoTransaction,
} from '@/lib/epayco'

export class EpaycoAdapter extends BasePaymentGateway {
  readonly name: PaymentGatewayName = 'epayco'
  readonly supportedCurrencies: Currency[] = ['COP', 'USD']
  readonly supportedMethods: PaymentMethodType[] = ['CARD', 'PAYPAL', 'PSE', 'CASH']

  isConfigured(): boolean {
    return !!(
      EPAYCO_CONFIG.publicKey &&
      EPAYCO_CONFIG.privateKey
    )
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    this.assertConfigured()
    this.validateCurrency(params.currency)

    try {
      const result = await createEpaycoCheckout({
        amount: params.amount,
        currency: params.currency,
        name: params.description,
        description: params.description,
        invoice: params.orderNumber,
        email: params.customer.email,
        name_billing: params.customer.name,
        response: params.returnUrl,
        confirmation: params.webhookUrl,
        extra1: params.orderId,
        extra2: JSON.stringify(params.metadata || {}),
      })

      return {
        success: true,
        redirectUrl: result.checkoutUrl,
        reference: params.orderNumber,
      }
    } catch (error: any) {
      console.error('[EPAYCO-ADAPTER] Error creating payment:', error)
      return {
        success: false,
        error: error.message,
        errorCode: 'EPAYCO_CREATE_ERROR',
      }
    }
  }

  async verifyWebhook(request: Request): Promise<WebhookVerificationResult> {
    try {
      const formData = await request.formData()
      const data = Object.fromEntries(formData.entries())

      // ePayco envía firma en x_signature
      const signature = data.x_signature as string
      const isValid = verifyEpaycoSignature(data, signature)

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' }
      }

      return {
        valid: true,
        eventType: 'payment.notification',
        transactionId: data.x_ref_payco as string,
        status: this.mapStatus(data.x_cod_response as string),
        reference: data.x_id_invoice as string,
        amount: parseFloat(data.x_amount as string),
        currency: data.x_currency_code as Currency,
        rawData: data,
      }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResult> {
    this.assertConfigured()

    try {
      const transaction = await getEpaycoTransaction(transactionId)

      return {
        success: true,
        status: this.mapStatus(transaction.x_cod_response),
        transactionId: transaction.x_ref_payco,
        amount: parseFloat(transaction.x_amount),
        currency: transaction.x_currency_code as Currency,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private mapStatus(codResponse: string): TransactionStatus {
    // ePayco usa códigos numéricos
    const statusMap: Record<string, TransactionStatus> = {
      '1': 'APPROVED',
      '2': 'DECLINED',
      '3': 'PENDING',
      '4': 'ERROR',
      '6': 'DECLINED', // Reversada
      '7': 'PENDING',  // Retenida
      '10': 'DECLINED', // Rechazada
    }
    return statusMap[codResponse] || 'PENDING'
  }
}
```

### Paso 6: Crear adaptadores de Stripe y Nequi

Similar a los anteriores. Crear:
- `lib/payments/adapters/stripe-adapter.ts`
- `lib/payments/adapters/nequi-adapter.ts`

### Paso 7: Crear selector de gateway

Crear `lib/payments/gateway-selector.ts`:

```typescript
/**
 * Payment Gateway Selector
 * Selecciona la pasarela apropiada según método de pago y región
 */

import { PaymentGateway } from './gateway-interface'
import { PaymentMethodType, Currency } from './types'
import { WompiAdapter } from './adapters/wompi-adapter'
import { EpaycoAdapter } from './adapters/epayco-adapter'
import { StripeAdapter } from './adapters/stripe-adapter'
import { NequiAdapter } from './adapters/nequi-adapter'

// Instancias singleton de cada adaptador
const gateways = {
  wompi: new WompiAdapter(),
  epayco: new EpaycoAdapter(),
  stripe: new StripeAdapter(),
  nequi: new NequiAdapter(),
}

export type GatewayName = keyof typeof gateways

/**
 * Obtiene un gateway por nombre
 */
export function getGateway(name: GatewayName): PaymentGateway {
  const gateway = gateways[name]
  if (!gateway) {
    throw new Error(`Unknown payment gateway: ${name}`)
  }
  return gateway
}

/**
 * Selecciona el gateway apropiado para un método de pago y moneda
 */
export function getGatewayForPayment(
  paymentMethod: PaymentMethodType,
  currency: Currency
): PaymentGateway {
  // Reglas de selección según CLAUDE.md

  // Nequi directo → Nequi API (solo COP)
  if (paymentMethod === 'NEQUI' && currency === 'COP') {
    if (gateways.nequi.isConfigured()) {
      return gateways.nequi
    }
    // Fallback a Wompi si Nequi no está configurado
    return gateways.wompi
  }

  // Tarjetas colombianas → Wompi (solo COP)
  if (paymentMethod === 'CARD' && currency === 'COP') {
    return gateways.wompi
  }

  // PSE → Wompi o ePayco (solo COP)
  if (paymentMethod === 'PSE' && currency === 'COP') {
    return gateways.wompi
  }

  // PayPal → ePayco (COP o USD)
  if (paymentMethod === 'PAYPAL') {
    return gateways.epayco
  }

  // Tarjetas internacionales → ePayco (USD)
  if (paymentMethod === 'CARD' && currency === 'USD') {
    return gateways.epayco
  }

  // Stripe como fallback para USD (si está configurado)
  if (currency === 'USD' && gateways.stripe.isConfigured()) {
    return gateways.stripe
  }

  // Default a ePayco para internacional
  return gateways.epayco
}

/**
 * Obtiene los métodos de pago disponibles para una moneda
 */
export function getAvailablePaymentMethods(currency: Currency): {
  method: PaymentMethodType
  gateway: GatewayName
  label: string
}[] {
  const methods: { method: PaymentMethodType; gateway: GatewayName; label: string }[] = []

  if (currency === 'COP') {
    methods.push(
      { method: 'CARD', gateway: 'wompi', label: 'Tarjeta de Crédito/Débito' },
      { method: 'NEQUI', gateway: gateways.nequi.isConfigured() ? 'nequi' : 'wompi', label: 'Nequi' },
      { method: 'PSE', gateway: 'wompi', label: 'PSE (Transferencia)' },
      { method: 'PAYPAL', gateway: 'epayco', label: 'PayPal' },
    )
  } else if (currency === 'USD') {
    methods.push(
      { method: 'CARD', gateway: 'epayco', label: 'Credit/Debit Card' },
      { method: 'PAYPAL', gateway: 'epayco', label: 'PayPal' },
    )
  }

  return methods
}
```

### Paso 8: Crear archivo index

Crear `lib/payments/index.ts`:

```typescript
/**
 * Payment Gateway Module
 * Exports públicos del módulo de pagos
 */

export * from './types'
export * from './gateway-interface'
export * from './gateway-selector'

// Re-export adapters for direct access if needed
export { WompiAdapter } from './adapters/wompi-adapter'
export { EpaycoAdapter } from './adapters/epayco-adapter'
export { StripeAdapter } from './adapters/stripe-adapter'
export { NequiAdapter } from './adapters/nequi-adapter'
```

### Paso 9: Verificar que compila
```bash
npm run build
```

### Paso 10: Testing básico

Crear tests unitarios básicos para cada adaptador:

```typescript
// __tests__/payments/gateway-selector.test.ts
import { getGatewayForPayment } from '@/lib/payments'

describe('Gateway Selector', () => {
  it('selects Wompi for Colombian cards', () => {
    const gateway = getGatewayForPayment('CARD', 'COP')
    expect(gateway.name).toBe('wompi')
  })

  it('selects ePayco for PayPal', () => {
    const gateway = getGatewayForPayment('PAYPAL', 'COP')
    expect(gateway.name).toBe('epayco')
  })

  it('selects ePayco for international cards', () => {
    const gateway = getGatewayForPayment('CARD', 'USD')
    expect(gateway.name).toBe('epayco')
  })
})
```

## Archivos a Crear
- ✅ `lib/payments/types.ts`
- ✅ `lib/payments/gateway-interface.ts`
- ✅ `lib/payments/gateway-selector.ts`
- ✅ `lib/payments/index.ts`
- ✅ `lib/payments/adapters/wompi-adapter.ts`
- ✅ `lib/payments/adapters/epayco-adapter.ts`
- ✅ `lib/payments/adapters/stripe-adapter.ts`
- ✅ `lib/payments/adapters/nequi-adapter.ts`

## Archivos que NO se modifican (aún)
- `lib/wompi.ts` - Se mantiene, el adaptador lo usa
- `lib/epayco.ts` - Se mantiene, el adaptador lo usa
- `lib/stripe.ts` - Se mantiene, el adaptador lo usa
- `lib/nequi.ts` - Se mantiene, el adaptador lo usa
- Endpoints de checkout - Se modificarán en Plan 07
- Webhooks - Se modificarán en Plan 08

## Criterios de Éxito
- [ ] Todos los archivos creados
- [ ] Cada adaptador implementa la interfaz correctamente
- [ ] `getGatewayForPayment` selecciona el gateway correcto
- [ ] `npm run build` completa sin errores
- [ ] Tests unitarios pasan

## Rollback
```bash
rm -rf lib/payments/
```

## Riesgo
**Medio** - Es código nuevo que no afecta el existente todavía.

## Tiempo Estimado
4 horas

## Siguiente Paso
Una vez completado este plan, proceder con:
- Plan 07: Unificar Checkout
- Plan 08: Unificar Webhooks
