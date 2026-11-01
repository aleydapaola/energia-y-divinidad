import { PayPalAdapter } from "./adapters/paypal-adapter";

import type { PaymentGateway } from "./gateway-interface";
import type { PaymentMethodType, Currency } from "./types";

const paypal = new PayPalAdapter();
export type GatewayName = "paypal";
export function getGateway(name: GatewayName): PaymentGateway {
  if (name !== "paypal") {
    throw new Error("Método de pago retirado");
  }
  return paypal;
}
export function getGatewayForPayment(
  method: PaymentMethodType,
  currency: Currency
): PaymentGateway {
  if (!["PAYPAL", "CARD"].includes(method) || currency !== "USD") {
    throw new Error("Selecciona PayPal en USD o Bre-B en COP desde el checkout");
  }
  return paypal;
}
export function getAvailablePaymentMethods(currency: Currency) {
  return currency === "USD"
    ? [{ method: "PAYPAL" as const, gateway: "paypal" as const, label: "PayPal" }]
    : [];
}
export function isGatewayConfigured(name: GatewayName): boolean {
  return name === "paypal" && paypal.isConfigured();
}
export function getConfiguredGateways(): GatewayName[] {
  return paypal.isConfigured() ? ["paypal"] : [];
}
