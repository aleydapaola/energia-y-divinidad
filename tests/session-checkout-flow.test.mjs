import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(relative, dependencies = {}) {
  const filename = new URL("../" + relative, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => (name in dependencies ? dependencies[name] : require(name));
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

function nodes(node) {
  if (Array.isArray(node)) {
    return node.flatMap(nodes);
  }
  if (!node || typeof node !== "object" || !node.props) {
    return [];
  }
  return [node, ...nodes(node.props.children)];
}

const session = {
  _id: "session-canalizacion",
  title: "Sesión de canalización",
  slug: { current: "sesion-canalizacion" },
  price: 185000,
  priceUSD: 50,
};

function checkout(country, paymentMethod, pushed) {
  let index = 0;
  const values = [
    country,
    paymentMethod,
    { name: "Prueba", email: "cliente@example.com", phone: "+573001234567", notes: "" },
    {},
    false,
    "",
    false,
    null,
    null,
    false,
    0,
    false,
  ];
  const { CheckoutForm } = load("components/sesiones/CheckoutForm.tsx", {
    react: { useState: () => [values[index++], () => {}], useEffect() {} },
    "next/navigation": { useRouter: () => ({ push: (url) => pushed.push(url) }) },
    "@/lib/purchase-methods": load("lib/purchase-methods.ts"),
  });
  return CheckoutForm({
    session,
    scheduledDateTime: new Date("2099-01-01T15:00:00Z"),
    formattedDate: "1 de enero de 2099",
    formattedTime: "10:00 Colombia",
  });
}

test("the session detail checkout offers Global66 Bre-B and sends Colombian PayPal buyers to USD approval", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const pushed = [];
  const browser = { location: { href: "" } };
  let request;
  try {
    globalThis.window = browser;
    globalThis.fetch = async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return {
        ok: true,
        json: async () => ({ approvalUrl: "https://sandbox.paypal.com/approve" }),
      };
    };
    const tree = checkout("colombia", "paypal_direct", pushed);
    const labels = nodes(tree).flatMap((node) =>
      typeof node.props.children === "string" ? [node.props.children] : []
    );
    assert.ok(labels.includes("Bre-B · Global66"));
    assert.ok(labels.includes("PayPal"));
    assert.ok(!labels.some((label) => label.includes("Wompi")));
    const form = nodes(tree).find((node) => node.type === "form");
    await form.props.onSubmit({ preventDefault() {} });
    assert.equal(request.url, "/api/checkout/paypal");
    assert.equal(request.body.amount, 50);
    assert.equal(request.body.currency, "USD");
    assert.equal(browser.location.href, "https://sandbox.paypal.com/approve");
    assert.deepEqual(pushed, []);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("the same session checkout sends Colombian Bre-B buyers to a pending order in COP", async () => {
  const originalFetch = globalThis.fetch;
  const pushed = [];
  let request;
  try {
    globalThis.fetch = async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ redirectUrl: "/pago/breb-pending?ref=BREB-test" }) };
    };
    const tree = checkout("colombia", "breb_manual", pushed);
    const form = nodes(tree).find((node) => node.type === "form");
    await form.props.onSubmit({ preventDefault() {} });
    assert.equal(request.url, "/api/checkout/breb");
    assert.equal(request.body.amount, 185000);
    assert.equal(request.body.currency, "COP");
    assert.deepEqual(pushed, ["/pago/breb-pending?ref=BREB-test"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a confirmed individual session bought without a date remains visible to choose its first slot", async () => {
  function BookingsList() {
    return null;
  }
  const fixtures = [
    {
      id: "paid-unscheduled",
      resourceName: "Paid session",
      status: "CONFIRMED",
      scheduledAt: null,
      sessionsTotal: 1,
      rescheduleCount: 0,
    },
    { id: "unpaid-unscheduled", status: "PENDING", scheduledAt: null, sessionsTotal: 1 },
    { id: "cancelled-unscheduled", status: "CANCELLED", scheduledAt: null, sessionsTotal: 1 },
    { id: "pack-parent", status: "CONFIRMED", scheduledAt: null, sessionsTotal: 8 },
    { id: "future-session", status: "CONFIRMED", scheduledAt: new Date("2099-01-01T15:00:00Z") },
  ];
  const { default: Page } = load("app/mi-cuenta/sesiones/page.tsx", {
    "@/lib/auth": { auth: async () => ({ user: { id: "test-user" } }) },
    "@/lib/prisma": {
      prisma: {
        booking: {
          findMany: async ({ where }) => {
            assert.deepEqual(where, { userId: "test-user", bookingType: "SESSION_1_ON_1" });
            return fixtures;
          },
        },
      },
    },
    "./BookingsList": { BookingsList },
  });
  const tree = await Page();
  const list = nodes(tree).find((node) => node.type === BookingsList);
  assert.deepEqual(
    list.props.bookings.map((item) => item.id),
    ["paid-unscheduled", "future-session"]
  );
});
