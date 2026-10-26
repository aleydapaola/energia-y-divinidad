import { isolatedBrebQrUrl, isProductionEnvironment } from "./preview-safety";

/** Bre-B accepts four kinds of key. The alias is the one used by Global66 here. */
export type BrebKeyType = "phone" | "email" | "alias" | "document";

export const BREB_KEY_TYPES: BrebKeyType[] = ["phone", "email", "alias", "document"];

const KEY_PATTERNS: Record<BrebKeyType, RegExp> = {
  phone: /^(\+57)?3\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  // Global66 issues aliases like @EJEMPLO123. The @ prefix is part of the key.
  alias: /^@?[A-Za-z0-9._-]{3,40}$/,
  document: /^\d{6,12}$/,
};

/** Static QR image supplied as a data URL or as an https address. */
const QR_DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
/** Vercel rejects environment values above 65536 characters. */
const MAX_QR_DATA_URL_LENGTH = 60000;

export interface BrebConfiguration {
  enabled: boolean;
  simulation: boolean;
  key: string;
  keyType: BrebKeyType | null;
  keyMasked: string;
  recipient: string;
  provider: "Global66";
  /** The account QR carries no amount: the customer types the exact total. */
  amountMode: "customer-entered";
  /** True when a QR image is configured; the image itself is never sent in JSON. */
  qrConfigured: boolean;
}

export function isValidBrebKey(key: string, keyType: BrebKeyType | null) {
  if (!key || !keyType || !BREB_KEY_TYPES.includes(keyType)) {
    return false;
  }
  return KEY_PATTERNS[keyType].test(key);
}

/** Only for diagnostics and logs. Never show the full key outside the checkout page. */
export function maskBrebKey(key: string) {
  if (key.length <= 4) {
    return "*".repeat(key.length);
  }
  return `${key.slice(0, 2)}${"*".repeat(key.length - 4)}${key.slice(-2)}`;
}

function normalizeQrSource(value: string | undefined) {
  const source = (value || "").trim();
  if (!source) {
    return null;
  }
  if (QR_DATA_URL.test(source)) {
    return source.length <= MAX_QR_DATA_URL_LENGTH ? source : null;
  }
  return /^https:\/\/\S+$/.test(source) ? source : null;
}

/**
 * Source of the account QR. It is static and has no amount, so it is reused
 * across orders; there is nothing per-order to expire or revoke.
 */
export function getBrebQrSource(): string | null {
  if (!isProductionEnvironment()) {
    return normalizeQrSource(isolatedBrebQrUrl() ?? undefined);
  }
  return normalizeQrSource(
    process.env.GLOBAL66_BREB_QR_DATA_URL || process.env.GLOBAL66_BREB_QR_URL
  );
}

/** Splits an inline QR image so the route can serve bytes instead of JSON. */
export function getBrebQrImage(source: string) {
  const match = QR_DATA_URL.exec(source);
  return match ? { contentType: match[1], base64: match[2] } : null;
}

const PREVIEW_KEY = "@PRUEBA-NO-REAL";
const PREVIEW_RECIPIENT = "PRUEBA — NO ENVIAR DINERO";

/** Personal Global66: manual reconciliation. Never inherit the old Bancolombia details. */
export function getBrebConfiguration(): BrebConfiguration {
  const qrConfigured = getBrebQrSource() !== null;

  if (!isProductionEnvironment()) {
    return {
      enabled: true,
      simulation: true,
      key: PREVIEW_KEY,
      keyType: "alias",
      keyMasked: maskBrebKey(PREVIEW_KEY),
      recipient: PREVIEW_RECIPIENT,
      provider: "Global66",
      amountMode: "customer-entered",
      qrConfigured,
    };
  }

  const verified = process.env.GLOBAL66_BREB_VERIFIED === "true";
  const key = verified ? (process.env.GLOBAL66_BREB_KEY || "").trim() : "";
  const recipient = verified ? (process.env.GLOBAL66_BREB_RECIPIENT || "").trim() : "";
  const declaredType = (process.env.GLOBAL66_BREB_KEY_TYPE || "").trim() as BrebKeyType;
  const keyType = BREB_KEY_TYPES.includes(declaredType) ? declaredType : null;

  // Fail closed: an unrecognised key format disables Bre-B instead of guessing.
  const valid = isValidBrebKey(key, keyType) && recipient.length > 0;

  return {
    enabled: valid,
    simulation: false,
    key: valid ? key : "",
    keyType: valid ? keyType : null,
    keyMasked: valid ? maskBrebKey(key) : "",
    recipient: valid ? recipient : "",
    provider: "Global66",
    amountMode: "customer-entered",
    qrConfigured: valid && qrConfigured,
  };
}
