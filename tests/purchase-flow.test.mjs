import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as safety from "../lib/preview-safety.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(relative, dependencies = {}) {
  const filename = new URL("../" + relative, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name in dependencies) {
      return dependencies[name];
    }
    if (name === "next/server") {
      return { NextResponse: { json: Response.json }, NextRequest: Request };
    }
    if (name === "./preview-safety") {
      return safety;
    }
    if (name.startsWith("@/")) {
      throw new Error(`Unmocked external dependency: ${name}`);
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
const req = (body) =>
  new Request("https://preview.test/api/checkout/breb", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
const base = {
  _id: "digital-1",
  title: "Audio de prueba",
  productType: "digital",
  price: 80000,
  priceUSD: 20,
};
function catalog(doc = base) {
  const query = { fetch: async () => doc };
  return load("lib/checkout/catalog-quote.ts", {
    "@/sanity/lib/client": { client: { withConfig: () => query } },
    "@/sanity/lib/projections": load("sanity/lib/projections.ts"),
  });
}
test("checkout evaluates the same CMS price projection as catalog pages, including legacy fallback", async () => {
  const { parse, evaluate } = require("groq-js");
  for (const kind of ["course", "event", "product", "session"]) {
    for (const nested of [true, false]) {
      const doc = {
        ...base,
        _type: kind === "session" ? "sessionConfig" : kind,
        status: "active",
        published: true,
        eventDate: "2099-01-01T15:00:00Z",
        price: 80000,
        priceUSD: 20,
        ...(nested ? { pricing: { price: 120000, priceUSD: 30 } } : {}),
      };
      const quote = load("lib/checkout/catalog-quote.ts", {
        "@/sanity/lib/projections": load("sanity/lib/projections.ts"),
        "@/sanity/lib/client": {
          client: {
            withConfig: () => ({
              fetch: async (query, params) =>
                (await evaluate(parse(query), { dataset: [doc], params })).get(),
            }),
          },
        },
      });
      for (const currency of ["COP", "USD"]) {
        const result = await quote.quoteCatalogItem({
          productType: kind,
          productId: doc._id,
          currency,
        });
        assert.equal(
          result.amount,
          currency === "COP" ? (nested ? 120000 : 80000) : nested ? 30 : 20
        );
      }
    }
  }
});

test("a CMS item marked free cannot be charged its obsolete legacy price", async () => {
  const { parse, evaluate } = require("groq-js");
  const doc = {
    ...base,
    _type: "course",
    published: true,
    status: "active",
    pricing: { isFree: true },
  };
  const quote = load("lib/checkout/catalog-quote.ts", {
    "@/sanity/lib/projections": load("sanity/lib/projections.ts"),
    "@/sanity/lib/client": {
      client: {
        withConfig: () => ({
          fetch: async (query, params) =>
            (await evaluate(parse(query), { dataset: [doc], params })).get(),
        }),
      },
    },
  });
  await assert.rejects(
    quote.quoteCatalogItem({ productType: "course", productId: doc._id, currency: "COP" }),
    /Precio en COP no configurado/
  );
});
test("server quotes all digital formats from existing catalog, ignores browser pricing, rejects physical/private/unavailable products", async () => {
  for (const kind of ["digital", "ebook", "audio", "course"]) {
    const q = await catalog({ ...base, productType: kind }).quoteCatalogItem({
      productType: "product",
      productId: base._id,
      currency: "COP",
      amount: 1,
    });
    assert.equal(q.amount, 80000);
    assert.equal(q.orderType, "PRODUCT");
  }
  for (const doc of [
    null,
    { ...base, visibility: "private" },
    { ...base, productType: "physical" },
    { ...base, price: -1 },
  ]) {
    await assert.rejects(
      catalog(doc).quoteCatalogItem({
        productType: "product",
        productId: base._id,
        currency: "COP",
      })
    );
  }
});
test("events take their date/price from catalog and validate seat count", async () => {
  const quote = catalog({ ...base, eventDate: "2099-01-01T15:00:00Z", maxPerBooking: 3 });
  const result = await quote.quoteCatalogItem({
    productType: "event",
    productId: "event",
    currency: "COP",
    seats: 2,
    scheduledAt: "2000-01-01",
  });
  assert.equal(result.amount, 160000);
  assert.equal(result.metadata.scheduledAt, "2099-01-01T15:00:00Z");
  for (const seats of [0, -1, 1.2, 4]) {
    await assert.rejects(
      quote.quoteCatalogItem({ productType: "event", productId: "event", currency: "COP", seats })
    );
  }
});
test("Preview never exposes the real Bre-B key or QR; production fails closed without a valid key", () => {
  const names = [
    "VERCEL_ENV",
    "GLOBAL66_BREB_VERIFIED",
    "GLOBAL66_BREB_KEY",
    "GLOBAL66_BREB_KEY_TYPE",
    "GLOBAL66_BREB_RECIPIENT",
    "GLOBAL66_BREB_QR_DATA_URL",
    "GLOBAL66_BREB_QR_URL",
    "PREVIEW_BREB_QR_URL",
    "NEXT_PUBLIC_BANCOLOMBIA_BREB_KEY",
  ];
  const saved = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  try {
    const breb = load("lib/breb.ts");
    Object.assign(process.env, {
      VERCEL_ENV: "preview",
      GLOBAL66_BREB_VERIFIED: "true",
      GLOBAL66_BREB_KEY: "@EJEMPLO123",
      GLOBAL66_BREB_KEY_TYPE: "alias",
      GLOBAL66_BREB_RECIPIENT: "Aleyda Paola Vargas Galvis",
      GLOBAL66_BREB_QR_URL: "https://example.com/bank.png",
      NEXT_PUBLIC_BANCOLOMBIA_BREB_KEY: "OLD-KEY",
    });
    // Preview: simulation, fake key, and never the real QR.
    assert.equal(breb.getBrebConfiguration().simulation, true);
    assert.equal(breb.getBrebConfiguration().key, "@PRUEBA-NO-REAL");
    assert.equal(breb.getBrebConfiguration().qrConfigured, false);
    assert.equal(breb.getBrebQrSource(), null);
    // An isolated Preview QR is required, and it must differ from Production.
    process.env.PREVIEW_BREB_QR_URL = "https://example.com/bank.png";
    assert.equal(breb.getBrebQrSource(), null);
    process.env.PREVIEW_BREB_QR_URL = "https://example.com/preview-fake.png";
    assert.equal(breb.getBrebQrSource(), "https://example.com/preview-fake.png");
    assert.equal(breb.getBrebConfiguration().qrConfigured, true);

    process.env.VERCEL_ENV = "production";
    delete process.env.GLOBAL66_BREB_VERIFIED;
    assert.equal(breb.getBrebConfiguration().enabled, false);
    assert.equal(breb.getBrebConfiguration().key, "");
    process.env.GLOBAL66_BREB_VERIFIED = "true";
    assert.equal(breb.getBrebConfiguration().enabled, true);
    assert.equal(breb.getBrebConfiguration().key, "@EJEMPLO123");
    assert.equal(breb.getBrebConfiguration().keyMasked, "@E*******23");
    // A key that does not match its declared type disables Bre-B instead of guessing.
    process.env.GLOBAL66_BREB_KEY = "@EJEMPLO 123";
    assert.equal(breb.getBrebConfiguration().enabled, false);
    process.env.GLOBAL66_BREB_KEY = "@EJEMPLO123";
    process.env.GLOBAL66_BREB_KEY_TYPE = "phone";
    assert.equal(breb.getBrebConfiguration().enabled, false);
    process.env.GLOBAL66_BREB_KEY_TYPE = "alias";
    process.env.GLOBAL66_BREB_RECIPIENT = "";
    assert.equal(breb.getBrebConfiguration().enabled, false);
  } finally {
    for (const k of names) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  }
});
function checkoutHarness(scheduling = {}) {
  const orders = [];
  let delivered = 0;
  const checkout = load("lib/checkout/one-time-checkout.ts", {
    "@/lib/session-scheduling": scheduling,
    "@/lib/auth": {
      auth: async () => ({ user: { id: "customer", email: "preview@example.com" } }),
    },
    "@/lib/breb": { getBrebConfiguration: () => ({ enabled: true, simulation: true }) },
    "@/lib/checkout/discounts": {
      applyCheckoutDiscount: async ({ amount }) => ({ finalAmount: amount, discountAmount: 0 }),
    },
    "@/lib/checkout/catalog-quote": catalog(),
    "@/lib/order-access": { allowOrderInBrowser: async () => {} },
    "@/lib/payment-processor": {
      processApprovedPayment: async () => {
        delivered++;
        return { success: true };
      },
    },
    "@/lib/paypal": {
      isPayPalConfigured: () => true,
      createPayPalOrder: async () => ({
        success: true,
        orderId: "pp-order",
        approvalUrl: "https://sandbox.paypal.com/test",
      }),
    },
    "@/lib/prisma": {
      prisma: {
        order: {
          create: async ({ data }) => {
            const o = { ...data, id: "order-1" };
            orders.push(o);
            return o;
          },
          update: async () => {},
        },
      },
    },
    "@/lib/rate-limit": { applyRateLimit: () => null },
    "@/lib/utils": { getAppUrl: () => "https://preview.test" },
  });
  return { ...checkout, orders, delivered: () => delivered };
}
test("Bre-B creates one pending order at server price, without entitlement or booking", async () => {
  const h = checkoutHarness();
  const response = await h.oneTimeCheckout(
    req({ productType: "product", productId: base._id, amount: 80000, productName: "fake" }),
    "breb"
  );
  assert.equal(response.status, 200);
  assert.equal(h.orders.length, 1);
  assert.equal(h.orders[0].amount, 80000);
  assert.equal(h.orders[0].itemName, base.title);
  assert.equal(h.orders[0].paymentStatus, "PENDING");
  assert.equal(h.delivered(), 0);
});
test("PayPal uses authoritative USD price and remains pending until provider confirmation", async () => {
  const h = checkoutHarness();
  const response = await h.oneTimeCheckout(
    req({ productType: "product", productId: base._id, amount: 20, currency: "COP" }),
    "paypal"
  );
  assert.equal(response.status, 200);
  assert.equal(h.orders[0].currency, "USD");
  assert.equal(h.orders[0].amount, 20);
  assert.equal(h.delivered(), 0);
});
test("unsupported checkout kind is rejected before creating any order", async () => {
  const h = checkoutHarness();
  const response = await h.oneTimeCheckout(
    req({ productType: "membership", productId: base._id }),
    "breb"
  );
  assert.equal(response.status, 400);
  assert.equal(h.orders.length, 0);
});
test("old browser completion endpoint cannot activate a product", async () => {
  const { POST } = load("app/api/orders/[reference]/complete/route.ts");
  assert.equal((await POST(req({ status: "APPROVED" }))).status, 403);
});
test("transfer report reuses manual payments, is idempotent and never settles the order", async () => {
  let manual = null,
    notifications = 0,
    access = true;
  const order = {
    id: "o",
    userId: "u",
    orderNumber: "BREB-test",
    paymentMethod: "BREB_MANUAL",
    paymentStatus: "PENDING",
    user: { email: "preview@example.com" },
  };
  const { POST } = load("app/api/orders/[reference]/report-payment/route.ts", {
    "@/lib/order-access": { canAccessOrder: async () => access },
    "@/lib/rate-limit": { applyRateLimit: () => null },
    "@/lib/checkout/pending-email": {
      notifyBrebReport: async () => {
        notifications++;
      },
    },
    "@/lib/prisma": {
      prisma: {
        order: { findUnique: async () => order },
        manualPayment: {
          findUnique: async () => manual,
          create: async ({ data }) => {
            manual = data;
          },
        },
      },
    },
  });
  const ctx = { params: Promise.resolve({ reference: "BREB-test" }) };
  assert.equal((await POST(req({ referenceNumber: "PRUEBA-123" }), ctx)).status, 200);
  assert.equal(order.paymentStatus, "PENDING");
  assert.equal(manual.approved, false);
  assert.equal(notifications, 1);
  await POST(req({ referenceNumber: "REPEAT" }), ctx);
  assert.equal(notifications, 1);
  assert.equal(manual.referenceNumber, "PRUEBA-123");
  access = false;
  assert.equal((await POST(req({ referenceNumber: "ATTACK" }), ctx)).status, 404);
});
test("manual confirmation requires admin + explicit bank verification and only calls shared fulfillment once", async () => {
  let role = "USER",
    status = "PENDING",
    deliveries = 0,
    audits = 0;
  const order = () => ({
    id: "o",
    orderNumber: "BREB-test",
    paymentMethod: "BREB_MANUAL",
    paymentStatus: status,
    metadata: {},
    userId: "u",
    amount: 100000,
    currency: "COP",
  });
  const db = {
    user: { findUnique: async () => ({ role, email: "admin@example.com" }) },
    order: {
      findUnique: async () => order(),
      findUniqueOrThrow: async () => order(),
      findFirst: async () => null,
      updateMany: async ({ where, data }) => {
        if (status !== where.paymentStatus) {
          return { count: 0 };
        }
        status = data.paymentStatus;
        return { count: 1 };
      },
      update: async ({ data }) => {
        status = data.paymentStatus;
      },
    },
    manualPayment: { upsert: async () => {} },
    auditLog: {
      create: async () => {
        audits++;
      },
    },
    $executeRaw: async () => {},
  };
  db.$transaction = async (fn) => fn(db);
  const { POST } = load("app/api/admin/orders/[id]/confirm-payment/route.ts", {
    "@/lib/auth": { auth: async () => ({ user: { id: "admin" } }) },
    "@/lib/prisma": { prisma: db },
    "@/lib/payment-processor": {
      processApprovedPayment: async () => {
        deliveries++;
        return { success: true };
      },
    },
  });
  const ctx = { params: Promise.resolve({ id: "o" }) };
  const body = {
    transactionReference: "BANK-123",
    receivedAmount: 100000,
    verifiedInAccount: true,
  };
  assert.equal((await POST(req(body), ctx)).status, 403);
  role = "ADMIN";
  assert.equal((await POST(req({ ...body, verifiedInAccount: false }), ctx)).status, 400);
  // The QR and the key carry no amount, so the received total is checked here.
  assert.equal((await POST(req({ ...body, receivedAmount: 90000 }), ctx)).status, 409);
  assert.equal(
    (
      await POST(
        req({
          ...body,
          receivedAmount: 90000,
          amountDiscrepancyReason: "Ingreso parcial acordado",
        }),
        ctx
      )
    ).status,
    200
  );
  assert.equal(status, "COMPLETED");
  assert.equal(deliveries, 1);
  assert.equal(audits, 1);
  assert.equal((await POST(req(body), ctx)).status, 409);
  assert.equal(deliveries, 1);
});
test("shared fulfillment rejects an unverified order before any external effects", async () => {
  const deps = Object.fromEntries(
    [
      "@/lib/course-access",
      "@/lib/credits",
      "@/lib/discount-codes",
      "@/lib/email",
      "@/lib/google-calendar",
      "@/lib/prisma",
      "@/lib/sanity/queries/sessionConfig",
      "@/lib/session-duration",
      "@/lib/session-scheduling",
    ].map((n) => [n, {}])
  );
  const { processApprovedPayment } = load("lib/payment-processor.ts", deps);
  assert.equal(
    (await processApprovedPayment({ id: "o", paymentStatus: "PENDING" })).success,
    false
  );
});

test("stale or tampered price is rejected before order creation", async () => {
  const h = checkoutHarness();
  const response = await h.oneTimeCheckout(
    req({ productType: "product", productId: base._id, amount: 1 }),
    "breb"
  );
  assert.equal(response.status, 400);
  assert.equal(h.orders.length, 0);
});

test("PayPal capture binds the provider order and checks completed state, amount and currency before delivery", async () => {
  for (const capture of [
    { success: true, status: "PENDING", amount: 20, currency: "USD" },
    { success: true, status: "COMPLETED", amount: 1, currency: "USD" },
    { success: true, status: "COMPLETED", amount: 20, currency: "COP" },
    { success: true, status: "COMPLETED", amount: 20, currency: "USD" },
  ]) {
    let writes = 0,
      deliveries = 0;
    const order = {
      id: "o",
      orderNumber: "PP-test",
      paymentMethod: "PAYPAL_DIRECT",
      paymentStatus: "PENDING",
      amount: 20,
      currency: "USD",
      metadata: { paypalOrderId: "provider-order" },
    };
    const { POST } = load("app/api/checkout/paypal/capture/route.ts", {
      "@/lib/paypal": { isPayPalConfigured: () => true, capturePayPalOrder: async () => capture },
      "@/lib/payment-processor": {
        processApprovedPayment: async () => {
          deliveries++;
          return { success: true };
        },
      },
      "@/lib/prisma": {
        prisma: {
          order: {
            findFirst: async ({ where }) => {
              assert.equal(where.orderNumber, "PP-test");
              assert.equal(where.metadata.equals, "provider-order");
              assert.equal(where.OR, undefined);
              return order;
            },
            update: async ({ data }) => {
              writes++;
              return { ...order, ...data };
            },
          },
        },
      },
    });
    const response = await POST(req({ paypalOrderId: "provider-order", reference: "PP-test" }));
    const valid =
      capture.status === "COMPLETED" && capture.amount === 20 && capture.currency === "USD";
    assert.equal(response.status, valid ? 200 : 409);
    assert.equal(writes, valid ? 1 : 0);
    assert.equal(deliveries, valid ? 1 : 0);
  }
});

test("order status requires access for PayPal as well as Bre-B before returning purchase details", async () => {
  for (const paymentMethod of ["PAYPAL_DIRECT", "BREB_MANUAL"]) {
    for (const access of [false, true]) {
      let brebReads = 0;
      const { GET } = load("app/api/orders/[reference]/status/route.ts", {
        "@/lib/order-access": { canAccessOrder: async () => access },
        "@/lib/breb": {
          getBrebConfiguration: () => {
            brebReads++;
            return { simulation: true };
          },
          getOrderBrebQr: () => null,
        },
        "@/lib/prisma": {
          prisma: {
            order: {
              findFirst: async () => ({
                id: "test-only",
                userId: "owner",
                orderNumber: "test-reference",
                paymentMethod,
                paymentStatus: "PENDING",
                amount: 20,
                currency: "USD",
                itemName: "Test product",
                metadata: { isGuestCheckout: true },
              }),
            },
          },
        },
      });
      const response = await GET(new Request("https://preview.test"), {
        params: Promise.resolve({ reference: "test-reference" }),
      });
      assert.equal(response.status, access ? 200 : 404);
      const body = await response.json();
      assert.equal(body.itemName, access ? "Test product" : undefined);
      assert.equal(brebReads, access && paymentMethod === "BREB_MANUAL" ? 1 : 0);
    }
  }
});

test("guest order access requires the signed browser capability or the actual account owner", async () => {
  const saved = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "unit-test-secret-never-used-externally";
  try {
    const jar = new Map();
    let userId = null;
    const access = load("lib/order-access.ts", {
      "next/headers": {
        cookies: async () => ({
          get: (k) => (jar.has(k) ? { value: jar.get(k) } : undefined),
          set: (k, v, options) => {
            assert.equal(options.httpOnly, true);
            jar.set(k, v);
          },
        }),
      },
      "@/lib/auth": { auth: async () => (userId ? { user: { id: userId } } : null) },
    });
    const order = { userId: "owner", orderNumber: "BREB-1" };
    assert.equal(await access.canAccessOrder(order), false);
    await access.allowOrderInBrowser("BREB-1");
    assert.equal(await access.canAccessOrder(order), true);
    assert.equal(await access.canAccessOrder({ ...order, orderNumber: "BREB-2" }), false);
    jar.clear();
    userId = "other";
    assert.equal(await access.canAccessOrder(order), false);
    userId = "owner";
    assert.equal(await access.canAccessOrder(order), true);
  } finally {
    if (saved === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = saved;
    }
  }
});

test("an occupied session slot is rejected before starting either payment provider", async () => {
  for (const method of ["breb", "paypal"]) {
    let checked = 0;
    const h = checkoutHarness({
      schedulingConfig: async () => ({}),
      assertSessionTimeAvailable: async () => {
        checked++;
        throw new Error("Este horario ya no está disponible");
      },
    });
    const response = await h.oneTimeCheckout(
      req({ productType: "session", productId: base._id, scheduledAt: "2099-11-01T15:00:00Z" }),
      method
    );
    assert.equal(response.status, 400);
    assert.equal(checked, 1);
    assert.equal(h.orders.length, 0);
    assert.equal(h.delivered(), 0);
  }
});

test("digital product pages display the same nested or legacy CMS price that checkout charges", async () => {
  const { parse, evaluate } = require("groq-js");
  const { renderToStaticMarkup } = require("react-dom/server");
  for (const nested of [true, false]) {
    const doc = {
      ...base,
      _type: "product",
      published: true,
      status: "active",
      slug: { current: "test-product" },
      ...(nested ? { pricing: { price: 120000, priceUSD: 30 } } : {}),
    };
    const fetch = async (query, params) =>
      (await evaluate(parse(query), { dataset: [doc], params })).get();
    const deps = {
      "@/sanity/lib/client": { client: { fetch, withConfig: () => ({ fetch }) } },
      "@/sanity/lib/projections": load("sanity/lib/projections.ts"),
      "next/navigation": {
        notFound() {
          throw new Error("Unexpected missing product");
        },
      },
      "next/link": { default: "a" },
      "@portabletext/react": { PortableText: "section" },
      "@/components/layout/Header": { Header: () => null },
      "@/components/layout/Footer": { Footer: () => null },
      "@/lib/auth": { auth: async () => null },
      "./DigitalProductCheckout": { DigitalProductCheckout: () => null },
    };
    const quote = await load("lib/checkout/catalog-quote.ts", deps).quoteCatalogItem({
      productType: "product",
      productId: doc._id,
      currency: "USD",
    });
    const detail = await load("app/productos/[slug]/page.tsx", deps).default({
      params: Promise.resolve({ slug: doc.slug.current }),
    });
    const form = detail.props.children.props.children.find((n) => n?.props?.product);
    assert.equal(form.props.product.priceUSD, quote.amount);
    assert.equal(form.props.product.price, nested ? 120000 : 80000);
    const listing = await load("app/productos/page.tsx", deps).default();
    const html = renderToStaticMarkup(listing);
    assert.match(html, nested ? /120\.000 COP/ : /80\.000 COP/);
    assert.match(html, nested ? /30.*USD/ : /20.*USD/);
  }
});
