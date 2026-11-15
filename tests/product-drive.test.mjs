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
    } } }, "./drive-config": {}, "./files": {}, "./drive-file-policy": {},
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

function deliveryFixture({ paid = true, granted = false, reader = true, entitled = true, anotherPurchase = false } = {}) {
  const changes = [];
  const order = { id: "order", userId: "buyer", itemId: "product", orderType: "PRODUCT", paymentStatus: paid ? "COMPLETED" : "PENDING",
    user: { id: "buyer", email: "buyer@example.test", emailVerified: new Date() },
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
      findFirst: async ({ where }) => {
        assert.equal(where.order.entitlements.some.type, "PRODUCT");
        assert.equal(where.order.entitlements.some.resourceId, "product");
        return anotherPurchase ? { orderId: "another-paid-order" } : null;
      },
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

test("manual grants are disabled; delivery must confirm the verified owner through Drive API", async () => {
  for (const options of [{ paid: false }, { reader: false }]) {
    const { service, changes } = deliveryFixture(options);
    await assert.rejects(service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "grant", revision: 0 }));
    assert.equal(changes.length, 0);
  }
  const { service, changes } = deliveryFixture();
  await assert.rejects(service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "grant", revision: 0 }), /automáticamente/);
  assert.equal(changes.length, 0);
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

test("a changed or unverified account email cannot open an earlier Drive delivery", async () => {
  for (const user of [{ email: "other@example.test", emailVerified: new Date() }, { email: "buyer@example.test", emailVerified: null }]) {
    const { service, order } = deliveryFixture({ granted: true });
    order.user = user;
    assert.equal(await service.ownedDriveAccess("order", "buyer"), null);
  }
});

test("refund completion requires removed reader permission unless another paid purchase preserves it", async () => {
  for (const anotherPurchase of [false, true]) {
    const { service, order } = deliveryFixture({ granted: true, anotherPurchase });
    await service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "refund", revision: 0, reference: "synthetic-refund" });
    const revoke = () => service.administerDriveDelivery("order", { id: "admin", email: "admin@example.test" }, { action: "revoke", revision: 1 });
    if (anotherPurchase) { await revoke(); assert.equal(order.driveDelivery.status, "REVOKED"); }
    else { await assert.rejects(revoke, /Retira primero el permiso/); assert.equal(order.driveDelivery.status, "PENDING_REVOCATION"); }
  }
});

function automaticFixture() {
  const calls = [];
  const order = { id: "order", userId: "buyer", itemId: "product", orderType: "PRODUCT", paymentStatus: "COMPLETED",
    user: { id: "buyer", email: "Buyer@example.test", emailVerified: new Date() },
    driveDelivery: { environment: "preview", folderId: "folder_1234567890", recipientEmail: "buyer@example.test", status: "PENDING_ACCESS" } };
  let permission;
  let failConfirmation = false;
  let failCommit = false;
  let folderMatches = true;
  let entitled = true;
  let privateFolder = true;
  const db = {
    $executeRaw: async (_strings, key) => { calls.push(["lock", key]); },
    $transaction: async (operation) => operation(db),
    order: { findUnique: async () => order }, // No payment mutation adapter exists: retries cannot settle money.
    entitlement: { findFirst: async ({ where }) => {
      assert.equal(where.userId, "buyer"); assert.equal(where.orderId, "order"); assert.equal(where.resourceId, "product");
      return entitled ? { id: "entitlement" } : null;
    } },
    productDriveFolder: { findFirst: async ({ where }) => {
      assert.equal(where.productId, "product"); assert.equal(where.environment, "preview");
      assert.equal(where.folderId, order.driveDelivery.folderId);
      return folderMatches ? { id: "folder-record" } : null;
    } },
    productDriveUpload: { findMany: async () => [{ fileId: "file_1234567890", contentType: "application/pdf" }] },
    driveProductDelivery: { update: async ({ data }) => {
      if (failCommit) { throw new Error("Synthetic lost DB response"); }
      calls.push(["delivery", data.status]); Object.assign(order.driveDelivery, data);
    } },
    auditLog: { create: async () => { calls.push(["audit"]); } },
  };
  const drive = { accessToken: "synthetic", ownerEmail: "owner@example.test", connection: { rootFolderId: "root_1234567890" } };
  const service = load("lib/digital-products/drive-auto-delivery.ts", {
    "@/lib/prisma": { prisma: db }, "./drive-config": { driveEnvironment: () => "preview" },
    "./drive-delivery": { activeProductEntitlement: (userId, resourceId) => ({ userId, resourceId }) },
    "./drive-file-policy": { applyDriveFilePolicy: async (id, mime, policy) => {
      assert.equal(id, "file_1234567890"); assert.equal(mime, "application/pdf"); assert.equal(policy, "PAID_DOWNLOAD");
    } },
    "./drive-api": { validDriveId: api.validDriveId, connectedDrive: async () => drive, assertPrivatePermissions: () => {},
      assertPrivateFolder: async () => { if (!privateFolder) { throw new Error("Public ACL"); } return []; },
      drivePermissions: async () => permission ? [permission] : [],
      driveFetch: async (path, _token, init) => {
        assert.match(path, /^files\/folder_1234567890\/permissions/);
        if (init?.method === "POST") {
          assert.match(path, /sendNotificationEmail=false/);
          assert.deepEqual(JSON.parse(init.body), { type: "user", role: "reader", emailAddress: "buyer@example.test" });
          calls.push(["create"]); permission = { id: "reader-id", type: "user", role: "reader", emailAddress: "buyer@example.test" };
          return permission;
        }
        calls.push(["confirm"]);
        if (failConfirmation) { throw new Error("Synthetic Drive outage"); }
        return permission;
      },
    },
  });
  return { order, service, calls, set: (options) => {
    if ("permission" in options) { permission = options.permission; }
    if ("failConfirmation" in options) { failConfirmation = options.failConfirmation; }
    if ("failCommit" in options) { failCommit = options.failCommit; }
    if ("folderMatches" in options) { folderMatches = options.folderMatches; }
    if ("entitled" in options) { entitled = options.entitled; }
    if ("privateFolder" in options) { privateFolder = options.privateFolder; }
  } };
}

