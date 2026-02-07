import { createHmac } from 'crypto'

/**
 * Wompi Payment Integration
 *
 * Wompi es la pasarela de pagos de Bancolombia para Colombia.
 * Solo opera en COP (pesos colombianos).
 *
 * Métodos soportados:
 * - Tarjetas de crédito/débito colombianas
 * - Nequi (integración nativa)
 * - PSE (transferencia bancaria)
 * - Bancolombia QR
 *
 * Documentación: https://docs.wompi.co/
 */

export const WOMPI_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
  environment: (process.env.WOMPI_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
}

// URLs de API según environment
const API_URLS = {
  sandbox: 'https://sandbox.wompi.co/v1',
  production: 'https://production.wompi.co/v1',
}

export function getWompiApiUrl(): string {
  return API_URLS[WOMPI_CONFIG.environment]
}

// ============================================
// TIPOS
// ============================================

export type WompiPaymentMethod = 'CARD' | 'NEQUI' | 'PSE' | 'BANCOLOMBIA_QR'

export interface WompiTransactionRequest {
  amountInCents: number
  currency: 'COP'
  customerEmail: string
  customerData?: {
    phoneNumber?: string
    fullName?: string
    legalId?: string
    legalIdType?: 'CC' | 'CE' | 'NIT' | 'PP'
  }
  reference: string
  paymentMethod: {
    type: WompiPaymentMethod
    token?: string // Para tarjetas tokenizadas
    phoneNumber?: string // Para Nequi
    userType?: number // Para PSE
    userLegalId?: string // Para PSE
    userLegalIdType?: string // Para PSE
    financialInstitutionCode?: string // Para PSE
  }
  redirectUrl?: string
  paymentSourceId?: string
}

export interface WompiTransaction {
  id: string
  createdAt: string
  amountInCents: number
  reference: string
  currency: string
  paymentMethodType: WompiPaymentMethod
  paymentMethod: {
    type: string
    extra?: Record<string, any>
    phoneNumber?: string
  }
  status: WompiTransactionStatus
  statusMessage?: string
  customerEmail: string
  customerData?: {
    fullName?: string
    phoneNumber?: string
  }
  redirectUrl?: string
  paymentLinkId?: string
}

export type WompiTransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'

export interface WompiPaymentLink {
  id: string
  name: string
  description?: string
  singleUse: boolean
  collectShipping: boolean
  currency: 'COP'
  amountInCents: number
  redirectUrl?: string
  imageUrl?: string
  expiresAt?: string
}

export interface WompiNequiPaymentResponse {
  success: boolean
  transactionId?: string
  status?: WompiTransactionStatus
  message?: string
  error?: string
}

export interface WompiCardTokenResponse {
  id: string
  createdAt: string
  brand: string
  name: string
  lastFour: string
  bin: string
  expYear: string
  expMonth: string
  cardHolder: string
  expiresAt: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Verificar si Wompi está configurado
 */
export function isWompiConfigured(): boolean {
  return !!(WOMPI_CONFIG.publicKey && WOMPI_CONFIG.privateKey)
}

/**
 * Generar firma de integridad para transacciones
 * Se usa para validar que la transacción no fue alterada
 */
export function generateWompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string = 'COP'
): string {
  const { integritySecret } = WOMPI_CONFIG
  if (!integritySecret) {
    throw new Error('WOMPI_INTEGRITY_SECRET no está configurado')
  }

  const data = `${reference}${amountInCents}${currency}${integritySecret}`
  return createHmac('sha256', integritySecret).update(data).digest('hex')
}

/**
 * Verificar firma de webhook de Wompi
 */
export function verifyWompiWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const { eventsSecret } = WOMPI_CONFIG
  if (!eventsSecret) {
    console.error('WOMPI_EVENTS_SECRET no está configurado')
    return false
  }

  const data = `${timestamp}${payload}`
  const expectedSignature = createHmac('sha256', eventsSecret)
    .update(data)
    .digest('hex')

  return signature === expectedSignature
}

/**
 * Generar referencia única para transacción
 * Formato alfanumérico sin caracteres especiales (compatible con apps bancarias)
 */
export function generateWompiReference(prefix: string = 'EYD'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  // Sin guiones para compatibilidad con apps bancarias (Bre-B, Nequi, etc.)
  return `${prefix}${timestamp}${random}`.toUpperCase()
}

// ============================================
// API DE WOMPI
// ============================================

/**
 * Headers de autenticación para requests a Wompi
 */
function getWompiHeaders(usePublicKey: boolean = false): Record<string, string> {
  const key = usePublicKey ? WOMPI_CONFIG.publicKey : WOMPI_CONFIG.privateKey
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
}

/**
 * Obtener token de aceptación de Wompi
 * Requerido antes de crear transacciones
 */
