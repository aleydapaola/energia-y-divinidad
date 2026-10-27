import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { loadInventory, memoryInventory } from "./helpers/checkout-inventory.mjs";
import { loadScheduling } from "./helpers/session-scheduling.mjs";
import {
  activeCheckoutHoldWhere,
  checkoutHoldStatus,
  consumeCheckoutHold,
} from "../lib/checkout/hold-store.ts";

const eventOrder = (id) => ({
  id,
  orderType: "EVENT",
  itemId: "event",
  paymentStatus: "PENDING",
  metadata: { seats: 1 },
  orderNumber: id,
  itemName: "PRUEBA",
  amount: 20,
  currency: "USD",
  paymentMethod: "PAYPAL_DIRECT",
});
const sessionOrder = (id) => ({
  ...eventOrder(id),
  orderType: "SESSION",
  itemId: "session",
  metadata: { productType: "session", scheduledAt: "2099-12-01T15:00:00Z" },
});

test("only unpaid holds expire; capture and transfer reports remain protected at the exact expiry boundary", () => {
  const now = Date.now(),
    expiresAt = new Date(now);
  assert.equal(checkoutHoldStatus({ state: "HELD", expiresAt }, now).canPay, false);
  assert.equal(
    checkoutHoldStatus({ state: "HELD", expiresAt: new Date(now + 1) }, now).canPay,
    true
  );
  for (const state of ["CAPTURING", "REPORTED"]) {
    assert.equal(checkoutHoldStatus({ state, expiresAt }, now).expired, false);
  }
  const where = activeCheckoutHoldWhere("own");
  assert.deepEqual(where.orderId, { not: "own" });
  assert.deepEqual(where.OR[1], { state: { in: ["CAPTURING", "REPORTED"] } });
});

test("unpaid event order holds the last seat, expiry frees it, and expired PayPal cannot acquire another customer's seat", async () => {
  const { db, holds, orders } = memoryInventory(),
    service = loadInventory("lib/checkout/holds.ts", db);
  await service.createHeldCheckoutOrder(eventOrder("first"), 1, db);
  assert.equal(holds.get("first").state, "HELD");
  await assert.rejects(
    service.createHeldCheckoutOrder(eventOrder("second"), 1, db),
    /No quedan suficientes plazas/
  );
  assert.equal(orders.size, 1);
  holds.get("first").expiresAt = new Date(Date.now() - 1);
  await service.createHeldCheckoutOrder(eventOrder("second"), 1, db);
  await assert.rejects(
    service.protectCheckoutPayment("first", "CAPTURING", { db }),
    /No quedan suficientes plazas/
  );
  assert.equal(holds.get("first").state, "HELD");
});

test("an expired order cannot charge even when its slot is still free; a late bank report may reacquire availability", async () => {
  const { db, holds } = memoryInventory(),
    service = loadInventory("lib/checkout/holds.ts", db);
  await service.createHeldCheckoutOrder(eventOrder("first"), 1, db);
  holds.get("first").expiresAt = new Date(Date.now() - 1);
  await assert.rejects(service.protectCheckoutPayment("first", "CAPTURING", { db }), /caducado/);
  await service.protectCheckoutPayment("first", "REPORTED", { db, allowExpired: true });
  assert.equal(holds.get("first").state, "REPORTED");
  await assert.rejects(
    service.createHeldCheckoutOrder(eventOrder("second"), 1, db),
    /No quedan suficientes plazas/
  );
});

