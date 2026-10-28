import type { PayPalBillingPlan, PayPalSubscriptionDetails } from "./paypal";

export type MembershipInterval = "monthly" | "yearly";
export type MembershipCurrency = "USD" | "EUR";

export function moneyMinor(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error("Importe no válido");
  }
  const number = typeof value === "number" ? value : Number(value);
  if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Importe no válido");
  }
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(Math.round(number * 100)) ||
    Math.abs(number * 100 - Math.round(number * 100)) > 0.000001
  ) {
    throw new Error("Importe no válido");
  }
  return Math.round(number * 100);
}

/** Provider periods are calendar periods, clamped at the end of short months. */
export function membershipPeriodEnd(start: Date, interval: MembershipInterval): Date {
  if (!Number.isFinite(start.getTime())) {
    throw new Error("Fecha de período no válida");
  }
  const end = new Date(start);
  const day = start.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + (interval === "yearly" ? 12 : 1));
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

export function assertMembershipPlan(
  plan: PayPalBillingPlan | null,
  quote: {
    planId: string;
    amount: number;
    currency: MembershipCurrency;
    interval: MembershipInterval;
  },
  options: { newAgreement?: boolean } = {}
) {
  if (
    !plan ||
    plan.id !== quote.planId ||
    !(options.newAgreement ? ["ACTIVE"] : ["ACTIVE", "INACTIVE"]).includes(plan.status)
  ) {
    throw new Error("El plan de PayPal no está disponible");
  }
  const regular = plan.billing_cycles?.filter((cycle) => cycle.tenure_type === "REGULAR") || [];
  if (
    regular.length !== 1 ||
    regular[0].frequency?.interval_unit !== (quote.interval === "yearly" ? "YEAR" : "MONTH") ||
    regular[0].frequency?.interval_count !== 1 ||
    regular[0].total_cycles !== 0 ||
    regular[0].pricing_scheme?.fixed_price?.currency_code !== quote.currency ||
    moneyMinor(regular[0].pricing_scheme?.fixed_price?.value) !== moneyMinor(quote.amount)
  ) {
    throw new Error("El precio, moneda o período del plan no coincide con la membresía");
  }
  if (
    options.newAgreement &&
    (plan.billing_cycles?.length !== 1 ||
      moneyMinor(plan.payment_preferences?.setup_fee?.value ?? 0) !== 0 ||
      Number(plan.taxes?.percentage || 0) !== 0 ||
      plan.quantity_supported === true)
  ) {
    throw new Error("El plan añade cobros o pruebas que no figuran en el resumen");
  }
}

export function assertMembershipAgreement(
  details: PayPalSubscriptionDetails | null,
  expected: { subscriptionId: string; orderId: string; planId: string; trialEndsAt?: string | null }
) {
  if (
    !details ||
    details.id !== expected.subscriptionId ||
    details.customId !== expected.orderId ||
    details.planId !== expected.planId ||
    (details.quantity !== undefined && details.quantity !== "1") ||
    details.planOverridden
  ) {
    throw new Error("La autorización de PayPal no corresponde a este pedido");
  }
  if (expected.trialEndsAt) {
    const start = Date.parse(details.startTime || "");
    const trialEnd = Date.parse(expected.trialEndsAt);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(trialEnd) ||
      Math.abs(start - trialEnd) > 60000
    ) {
      throw new Error("La fecha del primer cobro no coincide con la prueba aceptada");
    }
  }
}

export function approvedForTrial(
  details: PayPalSubscriptionDetails,
  trialEndsAt: string,
  now = new Date()
) {
  return ["ACTIVE", "APPROVED"].includes(details.status) && Date.parse(trialEndsAt) > now.getTime();
}

export function verifiedSalePeriod(
  sale: import("./paypal").PayPalSaleDetails | null,
  details: PayPalSubscriptionDetails,
  quote: {
    subscriptionId: string;
    amount: number;
    currency: MembershipCurrency;
    interval: MembershipInterval;
  },
  now = new Date()
) {
  if (
    !sale ||
    sale.state !== "completed" ||
    sale.billing_agreement_id !== quote.subscriptionId ||
    sale.amount?.currency !== quote.currency ||
    moneyMinor(sale.amount?.total) !== moneyMinor(quote.amount)
  ) {
    throw new Error("El cobro no corresponde al importe, moneda o autorización de esta membresía");
  }
  const start = new Date(sale.create_time || "");
  if (!Number.isFinite(start.getTime()) || start.getTime() > now.getTime() + 300000) {
    throw new Error("Fecha del cobro no válida");
  }
  const expectedEnd = membershipPeriodEnd(start, quote.interval);
  const next = new Date(details.nextBillingTime || "");
  const isLatest =
    !details.lastPaymentTime || Date.parse(details.lastPaymentTime) <= start.getTime() + 60000;
  if (!isLatest) {
    return { start, end: expectedEnd, isLatest: false };
  }
  if (
    Number.isFinite(next.getTime()) &&
    (next <= start || next.getTime() > expectedEnd.getTime() + 3 * 86400000)
  ) {
    throw new Error("El siguiente período de PayPal requiere revisión");
  }
  return { start, end: Number.isFinite(next.getTime()) ? next : expectedEnd, isLatest: true };
}
