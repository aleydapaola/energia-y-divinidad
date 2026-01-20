/**
 * Payment Gateway Selector
 * Selecciona la pasarela apropiada según método de pago y región
 *
 * Estrategia de pagos para Colombia (CLAUDE.md):
 * - Nequi → Nequi API (si está configurado) o Wompi (fallback)
 * - Tarjetas colombianas (COP) → Wompi
 * - PSE → Wompi
 * - PayPal → ePayco
 * - Tarjetas internacionales (USD) → ePayco
 */

import { PaymentGateway } from './gateway-interface'
import { PaymentMethodType, Currency } from './types'
import { WompiAdapter } from './adapters/wompi-adapter'
import { EpaycoAdapter } from './adapters/epayco-adapter'
import { NequiAdapter } from './adapters/nequi-adapter'

// Instancias singleton de cada adaptador
const gateways = {
  wompi: new WompiAdapter(),
  epayco: new EpaycoAdapter(),
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
 * Reglas de selección según CLAUDE.md:
 * - Nequi + COP → Nequi API (si configurado) o Wompi
 * - Tarjeta + COP → Wompi
 * - PSE + COP → Wompi
 * - PayPal → ePayco
 * - Tarjeta + USD → ePayco
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

  // PayPal → ePayco (COP o USD)
  if (paymentMethod === 'PAYPAL') {
    return gateways.epayco
  }

  // Efectivo (Efecty, Baloto) → ePayco
  if (paymentMethod === 'CASH') {
    return gateways.epayco
  }

  // Tarjetas internacionales → ePayco (USD)
  if (paymentMethod === 'CARD' && currency === 'USD') {
    return gateways.epayco
  }

  // Default: ePayco para cualquier otro caso internacional
  return gateways.epayco
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
      { method: 'PAYPAL', gateway: 'epayco', label: 'PayPal' }
    )
  } else if (currency === 'USD') {
    // Internacional - Dólares
    methods.push(
      { method: 'CARD', gateway: 'epayco', label: 'Credit/Debit Card' },
      { method: 'PAYPAL', gateway: 'epayco', label: 'PayPal' }
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
