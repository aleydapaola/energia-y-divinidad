import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const rules = loadMembership("lib/newsletter-capture-rules.ts");
const require = createRequire(import.meta.url);
const context = { source: "home", variant: "invitation", device: "mobile" };

test("invitation waits for both engagement conditions and excludes critical journeys", () => {
  const eligible = {
    path: "/",
    variant: "invitation",
    elapsed: 15000,
    progress: 0.35,
    dismissedUntil: 0,
    requestedUntil: 0,
    now: 100000,
    authenticated: false,
    busy: false,
  };
  assert.equal(rules.invitationEligible(eligible), true);
  for (const change of [
    { elapsed: 14999 },
    { progress: 0.34 },
    { variant: "control" },
    { variant: "none" },
    { dismissedUntil: 100001 },
    { requestedUntil: 100001 },
    { authenticated: true },
    { busy: true },
    ...[
      "/auth/signup",
      "/auth/signin",
      "/checkout",
      "/sesiones",
      "/mi-cuenta",
      "/admin",
      "/pago/exitoso",
      "/meditacion-gratis",
      "/regalo/meditacion-angel-de-la-guarda",
      "/eventos/test/checkout",
    ].map((path) => ({ path })),
  ]) {
    assert.equal(
      rules.invitationEligible({ ...eligible, ...change }),
      false,
      JSON.stringify(change)
    );
  }
});

