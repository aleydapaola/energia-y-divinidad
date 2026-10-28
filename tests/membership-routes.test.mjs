import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const policy = loadMembership("lib/commercial-policy.ts");
const intentModule = loadMembership("lib/membership-intent.ts");
const billing = loadMembership("lib/membership-billing.ts");
const quote = {
  tierId: "tier-1",
  tierName: "Esencia",
  tierSlug: "esencia",
  amount: 22,
  currency: "USD",
  billingInterval: "monthly",
  trialDays: 30,
  planId: "P-SERVER",
};
const plan = {
  id: "P-SERVER",
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
const body = {
  productId: "tier-1",
  productSlug: "untrusted-slug",
  productName: "untrusted-name",
  amount: 22,
  currency: "USD",
  billingInterval: "monthly",
  trialDays: 30,
  acceptedTerms: true,
  acceptedRecurring: true,
  termsVersion: policy.COMMERCIAL_POLICY_VERSION,
};
const request = (data) => ({ json: async () => data });
function setup({ authenticated = true, active = false, failOnce = false } = {}) {
  const state = { orders: [], providerCalls: [], quoteCalls: [], reads: 0 };
  const db = {
    subscription: {
      findFirst: async ({ where }) => (where.trialEnd ? null : active ? { id: "active" } : null),
    },
    order: {
      findFirst: async () => state.orders[0] || null,
      findUniqueOrThrow: async () => state.orders[0],
      create: async ({ data }) => {
        const order = { ...data, id: "order-stable", createdAt: new Date() };
        state.orders.push(order);
        return order;
      },
      update: async ({ data }) => {
        Object.assign(state.orders[0], data);
        return state.orders[0];
      },
      delete: async () => {
        throw new Error("Must preserve uncertain order");
      },
    },
    $executeRaw: async () => {},
  };
  db.$transaction = async (fn) => fn(db);
  const route = loadMembership("app/api/checkout/paypal-subscription/route.ts", {
    "@/lib/auth": {
      auth: async () =>
        authenticated ? { user: { id: "owner", email: "test@example.com", name: "Test" } } : null,
    },
    "@/lib/commercial-policy": policy,
    "@/lib/membership-billing": billing,
    "@/lib/membership-catalog": {
      getMembershipQuote: async (...args) => {
        state.quoteCalls.push(args);
        return quote;
      },
    },
    "@/lib/membership-intent": intentModule,
    "@/lib/paypal": {
      getPayPalBillingPlan: async (id) => {
        assert.equal(id, "P-SERVER");
        return plan;
      },
      createPayPalSubscription: async (params) => {
        state.providerCalls.push(params);
        if (failOnce && state.providerCalls.length === 1) {
          return { success: false };
        }
        return {
          success: true,
          subscriptionId: "I-SERVER",
          approvalUrl: "https://www.sandbox.paypal.com/approve-test",
        };
      },
    },
    "@/lib/prisma": { prisma: db },
    "@/lib/utils": { getAppUrl: () => "https://preview.test" },
  });
  return { state, route };
}

test("recurring checkout rejects unauthenticated accounts and missing/stale consent before any provider/order operation", async () => {
  const anonymous = setup({ authenticated: false });
  assert.equal((await anonymous.route.POST(request(body))).status, 401);
  assert.equal(anonymous.state.orders.length, 0);
  assert.equal(anonymous.state.quoteCalls.length, 0);
  for (const changed of [
    { acceptedTerms: false },
    { acceptedRecurring: false },
    { termsVersion: "old" },
  ]) {
    const { state, route } = setup();
    assert.equal((await route.POST(request({ ...body, ...changed }))).status, 400);
    assert.equal(state.quoteCalls.length, 0);
    assert.equal(state.providerCalls.length, 0);
    assert.equal(state.orders.length, 0);
  }
});

test("checkout uses catalogue identity and price, records the recurring consent and reuses the same pending authorization", async () => {
  const { state, route } = setup();
  assert.equal((await route.POST(request(body))).status, 200);
  assert.equal((await route.POST(request(body))).status, 200);
  assert.equal(state.orders.length, 1);
  assert.equal(state.providerCalls.length, 1);
  const order = state.orders[0];
  assert.equal(order.itemName, "Esencia");
  assert.equal(order.amount, 0);
  assert.equal(order.metadata.recurringAmount, 22);
  assert.equal(order.metadata.acceptedTermsVersion, policy.COMMERCIAL_POLICY_VERSION);
  assert.equal(order.metadata.acceptedRecurring, true);
  assert.equal(order.metadata.trialDays, 30);
  assert.equal(order.metadata.paypalSubscriptionId, "I-SERVER");
  assert.equal(state.providerCalls[0].customId, order.id);
  assert.equal(state.providerCalls[0].planId, "P-SERVER");
  assert.ok(
    Math.abs(Date.parse(order.metadata.trialEndsAt) - order.createdAt.getTime() - 30 * 86400000) <
      1000
  );
});

test("an uncertain provider creation preserves its intent; retry uses the same order and idempotency anchor", async () => {
  const { state, route } = setup({ failOnce: true });
  assert.equal((await route.POST(request(body))).status, 502);
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].paymentStatus, "PENDING");
  assert.equal((await route.POST(request(body))).status, 200);
  assert.equal(state.orders.length, 1);
  assert.deepEqual(state.providerCalls[0], state.providerCalls[1]);
});

