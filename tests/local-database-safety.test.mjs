import assert from "node:assert/strict";
import { test } from "node:test";

import { assertLocalDatabaseSafety } from "../scripts/local-database-safety.mjs";

const preview =
  "postgresql://test:fake@ep-still-star-agi8b3ka-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const production =
  "postgresql://test:fake@ep-snowy-sea-aglcoi8l-pooler.c-2.eu-central-1.aws.neon.tech/neondb";

test("allows only the verified EYD Preview pooler and direct endpoint", () => {
  assert.doesNotThrow(() => assertLocalDatabaseSafety({ DATABASE_URL: preview }));
  assert.doesNotThrow(() =>
    assertLocalDatabaseSafety({ DATABASE_URL: preview.replace("-pooler", "") })
  );
});

test("rejects production, another project and query host overrides without revealing credentials", () => {
  for (const value of [
    undefined,
    "invalid",
    production,
    preview.replace("still-star", "other-project"),
    `${preview}&host=production.example.com`,
    `${preview}&hostaddr=127.0.0.1`,
  ]) {
    assert.throws(
      () => assertLocalDatabaseSafety({ DATABASE_URL: value }),
      (error) => {
        assert.doesNotMatch(error.message, /test:fake|postgresql:\/\//);
        return true;
      }
    );
  }
});

test("rejects a production direct connection even with a safe pooled connection", () => {
  assert.throws(() => assertLocalDatabaseSafety({ DATABASE_URL: preview, DIRECT_URL: production }));
});

test("local production builds cannot disable service protections with VERCEL_ENV", () => {
  assert.throws(() =>
    assertLocalDatabaseSafety({ DATABASE_URL: preview, VERCEL_ENV: "production" })
  );
  assert.doesNotThrow(() =>
    assertLocalDatabaseSafety({ DATABASE_URL: preview, NODE_ENV: "production" })
  );
});
