// The local profile uses Neon Preview and public test content. External sending,
// calendars and payments are exercised on Vercel Preview with dedicated keys.
const disabledCredentials = [
  "RESEND_API_KEY",
  "MAILCHIMP_API_KEY",
  "SANITY_API_TOKEN",
  "SANITY_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_SECRET",
  "WOMPI_PRIVATE_KEY",
  "WOMPI_INTEGRITY_SECRET",
  "WOMPI_EVENTS_SECRET",
  "NEQUI_CLIENT_SECRET",
  "NEQUI_API_KEY",
  "EPAYCO_PRIVATE_KEY",
  "EPAYCO_SECRET_KEY",
];

export function assertLocalServiceSafety(env) {
  if (
    env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "81jpalr2" ||
    env.NEXT_PUBLIC_SANITY_DATASET !== "preview" ||
    env.PREVIEW_SANITY_DATASET !== "preview"
  ) {
    throw new Error("El entorno local requiere el contenido Preview de Energía y Divinidad.");
  }
  const present = disabledCredentials.filter((name) => env[name]);
  if (present.length) {
    throw new Error(
      `El perfil local no admite credenciales de servicios externos: ${present.join(", ")}. Usa la Preview de Vercel para esas pruebas.`
    );
  }
  for (const name of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"]) {
    let url;
    try {
      url = new URL(env[name]);
    } catch {
      throw new Error(`${name} debe ser una dirección local.`);
    }
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error(`${name} debe ser una dirección local.`);
    }
  }
}
