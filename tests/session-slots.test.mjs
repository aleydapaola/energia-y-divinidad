import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSessionSlots,
  sessionIntervalsConflict,
  validSessionDate,
} from "../lib/session-slots.ts";
import { config, loadScheduling, singleBookingDb } from "./helpers/session-scheduling.mjs";
const now = new Date("2099-10-25T15:00:00Z");
const date = "2099-10-26";
const at = (time) => new Date(`${date}T${time}:00-05:00`);
const candidate = {
  id: "test",
  userId: "owner",
  bookingType: "SESSION_1_ON_1",
  status: "CONFIRMED",
  scheduledAt: null,
  duration: 90,
  sessionsTotal: 1,
  rescheduleCount: 0,
  user: { email: "test@example.com" },
};

test("slots block partial overlaps, retain exact buffer boundaries and stored durations", () => {
  const intervals = [{ scheduledAt: at("10:30"), duration: 90 }];
  const result = buildSessionSlots(date, config, intervals, { now });
  assert.equal(result.slots.find((s) => s.time === "10:00").available, false);
  assert.equal(result.slots.find((s) => s.time === "12:00").available, false);
  assert.equal(result.slots.find((s) => s.time === "08:00").available, true);
  assert.equal(sessionIntervalsConflict(at("12:30"), 90, intervals[0], config), false);
  assert.equal(
    sessionIntervalsConflict(at("10:00"), 90, { scheduledAt: at("08:00"), duration: 120 }, config),
    true
  );
  assert.equal(
    sessionIntervalsConflict(at("10:00"), 90, { scheduledAt: at("08:00"), duration: null }, config),
    false
  );
});

test("availability respects Colombia day, tomorrow lead time, holidays, blocks and maximum advance", () => {
  const opts = { now: new Date("2099-10-26T04:00:00Z") }; // 23:00 on the 25th in Colombia
  const lead = buildSessionSlots(date, { ...config, bookingLeadTime: 12 }, [], opts);
  assert.equal(lead.slots.find((s) => s.time === "10:00").available, false);
  assert.equal(lead.slots.find((s) => s.time === "12:00").available, true);
  for (const extra of [
    { holidays: [{ date: "2000-10-26", recurring: true }] },
    { blockedDates: [{ startDate: date, endDate: date }] },
    { maxAdvanceBooking: 0 },
    { status: "paused" },
    { published: false },
  ]) {
    assert.equal(buildSessionSlots(date, { ...config, ...extra }, [], opts).available, false);
  }
  assert.equal(
    buildSessionSlots(date, { ...config, maxAdvanceBooking: 1 }, [], opts).available,
    true
  );
  assert.equal(validSessionDate("2099-02-30"), false);
  assert.equal(validSessionDate("2099-2-01"), false);
});

test("a long legacy booking crossing midnight blocks the next day and own booking can be excluded", async () => {
  let where;
  const reader = {
    booking: {
      findMany: async (args) => {
        where = args.where;
        return [{ scheduledAt: new Date("2099-10-25T23:00:00-05:00"), duration: 660 }];
      },
    },
  };
  const service = loadScheduling(reader);
  const result = await service.sessionAvailability(date, {
    reader,
    config,
    excludeBookingId: "own",
    duration: 60,
  });
  assert.deepEqual(where.status.in, ["PENDING_PAYMENT", "PENDING", "CONFIRMED"]);
  assert.deepEqual(where.id, { not: "own" });
  assert.equal(where.scheduledAt.gte, undefined);
  assert.equal(result.slots.find((s) => s.time === "08:00").available, false);
  assert.equal(result.session.duration, 60);
});

test("server rejects off-grid times, seconds, occupied intervals and no-op moves without a write", async () => {
  for (const [newDate, occupied] of [
    [at("09:00"), []],
    [new Date(at("10:00").getTime() + 1000), []],
    [at("10:00"), [{ scheduledAt: at("10:30"), duration: 90 }]],
    [at("10:00"), null],
  ]) {
    let writes = 0;
    const before = { ...candidate, ...(occupied === null ? { scheduledAt: newDate } : {}) };
    const db = singleBookingDb(before, () => {
      writes++;
    });
    db.booking.findMany = async () => occupied || [];
    const service = loadScheduling(db);
    await assert.rejects(
      service.moveSessionBooking({ id: "test", actorId: "owner", newDate }),
      service.SessionSchedulingError
    );
    assert.equal(writes, 0);
  }
});

test("admin exceptions bypass schedule and two-change limit, but still reject occupied times and record an audit", async () => {
  let writes = 0,
    audits = 0,
    occupied = [];
  const db = singleBookingDb({ ...candidate, scheduledAt: at("10:00"), rescheduleCount: 2 }, () => {
    writes++;
  });
  db.user.findUnique = async () => ({ id: "admin", role: "ADMIN", email: "test@example.com" });
  db.booking.findMany = async () => occupied;
  db.auditLog = {
    create: async () => {
      audits++;
    },
  };
  const service = loadScheduling(db);
  await service.moveSessionBooking({
    id: "test",
    actorId: "admin",
    requireAdmin: true,
    newDate: at("09:00"),
  });
  assert.deepEqual([writes, audits], [1, 1]);
  occupied = [{ scheduledAt: at("12:30"), duration: 90 }];
  await assert.rejects(
    service.moveSessionBooking({ id: "test", actorId: "admin", newDate: at("12:00") }),
    /ya no está disponible/
  );
  assert.deepEqual([writes, audits], [1, 1]);
});

test("changed status cannot be overwritten by a stale move, and a pack parent cannot occupy a date", async () => {
  const db = singleBookingDb(candidate);
  db.booking.updateMany = async () => ({ count: 0 });
  const service = loadScheduling(db);
  await assert.rejects(
    service.moveSessionBooking({ id: "test", actorId: "owner", newDate: at("10:00") }),
    /reserva ha cambiado/
  );
  const pack = loadScheduling(singleBookingDb({ ...candidate, sessionsTotal: 8 }));
  await assert.rejects(
    pack.moveSessionBooking({ id: "test", actorId: "owner", newDate: at("10:00") }),
    /sesiones individuales/
  );
});
