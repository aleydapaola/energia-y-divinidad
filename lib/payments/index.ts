/**
 * Payment Gateway Module
 * Exports públicos del módulo de pagos
 *
 * Este módulo proporciona una interfaz unificada para las pasarelas de pago:
 * - Wompi (Colombia - COP, tarjetas colombianas y Nequi)
 * - PayPal (Internacional y Colombia - COP/USD)
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
export { PayPalAdapter } from './adapters/paypal-adapter'
export { NequiAdapter } from './adapters/nequi-adapter'
