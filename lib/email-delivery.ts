import { Resend } from "resend";
import { z } from "zod";

type EmailPayload = Parameters<Resend["emails"]["send"]>[0];

export function previewEmailRecipient() {
  const recipient = z.string().email().safeParse(process.env.PREVIEW_EMAIL_RECIPIENT);
  if (!recipient.success) {
    throw new Error("Preview email recipient is not configured");
  }
  return recipient.data;
}

/** All outgoing emails share the same recipient boundary in Preview and local work. */
export async function deliverEmail(payload: EmailPayload) {
  let message = payload;
  if (process.env.VERCEL_ENV !== "production" || process.env.EMAIL_DELIVERY_MODE === "preview") {
    const recipient = previewEmailRecipient();
    message = {
      ...payload,
      to: recipient,
      cc: undefined,
      bcc: undefined,
      replyTo: recipient,
      subject: `[PREVIEW] ${payload.subject || "Correo de prueba"}`,
      from:
        process.env.PREVIEW_EMAIL_FROM ||
        payload.from ||
        "Energía y Divinidad <noreply@energiaydivinidad.com>",
    };
  }
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email provider is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY).emails.send(message);
}
