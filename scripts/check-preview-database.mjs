import { createRequire } from "node:module";

import { assertLocalDatabaseSafety } from "./local-database-safety.mjs";
import { assertLocalServiceSafety } from "./local-service-safety.mjs";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
let loadFailed = false;
loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {
    loadFailed = true;
  },
});

try {
  if (loadFailed) {
    throw new Error("No se ha podido cargar el entorno local.");
  }
  assertLocalDatabaseSafety(process.env);
  assertLocalServiceSafety(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Read-only diagnostic. Never log connection strings, credentials or database rows.
const pooled = new URL(process.env.DATABASE_URL);
const direct = new URL(process.env.DATABASE_URL);
direct.hostname = direct.hostname.replace("-pooler.", ".");
direct.searchParams.delete("pgbouncer");
for (const [label, url] of [
  ["runtime", pooled],
  ["migrations", direct],
]) {
  url.searchParams.set("connect_timeout", "10");
  assertLocalDatabaseSafety({ DATABASE_URL: url.toString() });
  const client = new PrismaClient({ datasourceUrl: url.toString(), log: [] });
  try {
    await client.$queryRaw`SELECT 1`;
    console.log(`${label}: conexión de lectura correcta (${url.hostname}).`);
  } catch (error) {
    const code = typeof error.code === "string" ? error.code : "CONNECTION_FAILED";
    console.error(`${label}: fallo de conexión (${code}, ${url.hostname}).`);
    process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}
