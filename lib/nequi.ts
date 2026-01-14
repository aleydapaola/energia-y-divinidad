import { createHmac } from 'crypto'

/**
 * Nequi Payment Integration
 *
 * Soporta dos modos:
 * - "app": Pago manual desde la app de Nequi (el cliente transfiere y se verifica manualmente)
 * - "push": Pago automático via Push Notification de Nequi API
 *           (el cliente recibe notificación en su app y aprueba el pago)
 *
 * NOTA: Nequi no tiene checkout redirect como Stripe. Los pagos automáticos
 * funcionan mediante:
 * 1. Push Notification: El usuario recibe notificación en su app para aprobar
 * 2. QR Code: El usuario escanea un código QR (menos práctico para web)
 *
 * El modo "push" es el más adecuado para e-commerce ya que:
 * - El usuario solo necesita su número de celular
 * - Recibe la notificación directamente en su app
 * - Aprueba el pago sin salir del flujo de compra
 */

export type NequiMode = 'app' | 'push'

export const NEQUI_MODE: NequiMode = (process.env.NEQUI_MODE as NequiMode) || 'app'

export const NEQUI_CONFIG = {
  mode: NEQUI_MODE,
  // Config para modo "app" (pago manual)
  number: process.env.NEQUI_NUMBER || '',
  name: process.env.NEQUI_NAME || '',
  // Config para modo "gateway" (pasarela de pago)
  clientId: process.env.NEQUI_CLIENT_ID || '',
  clientSecret: process.env.NEQUI_CLIENT_SECRET || '',
  apiKey: process.env.NEQUI_API_KEY || '',
  webhookSecret: process.env.NEQUI_WEBHOOK_SECRET || '',
  authUri: process.env.NEQUI_AUTH_URI || 'https://oauth.sandbox.nequi.com/oauth2/token',
  apiBaseUrl: process.env.NEQUI_API_BASE_URL || 'https://api.sandbox.nequi.com',
}

// ============================================
// TIPOS
// ============================================

export interface NequiSubscriptionResponse {
  subscriptionId: string
  status: 'pending' | 'active' | 'cancelled' | 'failed'
  phoneNumber: string
  amount: number
  frequency: 'monthly' | 'yearly'
  createdAt: string
  approvedAt?: string
}

export interface NequiChargeResponse {
  transactionId: string
  status: 'success' | 'failed' | 'pending'
  amount: number
  message?: string
}

