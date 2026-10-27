import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as eventTime from "../lib/event-time.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, deps = {}) {
  const filename = new URL("../" + path, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name in deps) {
      return deps[name];
    }
    if (name === "@/lib/events/capacity") {
      return load("lib/events/capacity.ts");
    }
    if (name === "@/lib/event-time") {
      return eventTime;
    }
    if (name === "next/server") {
      return { NextResponse: { json: Response.json } };
    }
    if (name.startsWith("@/")) {
      throw new Error("Unexpected external dependency: " + name);
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}
function nodes(node) {
  if (Array.isArray(node)) {
    return node.flatMap(nodes);
  }
  return node?.props ? [node, ...nodes(node.props.children)] : [];
}
const capacity = load("lib/events/capacity.ts");
test("event capacity counts legacy bookings, allocations and multi-seat purchases once, and releases cancelled seats", async () => {
  const db = {
    booking: {
      findMany: async () => [
        { id: "legacy", resourceId: "event", status: "CONFIRMED", metadata: { seats: 2 } },
        { id: "allocated", resourceId: "event", status: "CONFIRMED", metadata: { seats: 3 } },
        { id: "cancelled", resourceId: "event", status: "CANCELLED", metadata: { seats: 8 } },
      ],
    },
    seatAllocation: {
      findMany: async () => [
        { bookingId: "allocated", eventId: "event", seats: 3 },
        { bookingId: "cancelled", eventId: "event", seats: 8 },
      ],
    },
  };
  assert.equal((await capacity.eventSeatUsage(db, ["event"])).get("event"), 5);
  const [event] = await capacity.withEventAvailability(db, [
    { _id: "event", capacity: 6, availableSpots: 99 },
  ]);
  assert.equal(event.availableSpots, 1);
  await capacity.assertEventCapacity(db, event, 1);
  await assert.rejects(capacity.assertEventCapacity(db, event, 2), /No quedan suficientes plazas/);
  await capacity.assertEventCapacity(db, { _id: "event", capacity: 5 }, 3, "allocated");
  await assert.rejects(capacity.assertEventCapacity(db, event, 1.5), /inválido/);
  await capacity.assertEventCapacity(db, { _id: "event" }, 100);
});

test("the actual event checkout displays Colombia time and follows the PayPal approval URL", async () => {
  const previousWindow = globalThis.window,
    previousFetch = globalThis.fetch,
    previousZone = process.env.TZ;
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const event = {
    _id: "event",
    title: "PRUEBA — NO REAL",
    slug: { current: "test" },
    eventDate: "2026-12-15T15:00:00Z",
    locationType: "online",
    price: 80000,
    priceUSD: 20,
    capacity: 20,
    availableSpots: 19,
    maxPerBooking: 1,
  };
  let submitted;
  try {
    globalThis.window = { location: { href: "" } };
    globalThis.fetch = async (_url, options) => {
      submitted = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?test-only" }),
      };
    };
    for (const zone of ["UTC", "Europe/Madrid", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      let i = 0;
      const values = [
        event,
        false,
        false,
        null,
        1,
        "Test",
        "test@example.com",
        "0000000",
        "international",
        "paypal_direct",
        "",
        true,
        "",
        false,
        null,
        null,
      ];
      const { default: Checkout } = load("app/eventos/[slug]/checkout/page.tsx", {
        react: { ...React, useState: () => [values[i++], () => {}], useEffect() {} },
        "next/navigation": {
          useRouter: () => ({
            push() {
              throw new Error("Wrong redirect");
            },
          }),
        },
        "next-auth/react": {
          useSession: () => ({ data: { user: { email: "test@example.com" } } }),
        },
        "next/link": {
          default: ({ children, ...props }) => React.createElement("a", props, children),
        },
        "next/image": { default: () => null },
        "@/components/checkout/CheckoutHeader": { CheckoutHeader: () => null },
        "@/lib/purchase-methods": load("lib/purchase-methods.ts"),
      });
      const tree = Checkout({ params: Promise.resolve({ slug: "test" }) });
      const html = renderToStaticMarkup(tree);
      assert.match(html, /10:00.*hora de Colombia, UTC−5/);
      assert.match(html, /19/);
      await nodes(tree)
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
      assert.equal(
        globalThis.window.location.href,
        "https://www.sandbox.paypal.com/checkoutnow?test-only"
      );
      assert.equal(submitted.productType, "event");
      assert.equal(submitted.amount, 20);
      assert.equal(submitted.currency, "USD");
    }
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
    if (previousZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousZone;
    }
  }
});

