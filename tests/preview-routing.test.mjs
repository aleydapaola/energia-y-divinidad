import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const filename = new URL("../next.config.ts", import.meta.url).pathname;
const mod = new Module(filename);
mod.require = require;
mod._compile(
  ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename
);
const config = mod.exports.default;

test("Preview marks all routes noindex even on a custom domain, without changing Production", async () => {
  const saved = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(await config.headers(), [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]);
    for (const env of ["production", "development", undefined]) {
      if (env === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = env;
      }
      assert.deepEqual(await config.headers(), []);
    }
  } finally {
    if (saved === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = saved;
    }
  }
});
