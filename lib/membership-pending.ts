import { COMMERCIAL_POLICY_VERSION } from "./commercial-policy";
import { assertMembershipAgreement, assertMembershipPlan, moneyMinor } from "./membership-billing";
import { membershipIntent } from "./membership-intent";
import { getPayPalBillingPlan, getPayPalSubscriptionDetails } from "./paypal";
import { prisma } from "./prisma";

/** Read-only recovery: never create, cancel, charge or grant access to an agreement here. */
export async function getPendingMembership(userId: string) {
  if (!userId) {
    throw new Error("Inicia sesión para recuperar tu autorización");
  }
  const order = await prisma.order.findFirst({
    where: { userId, orderType: "MEMBERSHIP", paymentStatus: { in: ["PENDING", "PROCESSING"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!order) {
    return null;
  }
  if (
    order.userId !== userId ||
    order.orderType !== "MEMBERSHIP" ||
    order.paymentMethod !== "PAYPAL_DIRECT"
  ) {
    throw new Error("Pedido no disponible");
  }
  const intent = membershipIntent(order.metadata);
  if (
    !intent.paypalSubscriptionId ||
    intent.acceptedTermsVersion !== COMMERCIAL_POLICY_VERSION ||
    intent.currency !== order.currency ||
    moneyMinor(Number(order.amount)) !== (intent.freeTrial ? 0 : moneyMinor(intent.recurringAmount))
  ) {
    throw new Error("La autorización requiere revisión personal");
  }
  const active = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
      OR: [{ currentPeriodEnd: { gt: new Date() } }, { cancelledAt: null }],
    },
  });
  if (active && active.paypalSubscriptionId !== intent.paypalSubscriptionId) {
    throw new Error("Ya hay otra membresía vigente; consulta con Aleyda");
  }
  const details = await getPayPalSubscriptionDetails(intent.paypalSubscriptionId);
  assertMembershipAgreement(details, {
    subscriptionId: intent.paypalSubscriptionId,
    orderId: order.id,
    planId: intent.paypalPlanId,
    trialEndsAt: intent.trialEndsAt,
  });
  assertMembershipPlan(
    await getPayPalBillingPlan(intent.paypalPlanId),
    {
      planId: intent.paypalPlanId,
      amount: intent.recurringAmount,
      currency: intent.currency,
      interval: intent.billingInterval,
    },
    { newAgreement: details!.status === "APPROVAL_PENDING" }
  );
  let action: { href: string; label: string } | null = null;
  if (
    details!.status === "APPROVAL_PENDING" &&
    (!intent.freeTrial || Date.parse(intent.trialEndsAt!) > Date.now())
  ) {
    const url = new URL(details!.approvalUrl || intent.approvalUrl || "");
    const origin =
      process.env.VERCEL_ENV === "production"
        ? "https://www.paypal.com"
        : "https://www.sandbox.paypal.com";
    if (url.origin !== origin || url.username || url.password) {
      throw new Error("Destino de autorización no válido");
    }
    action = { href: url.toString(), label: "Retomar esta autorización en PayPal" };
  } else if (["ACTIVE", "APPROVED"].includes(details!.status)) {
    action = {
      href: `/api/checkout/paypal-subscription/activate?orderId=${encodeURIComponent(order.id)}`,
      label: "Comprobar autorización ya aprobada",
    };
  }
  return {
    orderNumber: order.orderNumber,
    name: order.itemName,
    createdAt: order.createdAt,
    amount: intent.recurringAmount,
    currency: intent.currency,
    interval: intent.billingInterval,
    freeTrial: intent.freeTrial,
    firstChargeAt: intent.trialEndsAt,
    providerStatus: details!.status,
    action,
  };
}