test("automatic delivery grants only the server's verified owner and product folder, then confirms reader", async () => {
  const { order, service, calls } = automaticFixture();
  assert.deepEqual(await service.deliverPaidDriveOrder("order", "buyer"), { delivered: true });
  assert.equal(order.driveDelivery.status, "GRANTED");
  assert.equal(order.paymentStatus, "COMPLETED");
  assert.deepEqual(calls.map(([operation]) => operation), ["lock", "create", "confirm", "delivery", "audit"]);
  assert.equal(calls[0][1], "drive-folder-acl:folder_1234567890");
  await service.deliverPaidDriveOrder("order", "buyer");
  assert.equal(calls.filter(([operation]) => operation === "create").length, 1);
  assert.equal(calls.filter(([operation]) => operation === "audit").length, 1);
});

test("automatic delivery rejects unpaid, unverified, unrelated or mismatched identities before creating permission", async () => {
  for (const change of [
    (f) => { f.order.paymentStatus = "PENDING"; },
    (f) => { f.order.user.emailVerified = null; },
    (f) => { f.order.user.email = "other@example.test"; },
    (f) => { f.order.user.id = "other"; },
    (f) => { f.order.driveDelivery.environment = "production"; },
    (f) => { f.order.driveDelivery.status = "REVOKED"; },
    (f) => { f.order.driveDelivery.folderId = "root_1234567890"; },
    (f) => { f.set({ entitled: false }); },
    (f) => { f.set({ folderMatches: false }); },
    (f) => { f.set({ privateFolder: false }); },
  ]) {
    const fixture = automaticFixture(); change(fixture);
    assert.equal((await fixture.service.deliverPaidDriveOrder("order", "buyer")).delivered, false);
    assert.equal(fixture.calls.some(([operation]) => operation === "create"), false);
  }
  const fixture = automaticFixture();
  assert.equal((await fixture.service.deliverPaidDriveOrder("order", "outsider")).reason, "NOT_FOUND");
  assert.equal(fixture.calls.length, 0);
});

test("lost Drive confirmation or DB response preserves payment; retry reuses the existing permission", async () => {
  for (const failure of ["failConfirmation", "failCommit"]) {
    const { order, service, calls, set } = automaticFixture();
    set({ [failure]: true });
    assert.deepEqual(await service.deliverPaidDriveOrder("order", "buyer"), { delivered: false, reason: "DRIVE_UNAVAILABLE" });
    assert.equal(order.paymentStatus, "COMPLETED");
    assert.equal(order.driveDelivery.status, "PENDING_ACCESS");
    set({ [failure]: false });
    assert.equal((await service.deliverPaidDriveOrder("order", "buyer")).delivered, true);
    assert.equal(calls.filter(([operation]) => operation === "create").length, 1);
  }
});

