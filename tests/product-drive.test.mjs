/* eslint-disable require-await -- Isolated asynchronous service adapters. */
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
    if (name in dependencies) { return dependencies[name]; }
    if (name.startsWith("@/") || name.startsWith("./")) { throw new Error(`Unmocked dependency ${name}`); }
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  }).outputText, filename);
  return mod.exports;
}
const config = load("lib/digital-products/drive-config.ts");
const api = load("lib/digital-products/drive-api.ts", {
  "@/lib/prisma": { prisma: {} }, "./drive-config": config,
});

test("Drive requires EYD Preview configuration and never falls back to production credentials", () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { VERCEL_ENV: "preview", NEXT_PUBLIC_SANITY_PROJECT_ID: "81jpalr2",
      NEXT_PUBLIC_SANITY_DATASET: "preview", PREVIEW_SANITY_DATASET: "preview",
      DIGITAL_PRODUCTS_DRIVE_ENABLED: "true", DIGITAL_PRODUCTS_DRIVE_CLIENT_ID: "synthetic-production",
      DIGITAL_PRODUCTS_DRIVE_CLIENT_SECRET: "synthetic-production" });
    for (const name of Object.keys(process.env)) { if (name.startsWith("PREVIEW_DIGITAL_PRODUCTS_DRIVE_")) { delete process.env[name]; } }
    assert.throws(config.driveConfig);
    Object.assign(process.env, {
      PREVIEW_DIGITAL_PRODUCTS_DRIVE_ENABLED: "true", PREVIEW_DIGITAL_PRODUCTS_DRIVE_CLIENT_ID: "synthetic-preview",
      PREVIEW_DIGITAL_PRODUCTS_DRIVE_CLIENT_SECRET: "synthetic-preview-secret", PREVIEW_DIGITAL_PRODUCTS_DRIVE_OWNER_EMAIL: "owner@example.test",
      PREVIEW_DIGITAL_PRODUCTS_DRIVE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
      PREVIEW_DIGITAL_PRODUCTS_DRIVE_ORIGIN: "https://preview.energiaydivinidad.com",
    });
    assert.equal(config.driveConfig().clientId, "synthetic-preview");
    const encrypted = config.encryptDriveSecret("synthetic-refresh-token");
    assert.doesNotMatch(encrypted, /synthetic/);
    assert.equal(config.decryptDriveSecret(encrypted), "synthetic-refresh-token");
    assert.notEqual(config.encryptDriveSecret("synthetic-refresh-token"), encrypted);
    process.env.PREVIEW_DIGITAL_PRODUCTS_DRIVE_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");
    assert.throws(() => config.decryptDriveSecret(encrypted));
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
    assert.throws(config.driveConfig, /aislado/);
  } finally {
    for (const name of Object.keys(process.env)) { if (!(name in saved)) { delete process.env[name]; } }
    Object.assign(process.env, saved);
  }
});

test("private folder ACL rejects public, inherited unexpected readers and editors", () => {
  const owner = { id: "owner", type: "user", role: "owner" };
  const buyer = { id: "buyer", type: "user", role: "reader", emailAddress: "buyer@example.test" };
  api.assertPrivatePermissions([owner], "owner", []);
  api.assertPrivatePermissions([owner, buyer], "owner", ["buyer@example.test"]);
  for (const extra of [
    { type: "anyone", role: "reader" }, { type: "domain", role: "reader" },
    { type: "group", role: "reader", emailAddress: "buyer@example.test" },
    { ...buyer, role: "writer" }, { ...buyer, emailAddress: "other-product@example.test" },
    { ...buyer, deleted: true },
  ]) { assert.throws(() => api.assertPrivatePermissions([owner, extra], "owner", ["buyer@example.test"])); }
  assert.throws(() => api.assertPrivatePermissions([buyer], "owner", ["buyer@example.test"]));
});

test("Drive destination is constructed from a validated ID, never an arbitrary redirect", () => {
  assert.equal(api.driveFolderUrl("test_folder_123"), "https://drive.google.com/drive/folders/test_folder_123");
  for (const id of ["", "https://evil.test", "../other", "abc?next=evil", "a/b/c/d/efghij"]) {
    assert.throws(() => api.driveFolderUrl(id));
  }
});

