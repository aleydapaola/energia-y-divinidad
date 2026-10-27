// Explicit opt-in: writes only ephemeral fixtures to the verified EYD Neon Preview.
// No provider, email or Calendar clients are loaded.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

import { assertLocalDatabaseSafety } from "../scripts/local-database-safety.mjs";
import { assertLocalServiceSafety } from "../scripts/local-service-safety.mjs";
import { loadInventory } from "./helpers/checkout-inventory.mjs";
import { consumeCheckoutHold } from "../lib/checkout/hold-store.ts";

nextEnv.loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {
    throw new Error("Environment loading failed");
  },
});
assertLocalDatabaseSafety(process.env);
assertLocalServiceSafety(process.env);
const db = new PrismaClient({ log: [] });
const prefix = `eyd-holds-${randomUUID()}`;
const ids = Array.from({ length: 8 }, (_, i) => `${prefix}-${i}`);
const bookingId = `${prefix}-booking`,
  eventId = `${prefix}-event`;
const { assertEventCapacity, lockEventCapacity, eventSeatUsage } = loadInventory(
  "lib/events/capacity.ts",
  db
);
const service = loadInventory("lib/checkout/holds.ts", db, {
  event: { _id: eventId, capacity: 1 },
});
try {
  const user = await db.user.findFirstOrThrow({ where: { role: "USER" }, select: { id: true } });
  const order = (id, kind = "EVENT", scheduledAt) => ({
    id,
    userId: user.id,
    orderNumber: id,
    orderType: kind,
    itemId: kind === "EVENT" ? eventId : `${prefix}-session`,
    itemName: "PRUEBA — RETENCIÓN EFÍMERA — NO REAL",
    amount: 20,
    currency: "USD",
    paymentMethod: "PAYPAL_DIRECT",
    paymentStatus: "PENDING",
    metadata: {
      productType: kind === "EVENT" ? "event" : "session",
      seats: 1,
      ...(scheduledAt ? { scheduledAt } : {}),
    },
  });
  const race = await Promise.allSettled(
    ids.slice(0, 2).map((id) => service.createHeldCheckoutOrder(order(id), 1, db))
  );
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    race.filter(
      (r) => r.status === "rejected" && /No quedan suficientes plazas/.test(r.reason.message)
    ).length,
    1
  );
  assert.equal(
    await db.order.count({ where: { id: { in: ids.slice(0, 2) } } }),
    1,
    "Losing transaction must not leave a payable order"
  );
  const first = race.find((r) => r.status === "fulfilled").value;
  await db.checkoutHold.update({
    where: { orderId: first.id },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  await service.createHeldCheckoutOrder(order(ids[2]), 1, db);
  await assert.rejects(
    service.protectCheckoutPayment(first.id, "CAPTURING", { db }),
    /No quedan suficientes plazas/
  );
  await service.protectCheckoutPayment(ids[2], "CAPTURING", { db });
  await db.checkoutHold.update({
    where: { orderId: ids[2] },
    data: { expiresAt: new Date(Date.now() - 3600000) },
  });
  await assert.rejects(
    service.createHeldCheckoutOrder(order(ids[3]), 1, db),
    /No quedan suficientes plazas/
  );
  // A transaction failure cannot release inventory without delivering the actual seat.
  await assert.rejects(
    db.$transaction(async (tx) => {
      await consumeCheckoutHold(tx, ids[2]);
      throw new Error("intentional hold rollback");
    }),
    /intentional hold rollback/
  );
  assert.equal(
    (await db.checkoutHold.findUniqueOrThrow({ where: { orderId: ids[2] } })).state,
    "CAPTURING"
  );
  await db.$transaction(async (tx) => {
    await lockEventCapacity(tx, eventId);
    await assertEventCapacity(tx, { _id: eventId, capacity: 1 }, 1, undefined, ids[2]);
    await tx.booking.create({
      data: {
        id: bookingId,
        userId: user.id,
        bookingType: "EVENT",
        resourceId: eventId,
        resourceName: "PRUEBA — NO REAL",
        status: "CONFIRMED",
        metadata: { orderId: ids[2], seats: 1 },
      },
    });
    await tx.seatAllocation.create({ data: { eventId, bookingId, userId: user.id } });
    await consumeCheckoutHold(tx, ids[2]);
  });
  assert.equal(
    (await eventSeatUsage(db, [eventId])).get(eventId),
    1,
    "Booking replaces its own hold without double-counting"
  );

  const day = new Date(Date.now() + 55 * 86400000).toISOString().slice(0, 10);
  const date = `${day}T10:00:00-05:00`;
  assert.equal(
    await db.booking.count({
      where: {
        bookingType: "SESSION_1_ON_1",
        scheduledAt: {
          gte: new Date(`${day}T00:00:00-05:00`),
          lt: new Date(`${day}T23:59:59-05:00`),
        },
      },
    }),
    0,
    "Use an empty day; never modify existing appointments"
  );
  assert.equal(
    await db.checkoutHold.count({ where: { orderType: "SESSION", scheduledAt: new Date(date) } }),
    0
  );
  const sessionRace = await Promise.allSettled(
    ids
      .slice(4, 6)
      .map((id) => service.createHeldCheckoutOrder(order(id, "SESSION", date), undefined, db))
  );
  assert.equal(sessionRace.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    sessionRace.filter((r) => r.status === "rejected" && /horario ya no/.test(r.reason.message))
      .length,
    1
  );
  const session = sessionRace.find((r) => r.status === "fulfilled").value;
  await db.checkoutHold.update({
    where: { orderId: session.id },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  await service.protectCheckoutPayment(session.id, "REPORTED", { db, allowExpired: true });
  await assert.rejects(
    service.createHeldCheckoutOrder(order(ids[6], "SESSION", date), undefined, db),
    /horario ya no/
  );
  assert.equal(
    (await db.checkoutHold.findUniqueOrThrow({ where: { orderId: session.id } })).duration,
    90
  );
  console.log(
    JSON.stringify({
      database: "verified Neon Preview",
      eventRace: "one unpaid order and one rejection",
      sessionRace: "one unpaid order and one rejection",
      expiry: "frees only unpaid claims",
      captureTimeout: "inventory retained",
      delivery: "hold consumed atomically; one occupied seat",
      rollback: "claim retained",
      transferReport: "retained for manual review",
      externalServices: "none",
    })
  );
} finally {
  await db.seatAllocation.deleteMany({ where: { bookingId } });
  await db.booking.deleteMany({ where: { id: bookingId, resourceId: eventId } });
  await db.checkoutHold.deleteMany({ where: { orderId: { in: ids } } });
  await db.order.deleteMany({ where: { id: { in: ids }, orderNumber: { startsWith: prefix } } });
  assert.equal(await db.order.count({ where: { id: { in: ids } } }), 0);
  await db.$disconnect();
  console.log(
    "Only this run's ephemeral orders, claims and booking were removed; historical data preserved."
  );
}
