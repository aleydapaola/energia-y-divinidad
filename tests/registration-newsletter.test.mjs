import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const require = createRequire(import.meta.url);
const copy = loadMembership("lib/registration-newsletter-copy.ts");
const email = "allowed@example.com";
const listId = "1234567890";
const savedFetch = globalThis.fetch;

async function environment(callback) {
  const keys = [
    "VERCEL",
    "VERCEL_ENV",
    "NODE_ENV",
    "AUTH_RATE_LIMIT_SECRET",
    "TURNSTILE_SECRET_KEY",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "REGISTRATION_NEWSLETTER_ENABLED",
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    VERCEL: "1",
    VERCEL_ENV: "preview",
    NODE_ENV: "test",
    AUTH_RATE_LIMIT_SECRET: "test-secret".padEnd(48, "x"),
    TURNSTILE_SECRET_KEY: "synthetic-secret",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "synthetic-sitekey",
    REGISTRATION_NEWSLETTER_ENABLED: "true",
  });
  try {
    await callback();
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

function security() {
  const buckets = new Map();
  const db = {
    async $queryRaw(_sql, key, resetAt, now, _reset, maxCount) {
      let record = buckets.get(key);
      if (!record || record.resetAt <= now) {
        record = { count: 0, resetAt };
      }
      record.count = Math.min(record.count + 1, maxCount);
      buckets.set(key, record);
      return [{ ...record }];
    },
  };
  const service = loadMembership("lib/public-form-security.ts", { "./prisma": { prisma: db } });
  return { ...service, buckets };
}
function request(path = "/api/auth/register", input = {}) {
  const req = new Request("https://preview.energiaydivinidad.com" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: JSON.stringify(input),
  });
  req.nextUrl = new URL(req.url);
  return req;
}

test("Turnstile is checked server-side for matching action and Preview hostname", () =>
  environment(async () => {
    const service = security();
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.deepEqual(JSON.parse(options.body), { secret: "synthetic-secret", response: "token" });
      return Response.json({
        success: true,
        hostname: "preview.energiaydivinidad.com",
        action: "register",
      });
    };
    await service.protectPublicForm(
      request(),
      { turnstileToken: "token", website: "" },
      "register"
    );
    assert.equal(calls, 1);
    assert.ok([...service.buckets.keys()].every((key) => /^[a-f0-9]{64}$/.test(key)));
  }));

test("honeypots and missing, expired, replayed, wrong-action or wrong-host tokens cannot pass", () =>
  environment(async () => {
    const service = security();
    await assert.rejects(service.protectPublicForm(request(), { website: "spam" }, "register"));
    await assert.rejects(service.protectPublicForm(request(), {}, "register"));
    for (const result of [
      { success: false, "error-codes": ["timeout-or-duplicate"] },
      { success: true, hostname: "evil.example", action: "register" },
      { success: true, hostname: "preview.energiaydivinidad.com", action: "resend-verification" },
    ]) {
      globalThis.fetch = async () => Response.json(result);
      await assert.rejects(
        service.protectPublicForm(request(), { turnstileToken: "token" }, "register")
      );
    }
  }));

test("provider outage fails closed and never becomes an allowed challenge", () =>
  environment(async () => {
    globalThis.fetch = async () => {
      throw Error("offline");
    };
    await assert.rejects(
      security().protectPublicForm(request(), { turnstileToken: "token" }, "register"),
      (error) => error.status === 503
    );
  }));

test("Production refuses official dummy Turnstile keys before external calls", () =>
  environment(async () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
    globalThis.fetch = async () => {
      throw Error("Must not call provider");
    };
    await assert.rejects(
      security().protectPublicForm(request(), { turnstileToken: "token" }, "register"),
      (error) => error.status === 503
    );
  }));

test("atomic counters reject excess concurrent calls, return Retry-After, and do not store identities", () =>
  environment(async () => {
    const service = security();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => service.consumeFormLimit("register", email, 5, 900000))
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
    const error = results.find((r) => r.status === "rejected").reason;
    const response = service.publicFormError(error);
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("Retry-After")) > 0);
    assert.ok(!JSON.stringify([...service.buckets]).includes(email));
    assert.equal(
      service.publicFormIP(
        new Request("https://example.com", {
          headers: { "x-forwarded-for": "fake, 192.0.2.1", "x-real-ip": "192.0.2.2" },
        })
      ),
      "unknown"
    );
  }));