test("verification rejects an incomplete or moved file before recording completion", async () => {
  let marked = 0;
  const originalFetch = globalThis.fetch;
  const upload = { id: "upload", size: 20, sha256: "a".repeat(64), fileId: "file_1234567890", folder: { folderId: "folder_1234567890" } };
  const service = load("lib/digital-products/drive-upload.ts", {
    "@sanity/client": {}, "@/lib/prisma": { prisma: { productDriveUpload: {
      findFirst: async () => upload, update: async () => { marked++; },
    } } }, "./drive-config": {}, "./files": {},
    "./drive-api": { assertPrivateFolder: async () => [],
      driveFetch: async () => ({ size: "10", sha256Checksum: upload.sha256, parents: [upload.folder.folderId], owners: [{ permissionId: "owner" }] }) },
  });
  try {
    globalThis.fetch = async () => { throw new Error("Unexpected external request"); };
    await assert.rejects(service.verifyDriveUpload("upload", "product", { environment: "preview", connection: { ownerPermissionId: "owner" } }), /no está completo/);
    assert.equal(marked, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("browser resumes only the server-confirmed offset and sends no Google token", async () => {
  const originalFetch = globalThis.fetch;
  const { uploadProductDrive } = load("sanity/lib/upload-product-drive.ts");
  const file = new File(["0123456789"], "test.pdf", { type: "application/pdf" });
  const progress = [];
  let statusCalls = 0;
  let chunks = 0;
  try {
    globalThis.fetch = async (url, options) => {
      if (String(url) === "/api/studio/product-drive") {
        const body = JSON.parse(options.body);
        assert.equal(body.productId, "drafts.product");
        assert.equal(options.headers.Authorization, "Bearer synthetic-sanity-editor");
        if (body.action === "start") {
          assert.match(body.sha256, /^[a-f0-9]{64}$/);
          return Response.json({ id: "attempt", sessionUrl: "https://www.googleapis.com/upload/drive/v3/files?upload_id=synthetic", complete: false });
        }
        if (body.action === "status") { return Response.json(++statusCalls === 1 ? { complete: false, offset: 4 } : { complete: true, offset: 10 }); }
        assert.equal(body.action, "finalize");
        return Response.json({ internalFileRef: "attempt", originalFilename: file.name, contentType: file.type, size: file.size });
      }
      chunks++;
      assert.equal(String(url), "https://www.googleapis.com/upload/drive/v3/files?upload_id=synthetic");
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers["Content-Length"], undefined);
      assert.equal(options.credentials, "omit");
      assert.equal(options.headers["Content-Range"], "bytes 4-9/10");
      assert.equal(await options.body.text(), "456789");
      return new Response(null, { status: 308 });
    };
    const result = await uploadProductDrive(file, "drafts.product", "file-key", "synthetic-sanity-editor", (p) => progress.push(p));
    assert.equal(result.internalFileRef, "attempt");
    assert.equal(chunks, 1);
    assert.equal(statusCalls, 2);
    assert.equal(progress.at(-1), 100);
  } finally { globalThis.fetch = originalFetch; }
});

test("browser does not finalize a failed upload", async () => {
  const originalFetch = globalThis.fetch;
  const { uploadProductDrive } = load("sanity/lib/upload-product-drive.ts");
  let finalized = false;
  try {
    globalThis.fetch = async (url, options) => {
      if (String(url) !== "/api/studio/product-drive") { throw new Error("Interrupted network"); }
      const body = JSON.parse(options.body);
      if (body.action === "finalize") { finalized = true; }
      return Response.json(body.action === "start" ? { id: "attempt", sessionUrl: "https://www.googleapis.com/upload/drive/v3/files?upload_id=synthetic" } : { complete: false, offset: 0 });
    };
    await assert.rejects(uploadProductDrive(new File(["test"], "test.pdf"), "drafts.product", "key", "synthetic-sanity-editor", () => {}), /Interrupted/);
    assert.equal(finalized, false);
  } finally { globalThis.fetch = originalFetch; }
});

function deliveryFixture({ paid = true, granted = false, reader = true, entitled = true } = {}) {
  const changes = [];
  const order = { id: "order", userId: "buyer", itemId: "product", orderType: "PRODUCT", paymentStatus: paid ? "COMPLETED" : "PENDING",
    driveDelivery: { orderId: "order", environment: "preview", folderId: "folder_1234567890", recipientEmail: "buyer@example.test",
      pendingRecipientEmail: null, revision: 0, status: granted ? "GRANTED" : "PENDING_ACCESS" } };
  const db = {
    $executeRaw: async () => 1,
    $transaction: async (operation) => operation(db),
    order: {
      findUnique: async () => order,
      findFirst: async ({ where }) => where.userId === "buyer" && (where.paymentStatus !== "COMPLETED" || order.paymentStatus === "COMPLETED") ? order : null,
      update: async (args) => { changes.push(["order", args]); Object.assign(order, args.data); return order; },
    },
    entitlement: {
      findFirst: async ({ where }) => {
        assert.equal(where.userId, "buyer"); assert.equal(where.orderId, "order"); assert.equal(where.revoked, false);
        return entitled ? { id: "entitlement" } : null;
      },
      updateMany: async (args) => { changes.push(["entitlement", args]); return { count: 1 }; },
    },
    driveProductDelivery: {
      findFirst: async () => null,
      update: async (args) => { changes.push(["delivery", args]); Object.assign(order.driveDelivery, args.data, { revision: order.driveDelivery.revision + 1 }); return order.driveDelivery; },
    },
    auditLog: { create: async (args) => { changes.push(["audit", args]); return {}; } },
  };
  const service = load("lib/digital-products/drive-delivery.ts", {
    "@/lib/prisma": { prisma: db },
    "./drive-config": { driveEnvironment: () => "preview", driveConfig: () => ({ environment: "preview" }) },
    "./drive-api": {
      driveFolderUrl: api.driveFolderUrl,
      connectedDrive: async () => ({ connection: { rootFolderId: "root_1234567890" } }),
      assertPrivateFolder: async () => reader ? [{ type: "user", role: "reader", emailAddress: "buyer@example.test" }] : [],
    },
  });
  return { service, order, changes };
}

test("Drive access requires the actual owner, completed payment, grant and an active entitlement", async () => {
  for (const options of [{ paid: false }, { granted: false }, { granted: true, entitled: false }]) {
    const fixture = deliveryFixture(options);
    assert.equal(await fixture.service.ownedDriveAccess("order", "buyer"), null);
  }
  const { service } = deliveryFixture({ granted: true });
  assert.equal(await service.ownedDriveAccess("order", "other-account"), null);
  assert.equal(await service.ownedDriveAccess("order", "buyer"), "https://drive.google.com/drive/folders/folder_1234567890");
});

test("recording a Drive grant requires payment and reader permission and never settles money", async () => {
  for (const options of [{ paid: false }, { reader: false }]) {
    const { service, changes } = deliveryFixture(options);
    await assert.rejects(service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "grant", revision: 0 }));
    assert.equal(changes.length, 0);
  }
  const { service, changes, order } = deliveryFixture();
  await service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "grant", revision: 0 });
  assert.equal(order.driveDelivery.status, "GRANTED");
  assert.deepEqual(changes.map(([type]) => type), ["delivery", "audit"]);
  await assert.rejects(service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "grant", revision: 0 }), /ha cambiado/);
  assert.equal(changes.length, 2);
});