test("sold-out event is rejected before an order or provider payment is created", async () => {
  let effects = 0;
  const fail = async () => {
    effects++;
    throw new Error("must not execute");
  };
  const { oneTimeCheckout } = load("lib/checkout/one-time-checkout.ts", {
    "@/lib/auth": { auth: async () => ({ user: { id: "client", email: "test@example.com" } }) },
    "@/lib/breb": { getBrebConfiguration: () => ({ enabled: true }) },
    "@/lib/checkout/catalog-quote": {
      quoteCatalogItem: async () => ({
        amount: 20,
        capacity: 1,
        productId: "event",
        metadata: { seats: 1 },
      }),
    },
    "@/lib/checkout/discounts": { applyCheckoutDiscount: fail },
    "@/lib/order-access": { allowOrderInBrowser: fail },
    "@/lib/payment-processor": { processApprovedPayment: fail },
    "@/lib/paypal": { isPayPalConfigured: () => true, createPayPalOrder: fail },
    "@/lib/prisma": {
      prisma: {
        booking: {
          findMany: async () => [
            { id: "legacy", resourceId: "event", status: "CONFIRMED", metadata: {} },
          ],
        },
        seatAllocation: { findMany: async () => [] },
        order: { create: fail },
      },
    },
    "@/lib/rate-limit": { applyRateLimit: () => null },
    "@/lib/session-scheduling": {},
    "@/lib/utils": { getAppUrl: () => "https://preview.test" },
  });
  const response = await oneTimeCheckout(
    { json: async () => ({ productType: "event", productId: "event" }) },
    "paypal"
  );
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /No quedan suficientes plazas/);
  assert.equal(effects, 0);
});

test("paid event delivery creates booking, allocation and entitlement once and rejects a second order when full", async () => {
  const bookings = [],
    allocations = [],
    entitlements = [],
    orders = new Map();
  let emails = 0,
    locks = 0;
  const db = {
    $executeRaw: async () => {
      locks++;
    },
    order: { findUnique: async ({ where }) => orders.get(where.id) },
    booking: {
      findMany: async () => bookings,
      findFirst: async ({ where }) =>
        bookings.find((b) => b.metadata.orderId === where.OR[0].metadata.equals) || null,
      create: async ({ data }) => {
        const b = { ...data, id: "booking-" + bookings.length };
        bookings.push(b);
        return b;
      },
    },
    seatAllocation: {
      findMany: async () => allocations,
      create: async ({ data }) => {
        allocations.push(data);
        return data;
      },
    },
    entitlement: {
      create: async ({ data }) => {
        entitlements.push(data);
        return data;
      },
    },
    user: { findUnique: async () => ({ email: "test@example.com", name: "Test" }) },
  };
  db.$transaction = async (fn) => fn(db);
  const { processApprovedPayment } = load("lib/payment-processor.ts", {
    "@/lib/prisma": { prisma: db },
    "@/lib/sanity/queries/events": {
      getEventById: async () => ({ _id: "event", capacity: 1, status: "upcoming" }),
    },
    "@/lib/course-access": {},
    "@/lib/credits": {},
    "@/lib/discount-codes": {},
    "@/lib/google-calendar": {},
    "@/lib/sanity/queries/sessionConfig": {},
    "@/lib/session-duration": {},
    "@/lib/session-scheduling": {},
    "@/lib/events/perks": { allocatePerks: async () => {} },
    "@/lib/email": {
      sendPaymentConfirmationEmail: async (data) => {
        assert.equal(data.eventDate.toISOString(), "2099-11-01T15:00:00.000Z");
        emails++;
      },
      sendAdminNotificationEmail: async () => {
        emails++;
      },
    },
  });
  const first = {
    id: "order-1",
    orderNumber: "PP-TEST-1",
    userId: "owner",
    user: { email: "test@example.com", name: "Test" },
    orderType: "EVENT",
    itemId: "event",
    itemName: "NO REAL",
    paymentStatus: "COMPLETED",
    paymentMethod: "PAYPAL_DIRECT",
    amount: 20,
    currency: "USD",
    metadata: { productType: "event", seats: 1, scheduledAt: "2099-11-01T15:00:00Z" },
  };
  orders.set(first.id, first);
  assert.equal((await processApprovedPayment(first)).success, true);
  assert.equal((await processApprovedPayment(first)).success, true);
  assert.deepEqual(
    [bookings.length, allocations.length, entitlements.length, emails],
    [1, 1, 1, 2]
  );
  const second = { ...first, id: "order-2", orderNumber: "PP-TEST-2" };
  orders.set(second.id, second);
  const result = await processApprovedPayment(second);
  assert.equal(result.success, false);
  assert.match(result.error, /No quedan suficientes plazas/);
  assert.deepEqual(
    [bookings.length, allocations.length, entitlements.length, emails],
    [1, 1, 1, 2]
  );
  assert.ok(locks >= 2);
});
