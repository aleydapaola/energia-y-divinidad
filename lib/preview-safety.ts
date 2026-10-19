/** Preview and local development must use isolated external services. */
export function isProductionEnvironment() {
  return process.env.VERCEL_ENV === "production";
}

export const MANUAL_PAYMENT_PREVIEW_MESSAGE =
  "Este método todavía no está habilitado para pruebas. No realices transferencias ni pagos reales. Las pruebas de pagos están pausadas.";

export function assertPayPalTestEnvironment(environment: string) {
  if (!isProductionEnvironment() && environment !== "sandbox") {
    throw new Error("Preview requires PayPal sandbox");
  }
}

export function assertWompiTestEnvironment(config: {
  environment: string;
  publicKey: string;
  privateKey: string;
  eventsSecret: string;
  integritySecret: string;
}) {
  if (isProductionEnvironment()) {
    return;
  }
  if (
    config.environment !== "sandbox" ||
    (config.publicKey && !config.publicKey.startsWith("pub_test_")) ||
    (config.privateKey && !config.privateKey.startsWith("prv_test_")) ||
    (config.eventsSecret && !config.eventsSecret.startsWith("test_events_")) ||
    (config.integritySecret && !config.integritySecret.startsWith("test_integrity_"))
  ) {
    throw new Error("Preview requires Wompi sandbox keys");
  }
}

export function assertNequiTestEnvironment(authUri: string, apiBaseUrl: string) {
  if (isProductionEnvironment()) {
    return;
  }
  const auth = new URL(authUri);
  const api = new URL(apiBaseUrl);
  if (
    auth.protocol !== "https:" ||
    auth.hostname !== "oauth.sandbox.nequi.com" ||
    api.protocol !== "https:" ||
    api.hostname !== "api.sandbox.nequi.com"
  ) {
    throw new Error("Preview requires Nequi sandbox endpoints");
  }
}

export function isolatedCalendarId() {
  if (isProductionEnvironment()) {
    return process.env.GOOGLE_CALENDAR_ID;
  }
  const id = process.env.PREVIEW_GOOGLE_CALENDAR_ID;
  return id && id !== process.env.GOOGLE_CALENDAR_ID ? id : undefined;
}

export function isolatedMailchimpListId() {
  if (isProductionEnvironment()) {
    return process.env.MAILCHIMP_LIST_ID;
  }
  const id = process.env.PREVIEW_MAILCHIMP_LIST_ID;
  return id && id !== process.env.MAILCHIMP_LIST_ID ? id : undefined;
}

export function assertIsolatedSanityWrites() {
  if (isProductionEnvironment()) {
    return;
  }
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  if (
    !process.env.PREVIEW_SANITY_DATASET ||
    dataset !== process.env.PREVIEW_SANITY_DATASET ||
    dataset === "production"
  ) {
    throw new Error("Preview content changes require an isolated Sanity dataset");
  }
}
