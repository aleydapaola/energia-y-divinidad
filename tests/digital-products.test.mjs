/* eslint-disable require-await -- Service mocks preserve asynchronous production interfaces. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

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
      return { NextResponse: { json: Response.json } };
    }
    if (name.startsWith("@/") || name.startsWith("./")) {
      throw new Error(`Unmocked dependency ${name}`);
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
const files = load("lib/digital-products/files.ts");
const prices = load("lib/digital-products/prices.ts");
const config = {
  token: "synthetic-preview-only",
  dataset: "preview",
  maximumSizeInBytes: 500_000_000,
};

test("products with COP only, USD only or both expose exactly the payable methods", () => {
  assert.deepEqual(prices.productPaymentMethods({ price: 80000 }), ["breb_manual"]);
  assert.deepEqual(prices.productPaymentMethods({ priceUSD: 20 }), ["paypal_direct"]);
  assert.deepEqual(prices.productPaymentMethods({ price: 80000, priceUSD: 20 }), [
    "paypal_direct",
    "breb_manual",
  ]);
  for (const price of [undefined, null, 0, -1, NaN, Infinity, "20"]) {
    assert.deepEqual(prices.productPaymentMethods({ price, priceUSD: price }), []);
  }
});

test("new product defaults do not require Academia and validation allows one positive currency", () => {
  const schema = load("sanity/schemas/product.ts", {
    sanity: { defineType: (x) => x, defineField: (x) => x },
  }).default;
  assert.equal(schema.initialValue.productType, "digital");
  assert.equal(schema.initialValue.status, "active");
  assert.equal(schema.initialValue.published, true);
  const validate = schema.validation({ custom: (fn) => fn });
  for (const price of [
    { price: 80000 },
    { priceUSD: 20 },
    { price: 80000, priceUSD: 20 },
    { pricing: { priceUSD: 20 } },
  ]) {
    assert.equal(validate({ ...schema.initialValue, ...price }), true);
  }
  assert.notEqual(validate({ ...schema.initialValue }), true);
  assert.notEqual(validate({ ...schema.initialValue, price: 0, priceUSD: 0 }), true);
  assert.equal(validate({ productType: "digital", status: "discontinued" }), true);
  const validateFiles = schema.fields
    .find((x) => x.name === "privateDigitalFiles")
    .validation({ custom: (fn) => fn });
  assert.notEqual(validateFiles([], { document: schema.initialValue }), true);
  assert.equal(validateFiles([{ _key: "one" }], { document: schema.initialValue }), true);
  assert.equal(validateFiles(undefined, { document: { status: "discontinued" } }), true);
});

test("download filenames preserve arbitrary extensions and cannot inject headers", () => {
  for (const name of [
    "vídeo.mp4",
    "audio.m4a",
    "guía.pdf",
    "paquete.zip",
    "libro.epub",
    "documento.docx",
    "nuevo.formato",
  ]) {
    assert.match(files.attachmentHeader(name), /^attachment;/);
    assert.match(files.attachmentHeader(name), /filename\*=UTF-8''/);
  }
  assert.doesNotMatch(files.attachmentHeader('bad\r\nX-Injected: yes/".zip'), /[\r\n]/);
  assert.equal(files.productFilePrefix("preview", "drafts.p1"), "digital-products/preview/p1/");
});

test("Preview storage never falls back to a Production credential or dataset", () => {
  const keys = [
    "VERCEL_ENV",
    "BLOB_READ_WRITE_TOKEN",
    "NEXT_PUBLIC_SANITY_DATASET",
    "PREVIEW_SANITY_DATASET",
    "DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN",
    "PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN",
    "DIGITAL_PRODUCTS_MAX_FILE_BYTES",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    const { productStorageConfig } = load("lib/digital-products/storage.ts", { "./files": files });
    Object.assign(process.env, {
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SANITY_DATASET: "preview",
      PREVIEW_SANITY_DATASET: "preview",
      DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN: "synthetic-production",
    });
    delete process.env.PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.throws(productStorageConfig, /almacenamiento privado/);
    process.env.PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN = "synthetic-production";
    assert.throws(productStorageConfig, /almacenamiento privado/);
    process.env.PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN = "synthetic-preview";
    assert.equal(productStorageConfig().token, "synthetic-preview");
    delete process.env.PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "synthetic-preview-only";
    assert.equal(productStorageConfig().token, "synthetic-preview-only");
    assert.equal(productStorageConfig().maximumSizeInBytes, 500_000_000);
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
    assert.throws(productStorageConfig, /dataset aislado/);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
});

function delivery({
  userId = "buyer",
  entitled = true,
  pathname = "digital-products/preview/p1/unique/archive.zip",
  key = "zip",
  blobMissing = false,
} = {}) {
  let reads = 0;
  let cmsReads = 0;
  const api = load("app/api/productos/[id]/archivos/[key]/route.ts", {
    "@/lib/auth": { auth: async () => (userId ? { user: { id: userId } } : null) },
    "@/lib/digital-products/files": files,
    "@/lib/digital-products/storage": { productStorageConfig: () => config },
    "@/lib/prisma": {
      prisma: {
        entitlement: {
          findFirst: async ({ where }) => {
            assert.equal(where.userId, userId);
            assert.equal(where.type, "PRODUCT");
            assert.equal(where.resourceId, "p1");
            assert.equal(where.revoked, false);
            assert.equal(where.OR[0].expiresAt, null);
            assert.ok(where.OR[1].expiresAt.gt instanceof Date);
            return entitled ? { id: "entitlement" } : null;
          },
        },
      },
    },
    "@/sanity/lib/client": {
      client: {
        withConfig: () => ({
          fetch: async (_query, params) => {
            cmsReads++;
            assert.deepEqual(params, { id: "p1" });
            return {
              privateDigitalFiles: [{ _key: "zip", pathname, originalFilename: "paquete.zip" }],
            };
          },
        }),
      },
    },
    "@vercel/blob": {
      get: async (path, options) => {
        reads++;
        assert.equal(path, pathname);
        assert.equal(options.access, "private");
        assert.equal(options.token, config.token);
        return blobMissing
          ? null
          : {
              statusCode: 200,
              stream: new ReadableStream({
                start(c) {
                  c.enqueue(new Uint8Array([80, 75, 3, 4]));
                  c.close();
                },
              }),
              blob: { size: 4 },
            };
      },
    },
  });
  return {
    get: () =>
      api.GET(new Request("https://preview.test/api/productos/p1/archivos/zip"), {
        params: Promise.resolve({ id: "p1", key }),
      }),
    reads: () => reads,
    cmsReads: () => cmsReads,
  };
}
for (const scenario of [
  { userId: null },
  { userId: "other", entitled: false },
  { userId: "buyer", entitled: false },
]) {
  test(`no direct file access without active entitlement: ${JSON.stringify(scenario)}`, async () => {
    const h = delivery(scenario);
    assert.equal((await h.get()).status, 404);
    assert.equal(h.reads(), 0);
    assert.equal(h.cmsReads(), 0);
  });
}
for (const scenario of [
  { key: "unknown" },
  { pathname: "digital-products/preview/another-product/archive.zip" },
  { pathname: "digital-products/production/p1/archive.zip" },
  { pathname: "https://other.invalid/archive.zip" },
]) {
  test(`file key and private path must belong to purchased product: ${JSON.stringify(scenario)}`, async () => {
    const h = delivery(scenario);
    assert.equal((await h.get()).status, 404);
    assert.equal(h.reads(), 0);
  });
}
test("a buyer downloads ZIP bytes as an attachment with no public redirect or shared cache", async () => {
  const h = delivery();
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/octet-stream");
  assert.match(response.headers.get("Content-Disposition"), /^attachment;.*paquete.zip/);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Location"), null);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [80, 75, 3, 4]);
});
test("a missing private file fails without leaking storage details", async () => {
  const response = await delivery({ blobMissing: true }).get();
  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /token|blob.vercel/);
});

function uploadApi({ canEdit = true, draftType = "product" } = {}) {
  let minted = false;
  const api = load("app/api/studio/product-files/route.ts", {
    "@/lib/digital-products/files": files,
    "@/lib/digital-products/storage": { productStorageConfig: () => config },
    "@/lib/rate-limit": { applyRateLimit: () => null },
    "@sanity/client": {
      createClient: (options) => {
        assert.equal(options.dataset, "preview");
        assert.equal(options.token, "synthetic-editor");
        return {
          getDocument: async (id) => {
            assert.equal(id, "drafts.p1");
            return { _type: draftType };
          },
          patch: (id) => {
            assert.equal(id, "drafts.p1");
            return {
              setIfMissing: () => ({
                commit: async () => {
                  if (!canEdit) {
                    throw new Error("Forbidden");
                  }
                },
              }),
            };
          },
        };
      },
    },
    "@vercel/blob/client": {
      handleUpload: async ({ body, onBeforeGenerateToken }) => {
        const settings = await onBeforeGenerateToken(
          body.payload.pathname,
          body.payload.clientPayload,
          true
        );
        assert.equal(settings.maximumSizeInBytes, 500_000_000);
        assert.equal(settings.allowOverwrite, false);
        assert.equal(settings.allowedContentTypes, undefined);
        minted = true;
        return { clientToken: "synthetic-scoped-upload" };
      },
    },
  });
  return { api, minted: () => minted };
}
const uploadRequest = ({
  authorized = true,
  productId = "drafts.p1",
  pathname = "digital-products/preview/p1/unique/video.mp4",
} = {}) =>
  new Request("https://preview.test/api/studio/product-files", {
    method: "POST",
    headers: authorized ? { Authorization: "Bearer synthetic-editor" } : {},
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname, clientPayload: JSON.stringify({ productId }) },
    }),
  });
for (const scenario of [
  { authorized: false },
  { canEdit: false },
  { draftType: "course" },
  { productId: "../p1" },
  { pathname: "digital-products/preview/p2/video.mp4" },
]) {
  test(`upload requires editor write access on this product: ${JSON.stringify(scenario)}`, async () => {
    const h = uploadApi(scenario);
    const response = await h.api.POST(uploadRequest(scenario));
    assert.equal(response.status, 403);
    assert.equal(h.minted(), false);
    assert.doesNotMatch(await response.text(), /synthetic-/);
  });
}
test("a Sanity editor can upload without a website ADMIN role; any storage-supported format allowed", async () => {
  for (const extension of ["mp4", "m4a", "pdf", "zip", "epub", "new-format"]) {
    const h = uploadApi();
    assert.equal(
      (
        await h.api.POST(
          uploadRequest({ pathname: `digital-products/preview/p1/unique/file.${extension}` })
        )
      ).status,
      200
    );
    assert.equal(h.minted(), true);
  }
});

test("product form starts with an available method and submits the matching currency and endpoint", async () => {
  const { renderToStaticMarkup } = require("react-dom/server");
  for (const scenario of [
    {
      product: { price: 80000 },
      method: "breb",
      currency: "COP",
      label: "Bre-B",
      excluded: "PayPal",
    },
    {
      product: { priceUSD: 20 },
      method: "paypal",
      currency: "USD",
      label: "PayPal",
      excluded: "Bre-B",
    },
    { product: { price: 80000, priceUSD: 20 }, method: "paypal", currency: "USD", label: "PayPal" },
  ]) {
    let sent;
    const component = load("app/productos/[slug]/DigitalProductCheckout.tsx", {
      react: { ...require("react"), useState: (value) => [value, () => {}] },
      "next/navigation": { useRouter: () => ({ push: () => {} }) },
      "next-auth/react": {
        useSession: () => ({ data: { user: { email: "buyer@example.invalid" } } }),
      },
      "@/lib/digital-products/prices": prices,
      "@/lib/purchase-methods": load("lib/purchase-methods.ts"),
      "@/components/checkout/PurchasePolicy": { PurchasePolicy: () => null },
    });
    const form = component.DigitalProductCheckout({
      product: { id: "p1", title: "Producto", ...scenario.product },
    });
    const html = renderToStaticMarkup(form);
    assert.match(html, new RegExp(scenario.label));
    if (scenario.excluded) {
      assert.doesNotMatch(html, new RegExp(scenario.excluded));
    }
    const previousFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, options) => {
        sent = { url, body: JSON.parse(options.body) };
        return Response.json({ redirectUrl: "/pago/confirmacion?ref=synthetic" });
      };
      await form.props.onSubmit({ preventDefault() {} });
    } finally {
      globalThis.fetch = previousFetch;
    }
    assert.equal(sent.url, `/api/checkout/${scenario.method}`);
    assert.equal(sent.body.currency, scenario.currency);
    assert.equal(sent.body.productType, "product");
    assert.equal(sent.body.amount, scenario.currency === "COP" ? 80000 : 20);
  }
});
