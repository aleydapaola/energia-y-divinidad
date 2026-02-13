/**
 * Wompi Payment Gateway Adapter
 *
 * Wompi es la pasarela de pagos de Bancolombia para Colombia.
 * Solo opera en COP (pesos colombianos).
 */

import {
  WOMPI_CONFIG,
  createWompiPaymentLink,
  verifyWompiWebhookSignature,
  getWompiTransaction,
  type WompiTransactionStatus,
} from '@/lib/wompi'

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
      // Wompi usa centavos, multiplicamos por 100
      const amountInCents = Math.round(params.amount * 100)

      const result = await createWompiPaymentLink({
        name: params.description,
        description: params.description,
        amountInCents,
        singleUse: true,
        redirectUrl: params.returnUrl,
      })

      return {
        success: true,
        redirectUrl: result.checkoutUrl,
        transactionId: result.paymentLink.id,
        reference: params.orderNumber,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[WOMPI-ADAPTER] Error creating payment:', error)
      return {
        success: false,
        error: errorMessage,
        errorCode: 'WOMPI_CREATE_ERROR',
      }
    }
  }

  async verifyWebhook(
    request: Request,
    rawBody?: string
  ): Promise<WebhookVerificationResult> {
    try {
      const body = rawBody || (await request.text())
      const signature = request.headers.get('x-event-checksum') || ''
      const timestamp = request.headers.get('x-event-timestamp') || Date.now().toString()

      const isValid = verifyWompiWebhookSignature(body, signature, timestamp)
      if (!isValid) {
        return { valid: false, error: 'Invalid signature' }
      }

      const data = JSON.parse(body)
      const transaction = data.data?.transaction

      if (!transaction) {
        return { valid: false, error: 'No transaction in webhook payload' }
      }

      return {
        valid: true,
        eventType: data.event || 'transaction.updated',
        transactionId: transaction.id,
        status: this.mapStatus(transaction.status),
        reference: transaction.reference,
        amount: transaction.amount_in_cents
          ? transaction.amount_in_cents / 100
          : undefined,
        currency: transaction.currency as Currency,
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
      const transaction = await getWompiTransaction(transactionId)

      return {
        success: true,
        status: this.mapStatus(transaction.status),
        transactionId: transaction.id,
        amount: transaction.amountInCents / 100,
        currency: transaction.currency as Currency,
        paidAt: transaction.createdAt ? new Date(transaction.createdAt) : undefined,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  private mapStatus(wompiStatus: WompiTransactionStatus): TransactionStatus {
    const statusMap: Record<WompiTransactionStatus, TransactionStatus> = {
      APPROVED: 'APPROVED',
      DECLINED: 'DECLINED',
      VOIDED: 'VOIDED',
      PENDING: 'PENDING',
      ERROR: 'ERROR',
    }
    return statusMap[wompiStatus] || 'PENDING'
  }
}
