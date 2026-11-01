/** Preview and local development must use isolated external services. */
export function isProductionEnvironment() {
  return process.env.VERCEL_ENV === "production";
}

export function assertPayPalTestEnvironment(environment: string) {
  if (!isProductionEnvironment() && environment !== "sandbox") {
    throw new Error("Preview requires PayPal sandbox");
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

/**
 * The Bre-B QR is a static account QR, so Preview must never serve the real one.
 * An isolated QR is required, and it must differ from every Production value.
 */
export function isolatedBrebQrUrl() {
  const url = (process.env.PREVIEW_BREB_QR_URL || "").trim();
  if (!url) {
    return null;
  }
  const production = [
    (process.env.GLOBAL66_BREB_QR_URL || "").trim(),
    (process.env.GLOBAL66_BREB_QR_DATA_URL || "").trim(),
  ];
  return production.includes(url) ? null : url;
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
