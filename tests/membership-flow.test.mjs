import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const future = () => new Date(Date.now() + 30 * 86400000).toISOString();
function fixture() {
  const trialEnd = future();
  const state = {
    order: {
      id: "order-test",
      orderNumber: "PPLS-TEST",
      userId: "owner",
      user: { id: "owner", email: "test@example.com", name: "Test" },
      orderType: "MEMBERSHIP",
      itemId: "tier-1",
      itemName: "Esencia",
      currency: "USD",
      paymentMethod: "PAYPAL_DIRECT",
      paymentStatus: "PENDING",
      amount: 0,
      metadata: {
        membershipFlowVersion: 2,
        billingInterval: "monthly",
        recurringAmount: 22,
        currency: "USD",
        paypalPlanId: "P-TEST",
        paypalSubscriptionId: "I-TEST",
        freeTrial: true,
        trialDays: 30,
        trialEndsAt: trialEnd,
        acceptedRecurring: true,
        acceptedTermsVersion: "test-v1",
        acceptedAt: new Date().toISOString(),
        customerEmail: "test@example.com",
        customerName: "Test",
      },
    },
    sub: null,
    entitlements: [],
    charges: [],
    events: [],
    notices: [],
  };
  const db = {
    order: {
      findUnique: async ({ where }) =>
        where.id === state.order.id ? structuredClone(state.order) : null,
      findUniqueOrThrow: async ({ where }) => {
        assert.equal(where.id, state.order.id);
        return structuredClone(state.order);
      },
      findFirst: async () => state.order,
      update: async ({ data }) => {
        Object.assign(state.order, data);
        return structuredClone(state.order);
      },
    },
    subscription: {
      findUnique: async ({ where }) =>
        state.sub &&
        (!where.paypalSubscriptionId ||
          state.sub.paypalSubscriptionId === where.paypalSubscriptionId)
          ? structuredClone(state.sub)
          : null,
      findUniqueOrThrow: async () => structuredClone(state.sub),
      findFirst: async () => state.sub,
      create: async ({ data }) => {
        assert.equal(state.sub, null);
        state.sub = { ...data, id: "sub-1", cancelledAt: null, chargeFailureCount: 0 };
        return structuredClone(state.sub);
      },
      update: async ({ data }) => {
        Object.assign(state.sub, data);
        return structuredClone(state.sub);
      },
    },
    entitlement: {
      findFirst: async () =>
        state.entitlements[0] ? { ...state.entitlements[0], subscription: state.sub } : null,
      create: async ({ data }) => {
        const item = { ...data, id: "ent-1", revoked: false };
        state.entitlements.push(item);
        return item;
      },
      updateMany: async ({ data }) => {
        state.entitlements.forEach((item) => Object.assign(item, data));
        return { count: state.entitlements.length };
      },
    },
    recurringCharge: {
      findUnique: async ({ where }) =>
        state.charges.find((item) => item.reference === where.reference) || null,
      create: async ({ data }) => {
        state.charges.push(data);
        return data;
      },
    },
    webhookEvent: {
      findUnique: async ({ where }) =>
        state.events.find((item) => item.eventId === where.eventId) || null,
      upsert: async ({ where, create, update }) => {
        const old = state.events.find((item) => item.eventId === where.eventId);
        if (old) {
          Object.assign(old, update);
        } else {
          state.events.push(create);
        }
        return old || create;
      },
    },
    $executeRaw: async () => {},
  };
  db.$transaction = async (fn) => {
    const before = structuredClone(state);
    try {
      return await fn(db);
    } catch (error) {
      Object.assign(state, before);
      throw error;
    }
  };
  const provider = {
    details: {
      id: "I-TEST",
      customId: "order-test",
      planId: "P-TEST",
      status: "ACTIVE",
      startTime: trialEnd,
      statusUpdatedAt: new Date().toISOString(),
      nextBillingTime: trialEnd,
      failedPaymentsCount: 0,
    },
    sale: null,
    plan: {
      id: "P-TEST",
      status: "ACTIVE",
      billing_cycles: [
        {
          tenure_type: "REGULAR",
          total_cycles: 0,
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          pricing_scheme: { fixed_price: { value: "22.00", currency_code: "USD" } },
        },
      ],
    },
  };
  const deps = {
    "./prisma": { prisma: db },
    "./paypal": {
      getPayPalSubscriptionDetails: async () => structuredClone(provider.details),
      getPayPalBillingPlan: async () => structuredClone(provider.plan),
      getPayPalSaleDetails: async () => structuredClone(provider.sale),
    },
    "./membership-notifications": {
      queueMembershipNotice: async (_tx, notice) => {
        if (!state.notices.some((item) => item.key === notice.key)) {
          state.notices.push(notice);
        }
      },
      deliverMembershipNotices: async () => {},
    },
  };
  const service = loadMembership("lib/paypal-memberships.ts", deps);
  return { state, db, provider, service, deps };
}
const event = (id, type = "BILLING.SUBSCRIPTION.ACTIVATED", resource = { id: "I-TEST" }) => ({
  id,
  event_type: type,
  resource,
});

