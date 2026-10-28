import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import { Auth } from "@auth/core";
import { encode, getToken } from "@auth/core/jwt";
import Credentials from "next-auth/providers/credentials";
import sharp from "sharp";

const secret = "eyd-unit-test-only-not-an-application-credential";
const logger = { error() {}, warn() {}, debug() {} };

test("updated native image library decodes and resizes a representative SVG", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#4944a4"/></svg>'
  );
  const image = await sharp(svg).resize(48, 48).png().toBuffer();
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 48);
  assert.equal(metadata.height, 48);
});

test("installed Auth.js accepts a signed session and rejects a modified session without external services", async () => {
  const token = await encode({
    token: { sub: "preview-user", email: "preview@example.test", name: "Preview" },
    secret,
    salt: "authjs.session-token",
  });
  async function session(cookie) {
    const response = await Auth(
      new Request("http://localhost/auth/session", {
        headers: cookie ? { cookie: `authjs.session-token=${cookie}` } : {},
      }),
      { providers: [], trustHost: true, secret, logger }
    );
    assert.equal(response.status, 200);
    return response.json();
  }
  assert.equal((await session(token)).user.email, "preview@example.test");
  const parts = token.split(".");
  parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
  assert.equal(await session(parts.join(".")), null);
  assert.equal(await session(), null);
});

test("installed Auth.js handles malformed Bearer tokens without an uncaught decoding error", async () => {
  for (const bearer of ["%", "%E0%A4%A", "not-a-jwt", "a.b.c.d.e"]) {
    const token = await getToken({
      req: new Request("http://localhost/private", {
        headers: { authorization: `Bearer ${bearer}` },
      }),
      secret,
      salt: "authjs.session-token",
      logger,
    });
    assert.equal(token, null);
  }
});

test("application authorization denies configuration-error objects and preserves real session navigation", () => {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const filename = new URL("../lib/auth.config.ts", import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    assert.equal(name, "next-auth/providers/credentials");
    return { default: Credentials };
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  const authorize = mod.exports.authConfig.callbacks.authorized;
  const request = (path) => ({ nextUrl: new URL(path, "https://preview.example.test") });
  for (const auth of [null, undefined, { message: "Configuration error" }]) {
    assert.equal(authorize({ auth, request: request("/mi-cuenta") }), false);
    assert.equal(authorize({ auth, request: request("/admin/orders") }), false);
    assert.equal(authorize({ auth, request: request("/auth/signin") }), true);
  }
  const auth = { user: { id: "preview-user" } };
  assert.equal(authorize({ auth, request: request("/mi-cuenta") }), true);
  const response = authorize({ auth, request: request("/auth/signin") });
  assert.equal(response.headers.get("location"), "https://preview.example.test/mi-cuenta");
});
