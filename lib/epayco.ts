import { createHmac } from 'crypto'

/**
 * ePayco Payment Integration
 *
 * ePayco es una pasarela de pagos colombiana que soporta múltiples monedas.
 * Ideal para pagos internacionales (USD) y PayPal.
 *
 * Métodos soportados:
 * - Tarjetas de crédito/débito internacionales (Visa, Mastercard, Amex, Diners)
 * - PayPal
 * - Tarjetas colombianas
 * - PSE
 * - Efecty, Baloto, etc.
 *
 * Documentación: https://docs.epayco.co/
 */

export const EPAYCO_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY || '',
  privateKey: process.env.EPAYCO_PRIVATE_KEY || '',
  pKey: process.env.EPAYCO_P_KEY || '', // Clave de encriptación
  lang: 'es',
  test: process.env.EPAYCO_TEST_MODE === 'true',
}

// ============================================
// TIPOS
// ============================================

export type EpaycoPaymentMethod =
  | 'card' // Tarjeta de crédito/débito
  | 'paypal' // PayPal
  | 'pse' // Transferencia bancaria colombiana
  | 'cash' // Efectivo (Efecty, Baloto)

export type EpaycoCurrency = 'COP' | 'USD'

export interface EpaycoTransactionRequest {
  // Información del pago
  amount: number
  amountBase: number // Subtotal sin IVA
  tax?: number // IVA
  taxBase?: number // Base gravable
  currency: EpaycoCurrency
  description: string

  // Información del cliente
  name: string
  lastName: string
  email: string
  phone?: string
  docType?: 'CC' | 'CE' | 'NIT' | 'PP' // Tipo de documento
  docNumber?: string // Número de documento
  country?: string
  city?: string
  address?: string

  // URLs de respuesta
  urlResponse: string
  urlConfirmation: string

  // Método de pago
  methodConfirmation?: 'GET' | 'POST'

  // Referencia única
  invoice: string
  extra1?: string // Metadata adicional
  extra2?: string
  extra3?: string
}

export interface EpaycoTransaction {
  success: boolean
  titleResponse: string
  textResponse: string
  lastAction: string
  data: {
    ref_payco: string
    factura: string
    descripcion: string
    valor: string
    iva: string
    baseiva: string
    moneda: string
    banco: string
    estado: EpaycoTransactionStatus
    respuesta: string
    autorizacion: string
    recibo: string
    fecha: string
    franquicia: string
    cod_respuesta: number
    ip: string
    tipo_doc: string
    documento: string
    nombres: string
    apellidos: string
    email: string
    enpruebas: number
    ciudad: string
    direccion: string
    ind_pais: string
    extras: {
      extra1?: string
      extra2?: string
      extra3?: string
    }
  }
}

export type EpaycoTransactionStatus =
  | 'Aceptada'
  | 'Rechazada'
  | 'Pendiente'
  | 'Fallida'
  | 'Reversada'
  | 'Retenida'
  | 'Iniciada'
  | 'Expirada'
  | 'Abandonada'
  | 'Cancelada'
  | 'Antifraude'

export interface EpaycoPaymentResponse {
  success: boolean
  checkoutUrl?: string
  transactionId?: string
  reference?: string
  message?: string
  error?: string
}

export interface EpaycoCheckoutConfig {
  // Información básica
  key: string
  amount: number
  name: string
  description: string
  currency: EpaycoCurrency
  country: string
  invoice: string

  // Impuestos
  tax?: number
  taxBase?: number

  // Información del cliente
  external?: boolean // True = checkout externo de ePayco
  confirmation?: string // URL de confirmación (webhook)
  response?: string // URL de respuesta

  // Personalización
  lang?: 'es' | 'en'
  test?: boolean
  autoclick?: boolean

  // Métodos de pago habilitados
  methodsDisable?: string[] // ['SP', 'CASH', 'DP'] para deshabilitar
}

// ============================================
// HELPERS
// ============================================

/**
 * Verificar si ePayco está configurado
 */
export function isEpaycoConfigured(): boolean {
  return !!(EPAYCO_CONFIG.publicKey && EPAYCO_CONFIG.privateKey)
}

/**
 * Generar referencia única para transacción
 */
