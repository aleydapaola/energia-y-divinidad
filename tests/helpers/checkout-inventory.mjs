import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";

import { loadScheduling, config } from "./session-scheduling.mjs";
import * as holdStore from "../../lib/checkout/hold-store.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
export function loadInventory(relative, db, options = {}) {
  const path = new URL("../../" + relative, import.meta.url).pathname;
  const mod = new Module(path);
  mod.require = (name) => {
    if (name === "./membership-webhook-events") {
      return loadInventory("lib/membership-webhook-events.ts", db, options);
    }
    if (options.dependencies?.[name]) {
      return options.dependencies[name];
    }
    if (name === "@/lib/prisma") {
      return { prisma: db };
    }
    if (name === "@/lib/checkout/hold-store") {
      return holdStore;
    }
    if (name === "@/lib/events/capacity") {
      return loadInventory("lib/events/capacity.ts", db, options);
    }
    if (name === "@/lib/checkout/holds") {
      return loadInventory("lib/checkout/holds.ts", db, options);
    }
    if (name === "@/lib/session-scheduling") {
      return loadScheduling(db, options.config ?? config);
    }
    if (name === "@/lib/sanity/queries/events") {
      return { getEventById: async () => options.event ?? { _id: "event", capacity: 1 } };
    }
    if (name === "next/server") {
      return { NextResponse: { json: Response.json } };
    }
    if (name.startsWith("@/")) {
      throw new Error("Unmocked inventory dependency: " + name);
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    path
  );
  return mod.exports;
}

export function memoryInventory() {
  const orders = new Map(),
    holds = new Map(),
    bookings = [],
    allocations = [];
  const db = {
    order: {
      create: async ({ data }) => {
        const o = { id: data.id ?? `order-${orders.size}`, ...data };
        orders.set(o.id, o);
        return o;
      },
      findUniqueOrThrow: async ({ where }) => {
        const o = orders.get(where.id);
        if (!o) {
          throw new Error("missing order");
        }
        return { ...o, checkoutHold: holds.get(o.id) ?? null };
      },
      updateMany: async ({ where, data }) => {
        const o = orders.get(where.id);
        if (!o || (where.paymentStatus && where.paymentStatus !== o.paymentStatus)) {
          return { count: 0 };
        }
        Object.assign(o, data);
        return { count: 1 };
      },
      findUnique: async ({ where }) => orders.get(where.id),
    },
    booking: { findMany: async () => bookings },
    seatAllocation: { findMany: async () => allocations },
    checkoutHold: {
      create: async ({ data }) => {
        const h = { state: "HELD", ...data };
        holds.set(h.orderId, h);
        return h;
      },
      findUnique: async ({ where }) => holds.get(where.orderId) ?? null,
      findMany: async ({ where }) =>
        [...holds.values()].filter(
          (h) =>
            (!where.orderType || h.orderType === where.orderType) &&
            (!where.resourceId?.in || where.resourceId.in.includes(h.resourceId)) &&
            (!where.orderId?.not || h.orderId !== where.orderId.not) &&
            (!where.scheduledAt?.lt || (h.scheduledAt && h.scheduledAt < where.scheduledAt.lt)) &&
            ((h.state === "HELD" && h.expiresAt > where.OR[0].expiresAt.gt) ||
              ["CAPTURING", "REPORTED"].includes(h.state))
        ),
      upsert: async ({ where, create, update }) => {
        const h = holds.get(where.orderId);
        if (h) {
          Object.assign(h, update);
        } else {
          holds.set(where.orderId, { ...create });
        }
      },
      update: async ({ where, data }) => {
        Object.assign(holds.get(where.orderId), data);
        return holds.get(where.orderId);
      },
      updateMany: async ({ where, data }) => {
        const h = holds.get(where.orderId);
        if (!h || (typeof where.state === "string" && h.state !== where.state)) {
          return { count: 0 };
        }
        Object.assign(h, data);
        return { count: 1 };
      },
    },
    $executeRaw: async () => {},
  };
  db.$transaction = async (fn) => fn(db);
  return { db, orders, holds, bookings, allocations };
}
