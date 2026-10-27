// Opt-in write test, verified isolated Neon Preview only. No email, Calendar or payment clients.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

import { assertEventCapacity, eventSeatUsage, lockEventCapacity } from "../lib/events/capacity.ts";
import { assertLocalDatabaseSafety } from "../scripts/local-database-safety.mjs";
import { assertLocalServiceSafety } from "../scripts/local-service-safety.mjs";

nextEnv.loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {
    throw new Error("Environment loading failed");
  },
});
assertLocalDatabaseSafety(process.env);
assertLocalServiceSafety(process.env);
const db = new PrismaClient({ log: [] });
const resourceId = "eyd-qa-capacity-" + randomUUID();
const ids = ["qa-event-" + randomUUID(), "qa-event-" + randomUUID(), "qa-event-" + randomUUID()];
try {
  const user = await db.user.findFirst({ where: { role: "USER" }, select: { id: true } });
  assert.ok(user, "A pre-existing Preview client is required");
  const create = async (tx, id, eventId) => {
    await tx.booking.create({
      data: {
        id,
        userId: user.id,
        bookingType: "EVENT",
        resourceId: eventId,
        resourceName: "PRUEBA — CONCURRENCIA — NO REAL",
        status: "CONFIRMED",
        paymentStatus: "COMPLETED",
        amount: 0,
        currency: "COP",
        metadata: { seats: 1, purpose: "ephemeral-event-capacity-test" },
      },
    });
    await tx.seatAllocation.create({ data: { eventId, bookingId: id, userId: user.id, seats: 1 } });
  };
  const race = await Promise.allSettled(
    ids.slice(0, 2).map((id) =>
      db.$transaction(
        async (tx) => {
          await lockEventCapacity(tx, resourceId);
          await assertEventCapacity(tx, { _id: resourceId, capacity: 1 }, 1);
          await create(tx, id, resourceId);
        },
        { maxWait: 10000, timeout: 15000 }
      )
    )
  );
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    race.filter(
      (r) => r.status === "rejected" && /No quedan suficientes plazas/.test(r.reason.message)
    ).length,
    1
  );
  assert.equal(await db.booking.count({ where: { resourceId } }), 1);
  assert.equal(await db.seatAllocation.count({ where: { eventId: resourceId } }), 1);
  assert.equal((await eventSeatUsage(db, [resourceId])).get(resourceId), 1);

  const rollbackId = resourceId + "-rollback";
  await assert.rejects(
    db.$transaction(async (tx) => {
      await lockEventCapacity(tx, rollbackId);
      await assertEventCapacity(tx, { _id: rollbackId, capacity: 1 }, 1);
      await create(tx, ids[2], rollbackId);
      await tx.entitlement.create({
        data: {
          userId: user.id,
          type: "EVENT",
          resourceId: rollbackId,
          resourceName: "PRUEBA — NO REAL",
        },
      });
      throw new Error("intentional rollback test");
    }),
    /intentional rollback test/
  );
  assert.equal(await db.booking.count({ where: { id: ids[2] } }), 0);
  assert.equal(await db.seatAllocation.count({ where: { eventId: rollbackId } }), 0);
  assert.equal(await db.entitlement.count({ where: { resourceId: rollbackId } }), 0);
  console.log(
    JSON.stringify({
      database: "verified Neon Preview",
      lastSeat: "one winner, one rejection",
      resources: "one booking, one allocation",
      rollback: "booking, allocation and entitlement rolled back",
      externalServices: "none",
    })
  );
} finally {
  await db.seatAllocation.deleteMany({ where: { bookingId: { in: ids } } });
  await db.entitlement.deleteMany({ where: { resourceId: resourceId + "-rollback" } });
  await db.booking.deleteMany({
    where: { id: { in: ids }, resourceId: { in: [resourceId, resourceId + "-rollback"] } },
  });
  assert.equal(await db.booking.count({ where: { id: { in: ids } } }), 0);
  await db.$disconnect();
  console.log(
    "Only this run's ephemeral fixtures were removed; historical records were preserved."
  );
}