export interface NequiPaymentResponse {
  success: boolean
  transactionId?: string
  status?: string
  message?: string
  error?: string
  qrCode?: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtener el modo actual de Nequi (con fallback si falta config)
 */
export function getNequiMode(): NequiMode {
  if (NEQUI_MODE === 'push' && !isNequiPushConfigured()) {
    console.warn('Nequi Push configurado pero faltan credenciales. Usando modo "app"')
    return 'app'
  }
  return NEQUI_MODE
}

/**
 * Verificar si Nequi Push está configurado correctamente
 */
export function isNequiPushConfigured(): boolean {
  return !!(
    NEQUI_CONFIG.clientId &&
    NEQUI_CONFIG.clientSecret &&
    NEQUI_CONFIG.apiKey
  )
}

/**
 * Convertir monto a formato Nequi (centavos como string)
 */
export function formatNequiAmount(amountCOP: number): string {
  return Math.round(amountCOP * 100).toString()
}

/**
 * Generar código único para transacción
 */
export function generateTransactionCode(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `EYD-${timestamp}-${random}`.toUpperCase()
}

/**
 * Validar número de celular colombiano
 * Formato: 10 dígitos, comenzando con 3
 */
export function validateColombianPhoneNumber(phoneNumber: string): boolean {
  const cleanPhone = phoneNumber.replace(/\s|-/g, '')
  const colombianPhoneRegex = /^3\d{9}$/
  return colombianPhoneRegex.test(cleanPhone)
}

// ============================================
// NEQUI GATEWAY API (Pasarela de Pago)
// ============================================

interface NequiTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Obtener token de autenticación de Nequi
 */
async function getNequiToken(): Promise<string> {
  // Check cache
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const { clientId, clientSecret, authUri } = NEQUI_CONFIG

  if (!clientId || !clientSecret) {
    throw new Error('Nequi Gateway: Faltan credenciales (NEQUI_CLIENT_ID, NEQUI_CLIENT_SECRET)')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(authUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Nequi Auth Error: ${error}`)
  }

  const data: NequiTokenResponse = await response.json()

  // Cache token (expire 5 minutes before actual expiry)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }

  return data.access_token
}

/**
 * Generar firma para requests a Nequi
 */
function generateNequiSignature(payload: any): string {
  const payloadString = JSON.stringify(payload)
  const signature = createHmac('sha256', NEQUI_CONFIG.clientSecret || '')
    .update(payloadString)
    .digest('hex')
  return signature
}

/**
 * Crear pago con notificación push (el cliente aprueba en su app)
 *
 * Flujo:
 * 1. Se envía solicitud a Nequi API con el número de celular del cliente
 * 2. El cliente recibe una notificación push en su app Nequi
 * 3. El cliente abre la notificación y aprueba el pago
 * 4. El pago se completa y se puede verificar con checkNequiPaymentStatus()
 *
 * Solo disponible en modo "push"
 */
export async function createNequiPushPayment(request: {
  phoneNumber: string
  code: string
  value: string
}): Promise<NequiPaymentResponse> {
  if (getNequiMode() !== 'push') {
    throw new Error('Nequi Push no está habilitado. Cambia NEQUI_MODE a "push"')
  }

  try {
    const token = await getNequiToken()
    const { apiBaseUrl, apiKey } = NEQUI_CONFIG

    const response = await fetch(`${apiBaseUrl}/payments/v2/-services-paymentservice-unregisteredpayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        RequestMessage: {
          RequestHeader: {
            Channel: 'PNP04-C001',
            RequestDate: new Date().toISOString(),
            MessageID: request.code,
            ClientID: NEQUI_CONFIG.clientId,
            Destination: {
              ServiceName: 'PaymentsService',
              ServiceOperation: 'unregisteredPayment',
              ServiceRegion: 'C001',
              ServiceVersion: '1.0.0',
            },
          },
          RequestBody: {
            any: {
              unregisteredPaymentRQ: {
                phoneNumber: request.phoneNumber,
                code: request.code,
                value: request.value,
              },
            },
          },
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Error al procesar pago con Nequi',
      }
    }

    const responseBody = data.ResponseMessage?.ResponseBody?.any?.unregisteredPaymentRS

    return {
      success: true,
      transactionId: responseBody?.transactionId,
      status: responseBody?.status,
      message: 'Notificación enviada al cliente',
    }
  } catch (error) {
    console.error('Nequi Push Payment Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Generar código QR para pago (alternativa al push)
 * Solo disponible en modo "push"
 *
 * NOTA: El modo push es preferible para e-commerce.
 * QR es más útil para pagos presenciales.
 */
export async function generateNequiQR(
  code: string,
  value: string
): Promise<NequiPaymentResponse> {
  if (getNequiMode() !== 'push') {
    throw new Error('Nequi Push no está habilitado')
  }

  try {
    const token = await getNequiToken()
    const { apiBaseUrl, apiKey } = NEQUI_CONFIG

    const response = await fetch(`${apiBaseUrl}/payments/v2/-services-paymentservice-generatecodeqr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        RequestMessage: {
          RequestHeader: {
            Channel: 'PQR03-C001',
            RequestDate: new Date().toISOString(),
            MessageID: code,
            ClientID: NEQUI_CONFIG.clientId,
            Destination: {
              ServiceName: 'PaymentsService',
              ServiceOperation: 'generateCodeQR',
              ServiceRegion: 'C001',
              ServiceVersion: '1.0.0',
            },
          },
          RequestBody: {
            any: {
              generateCodeQRRQ: {
                code,
                value,
              },
            },
          },
        },
      }),
    })

    const data = await response.json()
    const responseBody = data.ResponseMessage?.ResponseBody?.any?.generateCodeQRRS

    return {
      success: true,
      qrCode: responseBody?.codeQR,
    }
  } catch (error) {
    console.error('Nequi QR Generation Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Consultar estado de una transacción
 * Solo disponible en modo "push"
 */
export async function checkNequiPaymentStatus(
  transactionId: string
): Promise<NequiPaymentResponse> {
  if (getNequiMode() !== 'push') {
    throw new Error('Nequi Push no está habilitado')
  }

  try {
    const token = await getNequiToken()
    const { apiBaseUrl, apiKey } = NEQUI_CONFIG

    const response = await fetch(
      `${apiBaseUrl}/payments/v2/-services-paymentservice-getstatuspayment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          RequestMessage: {
            RequestHeader: {
              Channel: 'PNP04-C001',
              RequestDate: new Date().toISOString(),
              MessageID: `status-${transactionId}`,
              ClientID: NEQUI_CONFIG.clientId,
              Destination: {
                ServiceName: 'PaymentsService',
                ServiceOperation: 'getStatusPayment',
                ServiceRegion: 'C001',
                ServiceVersion: '1.0.0',
              },
            },
            RequestBody: {
              any: {
                getStatusPaymentRQ: {
                  codeQR: transactionId,
                },
              },
            },
          },
        }),
      }
    )

    const data = await response.json()
    const responseBody = data.ResponseMessage?.ResponseBody?.any?.getStatusPaymentRS

    const statusMessages: Record<string, string> = {
      '35': 'Pago exitoso',
      '36': 'Pago pendiente',
      '37': 'Pago rechazado',
      '38': 'Pago expirado',
      '39': 'Pago cancelado',
    }

    return {
      success: responseBody?.status === '35',
      transactionId,
      status: responseBody?.status,
      message: statusMessages[responseBody?.status] || `Estado: ${responseBody?.status}`,
    }
  } catch (error) {
    console.error('Nequi Status Check Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

// ============================================
// SUSCRIPCIONES (Débito Automático)
// ============================================

/**
 * Crear suscripción de débito automático en Nequi
 * Solo disponible en modo "push"
 */
export async function createNequiSubscription(
  phoneNumber: string,
  amount: number,
  frequency: 'monthly' | 'yearly',
  metadata: {
    userId: string
    tierId: string
    tierName: string
  }
): Promise<NequiSubscriptionResponse> {
  if (getNequiMode() !== 'push') {
    throw new Error('Nequi Push no está habilitado para suscripciones')
  }

  try {
    const accessToken = await getNequiToken()

    const payload = {
      phoneNumber,
      amount,
      frequency,
      description: `Membresía Energía y Divinidad - ${metadata.tierName}`,
      metadata,
    }

    const response = await fetch(`${NEQUI_CONFIG.apiBaseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Nequi-Signature': generateNequiSignature(payload),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Error creando suscripción Nequi: ${response.statusText} ${JSON.stringify(errorData)}`
      )
    }

    const data: NequiSubscriptionResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('Error en createNequiSubscription:', error)
    throw new Error(`No se pudo crear la suscripción en Nequi: ${error.message}`)
  }
}

/**
 * Consultar estado de una suscripción en Nequi
 */
export async function checkNequiSubscriptionStatus(
  subscriptionId: string
): Promise<'pending' | 'active' | 'cancelled' | 'failed'> {
  if (getNequiMode() !== 'push') {
    throw new Error('Nequi Push no está habilitado')
  }

  try {
    const accessToken = await getNequiToken()

    const response = await fetch(`${NEQUI_CONFIG.apiBaseUrl}/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error consultando estado: ${response.statusText}`)
    }

    const data: NequiSubscriptionResponse = await response.json()
    return data.status
  } catch (error: any) {
    console.error('Error en checkNequiSubscriptionStatus:', error)
    throw new Error(`No se pudo consultar el estado: ${error.message}`)
  }
}

/**
 * Cancelar una suscripción de débito automático
 */
export async function cancelNequiSubscription(subscriptionId: string): Promise<boolean> {
  if (getNequiMode() !== 'push') {
    throw new Error('Nequi Push no está habilitado')
  }

  try {
    const accessToken = await getNequiToken()

    const response = await fetch(`${NEQUI_CONFIG.apiBaseUrl}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error cancelando suscripción: ${response.statusText}`)
    }

    return true
  } catch (error: any) {
    console.error('Error en cancelNequiSubscription:', error)
    throw new Error(`No se pudo cancelar la suscripción: ${error.message}`)
  }
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * Verificar firma de webhook de Nequi
 */
export function verifyNequiWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!NEQUI_CONFIG.webhookSecret) {
    console.error('NEQUI_WEBHOOK_SECRET no está configurado')
    return false
  }

  const expectedSignature = createHmac('sha256', NEQUI_CONFIG.webhookSecret)
    .update(payload)
    .digest('hex')

  return signature === expectedSignature
}
