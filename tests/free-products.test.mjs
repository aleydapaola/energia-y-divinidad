/* eslint-disable require-await -- Isolated service mocks never use a database or network. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

function fixture() {
  const state = {
    published: true,
    sale: false,
    verified: true,
    policy: [],
    fetches: 0,
    folderSafe: true,
  };
  const upload = {
    id: "opaque-reference",
    contentType: "audio/wav",
    fileId: "file_1234567890",
    size: 4,
    sha256: "checksum",
    folder: { folderId: "folder_1234567890" },
  };
  const service = loadMembership("lib/digital-products/free-product.ts", {
    "@/sanity/lib/client": {
      client: {
        fetch: async (query) => {
          assert.match(query, /published == true.*status == "active".*pricing.isFree == true/);
          return state.published
            ? {
                _id: "free-qa",
                privateDigitalFiles: [
                  {
                    _key: "audio",
                    title: "Audio QA",
                    internalFileRef: upload.id,
                    contentType: "audio/wav",
                  },
                ],
              }
            : null;
        },
      },
    },
    "@/lib/prisma": {
      prisma: {
        order: { findFirst: async () => (state.sale ? { id: "paid-order" } : null) },
        productDriveFolder: { findUnique: async () => ({ folderId: upload.folder.folderId }) },
        productDriveUpload: {
          findMany: async () => (state.verified ? [upload] : []),
          findFirst: async () => (state.verified ? upload : null),
        },
      },
    },
    "./drive-config": { driveEnvironment: () => "preview" },
    "./drive-api": {
      connectedDrive: async () => ({
        accessToken: "synthetic",
        connection: { rootFolderId: "root", ownerPermissionId: "owner" },
      }),
      assertPrivateFolder: async () => {
        if (!state.folderSafe) {
          throw new Error("Unexpected reader");
        }
        return [];
      },
      assertPrivatePermissions: () => {},
      drivePermissions: async () => [],
      validDriveId: (id) => id,
      driveFetch: async () => ({
        id: upload.fileId,
        size: "4",
        sha256Checksum: "checksum",
        mimeType: "audio/wav",
        parents: [upload.folder.folderId],
        owners: [{ permissionId: "owner" }],
      }),
    },
    "./drive-file-policy": { applyDriveFilePolicy: async (...args) => state.policy.push(args[2]) },
  });
  return { service, state };
}
const request = (query = "", init) =>
  new Request(
    `https://preview.energiaydivinidad.com/api/productos/free-qa/gratis/audio${query}`,
    init
  );

test("online-only policy restricts each free PDF, audio and video file without changing folder sharing", async () => {
  for (const mime of ["application/pdf", "audio/wav", "video/mp4"]) {
    const calls = [];
    const service = loadMembership("lib/digital-products/drive-file-policy.ts", {
      "./drive-api": {
        validDriveId: (id) => id,
        driveFetch: async (path, token, options) => {
          calls.push({ path, options });
          return {
            id: "free_file_12345",
            mimeType: mime,
            parents: ["free_folder"],
            owners: [{ permissionId: "owner" }],
            copyRequiresWriterPermission: Boolean(options),
          };
        },
      },
    });
    await service.applyDriveFilePolicy("free_file_12345", mime, "FREE_ONLINE", "synthetic", {
      folderId: "free_folder",
      ownerId: "owner",
    });
    assert.equal(calls.length, 2);
    assert.deepEqual(JSON.parse(calls[1].options.body), { copyRequiresWriterPermission: true });
    assert.ok(calls.every((call) => call.path.startsWith("files/free_file_12345?")));
  }
});

test("only published free metadata is exposed; sold or unverified files are excluded", async () => {
  const { service, state } = fixture();
  assert.deepEqual(await service.freeProductFiles("free-qa"), [
    { key: "audio", title: "Audio QA", contentType: "audio/wav" },
  ]);
  state.sale = true;
  assert.deepEqual(await service.freeProductFiles("free-qa"), []);
  state.sale = false;
  state.verified = false;
  assert.deepEqual(await service.freeProductFiles("free-qa"), []);
  state.verified = true;
  state.published = false;
  assert.deepEqual(await service.freeProductFiles("free-qa"), []);
});

test("download, paid folders, unpublished products, unknown keys and invalid ranges fail before media transfer", async () => {
  const { service, state } = fixture();
  const saved = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("must not transfer media");
  };
  try {
    for (const query of ["?download=1", "?download=0", "?download="]) {
      assert.equal(
        (await service.freeProductContent(request(query), "free-qa", "audio")).status,
        403
      );
    }
    state.sale = true;
    assert.equal((await service.freeProductContent(request(), "free-qa", "audio")).status, 404);
    state.sale = false;
    state.published = false;
    assert.equal((await service.freeProductContent(request(), "free-qa", "audio")).status, 404);
    state.published = true;
    assert.equal(
      (await service.freeProductContent(request(), "free-qa", "foreign-key")).status,
      404
    );
    for (const range of ["bytes=0-1,2-3", "bytes=4-", "bytes=3-1", "bad"]) {
      assert.equal(
        (
          await service.freeProductContent(
            request("", { headers: { Range: range } }),
            "free-qa",
            "audio"
          )
        ).status,
        416
      );
    }
    state.folderSafe = false;
    assert.equal((await service.freeProductContent(request(), "free-qa", "audio")).status, 503);
  } finally {
    globalThis.fetch = saved;
  }
});

test("free audio streams inline from the bound Drive file, supports seeking and never returns tokens or Drive links", async () => {
  const { service, state } = fixture();
  const saved = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(new Uint8Array([2, 3]), {
      status: 206,
      headers: { "Content-Range": "bytes 1-2/4", "Content-Length": "2" },
    });
  };
  try {
    const response = await service.freeProductContent(
      request("?url=https://foreign.invalid/", { headers: { Range: "bytes=1-2" } }),
      "free-qa",
      "audio"
    );
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("Content-Disposition"), "inline");
    assert.equal(response.headers.get("Content-Type"), "audio/wav");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Location"), null);
    assert.equal(response.headers.get("Authorization"), null);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [2, 3]);
    assert.equal(
      calls[0].url,
      "https://www.googleapis.com/drive/v3/files/file_1234567890?alt=media"
    );
    assert.equal(calls[0].options.headers.Range, "bytes=1-2");
    assert.equal(calls[0].options.redirect, "error");
    assert.deepEqual(state.policy, ["FREE_ONLINE"]);
  } finally {
    globalThis.fetch = saved;
  }
});

test("malformed upstream partial responses are rejected instead of offering a broken player", async () => {
  const { service } = fixture();
  const saved = globalThis.fetch;
  globalThis.fetch = async () => new Response("bad", { status: 206 });
  try {
    assert.equal((await service.freeProductContent(request(), "free-qa", "audio")).status, 503);
  } finally {
    globalThis.fetch = saved;
  }
});