test("pending approvals and substituted agreements never grant a membership", async () => {
  for (const status of ["APPROVAL_PENDING", "CANCELLED", "SUSPENDED"]) {
    const { state, provider, service } = fixture();
    provider.details.status = status;
    const result = await service.reconcilePayPalMembership({
      subscriptionId: "I-TEST",
      requestingUserId: "owner",
    });
    assert.equal(result.completed, false);
    assert.equal(state.sub, null);
    assert.equal(state.order.paymentStatus, "PENDING");
    assert.equal(state.notices.length, 0);
  }
  for (const changed of [
    { customId: "foreign-order" },
    { planId: "P-FOREIGN" },
    { id: "I-FOREIGN" },
    { planOverridden: true },
  ]) {
    const { state, provider, service } = fixture();
    Object.assign(provider.details, changed);
    await assert.rejects(
      service.reconcilePayPalMembership({ subscriptionId: "I-TEST", requestingUserId: "owner" })
    );
    assert.equal(state.sub, null);
  }
  const { state, service } = fixture();
  await assert.rejects(
    service.reconcilePayPalMembership({ subscriptionId: "I-TEST", requestingUserId: "other" })
  );
  assert.equal(state.sub, null);
});

test("approved trial creates exactly one atomic subscription/entitlement and a no-charge notice", async () => {
  const { state, service } = fixture();
  await service.reconcilePayPalMembership({ subscriptionId: "I-TEST", requestingUserId: "owner" });
  await service.processMembershipWebhook(event("WH-1"));
  await service.processMembershipWebhook(event("WH-1"));
  assert.equal(state.order.paymentStatus, "COMPLETED");
  assert.equal(state.order.metadata.membershipActivation, "trial");
  assert.equal(state.sub.status, "TRIAL");
  assert.equal(state.entitlements.length, 1);
  assert.equal(state.charges.length, 0);
  assert.equal(state.notices.length, 1);
  assert.equal(state.notices[0].kind, "trial");
  assert.equal(state.sub.currentPeriodEnd.toISOString(), state.order.metadata.trialEndsAt);
  assert.equal(state.events.length, 1);
});

test("a failed entitlement write rolls back subscription, order completion and notices", async () => {
  const { state, db, service } = fixture();
  db.entitlement.create = async () => {
    throw new Error("test-write-failure");
  };
  await assert.rejects(
    service.reconcilePayPalMembership({ subscriptionId: "I-TEST" }),
    /test-write-failure/
  );
  assert.equal(state.sub, null);
  assert.equal(state.order.paymentStatus, "PENDING");
  assert.equal(state.notices.length, 0);
});

test("paid-only approval waits for a verified sale and distinct webhook IDs for the same sale cannot extend twice", async () => {
  const { state, provider, service } = fixture();
  state.order.metadata.freeTrial = false;
  state.order.metadata.trialDays = 0;
  state.order.metadata.trialEndsAt = null;
  state.order.amount = 22;
  assert.equal(
    (await service.reconcilePayPalMembership({ subscriptionId: "I-TEST" })).completed,
    false
  );
  const paidAt = new Date(Date.now() - 60000);
  const end = new Date(paidAt);
  end.setUTCMonth(end.getUTCMonth() + 1);
  provider.details.startTime = paidAt.toISOString();
  provider.details.nextBillingTime = end.toISOString();
  provider.details.lastPaymentTime = paidAt.toISOString();
  provider.sale = {
    id: "SALE-1",
    state: "completed",
    billing_agreement_id: "I-TEST",
    create_time: paidAt.toISOString(),
    amount: { total: "22.00", currency: "USD" },
  };
  for (const id of ["WH-SALE-1", "WH-SALE-1", "WH-SALE-OTHER-ID"]) {
    await service.processMembershipWebhook(
      event(id, "PAYMENT.SALE.COMPLETED", { id: "SALE-1", billing_agreement_id: "I-TEST" })
    );
  }
  assert.equal(state.sub.status, "ACTIVE");
  assert.equal(state.sub.currentPeriodEnd.toISOString(), end.toISOString());
  assert.equal(state.charges.length, 1);
  assert.equal(state.entitlements.length, 1);
  assert.equal(state.notices.length, 1);
});

