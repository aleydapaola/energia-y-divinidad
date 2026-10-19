import { assertLocalDatabaseSafety } from "./local-database-safety.mjs";

export function vercelMigrationEnvironment(env) {
  if (env.VERCEL !== "1" || !["preview", "production"].includes(env.VERCEL_ENV)) {
    throw new Error(
      "Usa los scripts locales protegidos para ejecutar migraciones fuera de Vercel."
    );
  }
  if (env.VERCEL_ENV === "production") {
    return { ...env };
  }

  // Migrations need a session that keeps its advisory lock. Only rewrite the
  // verified EYD Preview endpoint, preserving credentials and TLS parameters.
  assertLocalDatabaseSafety(env);
  const direct = new URL(env.DATABASE_URL);
  direct.hostname = direct.hostname.replace("-pooler.", ".");
  direct.searchParams.delete("pgbouncer");
  return { ...env, DATABASE_URL: direct.toString() };
}