test("a pre-existing writer permission cannot be recorded as buyer reader delivery", async () => {
  const fixture = automaticFixture();
  fixture.set({ permission: { id: "writer-id", type: "user", role: "writer", emailAddress: "buyer@example.test" } });
  assert.equal((await fixture.service.deliverPaidDriveOrder("order", "buyer")).reason, "REVIEW_REQUIRED");
  assert.equal(fixture.order.driveDelivery.status, "PENDING_ACCESS");
  assert.equal(fixture.calls.some(([operation]) => operation === "create"), false);
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

test("Studio detects deletion, movement, or changed bytes without trusting the filename", () => {
  const service = load("lib/digital-products/drive-upload.ts", {
    "@sanity/client": {}, "@/lib/prisma": {}, "./drive-config": {}, "./drive-api": {}, "./files": {}, "./drive-file-policy": {},
  });
  const expected = { size: 609, sha256: "a".repeat(64), folderId: "product-folder", ownerId: "owner" };
  const file = { size: "609", sha256Checksum: expected.sha256, parents: [expected.folderId], owners: [{ permissionId: "owner" }] };
  assert.equal(service.driveFileIntegrity(file, expected), "valid");
  assert.equal(service.driveFileIntegrity({ ...file, trashed: true }, expected), "missing");
  assert.equal(service.driveFileIntegrity({ ...file, parents: ["another-product"] }, expected), "moved");
  assert.equal(service.driveFileIntegrity({ ...file, size: "610" }, expected), "changed");
  assert.equal(service.driveFileIntegrity({ ...file, sha256Checksum: "b".repeat(64) }, expected), "changed");
});

test("a missing Drive file invalidates only its verified reference and blocks later checkout", async () => {
  const originalFetch = globalThis.fetch;
  let update;
  const service = load("lib/digital-products/drive-upload.ts", {
    "@sanity/client": {}, "@/lib/prisma": { prisma: { productDriveUpload: {
      findFirst: async () => ({ id: "upload", fileId: "file_1234567890", folder: { folderId: "folder_1234567890" } }),
      update: async (args) => { update = args; },
    } } }, "./drive-config": {}, "./files": {}, "./drive-file-policy": {}, "./drive-api": { assertPrivateFolder: async () => [] },
  });
  try {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    const result = await service.checkDriveUpload("upload", "product", { environment: "preview", connection: { rootFolderId: "root" } });
    assert.deepEqual(result, { state: "missing" });
    assert.deepEqual(update, { where: { id: "upload" }, data: { verifiedAt: null } });
  } finally { globalThis.fetch = originalFetch; }
});

test("subsequent uploads of one product reuse its existing private folder", async () => {
  const originalFetch = globalThis.fetch;
  const folder = { id: "folder-record", environment: "preview", productId: "product", folderId: "product_folder_123" };
  let queries = 0;
  const db = { $executeRaw: async () => 1, productDriveFolder: {
    findUnique: async ({ where }) => { queries++; assert.deepEqual(where, { environment_productId: { environment: "preview", productId: "product" } }); return folder; },
    create: async () => { throw new Error("Must not create a second product folder"); },
  } };
  const service = load("lib/digital-products/drive-upload.ts", {
    "@sanity/client": {}, "@/lib/prisma": { prisma: { $transaction: async (operation) => operation(db) } },
    "./drive-config": {}, "./files": {}, "./drive-file-policy": {}, "./drive-api": {
      assertPrivateFolder: async () => [], driveFetch: async () => { throw new Error("Must not allocate a second folder ID"); },
    },
  });
  try {
    globalThis.fetch = async () => new Response("{}", { status: 200 });
    const drive = { environment: "preview", connection: { rootFolderId: "root" }, accessToken: "synthetic-only" };
    assert.equal((await service.productDriveFolder("product", drive)).folderId, folder.folderId);
    assert.equal((await service.productDriveFolder("product", drive)).folderId, folder.folderId);
    assert.equal(queries, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("file policy allows paid PDF and audio downloads, but blocks download only for a free PDF", async () => {
  for (const [mimeType, policy, restricted] of [["application/pdf", "PAID_DOWNLOAD", false], ["audio/wav", "PAID_DOWNLOAD", false], ["application/pdf", "FREE_PDF_VIEW", true]]) {
    let saved = !restricted;
    let patches = 0;
    const service = load("lib/digital-products/drive-file-policy.ts", { "./drive-api": {
      validDriveId: api.validDriveId,
      driveFetch: async (path, _token, init) => {
        assert.match(path, /^files\/file_1234567890\?/);
        if (init?.method === "PATCH") { saved = JSON.parse(init.body).copyRequiresWriterPermission; patches++; }
        return { id: "file_1234567890", mimeType, copyRequiresWriterPermission: saved, parents: ["folder"], owners: [{ permissionId: "owner" }] };
      },
    } });
    await service.applyDriveFilePolicy("file_1234567890", mimeType, policy, "synthetic", { folderId: "folder", ownerId: "owner" });
    assert.equal(saved, restricted); assert.equal(patches, 1);
    await service.applyDriveFilePolicy("file_1234567890", mimeType, policy, "synthetic", { folderId: "folder", ownerId: "owner" });
    assert.equal(patches, 1);
  }
});

test("a free audio is rejected before applying an unplayable restriction; a moved file is never modified", async () => {
  let calls = 0;
  const service = load("lib/digital-products/drive-file-policy.ts", { "./drive-api": {
    validDriveId: api.validDriveId, driveFetch: async (_path, _token, init) => {
      calls++; assert.equal(init, undefined);
      return { id: "file_1234567890", mimeType: "application/pdf", parents: ["other-product"], owners: [{ permissionId: "owner" }] };
    },
  } });
  await assert.rejects(service.applyDriveFilePolicy("file_1234567890", "audio/wav", "FREE_PDF_VIEW", "synthetic"), /audio gratuito queda pendiente/);
  assert.equal(calls, 0);
  await assert.rejects(service.applyDriveFilePolicy("file_1234567890", "application/pdf", "PAID_DOWNLOAD", "synthetic", { folderId: "folder", ownerId: "owner" }), /carpeta privada/);
  assert.equal(calls, 1);
});
