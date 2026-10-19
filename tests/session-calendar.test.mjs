import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as safety from "../lib/preview-safety.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(file, dependencies) {
  const filename = new URL(`../lib/${file}.ts`, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return mod.exports;
}

for (const scenario of [
  { stored: 45, configured: 90, expected: 45 },
  { stored: null, configured: 90, expected: 90 },
  { stored: undefined, configured: 120, expected: 120 },
  { stored: 0, configured: -1, expected: 90 },
  { stored: null, failure: true, expected: 90 },
]) {
  test(`session duration preserves stored ${scenario.stored}, config ${scenario.configured}`, async () => {
    let calls = 0;
    const duration = load("session-duration", {
      "@/lib/sanity/queries/sessionConfig": {
        getSessionConfig: () => {
          calls++;
          if (scenario.failure) {
            throw new Error("CMS unavailable");
          }
          return { duration: scenario.configured };
        },
      },
    });
    assert.equal(await duration.resolveSessionDuration(scenario.stored), scenario.expected);
    assert.equal(calls, scenario.stored === 45 ? 0 : 1);
  });
}

test("actual Calendar sync uses session duration, preserves timezone and updates the same test event", async () => {
  const keys = [
    "VERCEL_ENV",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "GOOGLE_CALENDAR_ID",
    "PREVIEW_GOOGLE_CALENDAR_ID",
    "GOOGLE_CALENDAR_TIME_ZONE",
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    VERCEL_ENV: "preview",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@example.com",
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "fake",
    GOOGLE_CALENDAR_ID: "real-calendar",
    PREVIEW_GOOGLE_CALENDAR_ID: "test-calendar",
    GOOGLE_CALENDAR_TIME_ZONE: "America/Bogota",
  });
  try {
    const duration = load("session-duration", {
      "@/lib/sanity/queries/sessionConfig": { getSessionConfig: () => ({ duration: 90 }) },
    });
    const booking = {
      id: "test-booking",
      bookingType: "SESSION_1_ON_1",
      status: "CONFIRMED",
      scheduledAt: new Date("2026-10-26T15:00:00Z"),
      duration: null,
      user: { name: "Test", email: "test@example.com" },
      resourceName: "Session",
    };
    const requests = [];
    const calendar = load("google-calendar", {
      "@prisma/client": { BookingType: { SESSION_1_ON_1: "SESSION_1_ON_1" } },
      "@/lib/prisma": {
        prisma: {
          booking: {
            findUnique: () => booking,
            update: ({ data }) => Object.assign(booking, data),
          },
        },
      },
      "@/lib/session-duration": duration,
      "./preview-safety": safety,
      googleapis: {
        google: {
          auth: { JWT: class {} },
          calendar: () => ({
            events: {
              insert: (request) => {
                requests.push({ kind: "insert", ...request });
                return { data: { id: "test-event" } };
              },
              update: (request) => {
                requests.push({ kind: "update", ...request });
                return {};
              },
            },
          }),
        },
      },
    });
    assert.equal((await calendar.syncBookingToGoogleCalendar(booking.id)).success, true);
    assert.equal((await calendar.syncBookingToGoogleCalendar(booking.id)).action, "updated");
    assert.deepEqual(
      requests.map((r) => r.kind),
      ["insert", "update"]
    );
    assert.equal(requests[1].eventId, "test-event");
    for (const request of requests) {
      assert.equal(request.calendarId, "test-calendar");
      assert.equal(request.requestBody.start.dateTime, "2026-10-26T15:00:00.000Z");
      assert.equal(request.requestBody.end.dateTime, "2026-10-26T16:30:00.000Z");
      assert.equal(request.requestBody.start.timeZone, "America/Bogota");
      assert.match(request.requestBody.summary, /^\[PRUEBA — NO REAL\]/);
      assert.match(request.requestBody.description, /NO ES UNA CITA REAL/);
      assert.equal(request.requestBody.attendees, undefined);
    }
    booking.duration = 45;
    await calendar.syncBookingToGoogleCalendar(booking.id);
    assert.equal(requests[2].requestBody.end.dateTime, "2026-10-26T15:45:00.000Z");
    assert.equal(booking.googleCalendarSyncError, null);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
});
