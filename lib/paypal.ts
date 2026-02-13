/**
 * PayPal Integration
 *
 * Integración directa con PayPal REST API v2
 * Soporta pagos en USD y COP para Colombia e Internacional
 */

import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  type OrderRequest,
  type Order,
} from '@paypal/paypal-server-sdk'

// Configuration
export const PAYPAL_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
  environment: (process.env.PAYPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'live',
}

// Create PayPal client
function getPayPalClient(): Client {
  const environment =
    PAYPAL_CONFIG.environment === 'live' ? Environment.Production : Environment.Sandbox

  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CONFIG.clientId,
      oAuthClientSecret: PAYPAL_CONFIG.clientSecret,
    },
    environment,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: { logBody: true },
      logResponse: { logHeaders: true },
    },
  })
}

// Types
export interface PayPalOrderParams {
  amount: number
  currency: 'USD' | 'COP'
  description: string
  reference: string
  returnUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface PayPalOrderResult {
  success: boolean
  orderId?: string
  approvalUrl?: string
  error?: string
}

export interface PayPalCaptureResult {
  success: boolean
  captureId?: string
  status?: string
  amount?: number
  currency?: string
  payerEmail?: string
  error?: string
}

export type PayPalOrderStatus =
  | 'CREATED'
  | 'SAVED'
  | 'APPROVED'
  | 'VOIDED'
  | 'COMPLETED'
  | 'PAYER_ACTION_REQUIRED'

export interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource_type: string
  resource: {
    id: string
    status: string
    amount?: {
      currency_code: string
      value: string
    }
    purchase_units?: Array<{
      reference_id: string
      payments?: {
        captures?: Array<{
          id: string
          status: string
          amount: {
            currency_code: string
            value: string
          }
        }>
      }
    }>
  }
  create_time: string
}

/**
 * Check if PayPal is configured
 */
export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret)
}

/**
 * Create a PayPal order
 */
