// Verified EYD Neon Preview branch: br-floral-violet-agbqeqgy.
const previewHosts = new Set([
  "ep-still-star-agi8b3ka-pooler.c-2.eu-central-1.aws.neon.tech",
  "ep-still-star-agi8b3ka.c-2.eu-central-1.aws.neon.tech",
]);

export function assertLocalDatabaseSafety(env) {
  if (env.VERCEL_ENV === "production") {
    throw new Error("El entorno local no puede usar VERCEL_ENV=production.");
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (name === "DIRECT_URL" && !env[name]) {
      continue;
    }
    let url;
    try {
      url = new URL(env[name]);
    } catch {
      throw new Error(`Configura ${name} con la conexión de Neon Preview de Energía y Divinidad.`);
    }
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !previewHosts.has(url.hostname) ||
      (url.port && url.port !== "5432") ||
      url.pathname !== "/neondb" ||
      [...url.searchParams.keys()].some((key) => ["host", "hostaddr"].includes(key.toLowerCase()))
    ) {
      throw new Error(
        `${name} no corresponde a la base verificada de Preview de Energía y Divinidad. Inicio bloqueado.`
      );
    }
  }
}
