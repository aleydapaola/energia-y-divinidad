// Opt-in write test: node --experimental-strip-types tests/session-concurrency.integration.mjs
// Only the verified isolated Neon Preview is permitted. No Calendar or email code is loaded.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

import { assertLocalDatabaseSafety } from "../scripts/local-database-safety.mjs";
import { assertLocalServiceSafety } from "../scripts/local-service-safety.mjs";
import { config, loadScheduling } from "./helpers/session-scheduling.mjs";
nextEnv.loadEnvConfig(process.cwd(), true);
assertLocalDatabaseSafety(process.env);
assertLocalServiceSafety(process.env);
const db = new PrismaClient({ log: [] });
const ids = ["qa-slots-" + randomUUID(), "qa-slots-" + randomUUID()];
try {
  const user = await db.user.findFirst({ where: { role: "USER" }, select: { id: true } });
  assert.ok(user, "A pre-existing test customer is required");
  const day = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const date = (time) => new Date(`${day}T${time}:00-05:00`);
  const existing = await db.booking.count({
    where: {
      bookingType: "SESSION_1_ON_1",
      scheduledAt: { gte: date("00:00"), lt: new Date(date("00:00").getTime() + 86400000) },
      status: { in: ["PENDING_PAYMENT", "PENDING", "CONFIRMED"] },
    },
  });
  assert.equal(
    existing,
    0,
    "Chosen integration-test day must be empty; existing bookings are never modified"
  );
  await db.booking.createMany({
    data: ids.map((id) => ({
      id,
      userId: user.id,
      bookingType: "SESSION_1_ON_1",
      resourceId: "eyd-qa-slots",
      resourceName: "PRUEBA — CONCURRENCIA — NO REAL",
      status: "CONFIRMED",
      paymentStatus: "COMPLETED",
      duration: 90,
      amount: 0,
      currency: "COP",
      metadata: { purpose: "ephemeral-session-concurrency-test" },
    })),
  });
  const service = loadScheduling(db);
  const race = await Promise.allSettled(
    ids.map((id) =>
      service.moveSessionBooking({ id, actorId: user.id, newDate: date("10:00") }, { db, config })
    )
  );
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(race.filter((r) => r.status === "rejected" && r.reason.status === 409).length, 1);
  const booked = await db.booking.findFirstOrThrow({
    where: { id: { in: ids }, scheduledAt: { not: null } },
  });
  assert.equal(booked.rescheduleCount, 0, "The initial date does not consume a change");
  await service.moveSessionBooking(
    { id: booked.id, actorId: user.id, newDate: date("12:00") },
    { db, config }
  );
  const limitRace = await Promise.allSettled(
    ["14:00", "16:00"].map((time) =>
      service.moveSessionBooking(
        { id: booked.id, actorId: user.id, newDate: date(time) },
        { db, config }
      )
    )
  );
  assert.equal(limitRace.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    limitRace.filter((r) => r.status === "rejected" && /límite de 2/.test(r.reason.message)).length,
    1
  );
  const final = await db.booking.findUniqueOrThrow({ where: { id: booked.id } });
  assert.equal(final.rescheduleCount, 2);
  console.log(
    JSON.stringify({
      database: "verified Neon Preview",
      sameSlot: "one winner, one conflict",
      initialDateCount: 0,
      simultaneousFinalChanges: "one winner, limit preserved",
      finalCount: final.rescheduleCount,
      externalServices: "none",
    })
  );
} finally {
  await db.booking.deleteMany({ where: { id: { in: ids }, resourceId: "eyd-qa-slots" } });
  assert.equal(await db.booking.count({ where: { id: { in: ids } } }), 0);
  console.log("Only the ephemeral test bookings were removed; existing bookings were preserved.");
  await db.$disconnect();
}
