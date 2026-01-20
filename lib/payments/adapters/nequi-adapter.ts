/**
 * Nequi Payment Gateway Adapter
 *
 * Nequi es una billetera digital muy popular en Colombia.
 * Usa notificaciones push para que el usuario apruebe el pago en su app.
 *
 * Modos:
 * - "app": Pago manual (el usuario transfiere desde la app)
 * - "push": Pago automático via Push Notification de Nequi API
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
  getNequiMode,
  isNequiPushConfigured,
  createNequiPushPayment,
  checkNequiPaymentStatus,
  verifyNequiWebhookSignature,
  formatNequiAmount,
  generateTransactionCode,
} from '@/lib/nequi'

export class NequiAdapter extends BasePaymentGateway {
  readonly name: PaymentGatewayName = 'nequi'
  readonly supportedCurrencies: Currency[] = ['COP']
  readonly supportedMethods: PaymentMethodType[] = ['NEQUI']

  isConfigured(): boolean {
    // Solo está configurado si el modo push está activo y tiene credenciales
    return getNequiMode() === 'push' && isNequiPushConfigured()
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    // Si no está configurado, indicar que use Wompi como fallback
    if (!this.isConfigured()) {
      return {
        success: false,
        error:
          'Nequi Push API no está configurado. ' +
          'Los pagos con Nequi se procesan a través de Wompi.',
        errorCode: 'NEQUI_NOT_CONFIGURED',
      }
    }

    this.validateCurrency(params.currency)

    // Validar que hay número de teléfono
    if (!params.customer.phone) {
      return {
        success: false,
        error: 'Se requiere número de teléfono para pagos con Nequi',
        errorCode: 'NEQUI_PHONE_REQUIRED',
      }
    }

    try {
      const transactionCode = generateTransactionCode()
      const amountFormatted = formatNequiAmount(params.amount)

      const result = await createNequiPushPayment({
        phoneNumber: params.customer.phone,
        code: transactionCode,
        value: amountFormatted,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Error al crear pago Nequi',
          errorCode: 'NEQUI_CREATE_ERROR',
        }
      }

      return {
        success: true,
        transactionId: result.transactionId,
        reference: transactionCode,
        status: 'PENDING',
        processedImmediately: false,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[NEQUI-ADAPTER] Error creating payment:', error)
      return {
        success: false,
        error: errorMessage,
        errorCode: 'NEQUI_CREATE_ERROR',
      }
    }
  }

  async verifyWebhook(
    request: Request,
    rawBody?: string
  ): Promise<WebhookVerificationResult> {
    try {
      const body = rawBody || (await request.text())
      const signature = request.headers.get('x-nequi-signature') || ''

      const isValid = verifyNequiWebhookSignature(body, signature)
      if (!isValid) {
        return { valid: false, error: 'Invalid signature' }
      }

      const data = JSON.parse(body)

      // Nequi envía estructura específica según el tipo de evento
      const responseBody = data.ResponseMessage?.ResponseBody?.any
      const paymentStatus = responseBody?.getStatusPaymentRS?.status

      // Extraer referencia del pago (orderNumber)
      const reference =
        data.reference ||
        data.orderNumber ||
        responseBody?.reference ||
        responseBody?.messageId

      return {
        valid: true,
        eventType: data.eventType || 'payment.status',
        transactionId: data.transactionId || responseBody?.transactionId,
        status: this.mapStatus(paymentStatus),
        reference,
        rawData: data,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return { valid: false, error: errorMessage }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Nequi Push API no está configurado',
      }
    }

    try {
      const result = await checkNequiPaymentStatus(transactionId)

      return {
        success: result.success,
        status: this.mapStatus(result.status),
        transactionId,
        error: result.error,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  private mapStatus(nequiStatus?: string): TransactionStatus {
    // Nequi usa códigos numéricos para el estado
    const statusMap: Record<string, TransactionStatus> = {
      '35': 'APPROVED', // Pago exitoso
      '36': 'PENDING', // Pago pendiente
      '37': 'DECLINED', // Pago rechazado
      '38': 'EXPIRED', // Pago expirado
      '39': 'VOIDED', // Pago cancelado
    }
    return statusMap[nequiStatus || ''] || 'PENDING'
  }
}
