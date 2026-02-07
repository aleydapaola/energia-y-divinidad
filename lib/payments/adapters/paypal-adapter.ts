/**
 * PayPal Payment Gateway Adapter
 *
 * Integración directa con PayPal para pagos internacionales y Colombia.
 * Soporta USD y COP.
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
  RefundParams,
  RefundResult,
} from '../types'
import {
  PAYPAL_CONFIG,
  isPayPalConfigured,
  createPayPalOrder,
  getPayPalOrder,
  verifyPayPalWebhook,
  refundPayPalCapture,
  mapPayPalStatus,
  mapPayPalCaptureStatus,
  type PayPalWebhookEvent,
} from '@/lib/paypal'

export class PayPalAdapter extends BasePaymentGateway {
  readonly name: PaymentGatewayName = 'paypal'
  readonly supportedCurrencies: Currency[] = ['USD', 'COP']
  readonly supportedMethods: PaymentMethodType[] = ['PAYPAL', 'CARD']

  isConfigured(): boolean {
    return isPayPalConfigured()
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    this.assertConfigured()
    this.validateCurrency(params.currency)

    try {
      const result = await createPayPalOrder({
        amount: params.amount,
        currency: params.currency as 'USD' | 'COP',
        description: params.description,
        reference: params.orderNumber,
        returnUrl: params.returnUrl,
        cancelUrl: params.returnUrl.replace('/confirmacion', '/cancelado'),
        customerEmail: params.customer.email,
      })

      if (!result.success || !result.orderId || !result.approvalUrl) {
        return {
          success: false,
          error: result.error || 'Error al crear orden de PayPal',
          errorCode: 'PAYPAL_CREATE_ERROR',
        }
      }

      return {
        success: true,
        redirectUrl: result.approvalUrl,
        transactionId: result.orderId,
        reference: params.orderNumber,
        status: 'PENDING',
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[PAYPAL-ADAPTER] Error creating payment:', error)
      return {
        success: false,
        error: errorMessage,
        errorCode: 'PAYPAL_CREATE_ERROR',
      }
    }
  }

  async verifyWebhook(
    request: Request,
    rawBody?: string
  ): Promise<WebhookVerificationResult> {
    try {
      const body = rawBody || (await request.text())
      const headers = request.headers

      const verification = await verifyPayPalWebhook(headers, body)

      if (!verification.valid || !verification.event) {
        return { valid: false, error: verification.error || 'Invalid webhook' }
      }

      const event = verification.event
      const resource = event.resource

      // Extract reference from purchase units
      const reference = resource.purchase_units?.[0]?.reference_id

      // Get capture info if available
      const capture = resource.purchase_units?.[0]?.payments?.captures?.[0]

      // Determine status based on event type
      let status: TransactionStatus = 'PENDING'
      let amount: number | undefined
      let currency: Currency | undefined

      if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        status = 'PENDING' // Still needs capture
      } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        status = 'APPROVED'
        if (capture) {
          amount = parseFloat(capture.amount.value)
          currency = capture.amount.currency_code as Currency
        }
      } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
        status = 'DECLINED'
      } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
        status = 'VOIDED'
      }

      return {
        valid: true,
        eventType: event.event_type,
        transactionId: resource.id,
        status,
        reference,
        amount,
        currency,
        rawData: event,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return { valid: false, error: errorMessage }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResult> {
    this.assertConfigured()

    try {
      const order = await getPayPalOrder(transactionId)

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        }
      }

      // Check if there's a capture
      const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0]
      const purchaseUnit = order.purchaseUnits?.[0]

      let status: TransactionStatus
      let amount: number | undefined
      let paidAt: Date | undefined

      if (capture) {
        status = mapPayPalCaptureStatus(capture.status || 'PENDING')
        amount = capture.amount?.value ? parseFloat(capture.amount.value) : undefined
        if (capture.createTime) {
          paidAt = new Date(capture.createTime)
        }
      } else {
        status = mapPayPalStatus(order.status || 'CREATED')
        amount = purchaseUnit?.amount?.value
          ? parseFloat(purchaseUnit.amount.value)
          : undefined
      }

      return {
        success: true,
        status,
        transactionId: order.id,
        amount,
        currency: (purchaseUnit?.amount?.currencyCode || 'USD') as Currency,
        paidAt,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    this.assertConfigured()

    try {
      // First get the order to find the capture ID
      const order = await getPayPalOrder(params.transactionId)

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        }
      }

      const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0]

      if (!capture?.id) {
        return {
          success: false,
          error: 'No capture found to refund',
        }
      }

      const currency = order.purchaseUnits?.[0]?.amount?.currencyCode

      const result = await refundPayPalCapture(
        capture.id,
        params.amount,
        currency
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Refund failed',
        }
      }

      return {
        success: true,
        refundId: result.refundId,
        status: 'COMPLETED',
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}