test("capture timeouts and retries preserve the claim; atomic consumption replaces the hold with the actual booking", async () => {
  const { db, holds, bookings } = memoryInventory(),
    service = loadInventory("lib/checkout/holds.ts", db);
  await service.createHeldCheckoutOrder(eventOrder("first"), 1, db);
  await service.protectCheckoutPayment("first", "CAPTURING", { db });
  holds.get("first").expiresAt = new Date(Date.now() - 3600000);
  await service.protectCheckoutPayment("first", "CAPTURING", { db });
  await service.releaseUnpaidCheckoutHold("first");
  assert.equal(holds.get("first").state, "CAPTURING");
  await assert.rejects(
    service.createHeldCheckoutOrder(eventOrder("second"), 1, db),
    /No quedan suficientes plazas/
  );
  bookings.push({
    id: "booking",
    resourceId: "event",
    status: "CONFIRMED",
    metadata: { seats: 1 },
  });
  await consumeCheckoutHold(db, "first");
  const capacity = loadInventory("lib/events/capacity.ts", db);
  assert.equal((await capacity.eventSeatUsage(db, ["event"])).get("event"), 1);
});

test("a held session blocks availability, overlaps and reprogramming; its own capture doesn't block itself", async () => {
  const { db, holds } = memoryInventory(),
    service = loadInventory("lib/checkout/holds.ts", db),
    calendar = loadScheduling(db);
  await service.createHeldCheckoutOrder(sessionOrder("first"), undefined, db);
  assert.equal(holds.get("first").duration, 90);
  const day = await calendar.sessionAvailability("2099-12-01");
  assert.equal(day.slots.find((s) => s.time === "10:00").available, false);
  await assert.rejects(
    service.createHeldCheckoutOrder(sessionOrder("second"), undefined, db),
    /horario ya no/
  );
  await service.protectCheckoutPayment("first", "CAPTURING", { db });
  assert.equal(holds.get("first").state, "CAPTURING");
});

test("unauthorized or expired capture never calls PayPal; a failed provider response keeps the reservation", async () => {
  for (const access of [false, true]) {
    const { db, holds } = memoryInventory(),
      service = loadInventory("lib/checkout/holds.ts", db);
    const order = { ...eventOrder("first"), metadata: { seats: 1, paypalOrderId: "provider" } };
    await service.createHeldCheckoutOrder(order, 1, db);
    holds.get("first").expiresAt = new Date(Date.now() - 1);
    let captures = 0;
    db.order.findFirst = async () => order;
    const { POST } = loadInventory("app/api/checkout/paypal/capture/route.ts", db, {
      dependencies: {
        "@/lib/order-access": { canAccessOrder: async () => access },
        "@/lib/paypal": {
          isPayPalConfigured: () => true,
          capturePayPalOrder: async () => {
            captures++;
            throw new Error("must not capture");
          },
        },
        "@/lib/payment-processor": {
          processApprovedPayment: async () => {
            throw new Error("must not deliver");
          },
        },
      },
    });
    const response = await POST({
      json: async () => ({ paypalOrderId: "provider", reference: "first" }),
    });
    assert.equal(response.status, access ? 409 : 404);
    assert.equal(captures, 0);
  }
  const { db, holds } = memoryInventory(),
    service = loadInventory("lib/checkout/holds.ts", db);
  const order = { ...eventOrder("pending"), metadata: { seats: 1, paypalOrderId: "provider" } };
  await service.createHeldCheckoutOrder(order, 1, db);
  db.order.findFirst = async () => order;
  const { POST } = loadInventory("app/api/checkout/paypal/capture/route.ts", db, {
    dependencies: {
      "@/lib/order-access": { canAccessOrder: async () => true },
      "@/lib/paypal": {
        isPayPalConfigured: () => true,
        capturePayPalOrder: async () => ({ success: false, error: "timeout" }),
      },
      "@/lib/payment-processor": {
        processApprovedPayment: async () => {
          throw new Error("must not deliver");
        },
      },
    },
  });
  assert.equal(
    (await POST({ json: async () => ({ paypalOrderId: "provider", reference: "pending" }) }))
      .status,
    500
  );
  assert.equal(holds.get("pending").state, "CAPTURING");
});

