import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

import { deliverEmail } from "../lib/email-delivery.ts";
import {
  assertPayPalTestEnvironment,
  assertWompiTestEnvironment,
  assertNequiTestEnvironment,
  isolatedCalendarId,
  isolatedMailchimpListId,
  assertIsolatedSanityWrites,
} from "../lib/preview-safety.ts";
const original = { ...process.env };
let calls;
const originalFetch = globalThis.fetch;
beforeEach(() => {
  process.env.VERCEL_ENV = "preview";
  process.env.RESEND_API_KEY = "re_test_placeholder";
  process.env.PREVIEW_EMAIL_RECIPIENT = "preview@example.com";
  delete process.env.EMAIL_DELIVERY_MODE;
  calls = [];
  globalThis.fetch = async (url, request) => {
    calls.push({ url, request });
    return new Response(JSON.stringify({ id: "test-email" }), { status: 200 });
  };
});
afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, original);
  globalThis.fetch = originalFetch;
});
const payload = {
  from: "Energía y Divinidad <test@example.com>",
  to: ["customer1@example.com", "customer2@example.com"],
  cc: "cc@example.com",
  bcc: "bcc@example.com",
  replyTo: "customer@example.com",
  subject: "Reserva",
  html: "<p>Test</p>",
};

test("redirects every Preview recipient and removes copies", async () => {
  await deliverEmail(payload);
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0].request.body);
  assert.deepEqual([sent.to].flat(), ["preview@example.com"]);
  assert.equal(sent.cc, undefined);
  assert.equal(sent.bcc, undefined);
  assert.deepEqual([sent.reply_to].flat(), ["preview@example.com"]);
  assert.equal(sent.subject, "[PREVIEW] Reserva");
});
for (const recipient of ["", "invalid", "one@example.com,two@example.com"]) {
  test(`blocks an invalid Preview recipient ${JSON.stringify(recipient)}`, async () => {
    process.env.PREVIEW_EMAIL_RECIPIENT = recipient;
    await assert.rejects(deliverEmail(payload));
    assert.equal(calls.length, 0);
  });
}
test("local development remains protected even with NODE_ENV=production", async () => {
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = "production";
  await deliverEmail(payload);
  assert.equal(JSON.parse(calls[0].request.body).subject, "[PREVIEW] Reserva");
});
test("preserves real delivery only in Vercel Production", async () => {
  process.env.VERCEL_ENV = "production";
  await deliverEmail(payload);
  const sent = JSON.parse(calls[0].request.body);
  assert.deepEqual([sent.to].flat(), payload.to);
  assert.equal(sent.subject, "Reserva");
});
test("an explicit preview delivery mode protects Production too", async () => {
  process.env.VERCEL_ENV = "production";
  process.env.EMAIL_DELIVERY_MODE = "preview";
  await deliverEmail(payload);
  assert.equal(JSON.parse(calls[0].request.body).subject, "[PREVIEW] Reserva");
});
test("missing email credentials never reaches the provider", async () => {
  delete process.env.RESEND_API_KEY;
  await assert.rejects(deliverEmail(payload));
  assert.equal(calls.length, 0);
});
test("blocks live PayPal in Preview and local work", () => {
  assert.throws(() => assertPayPalTestEnvironment("live"));
  assert.doesNotThrow(() => assertPayPalTestEnvironment("sandbox"));
});
const wompi = {
  environment: "sandbox",
  publicKey: "pub_test_fake",
  privateKey: "prv_test_fake",
  eventsSecret: "test_events_fake",
  integritySecret: "test_integrity_fake",
};
for (const [field, value] of [
  ["environment", "production"],
  ["publicKey", "pub_prod_fake"],
  ["privateKey", "prv_prod_fake"],
  ["eventsSecret", "prod_events_fake"],
  ["integritySecret", "prod_integrity_fake"],
]) {
  test(`rejects a production Wompi ${field}`, () =>
    assert.throws(() => assertWompiTestEnvironment({ ...wompi, [field]: value })));
}
test("allows a complete sandbox Wompi configuration", () =>
  assert.doesNotThrow(() => assertWompiTestEnvironment(wompi)));
test("blocks real Nequi endpoints", () => {
  assert.throws(() =>
    assertNequiTestEnvironment("https://oauth.nequi.com/oauth2/token", "https://api.nequi.com")
  );
  assert.doesNotThrow(() =>
    assertNequiTestEnvironment(
      "https://oauth.sandbox.nequi.com/oauth2/token",
      "https://api.sandbox.nequi.com"
    )
  );
});
test("requires a separate Preview calendar", () => {
  process.env.GOOGLE_CALENDAR_ID = "real";
  delete process.env.PREVIEW_GOOGLE_CALENDAR_ID;
  assert.equal(isolatedCalendarId(), undefined);
  process.env.PREVIEW_GOOGLE_CALENDAR_ID = "real";
  assert.equal(isolatedCalendarId(), undefined);
  process.env.PREVIEW_GOOGLE_CALENDAR_ID = "test";
  assert.equal(isolatedCalendarId(), "test");
});
test("requires a separate Mailchimp audience", () => {
  process.env.MAILCHIMP_LIST_ID = "real";
  delete process.env.PREVIEW_MAILCHIMP_LIST_ID;
  assert.equal(isolatedMailchimpListId(), undefined);
  process.env.PREVIEW_MAILCHIMP_LIST_ID = "real";
  assert.equal(isolatedMailchimpListId(), undefined);
  process.env.PREVIEW_MAILCHIMP_LIST_ID = "test";
  assert.equal(isolatedMailchimpListId(), "test");
});
test("forbids writes to the production Sanity dataset from Preview", () => {
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  process.env.PREVIEW_SANITY_DATASET = "production";
  assert.throws(assertIsolatedSanityWrites);
  process.env.PREVIEW_SANITY_DATASET = "preview";
  assert.throws(assertIsolatedSanityWrites);
  process.env.NEXT_PUBLIC_SANITY_DATASET = "preview";
  assert.doesNotThrow(assertIsolatedSanityWrites);
});
test("preserves configured production services", () => {
  process.env.VERCEL_ENV = "production";
  process.env.GOOGLE_CALENDAR_ID = "real";
  process.env.MAILCHIMP_LIST_ID = "real";
  assert.doesNotThrow(() => assertPayPalTestEnvironment("live"));
  assert.doesNotThrow(() => assertWompiTestEnvironment({ ...wompi, environment: "production" }));
  assert.doesNotThrow(assertIsolatedSanityWrites);
  assert.equal(isolatedCalendarId(), "real");
  assert.equal(isolatedMailchimpListId(), "real");
});
