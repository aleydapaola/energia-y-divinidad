import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const retired = {
  "checkout/wompi": ["POST"],
  "checkout/wompi/signature": ["POST"],
  "checkout/wompi-manual": ["POST"],
  "checkout/wompi-recurring": ["POST"],
  "checkout/wompi-acceptance-token": ["GET"],
  "checkout/nequi-recurring": ["POST"],
  "payments/wompi/verify": ["GET"],
  "payments/wompi/verify-by-reference": ["GET"],
  "webhooks/wompi": ["POST"],
  "webhooks/nequi": ["POST"],
  "pago/nequi/push": ["POST"],
  "pago/nequi/status": ["GET"],
  "cron/process-renewals": ["GET", "POST"],
  "subscriptions/reactivate": ["POST"],
  "subscriptions/change-plan": ["POST"],
  "checkout/generate-pack-code": ["POST"],
};
for (const environment of ["production", "preview", "development"]) {
  test(`retired payment entries fail closed without loading any service in ${environment}`, async () => {
    const old = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = environment;
    try {
      for (const [path, methods] of Object.entries(retired)) {
        // The loader throws on any application dependency, including auth, DB and providers.
        const route = loadMembership(`app/api/${path}/route.ts`);
        for (const method of methods) {
          for (const body of ["{", JSON.stringify({ amount: 1, paymentMethod: "wompi_card" })]) {
            const response = await route[method](
              new Request(`https://preview.test/api/${path}`, {
                method,
                ...(method === "POST" ? { body } : {}),
              })
            );
            assert.equal(response.status, 410, `${path} ${method}`);
            assert.equal((await response.json()).code, "PAYMENT_METHOD_RETIRED");
          }
        }
      }
    } finally {
      if (old === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = old;
      }
    }
  });
}
test("the course cart rejects every retired method before catalogue, order, email or provider access", async () => {
  const route = loadMembership("app/api/checkout/cart/route.ts", {
    "@/lib/auth": { auth: async () => ({ user: { id: "owner", email: "test@example.com" } }) },
    ...Object.fromEntries(
      ["breb", "course-access", "discount-codes", "order-access", "paypal", "prisma", "utils"].map(
        (name) => [
          `@/lib/${name}`,
          new Proxy(
            {},
            {
              get() {
                throw Error(`Unexpected effect: ${name}`);
              },
            }
          ),
        ]
      )
    ),
    "@/sanity/lib/client": {},
    "@/sanity/lib/queries": {},
  });
  for (const paymentMethod of [
    "wompi_card",
    "wompi_nequi",
    "wompi_manual",
    "nequi",
    "stripe",
    "epayco",
    "MANUAL_TRANSFER",
    "BANK_TRANSFER",
  ]) {
    const response = await route.POST(
      new Request("https://preview.test/api/checkout/cart", {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      })
    );
    assert.equal(response.status, 400, paymentMethod);
    assert.match((await response.json()).error, /PayPal o Bre-B/);
  }
});
test("the provider registry cannot resolve old gateways, even when a caller bypasses TypeScript", () => {
  const registry = loadMembership("lib/payments/gateway-selector.ts", {
    "./adapters/paypal-adapter": {
      PayPalAdapter: class {
        name = "paypal";
        isConfigured() {
          return true;
        }
      },
    },
  });
  for (const name of ["wompi", "nequi", "stripe", "epayco", "unknown"]) {
    assert.throws(() => registry.getGateway(name));
    assert.equal(registry.isGatewayConfigured(name), false);
  }
  for (const method of ["NEQUI", "PSE", "BANK_TRANSFER", "CASH", "UNKNOWN"]) {
    assert.throws(() => registry.getGatewayForPayment(method, "COP"));
    assert.throws(() => registry.getGatewayForPayment(method, "USD"));
  }
  assert.equal(registry.getGatewayForPayment("PAYPAL", "USD").name, "paypal");
  assert.deepEqual(registry.getConfiguredGateways(), ["paypal"]);
  assert.deepEqual(registry.getAvailablePaymentMethods("COP"), []);
  const crons = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")).crons;
  assert.equal(
    crons.some((c) => c.path === "/api/cron/process-renewals"),
    false
  );
});