export async function getWompiAcceptanceToken(): Promise<string> {
  const response = await fetch(`${getWompiApiUrl()}/merchants/${WOMPI_CONFIG.publicKey}`, {
    method: 'GET',
    headers: getWompiHeaders(true),
  })

  if (!response.ok) {
    throw new Error(`Error obteniendo acceptance token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.presignedAcceptance.acceptanceToken
}

/**
 * Tokenizar tarjeta de crédito
 * La tarjeta se tokeniza en el frontend con la public key
 */
export async function tokenizeCard(cardData: {
  number: string
  cvc: string
  expMonth: string
  expYear: string
  cardHolder: string
}): Promise<WompiCardTokenResponse> {
  const response = await fetch(`${getWompiApiUrl()}/tokens/cards`, {
    method: 'POST',
    headers: getWompiHeaders(true),
    body: JSON.stringify(cardData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Error tokenizando tarjeta: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * Crear transacción con Wompi
 */
export async function createWompiTransaction(
  request: WompiTransactionRequest
): Promise<WompiTransaction> {
  const acceptanceToken = await getWompiAcceptanceToken()

  const payload = {
    acceptance_token: acceptanceToken,
    amount_in_cents: request.amountInCents,
    currency: request.currency,
    customer_email: request.customerEmail,
    customer_data: request.customerData
      ? {
          phone_number: request.customerData.phoneNumber,
          full_name: request.customerData.fullName,
          legal_id: request.customerData.legalId,
          legal_id_type: request.customerData.legalIdType,
        }
      : undefined,
    reference: request.reference,
    payment_method: {
      type: request.paymentMethod.type,
      token: request.paymentMethod.token,
      phone_number: request.paymentMethod.phoneNumber,
      user_type: request.paymentMethod.userType,
      user_legal_id: request.paymentMethod.userLegalId,
      user_legal_id_type: request.paymentMethod.userLegalIdType,
      financial_institution_code: request.paymentMethod.financialInstitutionCode,
    },
    redirect_url: request.redirectUrl,
    payment_source_id: request.paymentSourceId,
  }

  const response = await fetch(`${getWompiApiUrl()}/transactions`, {
    method: 'POST',
    headers: getWompiHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      `Error creando transacción Wompi: ${error.error?.message || response.statusText}`
    )
  }

  const data = await response.json()
  return mapWompiTransaction(data.data)
}

/**
 * Crear pago con Nequi via Wompi
 * El usuario recibe notificación push en su app Nequi
 */
export async function createWompiNequiPayment(request: {
  phoneNumber: string
  amountInCents: number
  customerEmail: string
  reference: string
  redirectUrl?: string
}): Promise<WompiNequiPaymentResponse> {
  try {
    const transaction = await createWompiTransaction({
      amountInCents: request.amountInCents,
      currency: 'COP',
      customerEmail: request.customerEmail,
      customerData: {
        phoneNumber: request.phoneNumber,
      },
      reference: request.reference,
      paymentMethod: {
        type: 'NEQUI',
        phoneNumber: request.phoneNumber,
      },
      redirectUrl: request.redirectUrl,
    })

    return {
      success: true,
      transactionId: transaction.id,
      status: transaction.status,
      message:
        transaction.status === 'PENDING'
          ? 'Se envió la solicitud de pago a tu app Nequi. Por favor apruébala.'
          : `Estado: ${transaction.status}`,
    }
  } catch (error) {
    console.error('Error en Wompi Nequi payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Consultar estado de transacción
 */
export async function getWompiTransaction(transactionId: string): Promise<WompiTransaction> {
  const response = await fetch(`${getWompiApiUrl()}/transactions/${transactionId}`, {
    method: 'GET',
    headers: getWompiHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Error consultando transacción: ${response.statusText}`)
  }

  const data = await response.json()
  return mapWompiTransaction(data.data)
}

/**
 * Crear link de pago (para checkout hospedado por Wompi)
 */
