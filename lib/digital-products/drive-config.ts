import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_MAX_BYTES = 50_000_000;

export function driveEnvironment() {
  const production = process.env.VERCEL_ENV === "production";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "81jpalr2" ||
      (production ? dataset !== "production" : dataset !== "preview" || process.env.PREVIEW_SANITY_DATASET !== "preview")) {
    throw new Error("Drive requiere el entorno Sanity aislado de Energía y Divinidad.");
  }
  return production ? "production" : "preview";
}

export function driveConfig() {
  const environment = driveEnvironment();
  const prefix = environment === "preview" ? "PREVIEW_DIGITAL_PRODUCTS_DRIVE_" : "DIGITAL_PRODUCTS_DRIVE_";
  const value = (name: string) => process.env[prefix + name] || "";
  const key = Buffer.from(value("ENCRYPTION_KEY"), "base64");
  const origin = new URL(value("ORIGIN"));
  if (value("ENABLED") !== "true" || !value("CLIENT_ID") || !value("CLIENT_SECRET") ||
      !value("OWNER_EMAIL") || key.length !== 32 || origin.protocol !== "https:" ||
      origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password ||
      (environment === "preview" && !origin.hostname.endsWith(".vercel.app") && origin.hostname !== "preview.energiaydivinidad.com") ||
      (environment === "production" && !["energiaydivinidad.com", "www.energiaydivinidad.com"].includes(origin.hostname))) {
    throw new Error("Falta configurar la conexión privada de Drive de este entorno.");
  }
  return { environment, clientId: value("CLIENT_ID"), clientSecret: value("CLIENT_SECRET"),
    ownerEmail: value("OWNER_EMAIL").trim().toLowerCase(), key, origin: origin.origin,
    redirectUri: `${origin.origin}/api/admin/product-drive/callback` };
}

export function encryptDriveSecret(value: string) {
  const { key, environment } = driveConfig();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`eyd-product-drive:${environment}`));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptDriveSecret(value: string) {
  const { key, environment } = driveConfig();
  const data = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  decipher.setAAD(Buffer.from(`eyd-product-drive:${environment}`));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
