import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";

import * as holdStore from "../../lib/checkout/hold-store.ts";
import * as slots from "../../lib/session-slots.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
export const config = {
  title: "PRUEBA — NO REAL",
  duration: 90,
  bufferTime: 30,
  bookingLeadTime: 0,
  maxAdvanceBooking: 36500,
  status: "active",
  published: true,
  weeklySchedule: Object.fromEntries(
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => [
      day,
      [{ start: "08:00", end: "18:00" }],
    ])
  ),
};
export function loadScheduling(db, schedule = config) {
  db.checkoutHold ??= {
    findMany: async () => [],
    findUnique: async () => null,
    updateMany: async () => ({ count: 0 }),
  };
  const filename = new URL("../../lib/session-scheduling.ts", import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === "@/lib/checkout/hold-store") {
      return holdStore;
    }
    if (name === "@/lib/prisma") {
      return { prisma: db };
    }
    if (name === "@/lib/sanity/queries/sessionConfig") {
      return { getSessionConfig: async () => schedule };
    }
    if (name === "./session-slots") {
      return slots;
    }
    throw new Error("Unexpected scheduling dependency: " + name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return mod.exports;
}
// A transaction-aware fixture for existing route tests. Concurrency itself is
// verified against Neon Preview separately, rather than simulated by this mock.
export function singleBookingDb(candidate, onWrite = () => {}) {
  let stored = { ...candidate };
  const db = {
    user: { findUnique: async () => ({ id: candidate.userId, role: "USER" }) },
    booking: {
      findUnique: async () => ({ ...stored }),
      findMany: async () => [],
      updateMany: async ({ data }) => {
        onWrite(data);
        stored = {
          ...stored,
          ...data,
          rescheduleCount: stored.rescheduleCount + (data.rescheduleCount?.increment ?? 0),
        };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => stored,
    },
    $executeRaw: async () => {},
  };
  db.$transaction = async (fn) => fn(db);
  return db;
}