test("only the owner can cancel an unpaid claim; a reported transfer or in-flight capture cannot be cancelled", async () => {
  for (const state of ["HELD", "REPORTED", "CAPTURING", "CONSUMED"]) {
    const { db, holds, orders } = memoryInventory(),
      service = loadInventory("lib/checkout/holds.ts", db);
    await service.createHeldCheckoutOrder(eventOrder("first"), 1, db);
    holds.get("first").state = state;
    let audits = 0;
    db.order.findUnique = async () => orders.get("first");
    db.manualPayment = { findUnique: async () => null };
    db.auditLog = {
      create: async () => {
        audits++;
      },
    };
    for (const access of [false, true]) {
      const { POST } = loadInventory("app/api/orders/[reference]/cancel-reservation/route.ts", db, {
        dependencies: {
          "@/lib/order-access": { canAccessOrder: async () => access },
        },
      });
      const response = await POST(
        { json: async () => ({ confirmNoPayment: true }) },
        { params: Promise.resolve({ reference: "first" }) }
      );
      assert.equal(response.status, !access ? 404 : state === "HELD" ? 200 : 409);
    }
    assert.equal(audits, state === "HELD" ? 1 : 0);
    assert.equal(orders.get("first").paymentStatus, state === "HELD" ? "CANCELLED" : "PENDING");
  }
});

test("ADMIN release requires bank verification and a reason, preserves the report and cannot release a capture", async () => {
  const { db, holds, orders } = memoryInventory(),
    service = loadInventory("lib/checkout/holds.ts", db);
  await service.createHeldCheckoutOrder(
    { ...eventOrder("first"), paymentMethod: "BREB_MANUAL" },
    1,
    db
  );
  holds.get("first").state = "REPORTED";
  let audit, rejectedReason;
  db.user = { findUnique: async () => ({ role: "ADMIN", email: "qa@example.com" }) };
  db.manualPayment = {
    updateMany: async ({ data }) => {
      rejectedReason = data.rejectedReason;
    },
  };
  db.auditLog = {
    create: async ({ data }) => {
      audit = data;
    },
  };
  const { POST } = loadInventory("app/api/admin/orders/[id]/release-reservation/route.ts", db, {
    dependencies: {
      "@/lib/auth": { auth: async () => ({ user: { id: "admin" } }) },
    },
  });
  for (const data of [
    { reason: "Sin ingreso" },
    { verifiedNoIncomingPayment: true, reason: "no" },
  ]) {
    assert.equal(
      (await POST({ json: async () => data }, { params: Promise.resolve({ id: "first" }) })).status,
      400
    );
  }
  holds.get("first").state = "CAPTURING";
  const input = {
    json: async () => ({ verifiedNoIncomingPayment: true, reason: "PRUEBA — cuenta sin ingreso" }),
  };
  assert.equal((await POST(input, { params: Promise.resolve({ id: "first" }) })).status, 409);
  holds.get("first").state = "REPORTED";
  assert.equal((await POST(input, { params: Promise.resolve({ id: "first" }) })).status, 200);
  assert.equal(orders.get("first").paymentStatus, "CANCELLED");
  assert.equal(holds.get("first").state, "RELEASED");
  assert.match(rejectedReason, /sin ingreso/);
  assert.equal(audit.metadata.refundExecuted, false);
  assert.equal((await POST(input, { params: Promise.resolve({ id: "first" }) })).status, 409);
  await assert.rejects(
    service.protectCheckoutPayment("first", "REPORTED", { db, allowExpired: true }),
    /no admite pagos/
  );
});

test("expired Bre-B inventory hides bank instructions and denies the QR before reading its source", async () => {
  const order = {
    ...sessionOrder("first"),
    createdAt: new Date(),
    paymentMethod: "BREB_MANUAL",
    checkoutHold: { state: "HELD", expiresAt: new Date(Date.now() - 1) },
  };
  const db = { order: { findFirst: async () => order } };
  const deps = {
    "@/lib/order-access": { canAccessOrder: async () => true },
    "@/lib/breb": {
      getBrebConfiguration: () => ({
        enabled: true,
        key: "TEST-BANK-KEY",
        recipient: "TEST-RECIPIENT",
        qrConfigured: true,
      }),
      getBrebQrSource: () => {
        throw new Error("must not expose QR");
      },
    },
  };
  const { GET } = loadInventory("app/api/orders/[reference]/status/route.ts", db, {
    dependencies: deps,
  });
  const data = await (await GET({}, { params: Promise.resolve({ reference: "first" }) })).json();
  assert.equal(data.reservation.expired, true);
  assert.equal(data.breb.key, "");
  assert.equal(data.qrAvailable, false);
  class NextResponse extends Response {
    static json = Response.json;
  }
  const qr = loadInventory("app/api/orders/[reference]/breb-qr/route.ts", db, {
    dependencies: { ...deps, "next/server": { NextResponse } },
  });
  assert.equal((await qr.GET({}, { params: Promise.resolve({ reference: "first" }) })).status, 409);
});