test("a verified total refund revokes only this order's entitlement and leaves manual Drive removal pending", async () => {
  const { service, changes, order } = deliveryFixture({ granted: true });
  await service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "refund", revision: 0, reference: "synthetic-refund" });
  assert.equal(order.paymentStatus, "REFUNDED");
  assert.equal(order.driveDelivery.status, "PENDING_REVOCATION");
  const revoke = changes.find(([type]) => type === "entitlement")[1];
  assert.deepEqual(revoke.where, { orderId: "order", type: "PRODUCT" });
  assert.equal(revoke.data.revoked, true);
  assert.equal(await service.ownedDriveAccess("order", "buyer"), null);
});

test("changing Google account after delivery suspends the link without changing payment", async () => {
  const { service, changes, order } = deliveryFixture({ granted: true });
  await assert.rejects(service.changeDriveRecipient("order", "other-account", "new@example.test"));
  assert.equal(changes.length, 0);
  await service.changeDriveRecipient("order", "buyer", "new@example.test");
  assert.equal(order.driveDelivery.status, "PENDING_REVOCATION");
  assert.equal(order.driveDelivery.recipientEmail, "buyer@example.test");
  assert.equal(order.driveDelivery.pendingRecipientEmail, "new@example.test");
  assert.equal(order.paymentStatus, "COMPLETED");
  assert.equal(await service.ownedDriveAccess("order", "buyer"), null);
});

test("anonymous Drive requests return no redirect before any delivery lookup", async () => {
  let lookup = false;
  const route = load("app/api/mi-cuenta/pedidos/[id]/drive/route.ts", {
    "next/server": { NextResponse: { json: Response.json } }, "@/lib/auth": { auth: async () => null },
    "@/lib/digital-products/drive-admin": { driveNoStore: { "Cache-Control": "private, no-store" } },
    "@/lib/digital-products/drive-delivery": { ownedDriveAccess: async () => { lookup = true; } },
  });
  const response = await route.GET(new Request("https://preview.example.test/drive"), { params: Promise.resolve({ id: "order" }) });
  assert.equal(response.status, 401); assert.equal(response.headers.get("Location"), null); assert.equal(lookup, false);
});
