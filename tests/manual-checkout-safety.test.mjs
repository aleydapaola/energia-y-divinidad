import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as safety from "../lib/preview-safety.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadCheckout(route, auth) {
  const filename = new URL(`../app/api/checkout/${route}/route.ts`, import.meta.url).pathname;
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === "next/server") {
      return { NextResponse: { json: Response.json } };
    }
    if (name === "@/lib/auth") {
      return { auth };
    }
    if (name === "@/lib/preview-safety") {
      return safety;
    }
    // Any access to payment, data, CMS or email dependencies must fail the test.
    return new Proxy(
      {},
      {
        get: () => {
          throw new Error(`Unexpected dependency: ${name}`);
        },
      }
    );
  };
  mod._compile(compiled, filename);
  return mod.exports.POST;
}

for (const environment of ["preview", "development", undefined]) {
  test(`manual checkout is blocked before side effects in ${environment || "local"}`, async () => {
    const old = process.env.VERCEL_ENV;
    if (environment) {
      process.env.VERCEL_ENV = environment;
    } else {
      delete process.env.VERCEL_ENV;
    }
    try {
      for (const route of ["wompi-manual", "cart"]) {
        let authCalls = 0;
        const post = loadCheckout(route, () => {
          authCalls++;
          return { user: { id: "test-user", email: "preview@example.com" } };
        });
        const response = await post(
          new Request("https://preview.example/api/checkout/" + route, {
            method: "POST",
            body: JSON.stringify({ paymentMethod: "wompi_manual" }),
          })
        );
        assert.equal(response.status, 403, route);
        assert.equal((await response.json()).error, safety.MANUAL_PAYMENT_PREVIEW_MESSAGE);
        assert.equal(authCalls, route === "cart" ? 1 : 0);
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

test("Production manual routes retain their original authentication and validation flow", async () => {
  const old = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    for (const route of ["wompi-manual", "cart"]) {
      let authCalls = 0;
      const post = loadCheckout(route, () => {
        authCalls++;
        return null;
      });
      const response = await post(
        new Request("https://production.example/api/checkout/" + route, {
          method: "POST",
          body: "{}",
        })
      );
      assert.equal(authCalls, 1);
      assert.equal(response.status, route === "cart" ? 401 : 400);
      assert.notEqual((await response.json()).error, safety.MANUAL_PAYMENT_PREVIEW_MESSAGE);
    }
  } finally {
    if (old === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = old;
    }
  }
});
