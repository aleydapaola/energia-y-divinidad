import { isProductionEnvironment } from "./preview-safety";

/** Personal Global66: manual reconciliation. Never inherit the old Bancolombia details. */
export function getBrebConfiguration() {
  if (!isProductionEnvironment()) {
    return {
      enabled: true,
      simulation: true,
      key: "",
      recipient: "PRUEBA — NO ENVIAR DINERO",
      provider: "Global66",
    };
  }
  const verified = process.env.GLOBAL66_BREB_VERIFIED === "true";
  const key = verified ? (process.env.GLOBAL66_BREB_KEY || "").trim() : "";
  const recipient = verified ? (process.env.GLOBAL66_BREB_RECIPIENT || "").trim() : "";
  return { enabled: !!(key && recipient), simulation: false, key, recipient, provider: "Global66" };
}

/** Global66 documents single-use QRs. Never reuse a global image or manufacture a bank QR. */
export function getOrderBrebQr(metadata: Record<string, unknown>, amount: number) {
  if (!isProductionEnvironment()) {
    return null;
  }
  const qr = metadata.global66Qr as Record<string, unknown> | undefined;
  if (
    !qr ||
    qr.verified !== true ||
    qr.currency !== "COP" ||
    qr.amount !== amount ||
    typeof qr.expiresAt !== "string" ||
    !(Date.parse(qr.expiresAt) > Date.now()) ||
    typeof qr.url !== "string" ||
    !qr.url.startsWith("https://")
  ) {
    return null;
  }
  return qr.url;
}
