/**
 * Payment Gateway Types
 * Tipos compartidos para todas las pasarelas de pago
 */

// Pasarelas de pago activas
export type PaymentGatewayName = 'wompi' | 'epayco' | 'nequi'

// LEGACY - Solo para datos históricos, no usar para nuevos pagos
export type LegacyPaymentGatewayName = 'stripe'
export type AllPaymentGatewayNames = PaymentGatewayName | LegacyPaymentGatewayName

export type PaymentMethodType =
  | 'CARD' // Tarjeta de crédito/débito
  | 'NEQUI' // Nequi directo
  | 'PSE' // PSE (transferencia bancaria Colombia)
  | 'PAYPAL' // PayPal
  | 'BANK_TRANSFER' // Transferencia bancaria
  | 'CASH' // Efectivo (Efecty, Baloto, etc.)

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
  /** Monto en la unidad principal (pesos para COP, dólares para USD) */
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
  metadata?: Record<string, unknown>
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
  rawData?: unknown
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
  metadata?: Record<string, unknown>
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
