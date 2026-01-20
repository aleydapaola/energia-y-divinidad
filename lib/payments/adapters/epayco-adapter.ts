/**
 * ePayco Payment Gateway Adapter
 *
 * ePayco es una pasarela de pagos colombiana que soporta múltiples monedas.
 * Ideal para pagos internacionales (USD) y PayPal.
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
  createEpaycoCheckoutUrl,
  verifyEpaycoWebhookSignature,
  getEpaycoTransaction,
  type EpaycoWebhookPayload,
} from '@/lib/epayco'

export class EpaycoAdapter extends BasePaymentGateway {
  readonly name: PaymentGatewayName = 'epayco'
  readonly supportedCurrencies: Currency[] = ['COP', 'USD']
  readonly supportedMethods: PaymentMethodType[] = ['CARD', 'PAYPAL', 'PSE', 'CASH']

  isConfigured(): boolean {
    return !!(EPAYCO_CONFIG.publicKey && EPAYCO_CONFIG.privateKey)
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    this.assertConfigured()
    this.validateCurrency(params.currency)

    try {
      // Separar nombre y apellido (ePayco los requiere separados)
      const nameParts = params.customer.name.split(' ')
      const firstName = nameParts[0] || 'Cliente'
      const lastName = nameParts.slice(1).join(' ') || 'N/A'

      const result = await createEpaycoCheckoutUrl({
        amount: params.amount,
        amountBase: params.amount,
        tax: 0,
        currency: params.currency as 'COP' | 'USD',
        description: params.description,
        name: firstName,
        lastName: lastName,
        email: params.customer.email,
        phone: params.customer.phone,
        invoice: params.orderNumber,
        urlResponse: params.returnUrl,
        urlConfirmation: params.webhookUrl || params.returnUrl,
        methodConfirmation: 'POST',
        extra1: params.orderId,
        extra2: JSON.stringify(params.metadata || {}),
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Error creando checkout ePayco',
          errorCode: 'EPAYCO_CREATE_ERROR',
        }
      }

      return {
        success: true,
        redirectUrl: result.checkoutUrl,
        reference: params.orderNumber,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[EPAYCO-ADAPTER] Error creating payment:', error)
      return {
        success: false,
        error: errorMessage,
        errorCode: 'EPAYCO_CREATE_ERROR',
      }
    }
  }

  async verifyWebhook(request: Request): Promise<WebhookVerificationResult> {
    try {
      const contentType = request.headers.get('content-type') || ''
      let data: Record<string, string>

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        data = {}
        formData.forEach((value, key) => {
          data[key] = value.toString()
        })
      } else {
        data = await request.json()
      }

      const payload = data as unknown as EpaycoWebhookPayload

      // Verificar campos requeridos
      if (!payload.x_ref_payco || !payload.x_transaction_id) {
        return { valid: false, error: 'Campos requeridos faltantes' }
      }

      // Verificar firma
      const isValid = verifyEpaycoWebhookSignature(payload)
      if (!isValid) {
        return { valid: false, error: 'Invalid signature' }
      }

      return {
        valid: true,
        eventType: `transaction.${payload.x_response}`,
        transactionId: payload.x_ref_payco,
        status: this.mapStatus(payload.x_cod_response),
        reference: payload.x_id_invoice,
        amount: parseFloat(payload.x_amount),
        currency: payload.x_currency_code as Currency,
        rawData: data,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return { valid: false, error: errorMessage }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResult> {
    this.assertConfigured()

    try {
      const transaction = await getEpaycoTransaction(transactionId)

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        }
      }

      return {
        success: true,
        status: this.mapStatus(transaction.data.cod_respuesta.toString()),
        transactionId: transaction.data.ref_payco,
        amount: parseFloat(transaction.data.valor),
        currency: transaction.data.moneda as Currency,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
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
      '7': 'PENDING', // Retenida
      '10': 'DECLINED', // Rechazada
      '11': 'EXPIRED', // Expirada
    }
    return statusMap[codResponse] || 'PENDING'
  }
}