test("PayPal retries use a stable provider idempotency key and different orders use different keys", async () => {
  const calls = [];
  const { capturePayPalOrder } = loadInventory(
    "lib/paypal.ts",
    {},
    {
      dependencies: {
        "@paypal/paypal-server-sdk": {
          Client: class {},
          Environment: { Sandbox: "sandbox", Production: "live" },
          LogLevel: { Info: "info" },
          OrdersController: class {
            async captureOrder(options) {
              calls.push(options);
              return {
                result: {
                  purchaseUnits: [
                    {
                      payments: {
                        captures: [
                          {
                            id: "capture",
                            status: "COMPLETED",
                            amount: { value: "20.00", currencyCode: "USD" },
                          },
                        ],
                      },
                    },
                  ],
                },
              };
            }
          },
        },
        "./paypal-webhook": {},
        "./preview-safety": { assertPayPalTestEnvironment: () => {} },
      },
    }
  );
  for (const id of ["provider-1", "provider-1", "provider-2"]) {
    assert.equal((await capturePayPalOrder(id)).success, true);
  }
  assert.ok(calls[0].paypalRequestId);
  assert.equal(calls[0].paypalRequestId, calls[1].paypalRequestId);
  assert.notEqual(calls[0].paypalRequestId, calls[2].paypalRequestId);
  assert.ok(calls[0].paypalRequestId.length <= 38);
});

test("Bre-B expiry removes payment instructions but keeps the late transfer report available", () => {
  const require = createRequire(import.meta.url),
    React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  for (const expired of [false, true]) {
    const order = {
      orderNumber: "BREB-TEST",
      itemName: "PRUEBA",
      paymentStatus: "PENDING",
      orderType: "SESSION",
      amount: 20,
      currency: "USD",
      reported: false,
      breb: { enabled: true },
      reservation: {
        state: "HELD",
        expiresAt: new Date(Date.now() + (expired ? -1000 : 1200000)).toISOString(),
        expired,
        canPay: !expired,
      },
    };
    let i = 0;
    const values = [order, false, false, "", "", Date.now()];
    const { default: Page } = loadInventory(
      "app/pago/breb-pending/page.tsx",
      {},
      {
        dependencies: {
          react: { ...React, useState: () => [values[i++], () => {}], useEffect: () => {} },
          "next/navigation": { useSearchParams: () => new URLSearchParams("ref=BREB-TEST") },
          "next/link": {
            default: ({ children, ...props }) => React.createElement("a", props, children),
          },
          "@/components/pago/BrebPaymentInstructions": {
            BrebPaymentInstructions: () =>
              React.createElement("div", null, "TEST-PAYMENT-INSTRUCTIONS"),
          },
          "@/components/pago/CancelUnpaidReservation": { CancelUnpaidReservation: () => null },
        },
      }
    );
    const content = Page().props.children.type;
    const html = renderToStaticMarkup(content());
    assert.equal(html.includes("TEST-PAYMENT-INSTRUCTIONS"), !expired);
    assert.equal(html.includes("La reserva temporal ha caducado"), expired);
    assert.match(html, /Comunicar transferencia/);
    assert.doesNotMatch(html, /<button[^>]*\sdisabled(?:=|[ >])[^>]*>Comunicar transferencia/);
  }
});
