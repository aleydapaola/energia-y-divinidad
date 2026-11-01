import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const require = createRequire(import.meta.url);
const { COMMERCIAL_POLICY_VERSION } = loadMembership("lib/commercial-policy.ts");
const firstCharge = "2099-11-27T22:51:20.721Z";
const intent = {
  membershipFlowVersion: 2,
  billingInterval: "monthly",
  recurringAmount: 22,
  currency: "USD",
  paypalPlanId: "P-OWN",
  paypalSubscriptionId: "I-OWN",
  freeTrial: true,
  trialDays: 30,
  trialEndsAt: firstCharge,
  acceptedTermsVersion: COMMERCIAL_POLICY_VERSION,
  acceptedRecurring: true,
  approvalUrl: "https://www.sandbox.paypal.com/approve?token=OWN",
};
const order = {
  id: "order",
  userId: "owner",
  orderNumber: "PPLS-TEST",
  orderType: "MEMBERSHIP",
  paymentMethod: "PAYPAL_DIRECT",
  itemName: "Esencia",
  createdAt: new Date("2020-10-28T22:51:20Z"),
  amount: 0,
  currency: "USD",
  metadata: intent,
};
const details = {
  id: "I-OWN",
  customId: "order",
  planId: "P-OWN",
  startTime: firstCharge,
  status: "APPROVAL_PENDING",
};
const plan = {
  id: "P-OWN",
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
function fixture({ record = order, provider = details, catalogue = plan, active = null } = {}) {
  let providerReads = 0,
    writes = 0;
  const { getPendingMembership } = loadMembership("lib/membership-pending.ts", {
    "./prisma": {
      prisma: {
        order: {
          findFirst: async ({ where }) => {
            assert.equal(where.userId, "owner");
            return record;
          },
        },
        subscription: {
          findFirst: async ({ where }) => {
            assert.equal(where.userId, "owner");
            return active;
          },
        },
        $transaction: () => {
          writes++;
          throw Error("No writes");
        },
      },
    },
    "./paypal": {
      getPayPalSubscriptionDetails: async (id) => {
        providerReads++;
        assert.equal(id, "I-OWN");
        return provider;
      },
      getPayPalBillingPlan: async (id) => {
        providerReads++;
        assert.equal(id, "P-OWN");
        return catalogue;
      },
    },
  });
  return { getPendingMembership, reads: () => providerReads, writes: () => writes };
}
test("old pending memberships can be reviewed without new agreements, charges, access, emails or a reset trial", async () => {
  const f = fixture(),
    summary = await f.getPendingMembership("owner");
  assert.equal(summary.firstChargeAt, firstCharge);
  assert.equal(summary.createdAt.getUTCFullYear(), 2020);
  assert.equal(summary.amount, 22);
  assert.equal(summary.action.href, intent.approvalUrl);
  assert.equal(f.reads(), 2);
  assert.equal(f.writes(), 0);
});
test("recovery rejects another owner or an existing different membership before accessing PayPal", async () => {
  for (const options of [
    { record: { ...order, userId: "other" } },
    { active: { paypalSubscriptionId: "I-OTHER" } },
  ]) {
    const f = fixture(options);
    await assert.rejects(f.getPendingMembership("owner"));
    assert.equal(f.reads(), 0);
  }
  const f = fixture();
  await assert.rejects(f.getPendingMembership(""));
  assert.equal(f.reads(), 0);
});
test("recovery binds provider identity, plan, first charge, amount and original consent before showing a continuation", async () => {
  for (const options of [
    { provider: { ...details, id: "I-OTHER" } },
    { provider: { ...details, customId: "other-order" } },
    { provider: { ...details, planId: "P-OTHER" } },
    { provider: { ...details, startTime: "2099-12-01T00:00:00Z" } },
    { provider: { ...details, planOverridden: true } },
    { provider: null },
    { catalogue: { ...plan, id: "P-OTHER" } },
    { catalogue: { ...plan, payment_preferences: { setup_fee: { value: "1.00" } } } },
    { record: { ...order, currency: "EUR" } },
    { record: { ...order, amount: 22 } },
    { record: { ...order, metadata: { ...intent, acceptedTermsVersion: "old" } } },
  ]) {
    await assert.rejects(fixture(options).getPendingMembership("owner"));
  }
});
test("recovery stays in sandbox and prefers a fresh provider approval link over the stored link", async () => {
  const old = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  try {
    for (const approvalUrl of [
      "https://www.paypal.com/approve",
      "https://evil.test/approve",
      "https://user:pass@www.sandbox.paypal.com/approve",
    ]) {
      await assert.rejects(
        fixture({ provider: { ...details, approvalUrl } }).getPendingMembership("owner")
      );
    }
    const approvalUrl = "https://www.sandbox.paypal.com/approve?token=FRESH";
    assert.equal(
      (await fixture({ provider: { ...details, approvalUrl } }).getPendingMembership("owner"))
        .action.href,
      approvalUrl
    );
  } finally {
    if (old === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = old;
    }
  }
});
test("an approved agreement goes through the existing verifier, while terminal states and elapsed starts cannot create another agreement", async () => {
  for (const status of ["ACTIVE", "APPROVED"]) {
    const summary = await fixture({ provider: { ...details, status } }).getPendingMembership(
      "owner"
    );
    assert.equal(summary.action.href, "/api/checkout/paypal-subscription/activate?orderId=order");
  }
  for (const status of ["CANCELLED", "EXPIRED", "SUSPENDED", "UNKNOWN"]) {
    assert.equal(
      (await fixture({ provider: { ...details, status } }).getPendingMembership("owner")).action,
      null
    );
  }
  const trialEndsAt = "2020-01-01T00:00:00Z";
  const f = fixture({
    record: { ...order, metadata: { ...intent, trialEndsAt } },
    provider: { ...details, startTime: trialEndsAt },
  });
  assert.equal((await f.getPendingMembership("owner")).action, null);
});
test("the recovery page shows the stored first charge instead of promising another full trial", async () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const summary = await fixture().getPendingMembership("owner");
  const { default: Page } = loadMembership("app/membresia/pendiente/page.tsx", {
    "@/lib/auth": { auth: async () => ({ user: { id: "owner" } }) },
    "@/lib/membership-pending": { getPendingMembership: async () => summary },
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  });
  const html = renderToStaticMarkup(await Page());
  assert.match(html, /Retomarla no inicia otros 30 días/);
  assert.match(html, /27 de noviembre de 2099/);
  assert.match(html, /hora de Colombia/);
  assert.match(html, /22.00/);
});
