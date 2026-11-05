// Opt-in: only the guarded EYD Preview database. No providers, emails or historical contacts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

import { assertLocalDatabaseSafety } from "../scripts/local-database-safety.mjs";
import { assertLocalServiceSafety } from "../scripts/local-service-safety.mjs";
import { loadMembership } from "./helpers/membership-loader.mjs";

if (process.env.EYD_PREVIEW_NEWSLETTER_QA !== "1") {
  throw Error("Opt in with EYD_PREVIEW_NEWSLETTER_QA=1");
}
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
assertLocalDatabaseSafety(process.env);
assertLocalServiceSafety(process.env);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw Error("External providers forbidden in this test");
};
process.env.AUTH_RATE_LIMIT_SECRET = "synthetic-integration-only-" + randomUUID();
const security = loadMembership("lib/public-form-security.ts", { "./prisma": { prisma } });
const service = loadMembership("lib/newsletter-capture.ts", {
  "./prisma": { prisma },
  "./public-form-security": security,
});
const email = `capture-${randomUUID()}@example.invalid`;
let fixtureId;
try {
  const context = { source: "landing", variant: "control", device: "mobile" };
  const ids = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      service.rememberNewsletterCapture(
        "qa12345678",
        i % 2 ? email : ` ${email.toUpperCase()} `,
        context
      )
    )
  );
  fixtureId = ids[0];
  assert.equal(new Set(ids).size, 1);
  assert.equal(await prisma.newsletterCapture.count({ where: { id: fixtureId } }), 1);
  await Promise.all(
    Array.from({ length: 8 }, () => service.confirmNewsletterCapture("qa12345678", email))
  );
  let saved = await prisma.newsletterCapture.findUnique({ where: { id: fixtureId } });
  assert.equal(saved.status, "CONFIRMED");
  assert.ok(saved.confirmedAt);
  const confirmedAt = saved.confirmedAt.getTime();
  await service.newsletterCaptureResult(fixtureId, "EXISTING");
  await service.rememberNewsletterCapture("qa12345678", email, { ...context, source: "footer" });
  saved = await prisma.newsletterCapture.findUnique({ where: { id: fixtureId } });
  assert.equal(saved.status, "CONFIRMED");
  assert.equal(saved.confirmedAt.getTime(), confirmedAt);
  assert.equal(saved.source, "landing");
  assert.equal(JSON.stringify(saved).includes(email), false);
  console.log(
    "Preview: 8 concurrent requests, one consent/confirmation, first source and confirmation immutable; no external effects."
  );
} finally {
  if (fixtureId) {
    await prisma.newsletterCapture.deleteMany({ where: { id: fixtureId, listId: "qa12345678" } });
  }
  await prisma.$disconnect();
  globalThis.fetch = originalFetch;
}
