import { COMMERCIAL_POLICY_VERSION } from "./commercial-policy";
import { moneyMinor, type MembershipCurrency, type MembershipInterval } from "./membership-billing";

export type MembershipIntent = {
  membershipFlowVersion: 2;
  billingInterval: MembershipInterval;
  recurringAmount: number;
  currency: MembershipCurrency;
  paypalPlanId: string;
  paypalSubscriptionId?: string;
  approvalUrl?: string;
  freeTrial: boolean;
  trialDays: number;
  trialEndsAt: string | null;
  acceptedTermsVersion: string;
  acceptedAt: string;
  acceptedRecurring: true;
  customerEmail: string;
  customerName: string;
  [key: string]: unknown;
};

export function membershipIntent(value: unknown): MembershipIntent {
  const data = value as MembershipIntent | null;
  if (
    !data ||
    data.membershipFlowVersion !== 2 ||
    !["monthly", "yearly"].includes(data.billingInterval) ||
    !["USD", "EUR"].includes(data.currency) ||
    typeof data.paypalPlanId !== "string" ||
    !data.paypalPlanId ||
    data.acceptedRecurring !== true ||
    !data.acceptedTermsVersion ||
    moneyMinor(data.recurringAmount) <= 0 ||
    typeof data.freeTrial !== "boolean" ||
    (data.freeTrial &&
      (!Number.isInteger(data.trialDays) ||
        data.trialDays <= 0 ||
        !Number.isFinite(Date.parse(data.trialEndsAt || ""))))
  ) {
    throw new Error("La membresía requiere revisión antes de activarse");
  }
  return data;
}

export function assertRecurringConsent(body: Record<string, unknown>) {
  if (
    body.acceptedTerms !== true ||
    body.acceptedRecurring !== true ||
    body.termsVersion !== COMMERCIAL_POLICY_VERSION
  ) {
    throw new Error("Revisa las condiciones y autoriza expresamente la renovación recurrente");
  }
}

export function eligibleTrialDays(
  tier: { trialPeriod?: { enabled?: boolean; durationDays?: number } },
  usedTrial: boolean
) {
  if (usedTrial || !tier.trialPeriod?.enabled) {
    return 0;
  }
  const days = tier.trialPeriod.durationDays;
  if (!Number.isInteger(days) || (days as number) < 1 || (days as number) > 90) {
    throw new Error("La duración de prueba del plan requiere revisión");
  }
  return days as number;
}
