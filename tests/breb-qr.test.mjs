import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import * as safety from "../lib/preview-safety.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

function transpile(relative, dependencies = {}) {
  const filename = new URL("../" + relative, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name in dependencies) {
      return dependencies[name];
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

class MockResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.headers = init?.headers ?? {};
  }
  static json(data, init) {
    return new MockResponse(data, init);
  }
  static redirect(url, status) {
    const response = new MockResponse(null, { status });
    response.location = url;
    return response;
  }
}

const loadBreb = () => transpile("lib/breb.ts");

function loadQrRoute({ order, qrSource, canAccess = true }) {
  const prisma = { order: { findFirst: async () => order } };
  const route = transpile("app/api/orders/[reference]/breb-qr/route.ts", {
    "next/server": { NextResponse: MockResponse, NextRequest: Request },
    "@/lib/breb": {
      getBrebConfiguration: () => ({ enabled: true, simulation: false, qrConfigured: !!qrSource }),
      getBrebQrSource: () => qrSource,
      getBrebQrImage: loadBreb().getBrebQrImage,
    },
    "@/lib/order-access": { canAccessOrder: async () => canAccess },
    "@/lib/prisma": { prisma },
  });
  return route.GET(new Request("https://preview.test/api/orders/x/breb-qr"), {
    params: Promise.resolve({ reference: "BREB-QA" }),
  });
}

const savedEnv = {};
const envNames = [
  "VERCEL_ENV",
  "GLOBAL66_BREB_VERIFIED",
  "GLOBAL66_BREB_KEY",
  "GLOBAL66_BREB_KEY_TYPE",
  "GLOBAL66_BREB_RECIPIENT",
  "GLOBAL66_BREB_QR_DATA_URL",
  "GLOBAL66_BREB_QR_URL",
  "PREVIEW_BREB_QR_URL",
];

function isolate(overrides) {
  for (const name of envNames) {
    if (!(name in savedEnv)) {
      savedEnv[name] = process.env[name];
    }
    delete process.env[name];
  }
  Object.assign(process.env, overrides);
}