export function generateEpaycoReference(prefix: string = 'EYD'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`.toUpperCase()
}

/**
 * Generar firma para validación de respuesta
 * Fórmula: sha256(p_cust_id_cliente + p_key + ref_payco + transaction_id + amount + currency)
 */
export function generateEpaycoSignature(params: {
  custId: string
  pKey: string
  refPayco: string
  transactionId: string
  amount: string
  currency: string
}): string {
  const data = `${params.custId}^${params.pKey}^${params.refPayco}^${params.transactionId}^${params.amount}^${params.currency}`
  return createHmac('sha256', EPAYCO_CONFIG.privateKey)
    .update(data)
    .digest('hex')
}

/**
 * Verificar firma de respuesta de ePayco
 */
export function verifyEpaycoSignature(
  receivedSignature: string,
  params: {
    custId: string
    refPayco: string
    transactionId: string
    amount: string
    currency: string
  }
): boolean {
  const expectedSignature = generateEpaycoSignature({
    ...params,
    pKey: EPAYCO_CONFIG.pKey,
  })
  return receivedSignature === expectedSignature
}

/**
 * Convertir estado de ePayco a estado normalizado
 */
export function normalizeEpaycoStatus(
  status: EpaycoTransactionStatus
): 'pending' | 'approved' | 'declined' | 'error' {
  const statusMap: Record<EpaycoTransactionStatus, 'pending' | 'approved' | 'declined' | 'error'> =
    {
      Aceptada: 'approved',
      Rechazada: 'declined',
      Pendiente: 'pending',
      Fallida: 'error',
      Reversada: 'declined',
      Retenida: 'pending',
      Iniciada: 'pending',
      Expirada: 'declined',
      Abandonada: 'declined',
      Cancelada: 'declined',
      Antifraude: 'declined',
    }
  return statusMap[status] || 'error'
}

// ============================================
// API DE EPAYCO
// ============================================

const EPAYCO_API_URL = 'https://secure.epayco.co'
const EPAYCO_API_REST = 'https://api.secure.epayco.co'

/**
 * Generar configuración para el checkout de ePayco
 * Esta configuración se usa en el frontend con el widget de ePayco
 */
export function getEpaycoCheckoutConfig(request: {
  amount: number
  name: string
  description: string
  currency: EpaycoCurrency
  invoice: string
  responseUrl: string
  confirmationUrl: string
  tax?: number
  taxBase?: number
  external?: boolean
}): EpaycoCheckoutConfig {
  return {
    key: EPAYCO_CONFIG.publicKey,
    amount: request.amount,
    name: request.name,
    description: request.description,
    currency: request.currency,
    country: 'CO',
    invoice: request.invoice,
    tax: request.tax || 0,
    taxBase: request.taxBase || request.amount,
    external: request.external ?? true,
    confirmation: request.confirmationUrl,
    response: request.responseUrl,
    lang: 'es',
    test: EPAYCO_CONFIG.test,
  }
}

/**
 * Crear URL de checkout de ePayco
 * Esta URL redirige al usuario al checkout hospedado de ePayco
 */
export async function createEpaycoCheckoutUrl(
  request: EpaycoTransactionRequest
): Promise<EpaycoPaymentResponse> {
  try {
    // ePayco usa un sistema de checkout con redirect
    // Los parámetros se pasan en la URL o mediante el SDK de JavaScript

    const params = new URLSearchParams({
      p_cust_id_cliente: EPAYCO_CONFIG.publicKey,
      p_key: EPAYCO_CONFIG.pKey,
      p_id_invoice: request.invoice,
      p_description: request.description,
      p_amount: request.amount.toString(),
      p_amount_base: request.amountBase.toString(),
      p_tax: (request.tax || 0).toString(),
      p_currency_code: request.currency,
      p_test_request: EPAYCO_CONFIG.test ? 'TRUE' : 'FALSE',
      p_url_response: request.urlResponse,
      p_url_confirmation: request.urlConfirmation,
      p_confirm_method: request.methodConfirmation || 'POST',
      p_billing_name: request.name,
      p_billing_lastname: request.lastName,
      p_billing_email: request.email,
      p_billing_phone: request.phone || '',
      p_billing_doc_type: request.docType || 'CC',
      p_billing_doc_number: request.docNumber || '',
      p_billing_address: request.address || '',
      p_billing_city: request.city || '',
      p_billing_country: request.country || 'CO',
      p_extra1: request.extra1 || '',
      p_extra2: request.extra2 || '',
      p_extra3: request.extra3 || '',
    })

    const checkoutUrl = `${EPAYCO_API_URL}/checkout.php?${params.toString()}`

    return {
      success: true,
      checkoutUrl,
      reference: request.invoice,
    }
  } catch (error) {
    console.error('Error creando checkout ePayco:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Crear pago con PayPal via ePayco
 */
export async function createEpaycoPayPalPayment(request: {
  amount: number
  currency: EpaycoCurrency
  description: string
  invoice: string
  customerName: string
  customerLastName: string
  customerEmail: string
  responseUrl: string
  confirmationUrl: string
  metadata?: {
    userId?: string
    productType?: string
    productId?: string
  }
}): Promise<EpaycoPaymentResponse> {
  try {
    const checkoutResponse = await createEpaycoCheckoutUrl({
      amount: request.amount,
      amountBase: request.amount,
      tax: 0,
      currency: request.currency,
      description: request.description,
      name: request.customerName,
      lastName: request.customerLastName,
      email: request.customerEmail,
      invoice: request.invoice,
      urlResponse: request.responseUrl,
      urlConfirmation: request.confirmationUrl,
      methodConfirmation: 'POST',
      extra1: request.metadata?.userId || '',
      extra2: request.metadata?.productType || '',
      extra3: request.metadata?.productId || '',
    })

    return checkoutResponse
  } catch (error) {
    console.error('Error creando pago PayPal via ePayco:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Crear pago con tarjeta internacional via ePayco
 */
export async function createEpaycoCardPayment(request: {
  amount: number
  currency: EpaycoCurrency
  description: string
  invoice: string
  customerName: string
  customerLastName: string
  customerEmail: string
  customerPhone?: string
  responseUrl: string
  confirmationUrl: string
  metadata?: {
    userId?: string
    productType?: string
    productId?: string
  }
}): Promise<EpaycoPaymentResponse> {
  try {
    const checkoutResponse = await createEpaycoCheckoutUrl({
      amount: request.amount,
      amountBase: request.amount,
      tax: 0,
      currency: request.currency,
      description: request.description,
      name: request.customerName,
      lastName: request.customerLastName,
      email: request.customerEmail,
      phone: request.customerPhone,
      invoice: request.invoice,
      urlResponse: request.responseUrl,
      urlConfirmation: request.confirmationUrl,
      methodConfirmation: 'POST',
      extra1: request.metadata?.userId || '',
      extra2: request.metadata?.productType || '',
      extra3: request.metadata?.productId || '',
    })

    return checkoutResponse
  } catch (error) {
    console.error('Error creando pago con tarjeta via ePayco:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Consultar estado de transacción por referencia
 */
export async function getEpaycoTransactionByReference(
  reference: string
): Promise<EpaycoTransaction | null> {
  try {
    const response = await fetch(
      `${EPAYCO_API_REST}/transaction/response.json?ref_payco=${reference}&public_key=${EPAYCO_CONFIG.publicKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Error consultando transacción: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      return null
    }

    return data as EpaycoTransaction
  } catch (error) {
    console.error('Error consultando transacción ePayco:', error)
    return null
  }
}