test("cancellation and delayed activation events retain the paid/trial end without reviving renewal", async () => {
  const { state, provider, service } = fixture();
  await service.reconcilePayPalMembership({ subscriptionId: "I-TEST" });
  const end = state.sub.currentPeriodEnd.toISOString();
  provider.details.status = "CANCELLED";
  provider.details.statusUpdatedAt = new Date(Date.now() + 1000).toISOString();
  await service.processMembershipWebhook(event("WH-CANCEL", "BILLING.SUBSCRIPTION.CANCELLED"));
  await service.processMembershipWebhook(event("WH-ACTIVATE-LATE"));
  assert.equal(state.sub.currentPeriodEnd.toISOString(), end);
  assert.ok(state.sub.cancelledAt);
  assert.equal(state.sub.status, "TRIAL");
  assert.equal(state.entitlements[0].revoked, false);
  assert.equal(state.sub.nextChargeDate, null);
  assert.equal(state.notices.filter((item) => item.kind === "cancelled").length, 1);
});

test("a wrong amount or currency sale fails, persists retry evidence and does not create access", async () => {
  for (const amount of [
    { total: "21.99", currency: "USD" },
    { total: "22.00", currency: "EUR" },
  ]) {
    const { state, provider, service } = fixture();
    state.order.metadata.freeTrial = false;
    state.order.metadata.trialEndsAt = null;
    provider.sale = {
      id: "SALE-BAD",
      state: "completed",
      billing_agreement_id: "I-TEST",
      create_time: new Date().toISOString(),
      amount,
    };
    await assert.rejects(
      service.processMembershipWebhook(
        event("WH-BAD", "PAYMENT.SALE.COMPLETED", {
          id: "SALE-BAD",
          billing_agreement_id: "I-TEST",
        })
      )
    );
    assert.equal(state.sub, null);
    assert.equal(state.order.paymentStatus, "PENDING");
    assert.equal(state.charges.length, 0);
    assert.equal(state.events[0].failed, true);
  }
});

test("provider suspension keeps an already paid period and replay does not invent retries or charges", async () => {
  const { state, provider, service } = fixture();
  await service.reconcilePayPalMembership({ subscriptionId: "I-TEST" });
  const end = state.sub.currentPeriodEnd.toISOString();
  provider.details.status = "SUSPENDED";
  provider.details.failedPaymentsCount = 1;
  provider.details.statusUpdatedAt = new Date(Date.now() + 1000).toISOString();
  for (const id of ["WH-FAILED", "WH-FAILED", "WH-FAILED-2"]) {
    await service.processMembershipWebhook(event(id, "BILLING.SUBSCRIPTION.PAYMENT.FAILED"));
  }
  assert.equal(state.sub.currentPeriodEnd.toISOString(), end);
  assert.equal(state.entitlements[0].revoked, false);
  assert.equal(state.sub.chargeFailureCount, 1);
  assert.equal(state.charges.length, 0);
  assert.equal(state.sub.nextChargeDate, null);
  assert.equal(state.notices.filter((item) => item.kind === "failed").length, 1);
});

test("an older approval snapshot cannot activate a trial already known to be cancelled", async () => {
  const { state, provider, service } = fixture();
  state.order.metadata.paypalStatus = "CANCELLED";
  state.order.metadata.paypalStatusUpdatedAt = new Date(Date.now() + 10000).toISOString();
  provider.details.status = "ACTIVE";
  const result = await service.reconcilePayPalMembership({ subscriptionId: "I-TEST" });
  assert.equal(result.completed, false);
  assert.equal(state.sub, null);
  assert.equal(state.order.metadata.paypalStatus, "CANCELLED");
});
