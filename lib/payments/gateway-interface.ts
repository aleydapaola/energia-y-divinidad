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
  abstract verifyWebhook(
    request: Request,
    rawBody?: string
  ): Promise<WebhookVerificationResult>
  abstract getTransactionStatus(transactionId: string): Promise<TransactionStatusResult>

  // Implementación por defecto de refund (no soportado)
  async refund(_params: RefundParams): Promise<RefundResult> {
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
