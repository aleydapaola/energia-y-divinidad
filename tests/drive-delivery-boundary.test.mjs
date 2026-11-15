/* eslint-disable require-await -- Isolated service adapters, no external requests. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { deliverEmail } from "../lib/email-delivery.ts";

import { loadMembership } from "./helpers/membership-loader.mjs";

test("retired recipient endpoint ignores forged form email and folder without reading the body", async () => {
  const route = loadMembership("app/api/mi-cuenta/pedidos/[id]/drive-email/route.ts", {
    "@/lib/auth": { auth: async () => ({ user: { id: "buyer" } }) },
    "@/lib/digital-products/drive-admin": { driveNoStore: { "Cache-Control": "private, no-store" } },
  });
  for (const email of ["outsider@example.test", "buyer@example.test"]) {
    const response = await route.POST(new Request("https://preview.energiaydivinidad.com/api/mi-cuenta/pedidos/order/drive-email", {
      method: "POST", body: JSON.stringify({ email, folderId: "another-folder" }),
    }), { params: Promise.resolve({ id: "order" }) });
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /correo verificado del titular/);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});

test("delivery retry passes only the path order and authenticated ID; forged form fields have no effect", async () => {
  const calls = [];
  const route = loadMembership("app/api/mi-cuenta/pedidos/[id]/drive-delivery/route.ts", {
    "@/lib/auth": { auth: async () => ({ user: { id: "buyer", email: "stale-session@example.test" } }) },
    "@/lib/digital-products/drive-admin": { assertDriveOrigin: () => {}, driveNoStore: {} },
    "@/lib/digital-products/drive-auto-delivery": { deliverPaidDriveOrder: async (...args) => { calls.push(args); return { delivered: false, reason: "NOT_FOUND" }; } },
    "@/lib/rate-limit": { applyRateLimit: () => null },
  });
  const response = await route.POST(new Request("https://preview.energiaydivinidad.com/retry", {
    method: "POST", body: JSON.stringify({ email: "outsider@example.test", folderId: "arbitrary-folder", userId: "admin" }),
  }), { params: Promise.resolve({ id: "another-order" }) });
  assert.deepEqual(calls, [["another-order", "buyer"]]); assert.equal(response.status, 404);
});

test("actual Drive payment email keeps recipients and links in Preview even with Production URL configuration", async () => {
  const saved = { ...process.env };
  const originalFetch = globalThis.fetch;
  const sent = [];
  try {
    Object.assign(process.env, { VERCEL_ENV: "preview", NODE_ENV: "production", RESEND_API_KEY: "re_synthetic",
      PREVIEW_EMAIL_RECIPIENT: "qa@example.test", NEXTAUTH_URL: "https://energiaydivinidad.com",
      NEXT_PUBLIC_APP_URL: "https://energiaydivinidad.com", NEXT_PUBLIC_SITE_URL: "https://energiaydivinidad.com" });
    delete process.env.VERCEL_URL;
    globalThis.fetch = async (_url, request) => { sent.push(JSON.parse(request.body)); return Response.json({ id: "synthetic" }); };
    const email = loadMembership("lib/email.ts", {
      "@/lib/email-delivery": { deliverEmail }, "@/lib/event-time": {}, "@/lib/prisma": { prisma: {} },
      "@/lib/session-policy": { INDIVIDUAL_SESSION_POLICY: [], SESSION_REFUND_CONTACT: "", SESSION_RESCHEDULE_POLICY: "" },
    });
    const result = await email.sendPaymentConfirmationEmail({ driveDelivery: true, email: "buyer@example.test", name: "QA",
      orderNumber: "QA-NO-REAL", orderType: "PRODUCT", itemName: "PDF QA", amount: 20, currency: "USD", paymentMethod: "PAYPAL_DIRECT" });
    assert.equal(result.success, true); assert.equal(sent.length, 1);
    assert.deepEqual([sent[0].to].flat(), ["qa@example.test"]);
    assert.equal(sent[0].cc, undefined); assert.equal(sent[0].bcc, undefined);
    assert.match(sent[0].subject, /^\[PREVIEW\]/);
    assert.match(sent[0].html, /https:\/\/preview\.energiaydivinidad\.com\/mi-cuenta\/compras/);
    assert.doesNotMatch(sent[0].html, /href="https:\/\/energiaydivinidad\.com\/mi-cuenta/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) { if (!(key in saved)) { delete process.env[key]; } }
    Object.assign(process.env, saved);
  }
});