test("registration and resends share the per-email mail budget", () =>
  environment(async () => {
    const service = security();
    await service.limitVerificationEmail(email);
    await assert.rejects(service.limitVerificationEmail(email), (error) => error.status === 429);
  }));

function registrationHarness({ failMail = false } = {}) {
  const state = { users: [], tokens: [], mails: [], external: 0 };
  const prisma = {
    user: {
      findUnique: async () => null,
      create: async ({ data }) => {
        const user = { id: "test-user", ...data };
        state.users.push(user);
        return user;
      },
      delete: async () => {
        state.users = [];
      },
    },
    verificationToken: {
      create: async ({ data }) => {
        state.tokens.push(data);
      },
      deleteMany: async () => {
        state.tokens = [];
      },
    },
    async $transaction(callback) {
      return callback(this);
    },
  };
  const deps = {
    "@/lib/prisma": { prisma },
    "@/lib/email": {
      sendVerificationEmail: async (payload) => {
        state.mails.push(payload);
        if (failMail) {
          throw Error("failed");
        }
      },
    },
    "@/lib/public-form-security": {
      protectPublicForm: async () => {},
      limitVerificationEmail: async () => {},
      publicFormError: () => Response.json({}, { status: 503 }),
    },
    "@/lib/registration-newsletter": { registrationNewsletterEnabled: () => true },
    "@/lib/registration-newsletter-copy": copy,
    "@/lib/terms": { getTermsPage: async () => ({ version: "preview" }) },
    bcrypt: { default: { hash: async () => "hash" } },
  };
  return { state, route: loadMembership("app/api/auth/register/route.ts", deps) };
}
const validInput = { name: "Test", email, password: "synthetic-password", acceptedTerms: true };

test("registration stores versioned consent only on explicit true and never calls Mailchimp", () =>
  environment(async () => {
    globalThis.fetch = async () => {
      throw Error("No provider call during registration");
    };
    for (const newsletterOptIn of [undefined, false, true]) {
      const { route, state } = registrationHarness();
      const response = await route.POST(
        request(undefined, {
          ...validInput,
          ...(newsletterOptIn === undefined ? {} : { newsletterOptIn }),
          ...(newsletterOptIn === true ? { newsletterConsentAction: "subscribe" } : {}),
        })
      );
      assert.equal(response.status, 201);
      const consent = state.users[0].registrationNewsletter?.create;
      assert.equal(!!consent, newsletterOptIn === true);
      if (consent) {
        assert.equal(consent.consentText, copy.REGISTRATION_NEWSLETTER_CONSENT_TEXT);
        assert.equal(consent.consentVersion, copy.REGISTRATION_NEWSLETTER_VERSION);
      }
      assert.equal(state.users[0].emailVerified, null);
      assert.equal(state.mails[0].newsletterOptIn, newsletterOptIn === true);
    }
  }));

test("string values cannot consent and required terms remain mandatory", () =>
  environment(async () => {
    for (const extra of [
      { newsletterOptIn: "true" },
      { newsletterOptIn: "false" },
      { acceptedTerms: false },
      { acceptedTerms: "true" },
      { newsletterOptIn: true },
      { newsletterOptIn: true, newsletterConsentAction: "decline" },
      { newsletterOptIn: false, newsletterConsentAction: "subscribe" },
    ]) {
      const { route, state } = registrationHarness();
      assert.equal((await route.POST(request(undefined, { ...validInput, ...extra }))).status, 400);
      assert.equal(state.users.length, 0);
    }
  }));

test("failed verification email removes only the new account and its token", () =>
  environment(async () => {
    const { route, state } = registrationHarness({ failMail: true });
    assert.equal(
      (
        await route.POST(
          request(undefined, {
            ...validInput,
            newsletterOptIn: true,
            newsletterConsentAction: "subscribe",
          })
        )
      ).status,
      502
    );
    assert.equal(state.users.length, 0);
    assert.equal(state.tokens.length, 0);
  }));

