import type { Prisma } from "@prisma/client";

/** One atomic delivery path for the existing subscription and membership entitlement. */
export async function createMembershipEntitlement(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; itemId: string; itemName: string; currency: string };
    userId: string;
    amount: number;
    interval: "monthly" | "yearly";
    provider: string;
    paypalSubscriptionId?: string | null;
    periodStart: Date;
    periodEnd: Date;
    trialEnd?: Date | null;
    lastChargeDate?: Date | null;
    nextChargeDate?: Date | null;
    wompiPaymentSourceId?: string | null;
    wompiCardLastFour?: string | null;
    wompiCardBrand?: string | null;
  }
) {
  const { order, userId } = input;
  if (!(input.periodEnd > input.periodStart)) {
    throw new Error("Período de membresía no válido");
  }
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-user:${userId}`}))`;
  const delivered = await tx.entitlement.findFirst({
    where: { orderId: order.id, type: "MEMBERSHIP" },
    include: { subscription: true },
  });
  if (delivered?.subscription) {
    return delivered.subscription;
  }
  const existing = await tx.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
      OR: [{ currentPeriodEnd: { gt: new Date() } }, { cancelledAt: null }],
    },
  });
  if (existing) {
    throw new Error("Ya existe una membresía o renovación pendiente para esta cuenta");
  }
  const subscription = await tx.subscription.create({
    data: {
      userId,
      membershipTierId: order.itemId,
      membershipTierName: order.itemName,
      status: input.trialEnd ? "TRIAL" : "ACTIVE",
      billingInterval: input.interval === "yearly" ? "YEARLY" : "MONTHLY",
      amount: input.amount,
      currency: order.currency,
      paymentProvider: input.provider,
      paypalSubscriptionId: input.paypalSubscriptionId,
      startDate: input.periodStart,
      currentPeriodStart: input.periodStart,
      currentPeriodEnd: input.periodEnd,
      trialEnd: input.trialEnd,
      lastChargeDate: input.lastChargeDate,
      nextChargeDate: input.nextChargeDate,
      wompiPaymentSourceId: input.wompiPaymentSourceId,
      wompiCardLastFour: input.wompiCardLastFour,
      wompiCardBrand: input.wompiCardBrand,
    },
  });
  await tx.entitlement.create({
    data: {
      userId,
      type: "MEMBERSHIP",
      resourceId: order.itemId,
      resourceName: order.itemName,
      expiresAt: input.periodEnd,
      subscriptionId: subscription.id,
      orderId: order.id,
    },
  });
  return subscription;
}
