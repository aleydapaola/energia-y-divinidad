import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import path from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../", import.meta.url).pathname;
function loadPure(relative) {
  const filename = path.resolve(root, relative);
  const mod = new Module(filename);
  mod.require = (name) =>
    name.startsWith(".")
      ? loadPure(
          path.relative(
            root,
            path.resolve(path.dirname(filename), name.endsWith(".ts") ? name : name + ".ts")
          )
        )
      : require(name);
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return mod.exports;
}
const {
  newsletterGiftConfiguration,
  parseNewsletterSignature,
  validNewsletterCallback,
  validNewsletterGiftUrl,
  verifyNewsletterSignature,
} = loadPure("lib/newsletter-gift-config.ts");
const { EYD_EMAIL_LOGO, renderNewsletterGiftEmail } = loadPure("lib/newsletter-gift-email.ts");
const secret = "synthetic-signing-secret-".padEnd(48, "x");
const listId = "1234567890";
const originalListId = "abcdef0123";
const recipient = "allowed@example.com";
const owner = "a".repeat(25);
const giftUrl = `https://mcusercontent.com/${owner}/files/11111111-2222-3333-4444-555555555555/meditacion.m4a`;
const callback =
  "https://preview.energiaydivinidad.com/api/webhooks/newsletter?x-vercel-protection-bypass=synthetic";
const keys = [
  "VERCEL_ENV",
  "MAILCHIMP_API_KEY",
  "MAILCHIMP_LIST_ID",
  "PREVIEW_MAILCHIMP_LIST_ID",
  "MAILCHIMP_SERVER_PREFIX",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_DELIVERY_MODE",
  "NEWSLETTER_GIFT_ENABLED",
  "PREVIEW_NEWSLETTER_GIFT_ENABLED",
  "NEWSLETTER_GIFT_URL",
  "PREVIEW_NEWSLETTER_GIFT_URL",
  "NEWSLETTER_WEBHOOK_SIGNING_SECRET",
  "PREVIEW_NEWSLETTER_WEBHOOK_SIGNING_SECRET",
  "PREVIEW_NEWSLETTER_CALLBACK_URL",
  "REGISTRATION_NEWSLETTER_ENABLED",
  "AUTH_RATE_LIMIT_SECRET",
];

async function isolated(callbackFn) {
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const savedFetch = globalThis.fetch;
  for (const key of keys) {
    delete process.env[key];
  }
  Object.assign(process.env, {
    VERCEL_ENV: "preview",
    MAILCHIMP_API_KEY: "synthetic-us2",
    MAILCHIMP_LIST_ID: originalListId,
    PREVIEW_MAILCHIMP_LIST_ID: listId,
    MAILCHIMP_SERVER_PREFIX: "us2",
    RESEND_API_KEY: "synthetic",
    PREVIEW_NEWSLETTER_GIFT_ENABLED: "true",
    PREVIEW_NEWSLETTER_GIFT_URL: giftUrl,
    PREVIEW_NEWSLETTER_WEBHOOK_SIGNING_SECRET: secret,
    PREVIEW_NEWSLETTER_CALLBACK_URL: callback,
    AUTH_RATE_LIMIT_SECRET: "synthetic-capture-secret".padEnd(48, "x"),
  });
  try {
    return await callbackFn();
  } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function body(overrides = {}) {
  return new URLSearchParams({
    type: "subscribe",
    "data[list_id]": listId,
    "data[email]": recipient,
    "data[id]": "0123456789",
    ...overrides,
  }).toString();
}
function signature(raw, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex")}`;
}
function request(raw = body(), headers = {}) {
  return new Request("https://preview.energiaydivinidad.com/api/webhooks/newsletter", {
    method: "POST",
    body: raw,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Mailchimp-Signature": signature(raw),
      ...headers,
    },
  });
}

