import { moneyMinor, type MembershipCurrency, type MembershipInterval } from "./membership-billing";
import { eligibleTrialDays } from "./membership-intent";
import { getPayPalPlanId } from "./paypal";
import { prisma } from "./prisma";
import { client } from "./sanity/client";

export async function getMembershipQuote(
  userId: string,
  tierId: string,
  interval: unknown,
  currency: unknown
) {
  if (
    !["monthly", "yearly"].includes(String(interval)) ||
    !["USD", "EUR"].includes(String(currency))
  ) {
    throw new Error("Período o moneda no disponible");
  }
  const billingInterval = interval as MembershipInterval;
  const selectedCurrency = currency as MembershipCurrency;
  const tier = await client.withConfig({ useCdn: false }).fetch<{
    _id: string;
    name: string;
    slug?: { current?: string };
    active?: boolean;
    pricing?: Record<string, number>;
    trialPeriod?: { enabled?: boolean; durationDays?: number };
  } | null>('*[_type == "membershipTier" && _id == $tierId && active == true][0]{_id,name,slug,active,pricing,trialPeriod}', { tierId }, { cache: "no-store" });
  if (!tier?.active || !tier.slug?.current) {
    throw new Error("Plan no disponible");
  }
  const priceKey = `${billingInterval === "yearly" ? "yearly" : "monthly"}Price${selectedCurrency}`;
  const amount = tier.pricing?.[priceKey];
  if (typeof amount !== "number" || moneyMinor(amount) <= 0) {
    throw new Error("Este plan no tiene precio en la moneda seleccionada");
  }
  const previousTrial = await prisma.subscription.findFirst({
    where: { userId, trialEnd: { not: null } },
    select: { id: true },
  });
  const trialDays = eligibleTrialDays(tier, !!previousTrial);
  return {
    tierId: tier._id,
    tierName: tier.name,
    tierSlug: tier.slug.current,
    amount,
    currency: selectedCurrency,
    billingInterval,
    trialDays,
    planId: getPayPalPlanId(tier.slug.current, billingInterval, selectedCurrency),
  };
}