function workerHarness({
  status = "missing",
  recordStatus = "READY",
  verified = true,
  previousActivation = false,
  failGift = false,
} = {}) {
  const state = {
    memberStatus: status,
    calls: [],
    gifts: 0,
    failGift,
    record: {
      userId: "test-user",
      consentAt: new Date(),
      consentVersion: copy.REGISTRATION_NEWSLETTER_VERSION,
      source: "registration",
      verifiedAt: verified ? new Date() : null,
      status: recordStatus,
      user: { email, emailVerified: verified ? new Date() : null },
      listId: null,
      activatedAt: previousActivation ? new Date() : null,
      leaseUntil: null,
      attempts: 0,
    },
  };
  const prisma = {
    registrationNewsletter: {
      updateMany: async ({ where, data }) => {
        if (
          !where.status.in.includes(state.record.status) ||
          !state.record.verifiedAt ||
          (state.record.leaseUntil && state.record.leaseUntil > new Date())
        ) {
          return { count: 0 };
        }
        Object.assign(state.record, data, { attempts: state.record.attempts + 1 });
        return { count: 1 };
      },
      findUnique: async () => state.record,
      update: async ({ data }) => {
        Object.assign(state.record, data);
        return state.record;
      },
      findMany: async () => [{ userId: "test-user" }],
    },
  };
  const member = () => ({
    id: createHash("md5").update(email).digest("hex"),
    email_address: email,
    list_id: listId,
    status: state.memberStatus,
    unique_email_id: "0123456789",
  });
  globalThis.fetch = async (url, options) => {
    const method = options.method || "GET";
    state.calls.push({ url, method, body: options.body ? JSON.parse(options.body) : undefined });
    if (method === "GET") {
      return state.memberStatus === "missing"
        ? new Response("", { status: 404 })
        : Response.json(member());
    }
    if (method === "POST" && url.endsWith("/members")) {
      state.memberStatus = "subscribed";
    }
    if (method === "PATCH") {
      state.memberStatus = "subscribed";
    }
    return Response.json(member());
  };
  const service = loadMembership("lib/registration-newsletter.ts", {
    "./prisma": { prisma },
    "./email-delivery": { previewEmailRecipient: () => email },
    "./registration-newsletter-copy": copy,
    "./newsletter-gift-config": {
      newsletterGiftConfiguration: () => ({
        ready: true,
        listId,
        listUrl: `https://us2.api.mailchimp.com/3.0/lists/${listId}`,
        apiKey: "synthetic",
        production: false,
      }),
    },
    "./newsletter-gift": {
      readNewsletterList: async () => ({
        list: { subscribe_url_long: "https://eyd.us2.list-manage.com/subscribe?u=test&id=test" },
      }),
      processRegistrationNewsletterGift: async () => {
        state.gifts++;
        if (state.failGift) {
          throw Error("outage");
        }
        return state.giftOutcome || "sent";
      },
    },
  });
  return { service, state };
}

test("verified opted-in registration subscribes directly and delivers without an extra confirmation", () =>
  environment(async () => {
    const { service, state } = workerHarness();
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "ACTIVE");
    assert.equal(state.gifts, 1);
    assert.ok(state.record.activatedAt);
    assert.equal(
      state.calls.find((c) => c.url.endsWith("/members") && c.method === "POST").body.status,
      "subscribed"
    );
  }));

test("unverified accounts and absent newsletter work cause no provider calls", () =>
  environment(async () => {
    for (const options of [{ verified: false }, { recordStatus: "AWAITING_EMAIL" }]) {
      const { service, state } = workerHarness(options);
      await service.processRegistrationNewsletter("test-user");
      assert.equal(state.calls.length, 0);
      assert.equal(state.gifts, 0);
    }
  }));

test("existing pending contact activates only with fresh registration ownership verification", () =>
  environment(async () => {
    const { service, state } = workerHarness({ status: "pending" });
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "ACTIVE");
    assert.equal(state.calls.filter((c) => c.method === "PATCH").length, 1);
  }));

