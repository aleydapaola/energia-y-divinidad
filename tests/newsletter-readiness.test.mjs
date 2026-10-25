import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

import { isolatedMailchimpListId } from "../lib/preview-safety.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load() {
  const filename = new URL("../app/api/newsletter/route.ts", import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === "@/lib/email-delivery") {
      return { previewEmailRecipient: () => "allowed@example.com" };
    }
    if (name === "@/lib/preview-safety") {
      return { isolatedMailchimpListId };
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return mod.exports;
}
const keys = [
  "VERCEL_ENV",
  "MAILCHIMP_API_KEY",
  "MAILCHIMP_LIST_ID",
  "PREVIEW_MAILCHIMP_LIST_ID",
  "MAILCHIMP_SERVER_PREFIX",
];
async function isolated(callback) {
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const fetch = globalThis.fetch;
  try {
    await callback();
  } finally {
    globalThis.fetch = fetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("unconfigured Preview newsletter fails closed with an actionable message and no external request", async () =>
  isolated(async () => {
    process.env.VERCEL_ENV = "preview";
    delete process.env.MAILCHIMP_API_KEY;
    globalThis.fetch = async () => {
      throw new Error("External request must not happen");
    };
    const response = await load().POST({ json: async () => ({ email: "visitor@example.com" }) });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /newsletter de pruebas todavía no está disponible/);
  }));

test("newsletter uses a separate test audience, authorized recipient and double opt-in", async () =>
  isolated(async () => {
    process.env.MAILCHIMP_API_KEY = "fake-test-key";
    process.env.MAILCHIMP_LIST_ID = "original-list";
    process.env.PREVIEW_MAILCHIMP_LIST_ID = "isolated-list";
    process.env.MAILCHIMP_SERVER_PREFIX = "us0";
    for (const env of ["preview", "production"]) {
      process.env.VERCEL_ENV = env;
      let sent;
      globalThis.fetch = async (url, options) => {
        sent = { url, body: JSON.parse(options.body) };
        return { ok: true, status: 200, json: async () => ({}) };
      };
      const response = await load().POST({ json: async () => ({ email: "visitor@example.com" }) });
      assert.equal(response.status, 201);
      assert.ok(sent.url.includes(env === "preview" ? "/isolated-list/" : "/original-list/"));
      assert.equal(
        sent.body.email_address,
        env === "preview" ? "allowed@example.com" : "visitor@example.com"
      );
      assert.equal(sent.body.status, "pending");
    }
    process.env.VERCEL_ENV = "preview";
    process.env.PREVIEW_MAILCHIMP_LIST_ID = "original-list";
    globalThis.fetch = async () => {
      throw new Error("Original list must not be touched");
    };
    assert.equal(
      (await load().POST({ json: async () => ({ email: "visitor@example.com" }) })).status,
      503
    );
  }));
