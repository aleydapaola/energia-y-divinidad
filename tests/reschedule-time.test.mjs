import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as bookingTime from "../lib/booking-time.ts";
import * as sessionPolicy from "../lib/session-policy.ts";
import { loadScheduling, singleBookingDb } from "./helpers/session-scheduling.mjs";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
function load(path, dependencies = {}) {
  const filename = new URL("../" + path, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (Object.hasOwn(dependencies, name)) {
      return dependencies[name];
    }
    if (name === "@/lib/session-scheduling") {
      return loadScheduling(dependencies["@/lib/prisma"].prisma);
    }
    if (name === "@/lib/session-policy") {
      return sessionPolicy;
    }
    if (name === "@/components/booking/SessionPolicy") {
      return load("components/booking/SessionPolicy.tsx");
    }
    return require(name);
  };
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
  bookingType: "SESSION_1_ON_1",
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
      const values = [
        true,
        false,
        "2026-10-26",
        "14:00",
        "test",
        false,
        null,
        zone,
        [{ time: "14:00", label: "14:00 - 15:30", available: true }],
        false,
        null,
      ];
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

test("card and API require both fewer than two changes and at least 24 hours, including the boundary", async () => {
  const originalNow = Date.now;
  const now = new Date("2099-10-25T15:00:00Z").getTime();
  Date.now = () => now;
  try {
    for (const scenario of [
      { hours: 24, count: 1, status: "CONFIRMED", allowed: true },
      { hours: 24 - 1 / 3600, count: 0, status: "CONFIRMED", allowed: false },
      { hours: 48, count: 2, status: "CONFIRMED", allowed: false },
      { hours: 48, count: 0, status: "NO_SHOW", allowed: false },
    ]) {
      let writes = 0,
        calendarCalls = 0,
        emails = 0;
      const candidate = {
        ...booking,
        userId: "test-user",
        user: { email: "test@example.com", name: "Test" },
        status: scenario.status,
        scheduledAt: new Date(now + scenario.hours * 3600000),
        rescheduleCount: scenario.count,
      };
      const { BookingCard } = load("app/mi-cuenta/sesiones/BookingCard.tsx", {
        "@/lib/booking-time": bookingTime,
      });
      const html = renderToStaticMarkup(
        React.createElement(BookingCard, {
          booking: candidate,
          onUpdate() {},
        })
      );
      assert.equal(/>Reprogramar<\/button>/.test(html), scenario.allowed, JSON.stringify(scenario));
      assert.match(html, /Ambas condiciones deben cumplirse/);
      assert.match(html, /a elección del cliente/);
      const { PATCH } = load("app/api/bookings/[id]/reschedule/route.ts", {
        "@/lib/auth": { auth: async () => ({ user: { id: "test-user" } }) },
        "@/lib/prisma": {
          prisma: singleBookingDb(candidate, () => {
            writes++;
          }),
        },
        "@/lib/google-calendar": {
          syncBookingToGoogleCalendar: async () => {
            calendarCalls++;
          },
        },
        "@/lib/email": {
          sendRescheduleEmail: async () => {
            emails++;
          },
        },
      });
      const response = await PATCH(
        { json: async () => ({ newDate: "2099-11-01T15:00:00Z" }) },
        {
          params: Promise.resolve({ id: candidate.id }),
        }
      );
      assert.equal(response.status, scenario.allowed ? 200 : 400);
      assert.deepEqual([writes, calendarCalls, emails], scenario.allowed ? [1, 1, 1] : [0, 0, 0]);
    }
  } finally {
    Date.now = originalNow;
  }
});

test("choosing the first date preserves two changes and cannot schedule an unconfirmed session or an event", async () => {
  for (const scenario of [
    {
      status: "CONFIRMED",
      bookingType: "SESSION_1_ON_1",
      date: "2099-11-01T15:00:00Z",
      allowed: true,
    },
    {
      status: "PENDING",
      bookingType: "SESSION_1_ON_1",
      date: "2099-11-01T15:00:00Z",
      allowed: false,
    },
    { status: "CONFIRMED", bookingType: "EVENT", date: "2099-11-01T15:00:00Z", allowed: false },
    { status: "CONFIRMED", bookingType: "SESSION_1_ON_1", date: "invalid-date", allowed: false },
  ]) {
    let writes = 0,
      calendarCalls = 0,
      emailCalls = 0;
    const candidate = {
      ...booking,
      ...scenario,
      scheduledAt: null,
      userId: "test-user",
      user: { email: "test@example.com", name: "Test" },
    };
    const { PATCH } = load("app/api/bookings/[id]/reschedule/route.ts", {
      "@/lib/auth": { auth: async () => ({ user: { id: "test-user" } }) },
      "@/lib/prisma": {
        prisma: singleBookingDb(candidate, (data) => {
          writes++;
          assert.equal(data.rescheduleCount, undefined);
        }),
      },
      "@/lib/google-calendar": {
        syncBookingToGoogleCalendar: async () => {
          calendarCalls++;
        },
      },
      "@/lib/email": {
        sendRescheduleEmail: async ({ previousDate }) => {
          emailCalls++;
          assert.equal(previousDate, null);
        },
      },
    });
    const response = await PATCH(
      { json: async () => ({ newDate: scenario.date }) },
      {
        params: Promise.resolve({ id: booking.id }),
      }
    );
    assert.equal(response.status, scenario.allowed ? 200 : 400, JSON.stringify(scenario));
    assert.deepEqual([writes, calendarCalls, emailCalls], scenario.allowed ? [1, 1, 1] : [0, 0, 0]);
    if (scenario.allowed) {
      assert.equal((await response.json()).booking.rescheduleCount, 0);
    }
  }
});

test("individual cancellation email states refund rights without claiming money was returned", async () => {
  const messages = [];
  const { sendCancellationEmail } = load("lib/email.ts", {
    "@/lib/email-delivery": {
      deliverEmail: async (data) => {
        messages.push(data);
        return { data: { id: "test" }, error: null };
      },
    },
    "@/lib/prisma": { prisma: {} },
  });
  for (const isIndividualSession of [true, false]) {
    await sendCancellationEmail({
      email: "test@example.com",
      name: "Test",
      sessionName: "Test",
      scheduledDate: new Date("2026-10-26T15:00:00Z"),
      cancelledBy: "admin",
      isIndividualSession,
    });
  }
  assert.match(messages[0].html, /Reembolso íntegro o cambio de fecha, a elección del cliente/);
  assert.match(messages[0].html, /Cancelar la reserva no ejecuta la devolución del dinero/);
  assert.match(messages[0].html, /Sin reembolso automático/);
  assert.match(messages[0].html, /10:00/);
  assert.match(messages[0].html, /hora de Colombia/);
  assert.doesNotMatch(messages[1].html, /Reembolso íntegro/);
});

test("paid-session and credit-booking emails include the policy without changing other purchase types", async () => {
  const messages = [];
  const email = load("lib/email.ts", {
    "@/lib/email-delivery": {
      deliverEmail: async (data) => {
        messages.push(data);
        return { data: { id: "test" }, error: null };
      },
    },
    "@/lib/prisma": { prisma: {} },
  });
  for (const orderType of ["SESSION", "EVENT", "COURSE", "PRODUCT", "MEMBERSHIP"]) {
    await email.sendPaymentConfirmationEmail({
      email: "test@example.com",
      name: "Test",
      orderNumber: "TEST-ONLY",
      orderType,
      itemName: "Test",
      amount: 100,
      currency: "USD",
      paymentMethod: "PAYPAL_DIRECT",
    });
    const message = messages.at(-1);
    assert.equal(message.html.includes("Reembolso íntegro"), orderType === "SESSION");
    assert.equal(
      message.html.includes("Ambas condiciones deben cumplirse"),
      orderType === "SESSION"
    );
  }
  await email.sendBookingConfirmationEmail({
    email: "test@example.com",
    name: "Test",
    sessionName: "Test",
    scheduledAt: new Date("2026-10-26T15:00:00Z"),
    duration: 90,
    deliveryMethod: "online",
    bookingId: "test",
    paidWithCredit: true,
  });
  assert.match(messages.at(-1).html, /Reembolso íntegro/);
  assert.match(messages.at(-1).html, /un máximo de 2 veces/);
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
    assert.match(message.html, /Ambas condiciones deben cumplirse/);
  } finally {
    if (saved === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = saved;
    }
  }
});
