import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import path from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../", import.meta.url).pathname;
const asset = "https://mcusercontent.com/aaaaaaaaaaaaaaaaaaaaaaaaa/files/1111-2222/audio.m4a";

async function isolated(run) {
  const saved = globalThis.fetch;
  const config = { enabled: true, giftUrl: asset };
  const filename = path.join(root, "app/api/newsletter/meditacion/route.ts");
  const mod = new Module(filename);
  mod.require = (name) =>
    name === "@/lib/newsletter-gift-config"
      ? { newsletterGiftConfiguration: () => config }
      : require(name);
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  try {
    await run({ route: mod.exports, config });
  } finally {
    globalThis.fetch = saved;
  }
}
const request = (url = "https://preview.energiaydivinidad.com/api/newsletter/meditacion", init) =>
  new Request(url, init);

test("audio fails closed before network access when disabled, missing or given a malformed/multiple range", () =>
  isolated(async ({ route, config }) => {
    globalThis.fetch = async () => {
      throw Error("must not fetch");
    };
    config.enabled = false;
    assert.equal((await route.GET(request())).status, 404);
    config.enabled = true;
    config.giftUrl = null;
    assert.equal((await route.GET(request())).status, 404);
    config.giftUrl = asset;
    for (const range of ["bytes=0-10,20-30", "bad", "bytes=0-999999999999999999999"])
      assert.equal(
        (await route.GET(request(undefined, { headers: { Range: range } }))).status,
        416
      );
  }));

test("audio streams the fixed configured asset with playable MIME and an explicit download filename", () =>
  isolated(async ({ route }) => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, opts });
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": "3",
          "Accept-Ranges": "bytes",
        },
      });
    };
    const response = await route.GET(
      request(
        "https://preview.energiaydivinidad.com/api/newsletter/meditacion?url=https://other.invalid/secret"
      )
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "audio/mp4");
    assert.match(
      response.headers.get("Content-Disposition"),
      /^inline; filename="meditacion-angel-de-la-guarda.m4a"$/
    );
    assert.equal(
      response.headers.get("Content-Length"),
      null,
      "GET stays streamed rather than buffered"
    );
    assert.equal(response.headers.get("Accept-Ranges"), "bytes");
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
    assert.equal(calls[0].url, asset);
    assert.equal(calls[0].opts.redirect, "error");
    assert.equal(calls[0].opts.headers.Authorization, undefined);
    const download = await route.GET(
      request("https://preview.energiaydivinidad.com/api/newsletter/meditacion?download=1")
    );
    assert.match(download.headers.get("Content-Disposition"), /^attachment;/);
  }));

test("seeking preserves a valid single byte range and HEAD reports the same media headers without a body", () =>
  isolated(async ({ route }) => {
    globalThis.fetch = async (url, opts) => {
      assert.equal(url, asset);
      assert.equal(opts.headers.Range, "bytes=100-199");
      return new Response(opts.method === "HEAD" ? null : new Uint8Array(100), {
        status: 206,
        headers: {
          "Content-Range": "bytes 100-199/9263703",
          "Content-Length": "100",
          "Accept-Ranges": "bytes",
        },
      });
    };
    const response = await route.GET(request(undefined, { headers: { Range: "bytes=100-199" } }));
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("Content-Range"), "bytes 100-199/9263703");
    assert.equal((await response.arrayBuffer()).byteLength, 100);
    const head = await route.HEAD(
      request(undefined, { method: "HEAD", headers: { Range: "bytes=100-199" } })
    );
    assert.equal(head.status, 206);
    assert.equal(head.headers.get("Content-Length"), "100");
    assert.equal(await head.text(), "");
  }));

test("upstream failures and redirects do not become an audio response or expose provider URLs", () =>
  isolated(async ({ route }) => {
    for (const status of [301, 403, 404, 500]) {
      globalThis.fetch = async () =>
        new Response("private upstream body", {
          status,
          headers: { Location: "https://other.invalid" },
        });
      const result = await route.GET(request());
      assert.equal(result.status, 503);
      assert.doesNotMatch(await result.text(), /private|mcusercontent|other.invalid/);
    }
    globalThis.fetch = async () => new Response("bad range", { status: 206 });
    assert.equal((await route.GET(request())).status, 503);
    globalThis.fetch = async () =>
      new Response(null, { status: 416, headers: { "Content-Range": "bytes */9263703" } });
    const missing = await route.GET(request(undefined, { headers: { Range: "bytes=999999999-" } }));
    assert.equal(missing.status, 416);
    assert.equal(missing.headers.get("Content-Range"), "bytes */9263703");
    globalThis.fetch = async () => {
      throw Error("network");
    };
    assert.equal((await route.GET(request())).status, 503);
  }));