function database() {
  const captures = new Map(),
    metrics = new Map();
  const prisma = {
    newsletterCapture: {
      async upsert({ where, create }) {
        if (!captures.has(where.id)) {
          captures.set(where.id, { ...create, confirmedAt: null });
        }
        return captures.get(where.id);
      },
      async updateMany({ where, data }) {
        const row = captures.get(where.id);
        if (!row || row.confirmedAt || (where.status && where.status !== row.status)) {
          return { count: 0 };
        }
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    newsletterMetric: {
      async upsert({ where, create }) {
        const row = metrics.get(where.id);
        if (row) {
          row.count++;
        } else {
          metrics.set(where.id, { ...create });
        }
      },
    },
  };
  const security = loadMembership("lib/public-form-security.ts", { "./prisma": { prisma } });
  const service = loadMembership("lib/newsletter-capture.ts", {
    "./prisma": { prisma },
    "./public-form-security": security,
  });
  return { captures, metrics, service };
}

async function secret(callback) {
  const saved = process.env.AUTH_RATE_LIMIT_SECRET;
  process.env.AUTH_RATE_LIMIT_SECRET = "synthetic-newsletter-capture-secret".padEnd(48, "x");
  try {
    await callback();
  } finally {
    if (saved === undefined) {
      delete process.env.AUTH_RATE_LIMIT_SECRET;
    } else {
      process.env.AUTH_RATE_LIMIT_SECRET = saved;
    }
  }
}

test("capture preserves first-touch consent and deduplicates normalized email within its audience", () =>
  secret(async () => {
    const { captures, service } = database();
    const email = "visitor@example.invalid";
    const id = await service.rememberNewsletterCapture("1234567890", ` ${email.toUpperCase()} `, {
      ...context,
      acceptedNewsletter: true,
    });
    const repeated = await service.rememberNewsletterCapture("1234567890", email, {
      ...context,
      source: "footer",
    });
    assert.equal(id, repeated);
    assert.equal(captures.size, 1);
    const saved = captures.get(id);
    assert.equal(saved.source, "home");
    assert.equal(saved.consentVersion, rules.NEWSLETTER_CONSENT_VERSION);
    assert.equal(saved.consentText, rules.NEWSLETTER_CONSENT_TEXT);
    assert.equal(saved.acceptedNewsletter, undefined);
    assert.equal(
      id,
      createHmac("sha256", process.env.AUTH_RATE_LIMIT_SECRET)
        .update(`public-form-v1\0newsletter-capture:1234567890\0${email}`)
        .digest("hex")
    );
    assert.equal(JSON.stringify([...captures]).includes(email), false);
    assert.notEqual(await service.rememberNewsletterCapture("other-list", email, context), id);
  }));

test("only provider-confirmed pending captures convert; repeats and inactive/existing addresses cannot inflate totals", () =>
  secret(async () => {
    for (const status of ["PENDING", "EXISTING", "INACTIVE", "FAILED"]) {
      const { captures, service } = database();
      const email = "visitor@example.invalid";
      const id = await service.rememberNewsletterCapture("1234567890", email, context);
      await service.newsletterCaptureResult(id, status);
      await Promise.all([
        service.confirmNewsletterCapture("1234567890", email),
        service.confirmNewsletterCapture("1234567890", email),
      ]);
      const row = captures.get(id);
      assert.equal(row.status, status === "PENDING" ? "CONFIRMED" : status);
      assert.equal(!!row.confirmedAt, status === "PENDING");
      await service.newsletterCaptureResult(id, "EXISTING");
      if (status === "PENDING") {
        assert.equal(row.status, "CONFIRMED");
      }
    }
  }));

test("daily metrics contain only aggregate dimensions and counts", async () => {
  const { metrics, service } = database();
  await service.incrementNewsletterMetric(context, "visit");
  await service.incrementNewsletterMetric(context, "visit");
  assert.equal(metrics.size, 1);
  const row = [...metrics.values()][0];
  assert.equal(row.count, 2);
  assert.deepEqual(
    Object.keys(row).sort(),
    ["id", "day", "source", "variant", "device", "event", "count"].sort()
  );
});

test("metric endpoint rejects cross-origin, oversized and unbounded dimensions before writing", async () => {
  let writes = 0;
  const route = loadMembership("app/api/newsletter/metrics/route.ts", {
    "@/lib/newsletter-capture": {
      incrementNewsletterMetric: async () => {
        writes++;
      },
    },
    "@/lib/newsletter-capture-rules": rules,
    "@/lib/public-form-security": {
      consumeFormLimit: async () => {},
      publicFormIP: () => "local",
      publicFormError: () => Response.json({}, { status: 503 }),
    },
  });
  const request = (input, headers = {}) =>
    new Request("https://preview.energiaydivinidad.com/api/newsletter/metrics", {
      method: "POST",
      headers: {
        origin: "https://preview.energiaydivinidad.com",
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(input),
    });
  const valid = { ...context, event: "visit" };
  for (const req of [
    request(valid, { origin: "https://foreign.invalid" }),
    request(valid, { "content-length": "1025" }),
    request({ ...valid, source: "private-email@example.invalid" }),
    request({ ...valid, email: "private@example.invalid" }),
  ]) {
    assert.equal((await route.POST(req)).status, 400);
  }
  assert.equal(writes, 0);
  assert.equal((await route.POST(request(valid))).status, 204);
  assert.equal(writes, 1);
});

test("capture reports are ADMIN-only and never query contacts", async () => {
  for (const [session, role, status] of [
    [null, null, 401],
    [{ user: { id: "qa" } }, "CLIENT", 403],
    [{ user: { id: "qa" } }, "ADMIN", 200],
  ]) {
    let groups = 0;
    const groupBy = async () => {
      groups++;
      return [];
    };
    const route = loadMembership("app/api/admin/newsletter/capture/route.ts", {
      "@/lib/auth": { auth: async () => session },
      "@/lib/prisma": {
        prisma: {
          user: { findUnique: async () => ({ role }) },
          newsletterCapture: { groupBy },
          newsletterMetric: { groupBy },
        },
      },
    });
    const response = await route.GET();
    assert.equal(response.status, status);
    assert.equal(groups, status === 200 ? 2 : 0);
    if (status === 200) {
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
  }
});

test("browser counters deduplicate within the tab and never transmit addresses or visitor identifiers", async () => {
  const saved = {
    window: globalThis.window,
    sessionStorage: globalThis.sessionStorage,
    fetch: globalThis.fetch,
  };
  const values = new Map([[rules.CAPTURE_EXPERIMENT, "control"]]);
  const sent = [];
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response(null, { status: 204 });
  };
  try {
    const client = loadMembership("lib/newsletter-capture-client.ts");
    client.captureMetric("home", "form");
    client.captureMetric("home", "form");
    await Promise.resolve();
    assert.deepEqual(sent, [
      { source: "home", variant: "control", device: "mobile", event: "form" },
    ]);
    globalThis.sessionStorage.getItem = () => {
      throw Error("Storage blocked");
    };
    assert.doesNotThrow(() => client.captureMetric("home", "visit"));
    assert.equal(sent.length, 1);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete globalThis[key];
      } else {
        globalThis[key] = value;
      }
    }
  }
});

test("shared form submits explicit consent and attribution, and never submits when unchecked", async () => {
  const savedFetch = globalThis.fetch;
  const React = require("react");
  function find(node, type) {
    if (!node || typeof node !== "object") {
      return null;
    }
    if (Array.isArray(node)) {
      return node.map((child) => find(child, type)).find(Boolean);
    }
    if (node.type === type) {
      return node;
    }
    return find(node.props?.children, type);
  }
  try {
    for (const accepted of [false, true]) {
      let payload, remembered;
      globalThis.fetch = async (_url, options) => {
        payload = JSON.parse(options.body);
        return Response.json({
          subscriptionStatus: "subscribed",
          message: "Ya estás en nuestra lista",
        });
      };
      const values = ["visitor@example.invalid", "idle", "", null, accepted, ""];
      let index = 0;
      const component = loadMembership("components/newsletter/NewsletterForm.tsx", {
        react: {
          ...React,
          useState: () => [values[index++], () => {}],
          useId: () => "capture",
          useRef: () => ({ current: null }),
          useEffect() {},
        },
        "@/lib/newsletter-capture-rules": rules,
        "@/lib/newsletter-capture-client": {
          captureContext: (source) => ({ ...context, source }),
          captureMetric() {},
          rememberNewsletterRequest: (value) => {
            remembered = value;
          },
        },
      });
      const tree = component.NewsletterForm({ source: "home" });
      await find(tree, "form").props.onSubmit({ preventDefault() {} });
      if (!accepted) {
        assert.equal(payload, undefined);
        continue;
      }
      assert.deepEqual(payload, {
        email: "visitor@example.invalid",
        ...context,
        acceptedNewsletter: true,
        consentVersion: rules.NEWSLETTER_CONSENT_VERSION,
        website: "",
      });
      assert.equal(remembered, true);
    }
  } finally {
    globalThis.fetch = savedFetch;
  }
});