/**
 * Consultar estado de transacción por ref_payco
 */
export async function getEpaycoTransaction(refPayco: string): Promise<EpaycoTransaction | null> {
  try {
    const response = await fetch(
      `${EPAYCO_API_REST}/transaction/response.json?ref_payco=${refPayco}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Error consultando transacción: ${response.statusText}`)
    }

    const data = await response.json()
    return data as EpaycoTransaction
  } catch (error) {
    console.error('Error consultando transacción ePayco:', error)
    return null
  }
}

// ============================================
// SUSCRIPCIONES (Recurrentes con ePayco)
// ============================================

export interface EpaycoSubscriptionPlan {
  idPlan: string
  name: string
  description: string
  amount: number
  currency: EpaycoCurrency
  interval: 'day' | 'week' | 'month' | 'year'
  intervalCount: number
  trialDays: number
}

export interface EpaycoSubscription {
  id: string
  status: 'active' | 'inactive' | 'cancelled'
  planId: string
  customerId: string
  created: string
}

/**
 * Crear plan de suscripción en ePayco
 * Los planes se crean una vez y luego se asocian a clientes
 */
export async function createEpaycoSubscriptionPlan(plan: {
  name: string
  description: string
  amount: number
  currency: EpaycoCurrency
  interval: 'month' | 'year'
  trialDays?: number
}): Promise<{ success: boolean; planId?: string; error?: string }> {
  // NOTA: ePayco requiere crear planes mediante su dashboard o API REST
  // Esta función es un placeholder para cuando se implemente
  console.log('createEpaycoSubscriptionPlan: Por implementar', plan)
  return {
    success: false,
    error: 'Suscripciones de ePayco requieren configuración previa en el dashboard',
  }
}

