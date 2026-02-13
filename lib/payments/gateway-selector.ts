/**
 * Payment Gateway Selector
 * Selecciona la pasarela apropiada según método de pago y región
 *
 * Estrategia de pagos:
 * - Nequi → Nequi API (si está configurado) o Wompi (fallback)
 * - Tarjetas colombianas (COP) → Wompi
 * - PSE → Wompi
 * - PayPal → PayPal directo
 * - Tarjetas internacionales (USD) → PayPal
 */

import { NequiAdapter } from './adapters/nequi-adapter'
import { PayPalAdapter } from './adapters/paypal-adapter'
import { WompiAdapter } from './adapters/wompi-adapter'
import { PaymentGateway } from './gateway-interface'
import { PaymentMethodType, Currency } from './types'

// Instancias singleton de cada adaptador
const gateways = {
  wompi: new WompiAdapter(),
  paypal: new PayPalAdapter(),
  nequi: new NequiAdapter(),
}

export type GatewayName = keyof typeof gateways

/**
 * Obtiene un gateway por nombre
 */
export function getGateway(name: GatewayName): PaymentGateway {
  const gateway = gateways[name]
  if (!gateway) {
    throw new Error(`Unknown payment gateway: ${name}`)
  }
  return gateway
}

/**
 * Selecciona el gateway apropiado para un método de pago y moneda
 *
 * Reglas de selección:
 * - Nequi + COP → Nequi API (si configurado) o Wompi
 * - Tarjeta + COP → Wompi
 * - PSE + COP → Wompi
 * - PayPal → PayPal directo
 * - Tarjeta + USD → PayPal
 */
export function getGatewayForPayment(
  paymentMethod: PaymentMethodType,
  currency: Currency
): PaymentGateway {
  // Nequi directo → Nequi API (solo COP)
  if (paymentMethod === 'NEQUI' && currency === 'COP') {
    if (gateways.nequi.isConfigured()) {
      return gateways.nequi
    }
    // Fallback a Wompi si Nequi API no está configurado
    // Wompi soporta pagos con Nequi a través de su checkout
    return gateways.wompi
  }

  // Tarjetas colombianas → Wompi (solo COP)
  if (paymentMethod === 'CARD' && currency === 'COP') {
    return gateways.wompi
  }

  // PSE → Wompi (solo COP, transferencia bancaria colombiana)
  if (paymentMethod === 'PSE' && currency === 'COP') {
    return gateways.wompi
  }

  // Transferencia bancaria → Wompi (Colombia)
  if (paymentMethod === 'BANK_TRANSFER' && currency === 'COP') {
    return gateways.wompi
  }

  // PayPal → PayPal directo (COP o USD)
  if (paymentMethod === 'PAYPAL') {
    return gateways.paypal
  }

  // Tarjetas internacionales → PayPal (USD)
  if (paymentMethod === 'CARD' && currency === 'USD') {
    return gateways.paypal
  }

  // Default: Wompi para COP, PayPal para USD
  if (currency === 'USD') {
    return gateways.paypal
  }

  return gateways.wompi
}

/**
 * Obtiene los métodos de pago disponibles para una moneda
 */
export function getAvailablePaymentMethods(currency: Currency): {
  method: PaymentMethodType
  gateway: GatewayName
  label: string
}[] {
  const methods: { method: PaymentMethodType; gateway: GatewayName; label: string }[] = []

  if (currency === 'COP') {
    // Colombia - Pesos colombianos
    methods.push(
      { method: 'CARD', gateway: 'wompi', label: 'Tarjeta de Crédito/Débito' },
      {
        method: 'NEQUI',
        gateway: gateways.nequi.isConfigured() ? 'nequi' : 'wompi',
        label: 'Nequi',
      },
      { method: 'PSE', gateway: 'wompi', label: 'PSE (Transferencia)' },
      { method: 'PAYPAL', gateway: 'paypal', label: 'PayPal' }
    )
  } else if (currency === 'USD') {
    // Internacional - Dólares
    methods.push(
      { method: 'PAYPAL', gateway: 'paypal', label: 'PayPal' },
      { method: 'CARD', gateway: 'paypal', label: 'Credit/Debit Card' }
    )
  }

  return methods
}

/**
 * Verifica si un gateway específico está configurado
 */
export function isGatewayConfigured(name: GatewayName): boolean {
  return gateways[name]?.isConfigured() ?? false
}

/**
 * Obtiene todos los gateways configurados
 */
export function getConfiguredGateways(): GatewayName[] {
  return (Object.keys(gateways) as GatewayName[]).filter((name) =>
    gateways[name].isConfigured()
  )
}
