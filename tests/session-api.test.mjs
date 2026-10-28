import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import { loadScheduling, config, singleBookingDb } from "./helpers/session-scheduling.mjs";
import * as holdStore from "../lib/checkout/hold-store.ts";
import * as slots from "../lib/session-slots.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(file, deps = {}) {
  const path = new URL("../" + file, import.meta.url).pathname;
  const mod = new Module(path);
  mod.require = (name) => {
    if (name === "@/lib/membership-fulfillment") {
      return load("lib/membership-fulfillment.ts");
    }
    if (name === "@/lib/membership-billing") {
      return load("lib/membership-billing.ts");
    }
    if (name === "@/components/checkout/PurchasePolicy") {
      return load("components/checkout/PurchasePolicy.tsx");
    }
    if (name === "@/lib/commercial-policy") {
      return load("lib/commercial-policy.ts");
    }

    if (name === "@/lib/checkout/hold-store") {
      return holdStore;
    }
    if (name === "next/server") {
      return { NextResponse: { json: Response.json } };
    }
    if (Object.hasOwn(deps, name)) {
      return deps[name];
    }
    if (name === "@/lib/events/capacity") {
      return load("lib/events/capacity.ts");
    }
    if (name === "@/lib/sanity/queries/events") {
      return {
        getEventById() {
          throw new Error("Unexpected CMS lookup");
        },
      };
    }
    if (name.startsWith("@/")) {
      throw new Error("Unexpected dependency: " + name);
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    path
  );
  return mod.exports;
}
const booking = {
  id: "own",
  userId: "owner",
  bookingType: "SESSION_1_ON_1",
  status: "CONFIRMED",
  duration: 60,
  sessionsTotal: 1,
};
test("private slot lookup requires owner or verified ADMIN and excludes only that booking", async () => {
  for (const [id, role, expected] of [
    [null, "USER", 401],
    ["other", "USER", 404],
    ["owner", "USER", 200],
    ["other", "ADMIN", 200],
  ]) {
    let queries = 0;
    const service = loadScheduling({});
    const { GET } = load("app/api/bookings/[id]/availability/route.ts", {
      "@/lib/auth": { auth: async () => (id ? { user: { id } } : null) },
      "@/lib/prisma": {
        prisma: {
          user: { findUnique: async () => ({ role }) },
          booking: { findUnique: async () => booking },
        },
      },
      "@/lib/session-scheduling": {
        ...service,
        sessionAvailability: async (date, options) => {
          queries++;
          assert.equal(date, "2099-11-01");
          assert.deepEqual(options, { excludeBookingId: "own", duration: 60 });
          return { slots: [], available: false };
        },
      },
    });
    const response = await GET(
      { nextUrl: new URL("https://preview.test/?date=2099-11-01") },
      { params: Promise.resolve({ id: "own" }) }
    );
    assert.equal(response.status, expected);
    assert.equal(queries, expected === 200 ? 1 : 0);
  }
});
test("admin cannot reactivate an overlapping appointment and ordinary users cannot change status", async () => {
  for (const role of ["USER", "ADMIN"]) {
    let writes = 0;
    const db = singleBookingDb({
      ...booking,
      status: "CANCELLED",
      scheduledAt: new Date("2099-11-01T15:00Z"),
    });
    db.user.findUnique = async () => ({ role });
    db.booking.findMany = async () => [
      { scheduledAt: new Date("2099-11-01T15:30Z"), duration: 90 },
    ];
    db.booking.update = async () => {
      writes++;
    };
    const { PATCH } = load("app/api/admin/bookings/[id]/status/route.ts", {
      "@/lib/auth": { auth: async () => ({ user: { id: "admin" } }) },
      "@/lib/prisma": { prisma: db },
      "@/lib/session-scheduling": loadScheduling(db, config),
      "@/lib/session-slots": slots,
    });
    const result = await PATCH(
      { json: async () => ({ status: "CONFIRMED" }) },
      { params: Promise.resolve({ id: "own" }) }
    );
    assert.equal(result.status, role === "USER" ? 403 : 409);
    assert.equal(writes, 0);
  }
});
test("retired legacy Nequi session checkout cannot create unvalidated appointments", async () => {
  const { POST } = load("app/api/checkout/session/route.ts");
  assert.equal(
    (
      await POST({
        json() {
          throw new Error("must not read");
        },
      })
    ).status,
    410
  );
});

test("paid session fulfillment creates one dated booking per order and flags a different paid order occupying that slot", async () => {
  const created = [],
    orders = new Map();
  let calendars = 0,
    customerEmails = 0,
    adminEmails = 0;
  const db = {
    order: { findUnique: async ({ where }) => orders.get(where.id) },
    booking: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where.OR, [
          { metadata: { path: ["orderId"], equals: orders.get(where.OR[0].metadata.equals).id } },
        ]);
        return created.find((b) => b.metadata.orderId === where.OR[0].metadata.equals) ?? null;
      },
      findMany: async () => created,
      create: async ({ data }) => {
        const b = { ...data, id: "booking-" + created.length };
        created.push(b);
        return b;
      },
    },
    $executeRaw: async () => {},
  };
  db.$transaction = async (fn) => fn(db);
  const service = loadScheduling(db);
  const { processApprovedPayment } = load("lib/payment-processor.ts", {
    "@/lib/prisma": { prisma: db },
    "@/lib/session-scheduling": service,
    "@/lib/course-access": {},
    "@/lib/credits": {},
    "@/lib/discount-codes": {},
    "@/lib/session-duration": { resolveSessionDuration: async () => 90 },
    "@/lib/sanity/queries/sessionConfig": { getSessionMeetingLink: async () => undefined },
    "@/lib/google-calendar": {
      syncBookingToGoogleCalendar: async () => {
        calendars++;
      },
    },
    "@/lib/email": {
      sendPaymentConfirmationEmail: async () => {
        customerEmails++;
      },
      sendAdminNotificationEmail: async () => {
        adminEmails++;
      },
    },
  });
  const first = {
    id: "order-1",
    orderNumber: "PP-TEST-1",
    userId: "owner",
    user: { email: "test@example.com", name: "Test" },
    orderType: "SESSION",
    itemId: "session",
    itemName: "NO REAL",
    paymentStatus: "COMPLETED",
    paymentMethod: "PAYPAL_DIRECT",
    amount: 20,
    currency: "USD",
    metadata: { productType: "session", scheduledAt: "2099-11-01T15:00:00Z" },
  };
  orders.set(first.id, first);
  assert.equal((await processApprovedPayment(first)).success, true);
  assert.equal(created[0].duration, 90);
  assert.equal(
    created[0].scheduledAt.toISOString(),
    first.metadata.scheduledAt.replace("Z", ".000Z")
  );
  assert.equal((await processApprovedPayment(first)).success, true);
  assert.deepEqual([created.length, calendars, customerEmails, adminEmails], [1, 1, 1, 1]);
  const second = { ...first, id: "order-2", orderNumber: "PP-TEST-2" };
  orders.set(second.id, second);
  const conflict = await processApprovedPayment(second);
  assert.equal(conflict.success, false);
  assert.match(conflict.error, /ya no está disponible/);
  assert.deepEqual([created.length, calendars, customerEmails, adminEmails], [1, 1, 1, 1]);
});