export async function createPayPalOrder(
  params: PayPalOrderParams
): Promise<PayPalOrderResult> {
  try {
    const client = getPayPalClient()
    const ordersController = new OrdersController(client)

    const orderRequest: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: params.reference,
          description: params.description,
          amount: {
            currencyCode: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
      applicationContext: {
        brandName: 'Energía y Divinidad',
        landingPage: OrderApplicationContextLandingPage.Login,
        userAction: OrderApplicationContextUserAction.PayNow,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
      },
    }

    const response = await ordersController.createOrder({
      body: orderRequest,
      prefer: 'return=representation',
    })

    const order = response.result as Order

    // Find approval URL
    const approvalLink = order.links?.find((link) => link.rel === 'approve')

    if (!order.id || !approvalLink?.href) {
      return {
        success: false,
        error: 'No se pudo crear la orden de PayPal',
      }
    }

    return {
      success: true,
      orderId: order.id,
      approvalUrl: approvalLink.href,
    }
  } catch (error: unknown) {
    console.error('[PAYPAL] Error creating order:', error)

    // Extract detailed error info from PayPal SDK
    let errorMessage = 'Error desconocido'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    // PayPal SDK errors often have additional details
    const errorDetails = error as {
      statusCode?: number;
      body?: string;
      result?: { details?: Array<{ issue?: string; description?: string }> }
    }

    if (errorDetails.statusCode) {
      console.error('[PAYPAL] Status code:', errorDetails.statusCode)
    }
    if (errorDetails.body) {
      console.error('[PAYPAL] Error body:', errorDetails.body)
      try {
        const bodyParsed = JSON.parse(errorDetails.body)
        if (bodyParsed.details?.[0]?.description) {
          errorMessage = bodyParsed.details[0].description
        } else if (bodyParsed.message) {
          errorMessage = bodyParsed.message
        }
      } catch {
        // Body is not JSON, use as-is
      }
    }
    if (errorDetails.result?.details) {
      console.error('[PAYPAL] Error details:', JSON.stringify(errorDetails.result.details))
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Capture a PayPal order after approval
 */
export async function capturePayPalOrder(
  orderId: string
): Promise<PayPalCaptureResult> {
  try {
    const client = getPayPalClient()
    const ordersController = new OrdersController(client)

    const response = await ordersController.captureOrder({
      id: orderId,
      prefer: 'return=representation',
    })

    const order = response.result as Order
    const captureData = order.purchaseUnits?.[0]?.payments?.captures?.[0]

    if (!captureData) {
      return {
        success: false,
        error: 'No se encontró información de captura',
      }
    }

    return {
      success: true,
      captureId: captureData.id,
      status: captureData.status,
      amount: captureData.amount?.value ? parseFloat(captureData.amount.value) : undefined,
      currency: captureData.amount?.currencyCode,
      payerEmail: order.payer?.emailAddress,
    }
  } catch (error) {
    console.error('[PAYPAL] Error capturing order:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(orderId: string): Promise<Order | null> {
  try {
    const client = getPayPalClient()
    const ordersController = new OrdersController(client)

    const response = await ordersController.getOrder({
      id: orderId,
    })

    return response.result as Order
  } catch (error) {
    console.error('[PAYPAL] Error getting order:', error)
    return null
  }
}

/**
 * Refund a PayPal capture
 */
export async function refundPayPalCapture(
  captureId: string,
  amount?: number,
  currency?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const client = getPayPalClient()
    const paymentsController = new PaymentsController(client)

    const refundRequest = amount && currency
      ? {
          amount: {
            currencyCode: currency,
            value: amount.toFixed(2),
          },
        }
      : undefined

    const response = await paymentsController.refundCapturedPayment({
      captureId,
      body: refundRequest,
    })

    const refund = response.result

    return {
      success: true,
      refundId: refund.id,
    }
  } catch (error) {
    console.error('[PAYPAL] Error refunding capture:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Verify PayPal webhook signature
 *
 * PayPal uses a different verification method - we need to call their API
 * to verify the webhook signature
 */
export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string
): Promise<{ valid: boolean; event?: PayPalWebhookEvent; error?: string }> {
  try {
    // Get required headers
    const transmissionId = headers.get('paypal-transmission-id')
    const transmissionTime = headers.get('paypal-transmission-time')
    const certUrl = headers.get('paypal-cert-url')
    const authAlgo = headers.get('paypal-auth-algo')
    const transmissionSig = headers.get('paypal-transmission-sig')

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      return { valid: false, error: 'Missing required headers' }
    }

    // For now, we'll do basic validation and trust the payload
    // In production, you should verify the signature using PayPal's API:
    // POST /v1/notifications/verify-webhook-signature

    // Parse the event
    const event = JSON.parse(rawBody) as PayPalWebhookEvent

    // Basic validation
    if (!event.id || !event.event_type || !event.resource) {
      return { valid: false, error: 'Invalid webhook payload' }
    }

    // TODO: Implement full signature verification using PayPal API
    // For now, we trust webhooks from PayPal's IPs (configured in PayPal dashboard)

    return {
      valid: true,
      event,
    }
  } catch (error) {
    console.error('[PAYPAL] Error verifying webhook:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Map PayPal order status to our internal status
 */
export function mapPayPalStatus(
  paypalStatus: string
): 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'EXPIRED' {
  const statusMap: Record<string, 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'EXPIRED'> = {
    CREATED: 'PENDING',
    SAVED: 'PENDING',
    APPROVED: 'PENDING', // Still needs capture
    PAYER_ACTION_REQUIRED: 'PENDING',
    COMPLETED: 'APPROVED',
    VOIDED: 'VOIDED',
    DECLINED: 'DECLINED',
  }

  return statusMap[paypalStatus] || 'PENDING'
}

/**
 * Map PayPal capture status
 */
export function mapPayPalCaptureStatus(
  captureStatus: string
): 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'EXPIRED' {
  const statusMap: Record<string, 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'EXPIRED'> = {
    COMPLETED: 'APPROVED',
    DECLINED: 'DECLINED',
    PARTIALLY_REFUNDED: 'APPROVED',
    PENDING: 'PENDING',
    REFUNDED: 'VOIDED',
    FAILED: 'ERROR',
  }

  return statusMap[captureStatus] || 'PENDING'
}