test.after(() => {
  for (const name of envNames) {
    const value = savedEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

test("the Global66 alias key is accepted only when it matches the declared type", () => {
  const { isValidBrebKey, maskBrebKey } = loadBreb();
  assert.equal(isValidBrebKey("@EJEMPLO123", "alias"), true);
  assert.equal(isValidBrebKey("EJEMPLO123", "alias"), true);
  assert.equal(isValidBrebKey("", "alias"), false);
  assert.equal(isValidBrebKey("@EJEMPLO123", null), false);
  assert.equal(isValidBrebKey("@EJEMPLO123", "phone"), false);
  assert.equal(isValidBrebKey("3001234567", "phone"), true);
  assert.equal(isValidBrebKey("+573001234567", "phone"), true);
  assert.equal(isValidBrebKey("30012345", "phone"), false);
  assert.equal(isValidBrebKey("pagos@example.com", "email"), true);
  assert.equal(isValidBrebKey("@EJEMPLO123", "email"), false);
  assert.equal(isValidBrebKey("53102423", "document"), true);
  assert.equal(isValidBrebKey("53.102.423", "document"), false);
  assert.equal(maskBrebKey("@EJEMPLO123"), "@E*******23");
  assert.equal(maskBrebKey("abc"), "***");
});

test("Production requires the verified flag, a valid key and a recipient", () => {
  const { getBrebConfiguration } = loadBreb();
  isolate({
    VERCEL_ENV: "production",
    GLOBAL66_BREB_VERIFIED: "true",
    GLOBAL66_BREB_KEY: "@EJEMPLO123",
    GLOBAL66_BREB_KEY_TYPE: "alias",
    GLOBAL66_BREB_RECIPIENT: "Aleyda Paola Vargas Galvis",
    GLOBAL66_BREB_QR_DATA_URL: PNG,
  });
  const enabled = getBrebConfiguration();
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.simulation, false);
  assert.equal(enabled.key, "@EJEMPLO123");
  assert.equal(enabled.keyType, "alias");
  assert.equal(enabled.qrConfigured, true);
  assert.equal(enabled.amountMode, "customer-entered");

  for (const [name, value] of [
    ["GLOBAL66_BREB_VERIFIED", "false"],
    ["GLOBAL66_BREB_KEY_TYPE", "phone"],
    ["GLOBAL66_BREB_RECIPIENT", ""],
  ]) {
    isolate({
      VERCEL_ENV: "production",
      GLOBAL66_BREB_VERIFIED: "true",
      GLOBAL66_BREB_KEY: "@EJEMPLO123",
      GLOBAL66_BREB_KEY_TYPE: "alias",
      GLOBAL66_BREB_RECIPIENT: "Aleyda Paola Vargas Galvis",
      [name]: value,
    });
    const disabled = getBrebConfiguration();
    assert.equal(disabled.enabled, false, `${name} must disable Bre-B`);
    assert.equal(disabled.key, "");
    assert.equal(disabled.recipient, "");
    assert.equal(disabled.qrConfigured, false);
  }
});

test("the static QR is reused, but only inline images or https addresses are accepted", () => {
  const { getBrebQrSource, getBrebQrImage } = loadBreb();
  const production = {
    VERCEL_ENV: "production",
    GLOBAL66_BREB_VERIFIED: "true",
    GLOBAL66_BREB_KEY: "@EJEMPLO123",
    GLOBAL66_BREB_KEY_TYPE: "alias",
    GLOBAL66_BREB_RECIPIENT: "Aleyda Paola Vargas Galvis",
  };
  isolate({ ...production, GLOBAL66_BREB_QR_URL: "http://insecure.example/qr.png" });
  assert.equal(getBrebQrSource(), null, "http must be rejected");
  isolate({ ...production, GLOBAL66_BREB_QR_URL: "https://cdn.example/qr.png" });
  assert.equal(getBrebQrSource(), "https://cdn.example/qr.png");
  isolate({ ...production, GLOBAL66_BREB_QR_DATA_URL: "data:image/png;base64,@@@@@" });
  assert.equal(getBrebQrSource(), null, "invalid base64 must be rejected");
  isolate({ ...production, GLOBAL66_BREB_QR_DATA_URL: PNG });
  assert.equal(getBrebQrSource(), PNG);
  assert.deepEqual(getBrebQrImage(PNG), { contentType: "image/png", base64: PNG.split(",")[1] });
  assert.equal(getBrebQrImage("https://cdn.example/qr.png"), null);
});

test("Preview serves a fake key and refuses to reuse the Production QR", () => {
  const { getBrebConfiguration, getBrebQrSource } = loadBreb();
  isolate({
    VERCEL_ENV: "preview",
    GLOBAL66_BREB_VERIFIED: "true",
    GLOBAL66_BREB_KEY: "@EJEMPLO123",
    GLOBAL66_BREB_KEY_TYPE: "alias",
    GLOBAL66_BREB_RECIPIENT: "Aleyda Paola Vargas Galvis",
    GLOBAL66_BREB_QR_DATA_URL: PNG,
  });
  const preview = getBrebConfiguration();
  assert.equal(preview.simulation, true);
  assert.equal(preview.key, "@PRUEBA-NO-REAL");
  assert.equal(preview.recipient, "PRUEBA — NO ENVIAR DINERO");
  assert.equal(preview.qrConfigured, false);
  assert.equal(getBrebQrSource(), null);
  process.env.PREVIEW_BREB_QR_URL = PNG;
  assert.equal(getBrebQrSource(), null, "the Production QR must not be reused in Preview");
  process.env.PREVIEW_BREB_QR_URL = "https://cdn.example/preview-fake.png";
  assert.equal(getBrebQrSource(), "https://cdn.example/preview-fake.png");
  assert.equal(getBrebConfiguration().qrConfigured, true);
});

test("the QR route serves the image, redirects external URLs and hides unknown orders", async () => {
  const order = { userId: "customer", orderNumber: "BREB-QA", paymentMethod: "BREB_MANUAL" };
  const inline = await loadQrRoute({ order, qrSource: PNG });
  assert.equal(inline.status, 200);
  assert.equal(inline.headers["Content-Type"], "image/png");
  assert.equal(inline.headers["Cache-Control"], "private, max-age=3600");
  assert.ok(inline.body instanceof Uint8Array);
  assert.ok(inline.body.length > 0);

  const external = await loadQrRoute({ order, qrSource: "https://cdn.example/qr.png" });
  assert.equal(external.status, 302);
  assert.equal(external.location, "https://cdn.example/qr.png");

  const missing = await loadQrRoute({ order, qrSource: null });
  assert.equal(missing.status, 404);

  const otherMethod = await loadQrRoute({
    order: { ...order, paymentMethod: "PAYPAL_DIRECT" },
    qrSource: PNG,
  });
  assert.equal(otherMethod.status, 404);

  const forbidden = await loadQrRoute({ order, qrSource: PNG, canAccess: false });
  assert.equal(forbidden.status, 404);
});

test("the checkout page never receives the QR in JSON, only a flag", () => {
  const source = readFileSync(
    new URL("../app/api/orders/[reference]/status/route.ts", import.meta.url).pathname,
    "utf8"
  );
  assert.ok(source.includes("qrAvailable"));
  assert.equal(source.includes("global66Qr"), false);
  assert.equal(source.includes("qrCodeUrl"), false);
});
