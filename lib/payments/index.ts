/** PayPal provider integration. Bre-B is confirmed through its audited ADMIN flow. */

// Tipos compartidos
export * from "./types";

// Interfaz y clase base
export * from "./gateway-interface";

// Selector de gateway
export * from "./gateway-selector";

// Procesador de webhooks
export * from "./webhook-processor";

// Re-export adapters para acceso directo si es necesario
export { PayPalAdapter } from "./adapters/paypal-adapter";