function setup({ crossFlow = false } = {}) {
  const state = {
    logs: new Map(),
    sent: [],
    lookups: [],
    memberStatus: "subscribed",
    memberId: "0123456789",
    tags: [{ name: "website" }],
    opt: new Date(Date.now() - 60000).toISOString(),
    listName: "PRUEBAS — NO REAL — Energía y Divinidad",
    from: "preview-newsletter@energiaydivinidad.com",
    providerFails: 0,
    lookupFails: false,
    role: "ADMIN",
    session: { user: { id: "qa-admin" } },
    hookOverride: {},
    transactionCount: 0,
    memberExists: true,
    memberCreates: 0,
    memberWrites: [],
    captures: new Map(),
  };
  const emailLog = {
    async upsert({ where, create }) {
      if (!state.logs.has(where.id)) {
        state.logs.set(where.id, { ...create, createdAt: new Date() });
      }
      return state.logs.get(where.id);
    },
    async findUnique({ where }) {
      return state.logs.get(where.id) || null;
    },
    async update({ where, data }) {
      Object.assign(state.logs.get(where.id), data);
      return state.logs.get(where.id);
    },
  };
  let tail = Promise.resolve();
  const prisma = {
    newsletterCapture: {
      async upsert({ where, create }) {
        if (!state.captures.has(where.id)) {
          state.captures.set(where.id, { ...create, confirmedAt: null });
        }
        return state.captures.get(where.id);
      },
      async updateMany({ where, data }) {
        const capture = state.captures.get(where.id);
        if (!capture || capture.confirmedAt || (where.status && capture.status !== where.status)) {
          return { count: 0 };
        }
        Object.assign(capture, data);
        return { count: 1 };
      },
    },
    registrationNewsletter: {
      findUnique: async () => state.registration || null,
      async updateMany({ where }) {
        const record = state.registration;
        if (
          !record ||
          !where.status.in.includes(record.status) ||
          !record.verifiedAt ||
          record.leaseUntil > new Date()
        ) {
          return { count: 0 };
        }
        record.leaseUntil = new Date(Date.now() + 120_000);
        return { count: 1 };
      },
      async update({ data }) {
        Object.assign(state.registration, data);
        return state.registration;
      },
    },
    emailLog,
    user: {
      async findUnique() {
        return { role: state.role };
      },
    },
    async $transaction(fn) {
      const run = tail.then(async () => {
        state.transactionCount++;
        return fn({ emailLog, async $executeRaw() {} });
      });
      tail = run.catch(() => {});
      return run;
    },
  };
  const modules = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (modules.has(filename)) {
      return modules.get(filename).exports;
    }
    const mod = new Module(filename);
    modules.set(filename, mod);
    mod.require = (name) => {
      if (name === "./prisma" || name === "@/lib/prisma") {
        return { prisma };
      }
      if (name === "@/lib/auth") {
        return { auth: async () => state.session };
      }
      if (name === "./email-delivery" || name === "@/lib/email-delivery") {
        return {
          previewEmailRecipient: () => recipient,
          deliverEmail: async (payload, options) => {
            state.sent.push({ payload, options });
            await new Promise((resolve) => setTimeout(resolve, 3));
            if (state.providerFails-- > 0) {
              throw Error("uncertain response");
            }
            return { data: { id: "synthetic-resend-id" }, error: null };
          },
        };
      }
      if (crossFlow && name === "@/lib/public-form-security") {
        return {
          consumeFormLimit: async () => {},
          publicFormIP: () => "192.0.2.1",
          PublicFormError: class extends Error {},
        };
      }
      if (name.startsWith("@/")) {
        return load(name.slice(2) + ".ts");
      }
      if (name.startsWith("./") || name.startsWith("../")) {
        return load(
          path.relative(
            root,
            path.resolve(path.dirname(filename), name.endsWith(".ts") ? name : name + ".ts")
          )
        );
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
  globalThis.fetch = async (url, options) => {
    state.lookups.push(String(url));
    const method = options.method || "GET";
    if (!crossFlow) {
      assert.equal(method, "GET", "never change a Mailchimp contact");
    } else if (method !== "GET") {
      const data = JSON.parse(options.body);
      state.memberWrites.push({ method, url: String(url), data });
      if (String(url).endsWith("/members") && method === "POST") {
        assert.equal(data.email_address, recipient);
        if (state.memberExists) {
          return Response.json({ title: "Member Exists" }, { status: 400 });
        }
        state.memberExists = true;
        state.memberCreates++;
        state.memberStatus = data.status;
        state.tags = data.tags.map((name) => ({ name }));
      } else if (String(url).endsWith("/tags") && method === "POST") {
        for (const tag of data.tags) {
          if (!state.tags.some((existing) => existing.name === tag.name)) {
            state.tags.push({ name: tag.name });
          }
        }
      } else if (String(url).includes("/members/") && method === "PATCH") {
        state.memberStatus = data.status;
      } else {
        assert.fail(`Unexpected provider write: ${method} ${url}`);
      }
      return Response.json({}, { status: 200 });
    }
    if (state.lookupFails) {
      return { ok: false, status: 503 };
    }
    if (String(url).endsWith("/webhooks")) {
      return {
        ok: true,
        json: async () => ({
          webhooks: [
            {
              list_id: listId,
              url: callback,
              signing_enabled: true,
              events: { subscribe: true, unsubscribe: false, profile: false },
              sources: { user: true, admin: false, api: false },
              ...state.hookOverride,
            },
          ],
        }),
      };
    }
    if (String(url).includes("/members/")) {
      if (!state.memberExists) {
        return new Response(null, { status: 404 });
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: createHash("md5").update(recipient).digest("hex"),
          list_id: listId,
          email_address: recipient,
          unique_email_id: state.memberId,
          status: state.memberStatus,
          tags: state.tags,
          timestamp_opt: state.opt,
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        id: listId,
        name: state.listName,
        subscribe_url_long: `https://eyd.us2.list-manage.com/subscribe?u=${owner}&id=${listId}`,
        campaign_defaults: { from_email: state.from },
        contact: {
          company: "EYD <script>",
          address1: "Calle ficticia 1",
          city: "Ciudad de pruebas",
          country: "CO",
        },
      }),
    };
  };
  return {
    state,
    route: load("app/api/webhooks/newsletter/route.ts"),
    health: load("app/api/admin/newsletter/health/route.ts"),
    service: load("lib/newsletter-gift.ts"),
    ...(crossFlow
      ? {
          newsletter: load("app/api/newsletter/route.ts"),
          registration: load("lib/registration-newsletter.ts"),
        }
      : {}),
  };
}

test("gift configuration is isolated, explicitly enabled and does not inherit live URLs or signing secrets", () =>
  isolated(async () => {
    assert.equal(newsletterGiftConfiguration().ready, true);
    for (const key of [
      "PREVIEW_NEWSLETTER_GIFT_ENABLED",
      "PREVIEW_NEWSLETTER_GIFT_URL",
      "PREVIEW_NEWSLETTER_WEBHOOK_SIGNING_SECRET",
    ]) {
      const previous = process.env[key];
      delete process.env[key];
      Object.assign(process.env, {
        NEWSLETTER_GIFT_ENABLED: "true",
        NEWSLETTER_GIFT_URL: giftUrl,
        NEWSLETTER_WEBHOOK_SIGNING_SECRET: secret,
      });
      assert.equal(newsletterGiftConfiguration().ready, false);
      process.env[key] = previous;
    }
    process.env.PREVIEW_MAILCHIMP_LIST_ID = originalListId;
    assert.equal(newsletterGiftConfiguration().ready, false);
    process.env.VERCEL_ENV = "production";
    delete process.env.NEWSLETTER_GIFT_ENABLED;
    assert.equal(newsletterGiftConfiguration().ready, false);
  }));

test("gift and callback URLs reject credentials, foreign hosts, insecure URLs and arbitrary query parameters", () => {
  assert.equal(validNewsletterGiftUrl(giftUrl), giftUrl);
  for (const bad of [
    giftUrl.replace("https:", "http:"),
    giftUrl.replace("mcusercontent.com", "mcusercontent.com.evil.example"),
    giftUrl.replace("https://", "https://user:pass@"),
    giftUrl + "?token=x",
    "javascript:alert(1)",
  ]) {
    assert.equal(validNewsletterGiftUrl(bad), null);
  }
  assert.equal(validNewsletterCallback(callback, false), true);
  assert.equal(validNewsletterCallback(callback, true), false);
  assert.equal(
    validNewsletterCallback("https://www.energiaydivinidad.com/api/webhooks/newsletter", true),
    true
  );
  assert.equal(validNewsletterCallback(callback + "&another=x", false), false);
});

test("Mailchimp signatures bind raw bytes and a fresh timestamp, rejecting alteration, replay and malformed headers", () => {
  const raw = Buffer.from(body({ "data[email]": "a+b@example.com" }));
  const sig = signature(raw);
  assert.equal(verifyNewsletterSignature(raw, sig, secret), true);
  assert.equal(
    verifyNewsletterSignature(Buffer.from(decodeURIComponent(raw.toString())), sig, secret),
    false
  );
  for (const header of [
    null,
    "",
    sig + ",v1=" + "a".repeat(64),
    "t=1,v1=" + "a".repeat(64),
    signature(raw, Math.floor(Date.now() / 1000) - 301),
    signature(raw, Math.floor(Date.now() / 1000) + 301),
  ]) {
    assert.equal(verifyNewsletterSignature(raw, header, secret), false);
  }
  assert.equal(parseNewsletterSignature("t=1234567890,v1=x"), null);
});

test("unconfigured or unauthenticated webhook attempts never call Mailchimp or the mailer", () =>
  isolated(async () => {
    const { state, route } = setup();
    delete process.env.PREVIEW_NEWSLETTER_GIFT_ENABLED;
    assert.equal((await route.POST(request())).status, 503);
    process.env.PREVIEW_NEWSLETTER_GIFT_ENABLED = "true";
    assert.equal(
      (await route.POST(request(body(), { "X-Mailchimp-Signature": "wrong" }))).status,
      401
    );
    assert.equal(
      (
        await route.POST(
          request(body(), { "X-Mailchimp-Signature": signature(body() + "changed") })
        )
      ).status,
      401
    );
    assert.equal(
      (await route.POST(request(body(), { "Content-Type": "application/json" }))).status,
      415
    );
    assert.equal(state.lookups.length, 0);
    assert.equal(state.sent.length, 0);
    assert.equal(state.logs.size, 0);
  }));

test("oversized, ambiguous and irrelevant events have no delivery effects", () =>
  isolated(async () => {
    const { state, route } = setup();
    assert.equal((await route.POST(request("x=" + "a".repeat(65536)))).status, 413);
    assert.equal(
      (await route.POST(request(body() + "&data%5Bemail%5D=other%40example.com"))).status,
      400
    );
    assert.equal((await route.POST(request(body({ type: "unsubscribe" })))).status, 200);
    assert.equal(
      (await route.POST(request(body({ "data[list_id]": originalListId })))).status,
      200
    );
    assert.equal(
      (await route.POST(request(body({ "data[email]": "outside@example.com" })))).status,
      200
    );
    assert.equal(state.lookups.length, 0);
    assert.equal(state.sent.length, 0);
    assert.equal(state.logs.size, 0);
  }));

test("only a currently confirmed website subscriber with the provider's matching identity receives the gift", () =>
  isolated(async () => {
    for (const change of [
      { memberStatus: "pending" },
      { memberStatus: "unsubscribed" },
      { memberStatus: "cleaned" },
      { tags: [] },
      { opt: null },
      { opt: "not a date" },
      { memberId: "9999999999" },
      { listName: "Other business" },
      { from: "other@example.com" },
    ]) {
      const { state, route } = setup();
      Object.assign(state, change);
      const response = await route.POST(request());
      assert.ok([200, 503].includes(response.status));
      assert.equal(state.sent.length, 0);
      assert.equal(state.logs.size, 0);
    }
  }));

test("concurrent confirmed events produce one durable message, one delivery and the existing EYD logo and format", () =>
  isolated(async () => {
    const { state, route } = setup();
    const result = await Promise.all([route.POST(request()), route.POST(request())]);
    assert.deepEqual(
      result.map((r) => r.status),
      [200, 200]
    );
    assert.equal(state.sent.length, 1);
    assert.equal(state.logs.size, 1);
    const log = [...state.logs.values()][0];
    assert.equal(log.status, "SENT");
    assert.equal(log.providerMessageId, "synthetic-resend-id");
    const { payload, options } = state.sent[0];
    assert.equal(payload.to, recipient);
    assert.equal(options.idempotencyKey, log.id);
    assert.ok(payload.html.includes(EYD_EMAIL_LOGO));
    assert.match(payload.html, /width="200"/);
    assert.match(payload.html, /max-width:600px/);
    assert.match(payload.html, /#f8f0f5/);
    assert.match(payload.html, /#8A4BAF/);
    assert.match(payload.html, /Segoe UI/);
    assert.ok(
      payload.html.includes(
        "https://preview.energiaydivinidad.com/regalo/meditacion-angel-de-la-guarda"
      )
    );
    assert.ok(
      payload.text.includes(
        "https://preview.energiaydivinidad.com/regalo/meditacion-angel-de-la-guarda"
      )
    );
    assert.equal(payload.html.includes(giftUrl), false);
    assert.match(payload.html, /EYD &lt;script&gt;/);
    assert.doesNotMatch(payload.html, /<script>/);
    assert.doesNotMatch(payload.html, /\*\|UNSUB\|\*|\{\{EYD/);
    assert.equal(payload.attachments, undefined);
    assert.match(payload.headers["List-Unsubscribe"], /list-manage.com\/unsubscribe/);
    state.memberStatus = "unsubscribed";
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(state.sent.length, 1);
  }));

test("an uncertain provider response is retried with the same key and exact immutable payload", () =>
  isolated(async () => {
    const { state, route } = setup();
    state.providerFails = 1;
    assert.equal((await route.POST(request())).status, 503);
    assert.equal([...state.logs.values()][0].status, "FAILED");
    process.env.EMAIL_FROM = "Changed <changed@energiaydivinidad.com>";
    assert.equal((await route.POST(request())).status, 200);
    assert.deepEqual(state.sent[0], state.sent[1]);
    assert.equal([...state.logs.values()][0].status, "SENT");
  }));

test("an uncertain send outside the provider deduplication window is retained for review and never automatically repeated", () =>
  isolated(async () => {
    const { state, route } = setup();
    state.providerFails = 1;
    await route.POST(request());
    const log = [...state.logs.values()][0];
    log.createdAt = new Date(Date.now() - 23 * 60 * 60 * 1000 - 1000);
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(log.status, "REVIEW_REQUIRED");
    assert.equal(state.sent.length, 1);
  }));

test("temporary Mailchimp failures cannot queue a gift or turn a pending subscription into a confirmation", () =>
  isolated(async () => {
    const { state, route } = setup();
    state.lookupFails = true;
    assert.equal((await route.POST(request())).status, 503);
    assert.equal(state.logs.size, 0);
    assert.equal(state.sent.length, 0);
  }));

test("readiness is ADMIN-only and verifies signed subscribe-only hooks without leaking URLs, credentials or addresses", () =>
  isolated(async () => {
    const { state, health } = setup();
    state.session = null;
    assert.equal((await health.GET()).status, 401);
    state.session = { user: { id: "qa" } };
    state.role = "USER";
    assert.equal((await health.GET()).status, 403);
    assert.equal(state.lookups.length, 0);
    state.role = "ADMIN";
    const ready = await health.GET();
    assert.equal(ready.status, 200);
    const result = await ready.json();
    assert.equal(result.ready, true);
    const serialized = JSON.stringify(result);
    for (const value of [secret, callback, giftUrl, "Calle ficticia", "synthetic-us2"]) {
      assert.equal(serialized.includes(value), false);
    }
    for (const change of [
      { signing_enabled: false },
      { sources: { user: true, admin: true, api: false } },
      { events: { subscribe: true, unsubscribe: true } },
      { list_id: originalListId },
    ]) {
      state.hookOverride = change;
      assert.equal((await health.GET()).status, 503);
    }
    assert.equal(state.sent.length, 0);
    assert.equal(state.logs.size, 0);
  }));

test("renderer uses real unsubscribe links, escaped footer content and a plain-text alternative", () => {
  const output = renderNewsletterGiftEmail({
    unsubscribeUrl: "https://eyd.us2.list-manage.com/unsubscribe?u=test&id=test",
    postalAddress: 'Test <address> & "company"',
    appUrl: "https://preview.energiaydivinidad.com",
    preview: true,
    year: 2026,
  });
  assert.match(output.html, /Test &lt;address&gt; &amp; &quot;company&quot;/);
  assert.match(output.html, /\[PREVIEW\]/);
  assert.match(output.text, /Darme de baja:/);
});

test("registration gift requires stored consent and verified ownership without weakening Mailchimp webhook checks", () =>
  isolated(async () => {
    const { state, service } = setup();
    state.opt = null;
    const event = { email: recipient, listId, memberId: state.memberId };
    await assert.rejects(service.processRegistrationNewsletterGift("qa", event));
    assert.equal(state.sent.length, 0);
    state.registration = {
      source: "registration",
      consentVersion: loadPure("lib/registration-newsletter-copy.ts")
        .REGISTRATION_NEWSLETTER_VERSION,
      verifiedAt: new Date(),
      activatedAt: new Date(),
      listId,
      user: { email: recipient, emailVerified: new Date() },
    };
    assert.equal(await service.processNewsletterGift(event), "ignored");
    assert.equal(await service.processRegistrationNewsletterGift("qa", event), "sent");
    assert.equal(state.sent.length, 1);
    state.registration.user.emailVerified = null;
    await assert.rejects(service.processRegistrationNewsletterGift("qa", event));
    assert.equal(state.sent.length, 1);
  }));

test("newsletter gift cannot render without a real Mailchimp unsubscribe link", () => {
  for (const unsubscribeUrl of [
    "",
    "https://example.com/unsubscribe?u=test&id=test",
    "https://eyd.us2.list-manage.com/subscribe?u=test&id=test",
    "http://eyd.us2.list-manage.com/unsubscribe?u=test&id=test",
    "https://eyd.us2.list-manage.com/unsubscribe?u=test",
  ]) {
    assert.throws(() =>
      renderNewsletterGiftEmail({
        unsubscribeUrl,
        postalAddress: "Test",
        appUrl: "https://preview.energiaydivinidad.com",
        preview: true,
        year: 2026,
      })
    );
  }
});

function crossFlowSetup() {
  // Exercise Production's email normalization, without Preview's recipient substitution.
  // All provider calls, database operations and deliveries remain simulated by setup.
  Object.assign(process.env, {
    VERCEL_ENV: "production",
    MAILCHIMP_LIST_ID: listId,
    NEWSLETTER_GIFT_ENABLED: "true",
    NEWSLETTER_GIFT_URL: giftUrl,
    NEWSLETTER_WEBHOOK_SIGNING_SECRET: secret,
    REGISTRATION_NEWSLETTER_ENABLED: "true",
  });
  const harness = setup({ crossFlow: true });
  harness.state.listName = "Energía y Divinidad";
  harness.state.memberExists = false;
  harness.state.registration = {
    userId: "qa",
    source: "registration",
    consentVersion: loadPure("lib/registration-newsletter-copy.ts").REGISTRATION_NEWSLETTER_VERSION,
    verifiedAt: new Date(),
    activatedAt: null,
    status: "READY",
    listId: null,
    leaseUntil: null,
    user: { email: recipient, emailVerified: new Date() },
  };
  return harness;
}

function newsletterRequest() {
  // Whitespace and casing must still identify the same address as the account.
  return new Request("https://www.energiaydivinidad.com/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `  ${recipient.toUpperCase()}  `,
      source: "landing",
      variant: "control",
      device: "mobile",
      acceptedNewsletter: true,
      consentVersion: "meditation-capture-v1",
    }),
  });
}

function assertSingleSubscriberAndGift(state) {
  assert.equal(state.memberCreates, 1);
  assert.equal(state.memberStatus, "subscribed");
  assert.equal(state.registration.status, "ACTIVE");
  assert.equal(state.logs.size, 1);
  assert.equal(state.sent.length, 1);
  assert.equal([...state.logs.values()][0].status, "SENT");
}

test("newsletter first, then verified account reuses the subscriber and never sends a second gift", () =>
  isolated(async () => {
    const { state, newsletter, route, registration } = crossFlowSetup();
    assert.equal((await newsletter.POST(newsletterRequest())).status, 201);
    assert.equal(state.memberStatus, "pending");
    state.memberStatus = "subscribed"; // The subscriber confirms Mailchimp's email.
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(state.sent.length, 1);
    const writesBeforeAccount = state.memberWrites.length;
    await registration.processRegistrationNewsletter("qa");
    assertSingleSubscriberAndGift(state);
    assert.ok(
      state.memberWrites.slice(writesBeforeAccount).every((write) => write.url.endsWith("/tags")),
      "An existing subscriber only gains the account source tag"
    );
  }));

test("verified account first, then newsletter form and duplicate webhook keep one subscriber and gift", () =>
  isolated(async () => {
    const { state, newsletter, route, registration } = crossFlowSetup();
    await registration.processRegistrationNewsletter("qa");
    assertSingleSubscriberAndGift(state);
    const response = await newsletter.POST(newsletterRequest());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).message, "Ya estás en nuestra lista");
    assert.equal(
      (await route.POST(request(body({ "data[email]": recipient.toUpperCase() })))).status,
      200
    );
    assertSingleSubscriberAndGift(state);
    assert.equal(
      state.memberWrites.filter((write) => write.data.status === "pending").length,
      1,
      "The rejected duplicate create never changes the subscribed contact to pending"
    );
  }));

