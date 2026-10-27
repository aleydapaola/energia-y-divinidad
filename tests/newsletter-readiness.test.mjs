import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
        sent = { url, body: JSON.parse(options.body), headers: options.headers };
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
      assert.equal(
        sent.headers.Authorization,
        `Basic ${Buffer.from("eyd:fake-test-key").toString("base64")}`
      );
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

test("newsletter rejects malformed email values before calling Mailchimp", async () =>
  isolated(async () => {
    globalThis.fetch = async () => {
      throw new Error("Must not send");
    };
    for (const email of [null, 42, {}, [], "bad@", "", "has spaces@example.com"]) {
      assert.equal((await load().POST({ json: async () => ({ email }) })).status, 400);
    }
  }));

function configurePreview() {
  process.env.VERCEL_ENV = "preview";
  process.env.MAILCHIMP_API_KEY = "fake-test-key";
  process.env.MAILCHIMP_LIST_ID = "original-list";
  process.env.PREVIEW_MAILCHIMP_LIST_ID = "isolated-list";
  process.env.MAILCHIMP_SERVER_PREFIX = "us2";
}

test("an existing pending or unsubscribed contact is never described as subscribed or silently reactivated", async () =>
  isolated(async () => {
    configurePreview();
    for (const status of ["subscribed", "pending", "unsubscribed", "cleaned", "transactional"]) {
      const calls = [];
      globalThis.fetch = async (url, options) => {
        calls.push({ url, method: options.method || "GET" });
        if (options.method === "POST") {
          return { ok: false, status: 400, json: async () => ({ title: "Member Exists" }) };
        }
        if (url.includes("fields=status")) {
          const expectedHash = createHash("md5").update("allowed@example.com").digest("hex");
          assert.ok(url.includes(expectedHash));
          assert.ok(!url.includes("visitor@example.com"));
          return { ok: true, json: async () => ({ status }) };
        }
        return {
          ok: true,
          json: async () => ({
            subscribe_url_long: "https://eyd.us2.list-manage.com/subscribe?u=test&id=isolated",
          }),
        };
      };
      const response = await load().POST({ json: async () => ({ email: "visitor@example.com" }) });
      const data = await response.json();
      assert.equal(response.status, ["subscribed", "pending"].includes(status) ? 200 : 409);
      if (status === "subscribed") {
        assert.match(data.message, /Ya estás/);
      } else if (status === "pending") {
        assert.match(data.message, /pendiente/);
      } else {
        assert.match(data.error, /volver a suscribirte/);
        assert.equal(
          data.signupUrl,
          "https://eyd.us2.list-manage.com/subscribe?u=test&id=isolated"
        );
        assert.equal(data.message, undefined);
      }
      assert.deepEqual(
        calls.map((call) => call.method),
        ["subscribed", "pending"].includes(status) ? ["POST", "GET"] : ["POST", "GET", "GET"]
      );
    }
  }));

test("the re-subscription link is restricted to HTTPS Mailchimp signup hosts", async () =>
  isolated(async () => {
    configurePreview();
    for (const signup of [
      "javascript:alert(1)",
      "http://test.list-manage.com/subscribe",
      "https://test.list-manage.com.evil.example/subscribe",
      "https://user:pass@test.list-manage.com/subscribe",
      "not a URL",
    ]) {
      globalThis.fetch = async (url, options) => {
        if (options.method === "POST") {
          return { ok: false, status: 400, json: async () => ({ title: "Member Exists" }) };
        }
        return {
          ok: true,
          json: async () =>
            url.includes("fields=status")
              ? { status: "unsubscribed" }
              : { subscribe_url_long: signup },
        };
      };
      const response = await load().POST({ json: async () => ({ email: "visitor@example.com" }) });
      assert.equal(response.status, 409);
      assert.equal((await response.json()).signupUrl, undefined);
    }
  }));

test("a failed existing-member lookup cannot produce a successful subscription message", async () =>
  isolated(async () => {
    configurePreview();
    globalThis.fetch = async (_url, options) =>
      options.method === "POST"
        ? { ok: false, status: 400, json: async () => ({ title: "Member Exists" }) }
        : { ok: false, status: 503 };
    const response = await load().POST({ json: async () => ({ email: "visitor@example.com" }) });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).message, undefined);
  }));

test("all newsletter form variants expose the re-confirmation link and existing subscribers are not promised a new email", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  function render(status, message, signupUrl, variant) {
    let i = 0;
    const values = ["", status, message, signupUrl];
    const filename = new URL("../components/newsletter/NewsletterForm.tsx", import.meta.url)
      .pathname;
    const mod = new Module(filename);
    mod.require = (name) =>
      name === "react"
        ? { ...React, useState: () => [values[i++], () => {}], useEffect() {} }
        : require(name);
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
    return renderToStaticMarkup(mod.exports.NewsletterForm({ variant }));
  }
  for (const variant of ["footer", "inline", "card"]) {
    const html = render(
      "error",
      "Completa tu inscripción",
      "https://eyd.us2.list-manage.com/subscribe?u=test",
      variant
    );
    assert.match(html, /Volver a suscribirme/);
    assert.match(html, /href="https:\/\/eyd.us2.list-manage.com\/subscribe\?u=test"/);
    assert.match(html, /role="alert"/);
  }
  const html = render("success", "Ya estás en nuestra lista", null, "footer");
  assert.match(html, /Ya estás en nuestra lista/);
  assert.doesNotMatch(html, /email que te hemos enviado/);
});
