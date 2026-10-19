import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as bookingTime from "../lib/booking-time.ts";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
function load(path, dependencies = {}) {
  const filename = new URL("../" + path, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => (Object.hasOwn(dependencies, name) ? dependencies[name] : require(name));
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
const booking = {
  id: "test-only",
  resourceName: "Test",
  status: "CONFIRMED",
  scheduledAt: new Date("2026-10-26T15:00:00Z"),
  duration: 90,
  rescheduleCount: 0,
};
function nodes(node) {
  if (Array.isArray(node)) {
    return node.flatMap(nodes);
  }
  if (!node || typeof node !== "object" || !node.props) {
    return [];
  }
  return [node, ...nodes(node.props.children)];
}
test("account card labels Colombia time consistently across browser/server zones", () => {
  const saved = process.env.TZ;
  try {
    const { BookingCard } = load("app/mi-cuenta/sesiones/BookingCard.tsx", {
      "@/lib/booking-time": bookingTime,
    });
    for (const zone of ["Europe/Madrid", "Asia/Tokyo", "America/Los_Angeles"]) {
      process.env.TZ = zone;
      const html = renderToStaticMarkup(
        React.createElement(BookingCard, { booking, onUpdate() {} })
      );
      assert.match(html, /26 de octubre de 2026/);
      assert.match(html, /10:00/);
      assert.match(html, /hora de Colombia/);
    }
  } finally {
    if (saved === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = saved;
    }
  }
});
test("actual reschedule form submits the chosen Colombia instant independently of browser timezone", async () => {
  const saved = process.env.TZ;
  const originalFetch = globalThis.fetch;
  try {
    for (const zone of ["Europe/Madrid", "Asia/Tokyo", "America/Los_Angeles"]) {
      process.env.TZ = zone;
      let index = 0,
        submitted,
        updated = false;
      const values = [true, false, "2026-10-26", "14:00", "test", false, null, zone];
      const { BookingCard } = load("app/mi-cuenta/sesiones/BookingCard.tsx", {
        "@/lib/booking-time": bookingTime,
        react: { useState: () => [values[index++], () => {}], useEffect() {} },
      });
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "/api/bookings/test-only/reschedule");
        assert.equal(options.method, "PATCH");
        submitted = JSON.parse(options.body);
        return { ok: true, json: async () => ({ success: true }) };
      };
      const tree = BookingCard({
        booking,
        onUpdate() {
          updated = true;
        },
      });
      const confirm = nodes(tree).find(
        (n) => n.type === "button" && n.props.children === "Confirmar"
      );
      assert.ok(confirm);
      await confirm.props.onClick();
      assert.equal(submitted.newDate, "2026-10-26T19:00:00.000Z", zone);
      assert.equal(updated, true);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (saved === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = saved;
    }
  }
});
test("earliest reschedule day follows Colombia at UTC midnight and year boundaries", () => {
  assert.equal(bookingTime.nextBookingDateKey(new Date("2027-01-01T02:00:00Z")), "2027-01-01");
  assert.equal(bookingTime.nextBookingDateKey(new Date("2027-01-01T05:00:00Z")), "2027-01-02");
  assert.equal(bookingTime.nextBookingDateKey(new Date("2028-03-01T02:00:00Z")), "2028-03-01");
});
test("reschedule email uses Colombia time even when the server runs in UTC", async () => {
  const saved = process.env.TZ;
  process.env.TZ = "UTC";
  let message;
  try {
    const { sendRescheduleEmail } = load("lib/email.ts", {
      "@/lib/email-delivery": {
        deliverEmail: async (data) => {
          message = data;
          return { data: { id: "test" }, error: null };
        },
      },
      "@/lib/prisma": { prisma: {} },
    });
    await sendRescheduleEmail({
      email: "test@example.com",
      name: "Test",
      sessionName: "Test",
      previousDate: null,
      newDate: new Date("2026-10-26T15:00:00Z"),
      rescheduledBy: "client",
    });
    assert.match(message.html, /26 de octubre de 2026/);
    assert.match(message.html, /10:00/);
    assert.match(message.html, /hora de Colombia/);
  } finally {
    if (saved === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = saved;
    }
  }
});