test("pending newsletter followed by verified account activates the same contact and delivers once", () =>
  isolated(async () => {
    const { state, newsletter, route, registration } = crossFlowSetup();
    assert.equal((await newsletter.POST(newsletterRequest())).status, 201);
    assert.equal(state.sent.length, 0);
    await registration.processRegistrationNewsletter("qa");
    assertSingleSubscriberAndGift(state);
    assert.equal(state.memberWrites.filter((write) => write.method === "PATCH").length, 1);
    assert.equal((await route.POST(request())).status, 200);
    assertSingleSubscriberAndGift(state);
  }));

test("simultaneous newsletter and account activation, followed by concurrent callbacks, deliver only once", () =>
  isolated(async () => {
    const { state, newsletter, route, registration } = crossFlowSetup();
    const [response] = await Promise.all([
      newsletter.POST(newsletterRequest()),
      registration.processRegistrationNewsletter("qa"),
    ]);
    assert.ok([200, 201].includes(response.status));
    await Promise.all([route.POST(request()), route.POST(request())]);
    assertSingleSubscriberAndGift(state);
  }));

test("newsletter unsubscribe survives later account activation and another newsletter request", () =>
  isolated(async () => {
    const { state, newsletter, route, registration } = crossFlowSetup();
    await newsletter.POST(newsletterRequest());
    state.memberStatus = "subscribed";
    await route.POST(request());
    state.memberStatus = "unsubscribed";
    const before = state.memberWrites.length;
    await registration.processRegistrationNewsletter("qa");
    assert.equal(state.registration.status, "RESUBSCRIBE_REQUIRED");
    assert.equal(state.memberWrites.length, before, "Account activation cannot resubscribe");
    assert.equal((await newsletter.POST(newsletterRequest())).status, 409);
    await route.POST(request());
    assert.equal(state.memberStatus, "unsubscribed");
    assert.equal(state.memberCreates, 1);
    assert.equal(state.logs.size, 1);
    assert.equal(state.sent.length, 1);
    assert.ok(
      state.registration.user.emailVerified,
      "The account remains verified after unsubscribe"
    );
  }));
