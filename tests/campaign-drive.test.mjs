/* eslint-disable require-await -- Isolated adapters for Drive and Prisma. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership as load } from "./helpers/membership-loader.mjs";

const fileId = "synthetic-pdf";
const folderId = "synthetic-folder";
const pdf = {
  id: "attachment",
  campaignId: "draft",
  fileId,
  folderId,
  filename: "Guía.pdf",
  size: 200,
  sha256: "a".repeat(64),
  encryptedSession: null,
  downloadUrl: "https://drive.google.com/uc?export=download&id=synthetic-pdf",
  removedAt: null,
};
const owner = { id: "owner", role: "owner", type: "user" };
const reader = { id: "anyone", role: "reader", type: "anyone", allowFileDiscovery: false };

function setup(prisma, driveFetch, extras = {}) {
  const connected = {
    environment: "preview",
    accessToken: "synthetic",
    origin: "https://preview.energiaydivinidad.com",
    connection: { ownerPermissionId: "owner" },
  };
  const verifyOwner = (entries) => assert.deepEqual(entries, [owner]);
  return load("lib/services/campaign-drive.ts", {
    "@/lib/campaign-attachment": { CAMPAIGN_PDF_LIMIT: 10_000_000 },
    "@/lib/digital-products/drive-api": {
      assertPrivateFolder: async (id) => assert.equal(id, folderId),
      assertPrivatePermissions: verifyOwner,
      connectedDrive: async () => connected,
      driveFetch,
      validDriveId: (id) => id,
    },
    "@/lib/digital-products/drive-config": {
      driveConfig: () => ({ environment: extras.environment ?? "preview" }),
      decryptDriveSecret: (v) => v,
      encryptDriveSecret: (v) => v,
    },
    "@/lib/digital-products/drive-upload": {
      driveFileIntegrity: (file, expected) =>
        file.sha256Checksum === expected.sha256 && file.size === expected.size
          ? "valid"
          : "changed",
      validUploadSession: (v) => v,
    },
    "@/lib/digital-products/files": { safeFilename: (v) => v },
    "@/lib/prisma": { prisma },
  });
}

test("download requires a verified PDF and a link-only reader permission", async (t) => {
  let acl = [owner, reader];
  let checksum = pdf.sha256;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      mimeType: "application/pdf",
      size: pdf.size,
      sha256Checksum: checksum,
      webContentLink: pdf.downloadUrl,
    })
  );
  const prisma = { campaignAttachment: { findMany: async () => [pdf] } };
  const service = setup(prisma, async () => ({ permissions: acl }));
  assert.equal((await service.campaignDownloads("draft"))[0].downloadUrl, pdf.downloadUrl);
  acl = [owner];
  await assert.rejects(service.campaignDownloads("draft"), /por enlace/);
  acl = [owner, { ...reader, allowFileDiscovery: true }];
  await assert.rejects(service.campaignDownloads("draft"), /por enlace/);
  acl = [owner, reader];
  checksum = "different";
  await assert.rejects(service.campaignDownloads("draft"), /ya no coincide/);
  await assert.rejects(
    setup(prisma, async () => assert.fail(), { environment: "production" }).campaignDownloads(
      "draft"
    ),
    /Preview/
  );
});

test("retries use the existing upload session and quota blocks a new upload", async (t) => {
  let available = 0;
  let existing = null;
  let newFile = 0;
  const session = "https://www.googleapis.com/upload/drive/v3/files?upload_id=fixture";
  const tx = {
    $executeRaw: async () => 0,
    $queryRaw: async () => [{ id: "draft" }],
    campaignDriveFolder: { findUnique: async () => ({ fileId: folderId }) },
    campaignAttachment: {
      findUnique: async () => existing,
      create: async ({ data }) => {
        newFile++;
        return (existing = { ...data, id: pdf.id });
      },
      update: async ({ data }) => (existing = { ...existing, ...data }),
    },
  };
  const prisma = {
    emailCampaign: { findFirst: async () => ({ id: "draft" }) },
    $transaction: async (fn) => fn(tx),
  };
  const service = setup(prisma, async (path) =>
    path.startsWith("about?")
      ? {
          storageQuota: { limit: "1000", usage: String(1000 - available) },
        }
      : { ids: [pdf.fileId] }
  );
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.includes("/upload/drive/v3/")) {
      return new Response(null, { headers: { Location: session } });
    }
    return url.includes(folderId)
      ? Response.json({ id: folderId })
      : new Response(null, { status: 404 });
  });
  const input = { filename: pdf.filename, size: pdf.size, sha256: pdf.sha256 };
  await assert.rejects(service.startCampaignAttachment("draft", input), /No queda espacio/);
  assert.equal(newFile, 0);
  available = 500;
  assert.equal((await service.startCampaignAttachment("draft", input)).sessionUrl, session);
  assert.equal((await service.startCampaignAttachment("draft", input)).sessionUrl, session);
  assert.equal(newFile, 1);
});
