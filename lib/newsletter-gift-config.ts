import { createHmac, timingSafeEqual } from "node:crypto";

import { isolatedMailchimpListId } from "./preview-safety";

export const NEWSLETTER_GIFT_VERSION = "angel-de-la-guarda-v1";
export const NEWSLETTER_WEBHOOK_PATH = "/api/webhooks/newsletter";

export function validNewsletterGiftUrl(value: string | undefined) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" &&
      url.hostname === "mcusercontent.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      /^\/[a-f0-9]{20,40}\/files\/[a-f0-9-]+\/[a-zA-Z0-9_-]+\.(m4a|mp3)$/.test(url.pathname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function newsletterGiftConfiguration() {
  const production = process.env.VERCEL_ENV === "production";
  const prefix = production ? "" : "PREVIEW_";
  const listId = isolatedMailchimpListId();
  const region = process.env.MAILCHIMP_SERVER_PREFIX;
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const signingSecret = process.env[`${prefix}NEWSLETTER_WEBHOOK_SIGNING_SECRET`];
  const giftUrl = validNewsletterGiftUrl(process.env[`${prefix}NEWSLETTER_GIFT_URL`]);
  const enabled = process.env[`${prefix}NEWSLETTER_GIFT_ENABLED`] === "true";
  const appUrl = production
    ? "https://www.energiaydivinidad.com"
    : "https://preview.energiaydivinidad.com";
  const callbackUrl = production
    ? `${appUrl}${NEWSLETTER_WEBHOOK_PATH}`
    : process.env.PREVIEW_NEWSLETTER_CALLBACK_URL;
  const mailchimpConfigured = !!(
    apiKey &&
    listId &&
    /^[a-zA-Z0-9]{10,32}$/.test(listId) &&
    region &&
    /^us\d{1,3}$/.test(region)
  );
  const signatureConfigured = !!(
    signingSecret &&
    signingSecret.length >= 32 &&
    signingSecret.length <= 256
  );
  return {
    production,
    enabled,
    giftUrl,
    appUrl,
    callbackUrl,
    listId,
    apiKey,
    signingSecret,
    mailchimpConfigured,
    signatureConfigured,
    listUrl: mailchimpConfigured
      ? `https://${region}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId!)}`
      : null,
    ready:
      enabled &&
      !!giftUrl &&
      signatureConfigured &&
      mailchimpConfigured &&
      !!process.env.RESEND_API_KEY &&
      (!production || process.env.EMAIL_DELIVERY_MODE !== "preview"),
  };
}

export function parseNewsletterSignature(header: string | null, now = Date.now()) {
  if (!header || header.length > 256) {
    return null;
  }
  const parts = header.split(",").map((part) => part.trim().split("="));
  if (parts.length !== 2 || parts.some((p) => p.length !== 2)) {
    return null;
  }
  const fields = Object.fromEntries(parts);
  if (
    new Set(parts.map((p) => p[0])).size !== 2 ||
    !/^\d{10}$/.test(fields.t || "") ||
    !/^[a-f0-9]{64}$/.test(fields.v1 || "")
  ) {
    return null;
  }
  const timestamp = Number(fields.t);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 300) {
    return null;
  }
  return { timestamp: fields.t, signature: fields.v1 };
}

/** Mailchimp HMAC covers timestamp + dot + the exact, unparsed request bytes. */
export function verifyNewsletterSignature(
  raw: Buffer,
  header: string | null,
  secret: string,
  now = Date.now()
) {
  const parsed = parseNewsletterSignature(header, now);
  if (!parsed || secret.length < 32) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(parsed.timestamp + ".")
    .update(raw)
    .digest();
  return timingSafeEqual(expected, Buffer.from(parsed.signature, "hex"));
}

export function validNewsletterCallback(value: string | undefined, production: boolean) {
  try {
    const url = new URL(value || "");
    const hosts = production
      ? ["www.energiaydivinidad.com"]
      : [
          "preview.energiaydivinidad.com",
          "energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app",
        ];
    return (
      url.protocol === "https:" &&
      hosts.includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      url.pathname === NEWSLETTER_WEBHOOK_PATH &&
      (production
        ? !url.search
        : [...url.searchParams.keys()].every((k) => k === "x-vercel-protection-bypass"))
    );
  } catch {
    return false;
  }
}
