import { createHmac } from 'crypto'

// Configuración de Nequi API Conecta
const NEQUI_API_URL = process.env.NEQUI_API_URL || 'https://api.conecta.nequi.com.co'
const NEQUI_CLIENT_ID = process.env.NEQUI_CLIENT_ID
const NEQUI_CLIENT_SECRET = process.env.NEQUI_CLIENT_SECRET
const NEQUI_WEBHOOK_SECRET = process.env.NEQUI_WEBHOOK_SECRET

if (!NEQUI_CLIENT_ID || !NEQUI_CLIENT_SECRET) {
  console.warn('Nequi API credentials not configured')
}

/**
 * Estructura de respuesta de Nequi para suscripciones
 */
export interface NequiSubscriptionResponse {
  subscriptionId: string
  status: 'pending' | 'active' | 'cancelled' | 'failed'
  phoneNumber: string
  amount: number
  frequency: 'monthly' | 'yearly'
  createdAt: string
  approvedAt?: string
}

/**
 * Estructura de respuesta para cobros
 */
export interface NequiChargeResponse {
  transactionId: string
  status: 'success' | 'failed' | 'pending'
  amount: number
  message?: string
}

/**
 * Obtener token de acceso de Nequi API
 * Nequi usa OAuth 2.0 para autenticación
 */
async function getAccessToken(): Promise<string> {
  // TODO: Implementar según documentación de Nequi Conecta
  // Endpoint: POST /oauth/token
  // Body: { client_id, client_secret, grant_type: 'client_credentials' }

  const response = await fetch(`${NEQUI_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: NEQUI_CLIENT_ID,
      client_secret: NEQUI_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    throw new Error(`Error obteniendo token de Nequi: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Generar firma JWS para requests a Nequi
 * Nequi requiere firma AWS Signature V4 para seguridad
 */
function generateNequiSignature(payload: any): string {
  // TODO: Implementar según documentación de Nequi Conecta
  // Debe generar firma usando AWS Signature V4
  // Referencias:
  // - https://docs.conecta.nequi.com.co/autenticacion
  // - https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

  const payloadString = JSON.stringify(payload)
  const signature = createHmac('sha256', NEQUI_CLIENT_SECRET || '')
    .update(payloadString)
    .digest('hex')

  return signature
}

/**
 * Crear suscripción de débito automático en Nequi
 *
 * @param phoneNumber - Número de celular colombiano (10 dígitos, ej: 3001234567)
 * @param amount - Monto en pesos colombianos (COP)
 * @param frequency - Frecuencia de cobro ('monthly' | 'yearly')
 * @param metadata - Datos adicionales (userId, tierId)
 * @returns Detalles de la suscripción creada
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
  try {
    const accessToken = await getAccessToken()

    const payload = {
      phoneNumber,
      amount,
      frequency,
      description: `Membresía Energía y Divinidad - ${metadata.tierName}`,
      metadata,
    }

    // TODO: Ajustar endpoint según documentación real de Nequi
    // Endpoint probable: POST /subscriptions o POST /recurrent-payments
    const response = await fetch(`${NEQUI_API_URL}/subscriptions`, {
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
 * Útil para polling desde el frontend mientras el usuario aprueba
 */
export async function checkNequiSubscriptionStatus(
  subscriptionId: string
): Promise<'pending' | 'active' | 'cancelled' | 'failed'> {
  try {
    const accessToken = await getAccessToken()

    // TODO: Ajustar endpoint según documentación
    const response = await fetch(`${NEQUI_API_URL}/subscriptions/${subscriptionId}`, {
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
 * Realizar un cobro automático a una suscripción existente
 * Nequi realiza esto automáticamente, pero esta función permite cobros manuales si es necesario
 */
export async function chargeNequiSubscription(
  subscriptionId: string,
  amount: number,
  description?: string
): Promise<NequiChargeResponse> {
  try {
    const accessToken = await getAccessToken()

    const payload = {
      subscriptionId,
      amount,
      description: description || 'Cobro de membresía',
    }

    // TODO: Ajustar endpoint según documentación
    const response = await fetch(`${NEQUI_API_URL}/subscriptions/${subscriptionId}/charge`, {
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
      throw new Error(`Error realizando cobro: ${response.statusText} ${JSON.stringify(errorData)}`)
    }

    const data: NequiChargeResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('Error en chargeNequiSubscription:', error)
    throw new Error(`No se pudo realizar el cobro: ${error.message}`)
  }
}

/**
 * Cancelar una suscripción de débito automático
 */
export async function cancelNequiSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken()

    // TODO: Ajustar endpoint según documentación
    const response = await fetch(`${NEQUI_API_URL}/subscriptions/${subscriptionId}`, {
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

/**
 * Verificar firma de webhook de Nequi
 * Para validar que los webhooks provienen realmente de Nequi
 */
export function verifyNequiWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!NEQUI_WEBHOOK_SECRET) {
    console.error('NEQUI_WEBHOOK_SECRET no está configurado')
    return false
  }

  const expectedSignature = createHmac('sha256', NEQUI_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return signature === expectedSignature
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
