import assert from "node:assert/strict";
import { test } from "node:test";

import { vercelMigrationEnvironment } from "../scripts/vercel-migration-environment.mjs";

const pool = "ep-still-star-agi8b3ka-pooler.c-2.eu-central-1.aws.neon.tech";
const directHost = "ep-still-star-agi8b3ka.c-2.eu-central-1.aws.neon.tech";
const env = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  DATABASE_URL: `postgresql://test:p%40ss@${pool}/neondb?sslmode=require&channel_binding=require&pgbouncer=true`,
};

test("Preview migrations use the same database directly without changing runtime environment", () => {
  const original = { ...env };
  const result = vercelMigrationEnvironment(env);
  const url = new URL(result.DATABASE_URL);
  assert.equal(url.hostname, directHost);
  assert.equal(url.username, "test");
  assert.equal(url.password, "p%40ss");
  assert.equal(url.pathname, "/neondb");
  assert.equal(url.searchParams.get("sslmode"), "require");
  assert.equal(url.searchParams.get("channel_binding"), "require");
  assert.equal(url.searchParams.has("pgbouncer"), false);
  assert.deepEqual(env, original);
});

test("an already direct Preview endpoint stays direct", () => {
  const input = { ...env, DATABASE_URL: env.DATABASE_URL.replace(pool, directHost) };
  assert.equal(new URL(vercelMigrationEnvironment(input).DATABASE_URL).hostname, directHost);
});

test("Preview rejects other databases and host overrides before spawning Prisma", () => {
  for (const DATABASE_URL of [
    env.DATABASE_URL.replace(pool, "production.example.com"),
    env.DATABASE_URL + "&host=production.example.com",
    env.DATABASE_URL.replace("/neondb", "/other"),
  ]) {
    assert.throws(() => vercelMigrationEnvironment({ ...env, DATABASE_URL }));
  }
});

test("local execution cannot bypass the existing local database guard", () => {
  assert.throws(() => vercelMigrationEnvironment({ ...env, VERCEL: undefined }));
  assert.throws(() => vercelMigrationEnvironment({ ...env, VERCEL_ENV: "development" }));
});

test("Vercel Production keeps its existing migration connection unchanged", () => {
  const production = { ...env, VERCEL_ENV: "production", DATABASE_URL: "production-unchanged" };
  assert.deepEqual(vercelMigrationEnvironment(production), production);
});
