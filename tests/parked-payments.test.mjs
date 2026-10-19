import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as safety from "../lib/preview-safety.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(relative, overrides = {}) {
  const filename = new URL(`../${relative}`, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === "next/server") {
      return { NextResponse: { json: Response.json } };
    }
    if (name === "@/lib/preview-safety" || name === "./preview-safety") {
      return safety;
    }
    if (name in overrides) {
      return overrides[name];
    }
    return new Proxy(
      {},
      {
        get: () => {
          throw new Error(`Unexpected external effect: ${name}`);
        },
      }
    );
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return mod.exports;
}
for (const environment of ["preview", undefined]) {
  test(`parked PayPal callbacks cannot alter bookings in ${environment || "local"}`, async () => {
    const old = process.env.VERCEL_ENV;
    if (environment) {
      process.env.VERCEL_ENV = environment;
    } else {
      delete process.env.VERCEL_ENV;
    }
    try {
      const route = load("app/api/webhooks/paypal/route.ts");
      const result = await route.POST(
        new Request("https://preview.example/api/webhooks/paypal", {
          method: "POST",
          body: JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED" }),
        })
      );
      assert.equal(result.status, 503);
      assert.equal((await result.json()).received, false);
      const paypal = load("lib/paypal.ts");
      assert.equal(paypal.isPayPalConfigured(), false);
      const creation = await paypal.createPayPalOrder({});
      assert.equal(creation.success, false);
      assert.match(creation.error, /pruebas de PayPal están pausadas/);
      assert.equal((await paypal.verifyPayPalWebhook(new Headers(), "{}")).valid, false);
    } finally {
      if (old === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = old;
      }
    }
  });
}
test("production callbacks retain their existing handler behavior", async () => {
  const old = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    let verifications = 0;
    const route = load("app/api/webhooks/paypal/route.ts", {
      "@/lib/paypal": {
        verifyPayPalWebhook: () => {
          verifications++;
          return { valid: false };
        },
      },
    });
    const result = await route.POST(
      new Request("https://production.example/api/webhooks/paypal", { method: "POST", body: "{}" })
    );
    assert.equal(verifications, 1);
    assert.equal(result.status, 200);
    assert.equal((await result.json()).received, true);
  } finally {
    if (old === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = old;
    }
  }
});