test("an existing recurring membership, altered price or stale trial offer cannot create another agreement", async () => {
  const active = setup({ active: true });
  assert.equal((await active.route.POST(request(body))).status, 409);
  assert.equal(active.state.providerCalls.length, 0);
  assert.equal(active.state.orders.length, 0);
  for (const changed of [{ amount: 21.99 }, { trialDays: 0 }, { discountCode: "FREE" }]) {
    const { state, route } = setup();
    assert.equal((await route.POST(request({ ...body, ...changed }))).status, 400);
    assert.equal(state.providerCalls.length, 0);
  }
});

test("activation callback requires the owning session and rejects replacing the stored agreement even on a completed order", async () => {
  for (const [userId, subscriptionId, expectedCalls] of [
    [null, "I-SERVER", 0],
    ["other", "I-SERVER", 0],
    ["owner", "I-OTHER", 0],
    ["owner", "I-SERVER", 1],
  ]) {
    let calls = 0;
    const metadata = {
      membershipFlowVersion: 2,
      billingInterval: "monthly",
      recurringAmount: 22,
      currency: "USD",
      paypalPlanId: "P-SERVER",
      paypalSubscriptionId: "I-SERVER",
      acceptedRecurring: true,
      acceptedTermsVersion: "test",
      freeTrial: false,
    };
    const { GET } = loadMembership("app/api/checkout/paypal-subscription/activate/route.ts", {
      "@/lib/auth": { auth: async () => (userId ? { user: { id: userId } } : null) },
      "@/lib/membership-intent": intentModule,
      "@/lib/paypal-memberships": {
        reconcilePayPalMembership: async (input) => {
          calls++;
          assert.equal(input.requestingUserId, "owner");
          return { completed: false };
        },
      },
      "@/lib/prisma": {
        prisma: {
          order: {
            findUnique: async () => ({
              id: "order",
              userId: "owner",
              orderType: "MEMBERSHIP",
              paymentStatus: "COMPLETED",
              orderNumber: "PPLS-TEST",
              metadata,
            }),
          },
        },
      },
      "@/lib/utils": { getAppUrl: () => "https://preview.test" },
    });
    const nextUrl = new URL(
      `https://preview.test/api/checkout/paypal-subscription/activate?orderId=order&subscription_id=${subscriptionId}`
    );
    const response = await GET({ nextUrl });
    assert.equal(response.status, 302);
    assert.equal(calls, expectedCalls);
    assert.match(
      response.headers.get("location"),
      userId === null ? /auth\/signin/ : expectedCalls ? /pago\/confirmacion/ : /pago\/error/
    );
  }
});

test("cancellation cannot report success or alter access when PayPal fails; successful cancellation keeps the refreshed paid end", async () => {
  for (const succeeds of [false, true]) {
    const oldEnd = new Date(Date.now() + 86400000);
    const renewedEnd = new Date(Date.now() + 31 * 86400000);
    const sub = {
      id: "sub",
      userId: "owner",
      status: "TRIAL",
      membershipTierName: "Esencia",
      billingInterval: "MONTHLY",
      amount: 22,
      currency: "USD",
      cancelledAt: null,
      currentPeriodEnd: oldEnd,
      paymentProvider: "paypal_direct",
      paypalSubscriptionId: "I-SERVER",
      entitlements: [],
      user: { email: "test@example.com" },
    };
    let updates = 0;
    let providerCalls = 0;
    const db = {
      subscription: {
        findUnique: async () => sub,
        findUniqueOrThrow: async () => ({ ...sub, currentPeriodEnd: renewedEnd }),
        update: async ({ data }) => {
          updates++;
          return { ...sub, ...data };
        },
      },
      order: { findFirst: async () => null },
      entitlement: {
        updateMany: async () => {
          throw Error("Must retain access");
        },
      },
      $executeRaw: async () => {},
    };
    db.$transaction = async (fn) => fn(db);
    const { cancelSubscription } = loadMembership("lib/services/subscription-cancellation.ts", {
      "@/lib/prisma": { prisma: db },
      "@/lib/audit": { createAuditLog: async () => {} },
      "@/lib/nequi": {},
      "@/lib/paypal": {
        cancelPayPalSubscription: async () => {
          providerCalls++;
          return { success: succeeds };
        },
      },
      "@/lib/membership-notifications": {
        queueMembershipNotice: async () => {},
        deliverMembershipNotices: async () => {},
      },
    });
    assert.equal(
      (
        await cancelSubscription({
          subscriptionId: "sub",
          cancelledBy: "user",
          requestingUserId: "other",
        })
      ).errorCode,
      "UNAUTHORIZED"
    );
    assert.equal(providerCalls, 0);
    const result = await cancelSubscription({
      subscriptionId: "sub",
      cancelledBy: "user",
      requestingUserId: "owner",
    });
    assert.equal(result.success, succeeds);
    assert.equal(updates, succeeds ? 1 : 0);
    if (succeeds) {
      assert.equal(result.subscription.status, "TRIAL");
      assert.equal(result.subscription.currentPeriodEnd.getTime(), renewedEnd.getTime());
    } else {
      assert.equal(result.errorCode, "PROVIDER_ERROR");
    }
  }
});