export async function createWompiPaymentLink(request: {
  name: string
  description?: string
  amountInCents: number
  singleUse?: boolean
  redirectUrl?: string
  expiresAt?: string
}): Promise<{ paymentLink: WompiPaymentLink; checkoutUrl: string }> {
  const payload = {
    name: request.name,
    description: request.description,
    single_use: request.singleUse ?? true,
    collect_shipping: false,
    currency: 'COP',
    amount_in_cents: request.amountInCents,
    redirect_url: request.redirectUrl,
    expires_at: request.expiresAt,
  }

  const response = await fetch(`${getWompiApiUrl()}/payment_links`, {
    method: 'POST',
    headers: getWompiHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Error creando link de pago: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const paymentLink = data.data

  // Generar URL de checkout
  // Wompi usa la misma URL para sandbox y producción
  // El ambiente se determina por el tipo de llave (pub_test_ vs pub_prod_)
  const checkoutUrl = `https://checkout.wompi.co/l/${paymentLink.id}`

  return {
    paymentLink: {
      id: paymentLink.id,
      name: paymentLink.name,
      description: paymentLink.description,
      singleUse: paymentLink.single_use,
      collectShipping: paymentLink.collect_shipping,
      currency: paymentLink.currency,
      amountInCents: paymentLink.amount_in_cents,
      redirectUrl: paymentLink.redirect_url,
      expiresAt: paymentLink.expires_at,
    },
    checkoutUrl,
  }
}

/**
 * Obtener lista de bancos para PSE
 */
export async function getWompiBanks(): Promise<
  Array<{ financial_institution_code: string; financial_institution_name: string }>
> {
  const response = await fetch(`${getWompiApiUrl()}/pse/financial_institutions`, {
    method: 'GET',
    headers: getWompiHeaders(true),
  })

  if (!response.ok) {
    throw new Error(`Error obteniendo bancos: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data
}

// ============================================
// SUSCRIPCIONES (Recurrentes)
// ============================================

export interface WompiPaymentSource {
  id: string
  publicData: {
    type: string
    token?: string
    phoneNumber?: string
  }
  status: 'AVAILABLE' | 'UNAVAILABLE'
  type: 'CARD' | 'NEQUI'
  customerId: string
}

/**
 * Crear fuente de pago (para cobros recurrentes)
 * El cliente debe autorizar el débito automático
 */
export async function createWompiPaymentSource(request: {
  type: 'CARD' | 'NEQUI'
  token?: string // Para tarjetas
  phoneNumber?: string // Para Nequi
  customerEmail: string
  acceptanceToken: string
}): Promise<WompiPaymentSource> {
  const payload = {
    type: request.type,
    token: request.token,
    phone_number: request.phoneNumber,
    customer_email: request.customerEmail,
    acceptance_token: request.acceptanceToken,
  }

  const response = await fetch(`${getWompiApiUrl()}/payment_sources`, {
    method: 'POST',
    headers: getWompiHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      `Error creando fuente de pago: ${error.error?.message || response.statusText}`
    )
  }

  const data = await response.json()
  return {
    id: data.data.id,
    publicData: data.data.public_data,
    status: data.data.status,
    type: data.data.type,
    customerId: data.data.customer_email,
  }
}

/**
 * Cobrar a una fuente de pago existente (débito recurrente)
 */
export async function chargeWompiPaymentSource(request: {
  paymentSourceId: string
  amountInCents: number
  reference: string
  customerEmail: string
}): Promise<WompiTransaction> {
  return await createWompiTransaction({
    amountInCents: request.amountInCents,
    currency: 'COP',
    customerEmail: request.customerEmail,
    reference: request.reference,
    paymentMethod: {
      type: 'CARD', // El tipo real se determina por el payment source
    },
    paymentSourceId: request.paymentSourceId,
  })
}

// ============================================
// MAPPERS
// ============================================

function mapWompiTransaction(data: any): WompiTransaction {
  return {
    id: data.id,
    createdAt: data.created_at,
    amountInCents: data.amount_in_cents,
    reference: data.reference,
    currency: data.currency,
    paymentMethodType: data.payment_method_type,
    paymentMethod: {
      type: data.payment_method?.type,
      extra: data.payment_method?.extra,
      phoneNumber: data.payment_method?.phone_number,
    },
    status: data.status,
    statusMessage: data.status_message,
    customerEmail: data.customer_email,
    customerData: data.customer_data
      ? {
          fullName: data.customer_data.full_name,
          phoneNumber: data.customer_data.phone_number,
        }
      : undefined,
    redirectUrl: data.redirect_url,
    paymentLinkId: data.payment_link_id,
  }
}

// ============================================
// WEBHOOKS TYPES
// ============================================

export interface WompiWebhookEvent {
  event: 'transaction.updated' | 'nequi_token.updated'
  data: {
    transaction?: WompiTransaction
    nequi_token?: any
  }
  sentAt: string
  timestamp: number
  signature: {
    properties: string[]
    checksum: string
  }
  environment: 'test' | 'prod'
}

/**
 * Parsear y verificar evento de webhook
 */
export function parseWompiWebhookEvent(
  body: string,
  signature: string,
  timestamp: string
): WompiWebhookEvent | null {
  if (!verifyWompiWebhookSignature(body, signature, timestamp)) {
    console.error('Firma de webhook Wompi inválida')
    return null
  }

  try {
    return JSON.parse(body) as WompiWebhookEvent
  } catch (error) {
    console.error('Error parseando webhook Wompi:', error)
    return null
  }
}
