import {
  NEWSLETTER_CONSENT_TEXT,
  NEWSLETTER_CONSENT_VERSION,
  type CaptureSource,
  type CaptureVariant,
  type CaptureDevice,
} from "./newsletter-capture-rules";
import { prisma } from "./prisma";
import { formLimitKey } from "./public-form-security";

export type CaptureContext = {
  source: CaptureSource;
  variant: CaptureVariant;
  device: CaptureDevice;
};

function captureId(listId: string, email: string) {
  return formLimitKey(`newsletter-capture:${listId}`, email.trim().toLowerCase());
}

/** One first-touch consent record per address/audience; no plaintext email or IP. */
export async function rememberNewsletterCapture(
  listId: string,
  email: string,
  context: CaptureContext
) {
  const id = captureId(listId, email);
  await prisma.newsletterCapture.upsert({
    where: { id },
    update: {},
    create: {
      id,
      listId,
      source: context.source,
      variant: context.variant,
      device: context.device,
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      consentText: NEWSLETTER_CONSENT_TEXT,
      status: "PENDING",
    },
  });
  return id;
}

export async function newsletterCaptureResult(
  id: string,
  status: "PENDING" | "EXISTING" | "INACTIVE" | "FAILED"
) {
  await prisma.newsletterCapture.updateMany({
    where: { id, confirmedAt: null },
    data: { status },
  });
}

/** Called only after the existing gift processor verifies the provider's identity and status. */
export async function confirmNewsletterCapture(listId: string, email: string) {
  await prisma.newsletterCapture.updateMany({
    where: { id: captureId(listId, email), status: "PENDING", confirmedAt: null },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
}

export async function incrementNewsletterMetric(
  context: CaptureContext,
  event: "visit" | "form" | "invitation"
) {
  const day = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const id = [day.toISOString(), context.source, context.variant, context.device, event].join(":");
  await prisma.newsletterMetric.upsert({
    where: { id },
    update: { count: { increment: 1 } },
    create: { id, day, ...context, event, count: 1 },
  });
}