test("unsubscribed, cleaned, transactional contacts and later pending states are never reactivated", () =>
  environment(async () => {
    for (const status of ["unsubscribed", "cleaned", "transactional", "pending"]) {
      const { service, state } = workerHarness({
        status,
        previousActivation: status === "pending",
      });
      await service.processRegistrationNewsletter("test-user");
      assert.equal(state.record.status, "RESUBSCRIBE_REQUIRED");
      assert.equal(state.gifts, 0);
      assert.deepEqual(
        state.calls.map((c) => c.method),
        ["GET"]
      );
    }
  }));

test("concurrent verification and retry workers acquire a single durable lease", () =>
  environment(async () => {
    const { service, state } = workerHarness();
    await Promise.all(
      Array.from({ length: 5 }, () => service.processRegistrationNewsletter("test-user"))
    );
    assert.equal(state.gifts, 1);
    assert.equal(
      state.calls.filter((c) => c.url.endsWith("/members") && c.method === "POST").length,
      1
    );
  }));

test("gift failure persists retry work; a later unsubscribe prevents redelivery and reactivation", () =>
  environment(async () => {
    const { service, state } = workerHarness({ failGift: true });
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "RETRY");
    assert.ok(state.record.activatedAt);
    state.memberStatus = "unsubscribed";
    state.failGift = false;
    state.calls.length = 0;
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "RESUBSCRIBE_REQUIRED");
    assert.equal(state.gifts, 1);
    assert.deepEqual(
      state.calls.map((c) => c.method),
      ["GET"]
    );
  }));

test("paused registration integration makes no changes", () =>
  environment(async () => {
    process.env.REGISTRATION_NEWSLETTER_ENABLED = "false";
    const { service, state } = workerHarness();
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.calls.length, 0);
    assert.equal(state.record.attempts, 0);
  }));

test("registration checkbox is preselected, optional and accompanied by explicit subscribe and account-only buttons", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { default: Page } = loadMembership("app/auth/signup/page.tsx", {
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/components/auth/TurnstileCheck": { TurnstileCheck: () => null, WebsiteTrap: () => null },
    "@/lib/registration-newsletter-copy": copy,
  });
  const html = renderToStaticMarkup(React.createElement(Page));
  const checkbox = html.match(/<input[^>]+id="newsletterOptIn"[^>]*>/)?.[0];
  assert.ok(checkbox);
  assert.match(checkbox, /\bchecked/);
  assert.ok(!/\brequired/.test(checkbox));
  assert.match(html, /Crear cuenta y suscribirme/);
  assert.match(html, /Crear cuenta sin newsletter/);
  const terms = html.match(/<input[^>]+id="acceptedTerms"[^>]*>/)?.[0];
  assert.ok(terms && !/\bchecked/.test(terms));
  assert.match(html, /meditación del Ángel de la Guarda/);
});

test("one-use account verification atomically enables newsletter work, and replay cannot send again", () =>
  environment(async () => {
    const token = "a".repeat(64);
    let verification = { identifier: email, token, expires: new Date(Date.now() + 60000) };
    const user = { id: "qa", email, name: "Test", emailVerified: null };
    let queued = 0,
      welcomed = 0,
      activated = 0;
    const tx = {
      $executeRaw: async () => {},
      verificationToken: {
        findUnique: async () => verification,
        deleteMany: async () => {
          verification = null;
        },
      },
      user: { findUnique: async () => user, update: async ({ data }) => Object.assign(user, data) },
      registrationNewsletter: {
        updateMany: async ({ where, data }) => {
          assert.equal(where.status, "AWAITING_EMAIL");
          assert.equal(data.status, "READY");
          assert.ok(data.verifiedAt);
          queued++;
          return { count: 1 };
        },
      },
    };
    let tail = Promise.resolve();
    const prisma = {
      $transaction(callback) {
        const run = tail.then(() => callback(tx));
        tail = run.catch(() => {});
        return run;
      },
    };
    const route = loadMembership("app/api/auth/verify-email/route.ts", {
      "@/lib/prisma": { prisma },
      "@/lib/email": {
        sendWelcomeEmail: async () => {
          welcomed++;
        },
      },
      "@/lib/public-form-security": {
        consumeFormLimit: async () => {},
        publicFormIP: () => "qa",
        publicFormError: () => Response.json({}, { status: 503 }),
      },
      "@/lib/registration-newsletter": {
        processRegistrationNewsletter: async () => {
          activated++;
        },
        registrationNewsletterStatus: async () => ({ status: "subscribed" }),
      },
    });
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => route.GET(request(`/api/auth/verify-email?token=${token}`)))
    );
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400, 400]);
    assert.equal(queued, 1);
    assert.equal(welcomed, 1);
    assert.equal(activated, 1);
    assert.ok(user.emailVerified);
  }));

