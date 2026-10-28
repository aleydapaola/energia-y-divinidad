// Explicit opt-in. Only unique ephemeral fixtures in the verified EYD Neon Preview.
// PayPal, mail delivery and all other external APIs are replaced with throwing stubs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

import { assertLocalDatabaseSafety } from "../scripts/local-database-safety.mjs";
import { assertLocalServiceSafety } from "../scripts/local-service-safety.mjs";
import { loadMembership } from "./helpers/membership-loader.mjs";

nextEnv.loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {
    throw new Error("Environment loading failed");
  },
});
assertLocalDatabaseSafety(process.env);
assertLocalServiceSafety(process.env);
const db = new PrismaClient({ log: [] });
const prefix = `eyd-membership-${randomUUID()}`;
const users = [`${prefix}-trial`, `${prefix}-paid`, `${prefix}-rollback`];
const orderIds = users.map((id) => id + "-order");
const providerIds = users.map((id) => id + "-agreement");
const failNetwork = async () => {
  throw new Error("External network not allowed in membership fixture QA");
};
const commonDeps = {
  "./prisma": { prisma: db },
  "./email-delivery": { deliverEmail: failNetwork },
  "./utils": { getAppUrl: () => "http://localhost:3000" },
};
const notices = loadMembership("lib/membership-notifications.ts", commonDeps);
const plan = {
  id: prefix + "-plan",
  status: "ACTIVE",
  billing_cycles: [
    {
      tenure_type: "REGULAR",
      total_cycles: 0,
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      pricing_scheme: { fixed_price: { value: "22.00", currency_code: "USD" } },
    },
  ],
};
const details = new Map();
const sales = new Map();
const service = loadMembership("lib/paypal-memberships.ts", {
  ...commonDeps,
  "./paypal": {
    getPayPalSubscriptionDetails: async (id) => details.get(id),
    getPayPalBillingPlan: async () => plan,
    getPayPalSaleDetails: async (id) => sales.get(id),
  },
  "./membership-notifications": {
    queueMembershipNotice: notices.queueMembershipNotice,
    deliverMembershipNotices: async () => {},
  },
});
try {
  for (let i = 0; i < users.length; i++) {
    await db.user.create({
      data: {
        id: users[i],
        email: `${users[i]}@example.invalid`,
        name: "PRUEBA EFÍMERA — NO REAL",
      },
    });
    const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    await db.order.create({
      data: {
        id: orderIds[i],
        userId: users[i],
        orderNumber: orderIds[i],
        orderType: "MEMBERSHIP",
        itemId: prefix + "-tier",
        itemName: "PRUEBA EFÍMERA — NO REAL",
        amount: i === 1 ? 22 : 0,
        currency: "USD",
        paymentMethod: "PAYPAL_DIRECT",
        paymentStatus: "PENDING",
        metadata: {
          membershipFlowVersion: 2,
          billingInterval: "monthly",
          recurringAmount: 22,
          currency: "USD",
          paypalPlanId: plan.id,
          paypalSubscriptionId: providerIds[i],
          freeTrial: i !== 1,
          trialDays: i === 1 ? 0 : 30,
          trialEndsAt: i === 1 ? null : trialEnd,
          acceptedRecurring: true,
          acceptedTermsVersion: "ephemeral-test",
          acceptedAt: new Date().toISOString(),
          customerEmail: `${users[i]}@example.invalid`,
          customerName: "PRUEBA EFÍMERA",
        },
      },
    });
    details.set(providerIds[i], {
      id: providerIds[i],
      customId: orderIds[i],
      planId: plan.id,
      status: "ACTIVE",
      startTime: trialEnd,
      nextBillingTime: trialEnd,
      statusUpdatedAt: new Date().toISOString(),
    });
  }
  await Promise.all(
    Array.from({ length: 2 }, () =>
      service.reconcilePayPalMembership({
        subscriptionId: providerIds[0],
        requestingUserId: users[0],
      })
    )
  );
  const trial = await db.subscription.findUniqueOrThrow({
    where: { paypalSubscriptionId: providerIds[0] },
  });
  assert.equal(trial.status, "TRIAL");
  assert.equal(await db.subscription.count({ where: { userId: users[0] } }), 1);
  assert.equal(await db.entitlement.count({ where: { orderId: orderIds[0] } }), 1);
  assert.equal(await db.recurringCharge.count({ where: { subscriptionId: trial.id } }), 0);
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { id: orderIds[0] } })).paymentStatus,
    "COMPLETED"
  );
  details.get(providerIds[0]).status = "CANCELLED";
  details.get(providerIds[0]).statusUpdatedAt = new Date(Date.now() + 1000).toISOString();
  await service.processMembershipWebhook({
    id: prefix + "-cancel",
    event_type: "BILLING.SUBSCRIPTION.CANCELLED",
    resource: { id: providerIds[0] },
  });
  const cancelled = await db.subscription.findUniqueOrThrow({ where: { id: trial.id } });
  assert.equal(cancelled.currentPeriodEnd.getTime(), trial.currentPeriodEnd.getTime());
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.nextChargeDate, null);
  assert.equal(
    (await db.entitlement.findFirstOrThrow({ where: { subscriptionId: trial.id } })).revoked,
    false
  );

  assert.equal(
    (await service.reconcilePayPalMembership({ subscriptionId: providerIds[1] })).completed,
    false
  );
  const paidAt = new Date(Date.now() - 60000);
  const end = new Date(paidAt);
  end.setUTCMonth(end.getUTCMonth() + 1);
  Object.assign(details.get(providerIds[1]), {
    startTime: paidAt.toISOString(),
    lastPaymentTime: paidAt.toISOString(),
    nextBillingTime: end.toISOString(),
  });
  const saleId = prefix + "-sale";
  sales.set(saleId, {
    id: saleId,
    state: "completed",
    billing_agreement_id: providerIds[1],
    create_time: paidAt.toISOString(),
    amount: { total: "22.00", currency: "USD" },
  });
  const saleEvent = (id) => ({
    id: prefix + "-" + id,
    event_type: "PAYMENT.SALE.COMPLETED",
    resource: { id: saleId, billing_agreement_id: providerIds[1] },
  });
  await Promise.all([
    service.processMembershipWebhook(saleEvent("sale-first")),
    service.processMembershipWebhook(saleEvent("sale-other-event")),
  ]);
  await service.processMembershipWebhook(saleEvent("sale-first"));
  const paid = await db.subscription.findUniqueOrThrow({
    where: { paypalSubscriptionId: providerIds[1] },
  });
  assert.equal(paid.status, "ACTIVE");
  assert.equal(paid.currentPeriodEnd.getTime(), end.getTime());
  assert.equal(await db.recurringCharge.count({ where: { subscriptionId: paid.id } }), 1);
  assert.equal(await db.entitlement.count({ where: { orderId: orderIds[1] } }), 1);

  const fulfillment = loadMembership("lib/membership-fulfillment.ts");
  const rollbackOrder = await db.order.findUniqueOrThrow({ where: { id: orderIds[2] } });
  await assert.rejects(
    db.$transaction(async (tx) => {
      await fulfillment.createMembershipEntitlement(tx, {
        order: rollbackOrder,
        userId: users[2],
        amount: 22,
        interval: "monthly",
        provider: "paypal_direct",
        paypalSubscriptionId: providerIds[2],
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
      });
      throw new Error("intentional membership rollback");
    }),
    /intentional membership rollback/
  );
  assert.equal(await db.subscription.count({ where: { userId: users[2] } }), 0);
  assert.equal(await db.entitlement.count({ where: { orderId: orderIds[2] } }), 0);
  console.log(
    "Preview membership QA passed: concurrent trial delivery, authenticated paid-only delivery, sale/event replay, cancellation retaining access, atomic rollback. Provider/mail APIs not called."
  );
} finally {
  const subs = await db.subscription.findMany({
    where: { userId: { in: users } },
    select: { id: true },
  });
  const subscriptionIds = subs.map((sub) => sub.id);
  await db.emailLog.deleteMany({
    where: { entityType: "subscription", entityId: { in: subscriptionIds } },
  });
  await db.webhookEvent.deleteMany({ where: { eventId: { startsWith: `paypal-sub:${prefix}` } } });
  await db.recurringCharge.deleteMany({ where: { subscriptionId: { in: subscriptionIds } } });
  await db.entitlement.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.subscription.deleteMany({ where: { userId: { in: users } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
