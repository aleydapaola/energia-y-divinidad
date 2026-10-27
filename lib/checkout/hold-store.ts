import type { Prisma } from "@prisma/client";

export const CHECKOUT_HOLD_MINUTES = 20;

export function requiresCheckoutHold(order: { orderType?: string; metadata?: unknown }) {
  const metadata = (order.metadata || {}) as Record<string, unknown>;
  return (
    order.orderType === "EVENT" ||
    (order.orderType === "SESSION" && metadata.productType !== "pack" && !!metadata.scheduledAt)
  );
}

// Never expire an in-flight capture or a reported bank transfer automatically.
// A timeout is not proof that payment failed.
export function activeCheckoutHoldWhere(excludeOrderId?: string): Prisma.CheckoutHoldWhereInput {
  return {
    ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
    OR: [
      { state: "HELD", expiresAt: { gt: new Date() } },
      { state: { in: ["CAPTURING", "REPORTED"] } },
    ],
  };
}

export function checkoutHoldStatus(
  hold: { state: string; expiresAt: Date } | null | undefined,
  now = Date.now()
) {
  if (!hold) {
    return null;
  }
  const expired = hold.state === "HELD" && hold.expiresAt.getTime() <= now;
  return {
    state: hold.state,
    expiresAt: hold.expiresAt.toISOString(),
    expired,
    canPay: hold.state === "HELD" && !expired,
  };
}

export async function consumeCheckoutHold(tx: Prisma.TransactionClient, orderId: string) {
  await tx.checkoutHold.updateMany({ where: { orderId }, data: { state: "CONSUMED" } });
}