test("newsletter ADMIN diagnostics and processing reject anonymous and non-admin callers before accessing work", () =>
  environment(async () => {
    for (const session of [null, { user: { id: "user" } }]) {
      const route = loadMembership("app/api/admin/newsletter/registrations/route.ts", {
        "@/lib/auth": { auth: async () => session },
        "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ role: "USER" }) } } },
        "@/lib/registration-newsletter": {},
      });
      assert.equal((await route.GET()).status, session ? 403 : 401);
      assert.equal((await route.POST(request())).status, session ? 403 : 401);
    }
  }));

test("a temporarily invisible website tag retries delivery instead of inventing a prior unsubscribe", () =>
  environment(async () => {
    const { service, state } = workerHarness();
    state.giftOutcome = "ignored";
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "RETRY");
    assert.equal(state.memberStatus, "subscribed");
    state.giftOutcome = "sent";
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "ACTIVE");
    assert.equal(
      state.calls.filter((c) => c.url.endsWith("/members") && c.method === "POST").length,
      1
    );
  }));

test("explicit subscribe, account-only button and unchecked checkbox send independent choices", () =>
  environment(async () => {
    const React = require("react");
    function find(node, predicate) {
      if (!node || typeof node !== "object") {
        return null;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = find(child, predicate);
          if (found) {
            return found;
          }
        }
        return null;
      }
      if (predicate(node)) {
        return node;
      }
      return find(node.props?.children, predicate);
    }
    for (const scenario of ["subscribe", "account-only", "unchecked"]) {
      let submitted;
      globalThis.fetch = async (_url, options) => {
        submitted = JSON.parse(options.body);
        return Response.json({ success: true }, { status: 201 });
      };
      const { default: Page } = loadMembership("app/auth/signup/page.tsx", {
        react: {
          ...React,
          useState(initial) {
            if (initial && typeof initial === "object" && "acceptedTerms" in initial) {
              return [
                {
                  ...validInput,
                  confirmPassword: validInput.password,
                  newsletterOptIn: scenario !== "unchecked",
                },
                () => {},
              ];
            }
            return [initial, () => {}];
          },
        },
        "next/navigation": { useRouter: () => ({ push() {} }) },
        "@/components/auth/TurnstileCheck": { TurnstileCheck: () => null, WebsiteTrap: () => null },
        "@/lib/registration-newsletter-copy": copy,
      });
      const tree = Page();
      const event = { preventDefault() {} };
      if (scenario === "account-only") {
        const button = find(
          tree,
          (node) => node.type === "button" && node.props.children === "Crear cuenta sin newsletter"
        );
        assert.ok(button);
        await button.props.onClick(event);
      } else {
        await find(tree, (node) => node.type === "form").props.onSubmit(event);
      }
      assert.equal(submitted.newsletterOptIn, scenario === "subscribe");
      assert.equal(
        submitted.newsletterConsentAction,
        scenario === "subscribe" ? "subscribe" : "decline"
      );
    }
  }));

test("existing v1 consent remains processable after switching to explicit-submit v2", () =>
  environment(async () => {
    const { service, state } = workerHarness();
    state.record.consentVersion = "registration-newsletter-2026-11-03-v1";
    await service.processRegistrationNewsletter("test-user");
    assert.equal(state.record.status, "ACTIVE");
    assert.equal(state.gifts, 1);
  }));