/**
 * Suscribir cliente a un plan
 */
export async function createEpaycoSubscription(request: {
  planId: string
  customerEmail: string
  customerName: string
  cardToken: string
}): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  // NOTA: Requiere tokenización previa de tarjeta
  console.log('createEpaycoSubscription: Por implementar', request)
  return {
    success: false,
    error: 'Suscripciones de ePayco requieren implementación adicional',
  }
}

// ============================================
// WEBHOOKS / CONFIRMACIÓN
// ============================================

export interface EpaycoWebhookPayload {
  x_cust_id_cliente: string
  x_ref_payco: string
  x_id_invoice: string
  x_description: string
  x_amount: string
  x_amount_country: string
  x_amount_ok: string
  x_amount_base: string
  x_tax: string
  x_currency_code: string
  x_bank_name: string
  x_cardnumber: string
  x_quotas: string
  x_response: EpaycoTransactionStatus
  x_response_reason_text: string
  x_approval_code: string
  x_transaction_id: string
  x_fecha_transaccion: string
  x_transaction_date: string
  x_cod_response: string
  x_cod_transaction_state: string
  x_business: string
  x_franchise: string
  x_customer_doctype: string
  x_customer_document: string
  x_customer_name: string
  x_customer_lastname: string
  x_customer_email: string
  x_customer_phone: string
  x_customer_movil: string
  x_customer_country: string
  x_customer_city: string
  x_customer_address: string
  x_customer_ip: string
  x_test_request: string
  x_signature: string
  x_extra1?: string
  x_extra2?: string
  x_extra3?: string
}

/**
 * Verificar firma de confirmación de ePayco
 * Fórmula: sha256(p_cust_id_cliente + ^ + p_key + ^ + x_ref_payco + ^ + x_transaction_id + ^ + x_amount + ^ + x_currency_code)
 */
export function verifyEpaycoWebhookSignature(payload: EpaycoWebhookPayload): boolean {
  const data = [
    payload.x_cust_id_cliente,
    EPAYCO_CONFIG.pKey,
    payload.x_ref_payco,
    payload.x_transaction_id,
    payload.x_amount,
    payload.x_currency_code,
  ].join('^')

  const expectedSignature = createHmac('sha256', EPAYCO_CONFIG.privateKey || 'sha256')
    .update(data)
    .digest('hex')

  return payload.x_signature === expectedSignature
}

/**
 * Parsear y validar payload de webhook
 */
export function parseEpaycoWebhook(body: Record<string, string>): {
  valid: boolean
  payload?: EpaycoWebhookPayload
  normalizedStatus?: 'pending' | 'approved' | 'declined' | 'error'
  error?: string
} {
  try {
    const payload = body as unknown as EpaycoWebhookPayload

    // Verificar campos requeridos
    if (!payload.x_ref_payco || !payload.x_transaction_id) {
      return { valid: false, error: 'Campos requeridos faltantes' }
    }

    // Verificar firma
    if (!verifyEpaycoWebhookSignature(payload)) {
      return { valid: false, error: 'Firma inválida' }
    }

    return {
      valid: true,
      payload,
      normalizedStatus: normalizeEpaycoStatus(payload.x_response),
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Error parseando webhook',
    }
  }
}

// ============================================
// UTILIDADES PARA FRONTEND
// ============================================

/**
 * Script de ePayco para cargar en el frontend
 */
export const EPAYCO_CHECKOUT_SCRIPT = 'https://checkout.epayco.co/checkout.js'

/**
 * Generar datos para el botón de checkout de ePayco
 */
export function getEpaycoButtonData(config: EpaycoCheckoutConfig): Record<string, string> {
  return {
    'data-epayco-key': config.key,
    'data-epayco-amount': config.amount.toString(),
    'data-epayco-name': config.name,
    'data-epayco-description': config.description,
    'data-epayco-currency': config.currency,
    'data-epayco-country': config.country,
    'data-epayco-invoice': config.invoice,
    'data-epayco-tax': (config.tax || 0).toString(),
    'data-epayco-tax-base': (config.taxBase || config.amount).toString(),
    'data-epayco-external': (config.external ?? true).toString(),
    'data-epayco-response': config.response || '',
    'data-epayco-confirmation': config.confirmation || '',
    'data-epayco-test': (config.test ?? EPAYCO_CONFIG.test).toString(),
    'data-epayco-autoclick': (config.autoclick ?? false).toString(),
  }
}
