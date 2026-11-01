import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const { MEMBERSHIP_WEBHOOK_EVENTS } = loadMembership("lib/membership-webhook-events.ts");
const events = [
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DECLINED",
  "PAYMENT.CAPTURE.DENIED",
  ...MEMBERSHIP_WEBHOOK_EVENTS,
];
function fixture({
  role = "ADMIN",
  authId = "qa-admin",
  mode = "live",
  secret = "synthetic-secret",
  badAnnual = false,
  extraTrial = false,
  url = "https://www.energiaydivinidad.com/api/webhooks/paypal",
  names = events,
} = {}) {
  const reads = [];
  const { GET } = loadMembership("app/api/admin/payments/paypal/health/route.ts", {
    "@/lib/membership-billing": loadMembership("lib/membership-billing.ts"),
    "@/lib/membership-webhook-events": { MEMBERSHIP_WEBHOOK_EVENTS },
    "@/lib/auth": { auth: async () => (authId ? { user: { id: authId } } : null) },
    "@/lib/prisma": {
      prisma: {
        user: {
          findUnique: async ({ where }) => {
            assert.equal(where.id, authId);
            return { role };
          },
        },
      },
    },
    "@/lib/sanity/client": {
      client: {
        withConfig: () => ({
          fetch: async () => {
            reads.push("catalogue");
            return ["esencia", "divinidad"].map((slug) => ({
              _id: `membership-${slug}`,
              slug: { current: slug },
              pricing: {
                monthlyPriceUSD: slug === "esencia" ? 22 : 33,
                yearlyPriceUSD: slug === "esencia" ? 239 : 357,
              },
            }));
          },
        }),
      },
    },
    "@/lib/paypal": {
      PAYPAL_CONFIG: {
        environment: mode,
        clientId: "synthetic-client",
        clientSecret: secret,
        webhookId: "HOOK-TEST",
      },
      getPayPalPlanId: (slug, interval) => `${slug}-${interval}`,
      getPayPalBillingPlan: async (id) => {
        reads.push(id);
        const annual = id.endsWith("yearly");
        const amount = id.startsWith("esencia") ? (annual ? 239 : 22) : annual ? 357 : 33;
        return {
          id,
          status: "ACTIVE",
          billing_cycles: [
            ...(extraTrial
              ? [
                  {
                    tenure_type: "TRIAL",
                    sequence: 0,
                    total_cycles: 1,
                    frequency: { interval_unit: "DAY", interval_count: 30 },
                    pricing_scheme: { fixed_price: { value: "0.00", currency_code: "USD" } },
                  },
                ]
              : []),
            {
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              frequency: {
                interval_unit: annual && !badAnnual ? "YEAR" : "MONTH",
                interval_count: 1,
              },
              pricing_scheme: { fixed_price: { value: String(amount), currency_code: "USD" } },
            },
          ],
        };
      },
      getPayPalWebhookDetails: async () => {
        reads.push("webhook");
        return { id: "HOOK-TEST", url, event_types: names.map((name) => ({ name })) };
      },
    },
  });
  return { GET, reads };
}
async function production(work) {
  const saved = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    await work();
  } finally {
    if (saved === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = saved;
    }
  }
}
test("readiness refuses anonymous/non-admin callers before provider or catalogue reads", async () => {
  for (const [input, expected] of [
    [{ authId: null }, 401],
    [{ role: "USER" }, 403],
  ]) {
    const f = fixture(input);
    assert.equal((await f.GET()).status, expected);
    assert.equal(f.reads.length, 0);
  }
});
test("Production refuses sandbox/missing credentials before provider calls", async () =>
  production(async () => {
    for (const input of [{ mode: "sandbox" }, { secret: "" }]) {
      const f = fixture(input),
        r = await f.GET();
      assert.equal(r.status, 503);
      assert.equal(f.reads.length, 0);
      assert.equal((await r.json()).ready, false);
    }
  }));
test("readiness verifies four exact plans and the existing callback without orders, charges or secret disclosure", async () =>
  production(async () => {
    const f = fixture(),
      r = await f.GET(),
      body = await r.json();
    assert.equal(r.status, 200);
    assert.equal(body.ready, true);
    assert.equal(f.reads.length, 6);
    assert.equal(r.headers.get("Cache-Control"), "private, no-store");
    assert.ok(!JSON.stringify(body).includes("synthetic-secret"));
    assert.ok(!JSON.stringify(body).includes("HOOK-TEST"));
  }));
test("a misconfigured annual cycle, different callback owner or wildcard prevents readiness", async () =>
  production(async () => {
    for (const input of [
      { badAnnual: true },
      { extraTrial: true },
      { url: "https://other.test/api/webhooks/paypal" },
      { url: "https://www.energiaydivinidad.com:444/api/webhooks/paypal" },
      { names: ["*"] },
    ]) {
      const r = await fixture(input).GET();
      assert.equal(r.status, 503);
      assert.equal((await r.json()).ready, false);
    }
  }));
