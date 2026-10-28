import { Prisma } from "@prisma/client";

import {
  assertMembershipAgreement,
  assertMembershipPlan,
  approvedForTrial,
  verifiedSalePeriod,
} from "./membership-billing";
import { createMembershipEntitlement } from "./membership-fulfillment";
import { membershipIntent } from "./membership-intent";
import { deliverMembershipNotices, queueMembershipNotice } from "./membership-notifications";
import { getPayPalBillingPlan, getPayPalSaleDetails, getPayPalSubscriptionDetails } from "./paypal";
import { prisma } from "./prisma";

export const MEMBERSHIP_WEBHOOK_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.DENIED",
]);
export type MembershipEvent = { id: string; event_type: string; resource: Record<string, unknown> };

/** Both the return route and signed webhooks use provider-verified facts and the same atomic delivery. */
export async function reconcilePayPalMembership(input: {
  subscriptionId: string;
  requestingUserId?: string;
  expectedOrderId?: string;
  event?: MembershipEvent;
}) {
  const details = await getPayPalSubscriptionDetails(input.subscriptionId);
  if (!details?.customId) {
    throw new Error("No se pudo verificar la autorización de membresía");
  }
  const initial = await prisma.order.findUnique({
    where: { id: details.customId },
    include: { user: true },
  });
  if (
    !initial ||
    !initial.userId ||
    initial.orderType !== "MEMBERSHIP" ||
    initial.paymentMethod !== "PAYPAL_DIRECT" ||
    (input.requestingUserId && initial.userId !== input.requestingUserId) ||
    (input.expectedOrderId && initial.id !== input.expectedOrderId)
  ) {
    throw new Error("Pedido no disponible");
  }
  const intent = membershipIntent(initial.metadata);
  if (
    intent.currency !== initial.currency ||
    intent.paypalSubscriptionId !== input.subscriptionId
  ) {
    throw new Error("La autorización no coincide con el pedido");
  }
  assertMembershipAgreement(details, {
    subscriptionId: input.subscriptionId,
    orderId: initial.id,
    planId: intent.paypalPlanId,
    trialEndsAt: intent.trialEndsAt,
  });
  await assertMembershipPlan(await getPayPalBillingPlan(intent.paypalPlanId), {
    planId: intent.paypalPlanId,
    amount: intent.recurringAmount,
    currency: intent.currency,
    interval: intent.billingInterval,
  });
  const saleId =
    input.event?.event_type === "PAYMENT.SALE.COMPLETED" ? input.event.resource.id : undefined;
  const sale = typeof saleId === "string" ? await getPayPalSaleDetails(saleId) : null;
  if (saleId && sale?.id !== saleId) {
    throw new Error("No se pudo verificar el cobro de PayPal");
  }
  const paidPeriod = saleId
    ? verifiedSalePeriod(sale, details, {
        subscriptionId: input.subscriptionId,
        amount: intent.recurringAmount,
        currency: intent.currency,
        interval: intent.billingInterval,
      })
    : null;
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-user:${initial.userId}`}))`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: initial.id } });
      const currentIntent = membershipIntent(order.metadata);
      const providerTime = Date.parse(details.statusUpdatedAt || "");
      const recordedTime = Date.parse(String(currentIntent.paypalStatusUpdatedAt || ""));
      const isCurrent =
        !Number.isFinite(recordedTime) ||
        (Number.isFinite(providerTime) && providerTime >= recordedTime);
      const effectiveStatus = isCurrent
        ? details.status
        : String(currentIntent.paypalStatus || details.status);
      const terminal = ["CANCELLED", "EXPIRED"].includes(effectiveStatus);
      let subscription = await tx.subscription.findUnique({
        where: { paypalSubscriptionId: input.subscriptionId },
      });
      const eventKey = input.event ? `paypal-sub:${input.event.id}` : null;
      if (eventKey) {
        const existing = await tx.webhookEvent.findUnique({ where: { eventId: eventKey } });
        if (existing?.processed) {
          return {
            subscriptionId: subscription?.id,
            completed: order.paymentStatus === "COMPLETED",
          };
        }
      }
      let changed = false;
      let trialActivated = false;
      const now = new Date();
      if (!subscription) {
        const trialApproved =
          currentIntent.freeTrial &&
          !terminal &&
          approvedForTrial(details, currentIntent.trialEndsAt!, now);
        const paidApproved = !!paidPeriod?.isLatest;
        if (trialApproved || paidApproved) {
          if (order.paymentStatus !== "PENDING") {
            throw new Error("La entrega de este pedido requiere revisión");
          }
          subscription = await createMembershipEntitlement(tx, {
            order,
            userId: initial.userId!,
            amount: intent.recurringAmount,
            interval: intent.billingInterval,
            provider: "paypal_direct",
            paypalSubscriptionId: details.id,
            periodStart: paidApproved ? paidPeriod!.start : now,
            periodEnd: paidApproved ? paidPeriod!.end : new Date(intent.trialEndsAt!),
            trialEnd: intent.freeTrial ? new Date(intent.trialEndsAt!) : null,
            lastChargeDate: paidApproved ? paidPeriod!.start : null,
            nextChargeDate: paidApproved ? paidPeriod!.end : new Date(intent.trialEndsAt!),
          });
          // A late initial approval may already have its first verified payment.
          if (paidApproved && subscription.status === "TRIAL") {
            subscription = await tx.subscription.update({
              where: { id: subscription.id },
              data: { status: "ACTIVE" },
            });
          }
          trialActivated = !paidApproved;
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "COMPLETED",
              metadata: {
                ...currentIntent,
                membershipActivation: trialActivated ? "trial" : "paid",
                activatedAt: now.toISOString(),
              } as Prisma.InputJsonObject,
            },
          });
          changed = true;
        }
      }
      if (
        subscription &&
        (subscription.userId !== initial.userId || subscription.membershipTierId !== initial.itemId)
      ) {
        throw new Error("La membresía pertenece a otra compra");
      }
      if (subscription && sale && paidPeriod) {
        const reference = `PAYPAL-SALE-${sale.id}`;
        const existing = await tx.recurringCharge.findUnique({ where: { reference } });
        if (!existing) {
          await tx.recurringCharge.create({
            data: {
              subscriptionId: subscription.id,
              reference,
              externalId: sale.id,
              amount: intent.recurringAmount,
              currency: intent.currency,
              status: "COMPLETED",
              chargedAt: paidPeriod.start,
              completedAt: now,
            },
          });
          // Different webhook IDs for one sale must not extend access twice. Old sales remain ledger evidence only.
          if (
            paidPeriod.isLatest &&
            (!subscription.lastChargeDate ||
              paidPeriod.start > subscription.lastChargeDate ||
              changed)
          ) {
            if (
              subscription.cancelledAt &&
              subscription.currentPeriodEnd <= subscription.cancelledAt
            ) {
              throw new Error(
                "Cobro posterior a una retirada inmediata: revisión manual necesaria"
              );
            }
            subscription = await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: "ACTIVE",
                currentPeriodStart: paidPeriod.start,
                currentPeriodEnd: paidPeriod.end,
                lastChargeDate: paidPeriod.start,
                nextChargeDate: subscription.cancelledAt ? null : paidPeriod.end,
                chargeFailureCount: 0,
                chargeFailureReason: null,
              },
            });
            await tx.entitlement.updateMany({
              where: { subscriptionId: subscription.id, revoked: false },
              data: { expiresAt: paidPeriod.end },
            });
            await queueMembershipNotice(tx, {
              key: reference,
              kind: "payment",
              to: initial.user!.email!,
              orderNumber: initial.orderNumber,
              subscriptionId: subscription.id,
              plan: initial.itemName,
              amount: intent.recurringAmount,
              currency: intent.currency,
              interval: intent.billingInterval,
              periodEnd: paidPeriod.end,
              renewalStopped: !!subscription.cancelledAt || terminal,
            });
          }
        }
      }
      if (subscription && trialActivated) {
        await queueMembershipNotice(tx, {
          key: `trial:${initial.id}`,
          kind: "trial",
          to: initial.user!.email!,
          orderNumber: initial.orderNumber,
          subscriptionId: subscription.id,
          plan: initial.itemName,
          amount: intent.recurringAmount,
          currency: intent.currency,
          interval: intent.billingInterval,
          periodEnd: subscription.currentPeriodEnd,
        });
      }
      // Read current provider status rather than trusting the order of delivered event names.
      if (subscription && (isCurrent || terminal)) {
        const ended = subscription.currentPeriodEnd <= now;
        if (terminal) {
          const wasCancelled = !!subscription.cancelledAt;
          subscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              cancelledAt: subscription.cancelledAt || now,
              nextChargeDate: null,
              status: ended ? "CANCELLED" : subscription.status,
            },
          });
          if (!wasCancelled) {
            await queueMembershipNotice(tx, {
              key: `cancelled:${subscription.id}`,
              kind: "cancelled",
              to: initial.user!.email!,
              orderNumber: initial.orderNumber,
              subscriptionId: subscription.id,
              plan: initial.itemName,
              amount: intent.recurringAmount,
              currency: intent.currency,
              interval: intent.billingInterval,
              periodEnd: subscription.currentPeriodEnd,
            });
          }
        } else if (details.status === "SUSPENDED" || (details.failedPaymentsCount || 0) > 0) {
          subscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: ended ? "PAST_DUE" : subscription.status,
              nextChargeDate: null,
              chargeFailureCount: details.failedPaymentsCount || subscription.chargeFailureCount,
              chargeFailureReason: "PayPal informa de suspensión o fallo de cobro",
            },
          });
          await queueMembershipNotice(tx, {
            key: `failed:${subscription.id}:${details.lastFailedPaymentTime || details.statusUpdatedAt || "provider"}`,
            kind: "failed",
            to: initial.user!.email!,
            orderNumber: initial.orderNumber,
            subscriptionId: subscription.id,
            plan: initial.itemName,
            amount: intent.recurringAmount,
            currency: intent.currency,
            interval: intent.billingInterval,
            periodEnd: subscription.currentPeriodEnd,
          });
        }
      }
      // A signed early sale must be retried, not acknowledged before its local delivery exists.
      if (saleId && !subscription) {
        throw new Error("El primer cobro aún no se puede conciliar");
      }
      const latestOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (isCurrent) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            metadata: {
              ...membershipIntent(latestOrder.metadata),
              paypalStatus: details.status,
              paypalStatusUpdatedAt: details.statusUpdatedAt || null,
              nextBillingAt: subscription?.nextChargeDate?.toISOString() || null,
            } as Prisma.InputJsonObject,
          },
        });
      }
      if (eventKey && input.event) {
        await tx.webhookEvent.upsert({
          where: { eventId: eventKey },
          create: {
            provider: "paypal",
            eventId: eventKey,
            eventType: input.event.event_type,
            payload: input.event as unknown as Prisma.InputJsonObject,
            processed: true,
            processedAt: now,
          },
          update: { processed: true, processedAt: now, failed: false, errorMessage: null },
        });
      }
      return { subscriptionId: subscription?.id, completed: !!subscription };
    },
    { maxWait: 10000, timeout: 30000 }
  );
  if (result.subscriptionId) {
    await deliverMembershipNotices(result.subscriptionId).catch(() => undefined);
  }
  return result;
}

export async function processMembershipWebhook(event: MembershipEvent) {
  if (!MEMBERSHIP_WEBHOOK_EVENTS.has(event.event_type)) {
    return { ignored: true };
  }
  const subscriptionId = event.event_type.startsWith("PAYMENT.SALE.")
    ? event.resource.billing_agreement_id
    : event.resource.id;
  if (typeof subscriptionId !== "string" || !event.id) {
    throw new Error("Aviso de membresía incompleto");
  }
  try {
    return await reconcilePayPalMembership({ subscriptionId, event });
  } catch (error) {
    await prisma.webhookEvent.upsert({
      where: { eventId: `paypal-sub:${event.id}` },
      create: {
        provider: "paypal",
        eventId: `paypal-sub:${event.id}`,
        eventType: event.event_type,
        payload: event as unknown as Prisma.InputJsonObject,
        failed: true,
        errorMessage: "Conciliación de membresía pendiente de revisión o reintento",
      },
      update: {
        failed: true,
        retryCount: { increment: 1 },
        errorMessage: "Conciliación de membresía pendiente de revisión o reintento",
      },
    });
    throw error;
  }
}
