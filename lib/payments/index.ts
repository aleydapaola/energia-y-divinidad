/**
 * Payment Gateway Module
 * Exports públicos del módulo de pagos
 *
 * Este módulo proporciona una interfaz unificada para las pasarelas de pago de Colombia:
 * - Wompi (Colombia - COP, tarjetas colombianas y Nequi)
 * - ePayco (Internacional - COP/USD, PayPal)
 * - Nequi (Colombia - COP, pagos push directos)
 */

// Tipos compartidos
export * from './types'

// Interfaz y clase base
export * from './gateway-interface'

// Selector de gateway
export * from './gateway-selector'

// Procesador de webhooks
export * from './webhook-processor'

// Re-export adapters para acceso directo si es necesario
export { WompiAdapter } from './adapters/wompi-adapter'
export { EpaycoAdapter } from './adapters/epayco-adapter'
export { NequiAdapter } from './adapters/nequi-adapter'
