import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

function env(values, work) {
  const saved = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  Object.assign(process.env, values);
  return Promise.resolve()
    .then(work)
    .finally(() => {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}
const preview = {
  VERCEL_ENV: "preview",
  PAYPAL_ENVIRONMENT: "sandbox",
  NEXT_PUBLIC_SANITY_PROJECT_ID: "81jpalr2",
  NEXT_PUBLIC_SANITY_DATASET: "preview",
};

test("sandbox plan preparation is unavailable in Production and rejects unauthenticated, non-admin and cross-origin requests before catalogue/provider writes", async () => {
  for (const [environment, role, origin, expected] of [
    ["production", "ADMIN", "https://preview.test", 404],
    ["preview", null, "https://preview.test", 401],
    ["preview", "USER", "https://preview.test", 403],
    ["preview", "ADMIN", "https://other.test", 403],
  ]) {
    await env({ ...preview, VERCEL_ENV: environment }, async () => {
      const fail = () => {
        throw Error("Side effect must not run");
      };
      const { POST } = loadMembership("app/api/admin/payments/paypal/membership-plans/route.ts", {
        "@/lib/auth": { auth: async () => (role ? { user: { id: "test" } } : null) },
        "@/lib/prisma": {
          prisma: { user: { findUnique: async () => ({ role }) }, auditLog: { create: fail } },
        },
        "@/lib/membership-billing": {},
        "@/lib/paypal": { ensurePayPalSandboxMembershipPlan: fail },
        "@/lib/sanity/client": { client: { withConfig: fail } },
      });
      assert.equal(
        (
          await POST({
            headers: new Headers({ origin }),
            nextUrl: new URL("https://preview.test/api/admin/payments/paypal/membership-plans"),
          })
        ).status,
        expected
      );
    });
  }
});

test("plan lookup never inherits live/general plan IDs outside Production", async () => {
  await env(
    {
      VERCEL_ENV: "preview",
      PAYPAL_PLAN_ID_ESENCIA_USD_MONTHLY: "P-LIVE",
      PAYPAL_PLAN_ID_ESENCIA_MONTHLY: "P-LEGACY-LIVE",
      PREVIEW_PAYPAL_PLAN_ID_ESENCIA_USD_MONTHLY: "",
    },
    async () => {
      const { getPayPalPlanId } = loadMembership("lib/paypal.ts");
      assert.equal(getPayPalPlanId("esencia", "monthly", "USD"), null);
      process.env.PREVIEW_PAYPAL_PLAN_ID_ESENCIA_USD_MONTHLY = "P-PREVIEW";
      assert.equal(getPayPalPlanId("esencia", "monthly", "USD"), "P-PREVIEW");
      process.env.VERCEL_ENV = "production";
      assert.equal(getPayPalPlanId("esencia", "monthly", "USD"), "P-LIVE");
    }
  );
});

test("provider preparation fails before OAuth in live mode and creates only a reusable fixed-price regular sandbox plan", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const requests = [];
    let planCreated = false;
    globalThis.fetch = async (url, options = {}) => {
      requests.push({ url, options });
      if (url.endsWith("/v1/oauth2/token")) {
        return Response.json({ access_token: "test-token" });
      }
      if (url.includes("/v1/catalogs/products/")) {
        return Response.json({
          id: "EYD-PREVIEW-MEMBERSHIPS-20261028",
          name: "PRUEBAS - NO REAL - EYD Membresias 2026-10-28",
          type: "SERVICE",
        });
      }
      if (url.includes("/v1/billing/plans?")) {
        return Response.json({
          plans: planCreated
            ? [{ id: "P-TEST", name: "PRUEBA EYD 20261028 ESENCIA_USD_MONTHLY 22.00 USD" }]
            : [],
        });
      }
      if (url.endsWith("/v1/billing/plans") && options.method === "POST") {
        const body = JSON.parse(options.body);
        assert.equal(body.product_id, "EYD-PREVIEW-MEMBERSHIPS-20261028");
        assert.equal(body.billing_cycles.length, 1);
        assert.equal(body.billing_cycles[0].tenure_type, "REGULAR");
        assert.equal(body.billing_cycles[0].pricing_scheme.fixed_price.value, "22.00");
        assert.equal(body.payment_preferences.auto_bill_outstanding, false);
        assert.ok(options.headers["PayPal-Request-Id"]);
        planCreated = true;
        return Response.json({ id: "P-TEST" });
      }
      if (url.endsWith("/v1/billing/plans/P-TEST")) {
        return Response.json({ id: "P-TEST", status: "ACTIVE" });
      }
      throw new Error("Unexpected provider call");
    };
    const input = {
      key: "ESENCIA_USD_MONTHLY",
      tierName: "Esencia",
      amount: 22,
      currency: "USD",
      interval: "monthly",
    };
    await env({ ...preview, PAYPAL_ENVIRONMENT: "live" }, async () => {
      await assert.rejects(
        loadMembership("lib/paypal.ts").ensurePayPalSandboxMembershipPlan(input)
      );
      assert.equal(requests.length, 0);
    });
    await env(preview, async () => {
      const provider = loadMembership("lib/paypal.ts");
      assert.equal((await provider.ensurePayPalSandboxMembershipPlan(input)).id, "P-TEST");
      assert.equal((await provider.ensurePayPalSandboxMembershipPlan(input)).id, "P-TEST");
      assert.equal(
        requests.filter((r) => r.url.endsWith("/v1/billing/plans") && r.options.method === "POST")
          .length,
        1
      );
      assert.ok(requests.every((r) => r.url.startsWith("https://api-m.sandbox.paypal.com/")));
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sandbox webhook setup preserves the exact private destination and capture events, adding only implemented membership notices", async () => {
  const originalFetch = globalThis.fetch;
  try {
    await env({ ...preview, PAYPAL_WEBHOOK_ID: "HOOK-TEST" }, async () => {
      let names = ["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED"];
      let patches = 0;
      // Synthetic fixture only, not a real protection token.
      const url = "https://preview.energiaydivinidad.com/api/webhooks/paypal?test-only=fake";
      globalThis.fetch = async (address, options = {}) => {
        assert.ok(address.startsWith("https://api-m.sandbox.paypal.com/"));
        if (address.endsWith("/v1/oauth2/token")) {
          return Response.json({ access_token: "fixture-token" });
        }
        assert.ok(address.endsWith("/v1/notifications/webhooks/HOOK-TEST"));
        if (options.method === "PATCH") {
          patches++;
          const patch = JSON.parse(options.body);
          assert.equal(patch.length, 1);
          assert.equal(patch[0].path, "/event_types");
          assert.equal(patch[0].op, "replace");
          names = patch[0].value.map((e) => e.name);
          assert.ok(names.includes("PAYMENT.CAPTURE.COMPLETED"));
          assert.ok(names.includes("PAYMENT.CAPTURE.DENIED"));
          assert.ok(names.includes("BILLING.SUBSCRIPTION.PAYMENT.FAILED"));
          assert.ok(names.includes("PAYMENT.SALE.COMPLETED"));
          assert.ok(!names.includes("*") && !names.includes("PAYMENT.SALE.REFUNDED"));
          return new Response(null, { status: 204 });
        }
        return Response.json({
          id: "HOOK-TEST",
          url,
          event_types: names.map((name) => ({ name })),
        });
      };
      const provider = loadMembership("lib/paypal.ts");
      const result = await provider.ensurePayPalSandboxMembershipEvents();
      await provider.ensurePayPalSandboxMembershipEvents();
      assert.equal(patches, 1);
      assert.equal(result.eventTypes.length, 10);
      assert.equal(result.url, undefined);
      assert.equal(JSON.stringify(result).includes("test-only"), false);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sandbox webhook setup refuses other destinations and wildcard subscriptions before any mutation", async () => {
  const originalFetch = globalThis.fetch;
  try {
    await env({ ...preview, PAYPAL_WEBHOOK_ID: "HOOK-TEST" }, async () => {
      const provider = loadMembership("lib/paypal.ts");
      for (const hook of [
        {
          url: "https://www.energiaydivinidad.com/api/webhooks/paypal",
          event_types: [{ name: "PAYMENT.CAPTURE.COMPLETED" }],
        },
        { url: "https://preview.energiaydivinidad.com/api/other", event_types: [] },
        {
          url: "https://preview.energiaydivinidad.com/api/webhooks/paypal",
          event_types: [{ name: "*" }],
        },
      ]) {
        globalThis.fetch = async (address, options = {}) => {
          if (address.endsWith("/v1/oauth2/token")) {
            return Response.json({ access_token: "fixture-token" });
          }
          assert.notEqual(options.method, "PATCH");
          return Response.json({ id: "HOOK-TEST", ...hook });
        };
        await assert.rejects(provider.ensurePayPalSandboxMembershipEvents());
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("subscription creation omits an empty surname and keeps the same provider request ID for an uncertain retry", async () => {
  await env(preview, async () => {
    const calls = [];
    const sdk = {
      Client: class {},
      Environment: { Production: "live", Sandbox: "sandbox" },
      LogLevel: { Info: "info" },
      ApplicationContextUserAction: { SubscribeNow: "SUBSCRIBE_NOW" },
      SubscriptionsController: class {
        async createSubscription(input) {
          calls.push(input);
          return {
            result: {
              id: "I-FIXTURE",
              links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/approve" }],
            },
          };
        }
      },
    };
    const provider = loadMembership("lib/paypal.ts", { "@paypal/paypal-server-sdk": sdk });
    const params = {
      planId: "P-TEST",
      subscriberEmail: "test@example.com",
      subscriberName: "Prova",
      customId: "order-1",
      startTime: new Date(Date.now() + 30 * 86400000).toISOString(),
      returnUrl: "https://preview.test/return",
      cancelUrl: "https://preview.test/cancel",
    };
    assert.equal((await provider.createPayPalSubscription(params)).success, true);
    await provider.createPayPalSubscription(params);
    await provider.createPayPalSubscription({
      ...params,
      subscriberName: " Aleyda  Paola ",
      customId: "order-2",
    });
    assert.deepEqual(calls[0].body.subscriber.name, { givenName: "Prova" });
    assert.deepEqual(calls[2].body.subscriber.name, { givenName: "Aleyda", surname: "Paola" });
    assert.equal(calls[0].paypalRequestId, calls[1].paypalRequestId);
    assert.notEqual(calls[0].paypalRequestId, calls[2].paypalRequestId);
    assert.equal(calls[0].body.startTime, params.startTime);
  });
});
