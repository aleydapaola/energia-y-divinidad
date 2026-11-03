import { createHash } from "node:crypto";

import { z } from "zod";

import { deliverEmail, previewEmailRecipient } from "./email-delivery";
import { newsletterGiftConfiguration, NEWSLETTER_GIFT_VERSION } from "./newsletter-gift-config";
import { NEWSLETTER_GIFT_SUBJECT, renderNewsletterGiftEmail } from "./newsletter-gift-email";
import { prisma } from "./prisma";
import { REGISTRATION_NEWSLETTER_VERSION } from "./registration-newsletter-copy";

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const memberSchema = z.object({
  id: z.string(),
  list_id: z.string(),
  email_address: email,
  unique_email_id: z.string(),
  status: z.string(),
  timestamp_opt: z.string().nullable().optional(),
  tags: z.array(z.object({ name: z.string() })).default([]),
});
const listSchema = z.object({
  id: z.string(),
  name: z.string(),
  subscribe_url_long: z.string(),
  campaign_defaults: z.object({ from_email: email }),
  contact: z.object({
    company: z.string().optional(),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().min(1),
  }),
});

export type NewsletterSubscribeEvent = { email: string; listId: string; memberId: string };

export function parseNewsletterEvent(raw: string) {
  const form = new URLSearchParams(raw);
  if (form.getAll("type").length !== 1) {
    throw Error("Invalid event");
  }
  if (form.get("type") !== "subscribe") {
    return null;
  }
  for (const key of ["data[email]", "data[list_id]", "data[id]"]) {
    if (form.getAll(key).length !== 1) {
      throw Error("Invalid event");
    }
  }
  const recipient = email.parse(form.get("data[email]"));
  const listId = form.get("data[list_id]")!;
  const memberId = form.get("data[id]")!;
  if (!/^[a-zA-Z0-9]{10,32}$/.test(listId) || !/^[a-zA-Z0-9]{8,32}$/.test(memberId)) {
    throw Error("Invalid event");
  }
  return { email: recipient, listId, memberId };
}

export function newsletterGiftLogId(listId: string, recipient: string) {
  return `newsletter-gift-${createHash("sha256").update(`${NEWSLETTER_GIFT_VERSION}\0${listId}\0${recipient}`).digest("hex")}`;
}

export async function readNewsletterList(config = newsletterGiftConfiguration()) {
  if (!config.mailchimpConfigured || !config.listUrl) {
    throw Error("Newsletter unavailable");
  }
  const r = await fetch(
    `${config.listUrl}?fields=id,name,contact,campaign_defaults,subscribe_url_long`,
    {
      headers: { Authorization: `Basic ${Buffer.from(`eyd:${config.apiKey}`).toString("base64")}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    }
  );
  if (!r.ok) {
    throw Error("Newsletter unavailable");
  }
  const list = listSchema.parse(await r.json());
  const name = list.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (
    list.id !== config.listId ||
    !/energia.*divinidad/.test(name) ||
    !list.campaign_defaults.from_email.endsWith("@energiaydivinidad.com") ||
    (config.production ? /pruebas|no real|preview/.test(name) : !/pruebas.*no real/.test(name))
  ) {
    throw Error("Newsletter audience mismatch");
  }
  const signup = new URL(list.subscribe_url_long);
  const owner = signup.searchParams.get("u");
  if (
    signup.protocol !== "https:" ||
    !signup.hostname.endsWith(".list-manage.com") ||
    signup.username ||
    signup.password ||
    signup.port ||
    !owner ||
    !/^[a-f0-9]{20,40}$/.test(owner) ||
    signup.searchParams.get("id") !== config.listId
  ) {
    throw Error("Newsletter audience mismatch");
  }
  const unsubscribe = new URL("/unsubscribe", signup.origin);
  unsubscribe.searchParams.set("u", owner);
  unsubscribe.searchParams.set("id", list.id);
  const postalAddress = [
    list.contact.company,
    list.contact.address1,
    list.contact.address2,
    list.contact.city,
    list.contact.state,
    list.contact.zip,
    list.contact.country,
  ]
    .filter(Boolean)
    .join(", ");
  return { list, unsubscribeUrl: unsubscribe.toString(), postalAddress };
}

type Snapshot = {
  giftVersion: string;
  from: string;
  replyTo: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
};

/** Read confirmation from Mailchimp; this function never changes a contact or an unsubscribe. */
export function processNewsletterGift(event: NewsletterSubscribeEvent) {
  return deliverNewsletterGift(event, false);
}

/** Internal entry: registration's own verified consent replaces Mailchimp's opt-in timestamp. */
export async function processRegistrationNewsletterGift(
  userId: string,
  event: NewsletterSubscribeEvent
) {
  const record = await prisma.registrationNewsletter.findUnique({
    where: { userId },
    include: { user: { select: { email: true, emailVerified: true } } },
  });
  if (
    !record?.verifiedAt ||
    !record.activatedAt ||
    !record.user.emailVerified ||
    record.source !== "registration" ||
    record.consentVersion !== REGISTRATION_NEWSLETTER_VERSION ||
    record.user.email !== event.email ||
    record.listId !== event.listId
  ) {
    throw Error("Registration newsletter consent unavailable");
  }
  return deliverNewsletterGift(event, true);
}

async function deliverNewsletterGift(
  event: NewsletterSubscribeEvent,
  registrationVerified: boolean
) {
  const config = newsletterGiftConfiguration();
  if (!config.ready || !config.giftUrl) {
    throw Error("Newsletter unavailable");
  }
  if (event.listId !== config.listId) {
    return "ignored";
  }
  if (!config.production && event.email !== previewEmailRecipient().toLowerCase()) {
    return "ignored";
  }
  const subscriberHash = createHash("md5").update(event.email).digest("hex");
  const [response, audience] = await Promise.all([
    fetch(
      `${config.listUrl}/members/${subscriberHash}?fields=id,list_id,email_address,unique_email_id,status,timestamp_opt,tags`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`eyd:${config.apiKey}`).toString("base64")}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(3500),
      }
    ),
    readNewsletterList(config),
  ]);
  if (response.status === 404) {
    return "ignored";
  }
  if (!response.ok) {
    throw Error("Newsletter confirmation unavailable");
  }
  const member = memberSchema.parse(await response.json());
  if (
    member.id !== subscriberHash ||
    member.list_id !== event.listId ||
    member.email_address !== event.email ||
    member.unique_email_id !== event.memberId
  ) {
    return "ignored";
  }
  if (member.status === "pending") {
    throw Error("Newsletter confirmation pending");
  }
  const opted = Date.parse(member.timestamp_opt || "");
  if (
    member.status !== "subscribed" ||
    !member.tags.some((t) => t.name === "website") ||
    (!registrationVerified && (!Number.isFinite(opted) || opted > Date.now() + 300000))
  ) {
    return "ignored";
  }

  const id = newsletterGiftLogId(event.listId, event.email);
  const content = renderNewsletterGiftEmail({
    unsubscribeUrl: audience.unsubscribeUrl,
    postalAddress: audience.postalAddress,
    appUrl: config.appUrl,
    preview: !config.production,
    year: new Date().getUTCFullYear(),
  });
  const snapshot: Snapshot = {
    ...content,
    giftVersion: NEWSLETTER_GIFT_VERSION,
    unsubscribeUrl: audience.unsubscribeUrl,
    from: process.env.EMAIL_FROM || "Energía y Divinidad <noreply@energiaydivinidad.com>",
    replyTo: "contacto@energiaydivinidad.com",
  };
  // Commit the immutable payload and start of the retry window before contacting Resend.
  await prisma.emailLog.upsert({
    where: { id },
    update: {},
    create: {
      id,
      to: event.email,
      template: "newsletter_gift",
      subject: NEWSLETTER_GIFT_SUBJECT,
      entityType: "newsletter",
      entityId: `${event.listId}:${subscriberHash}`,
      status: "PENDING",
      metadata: snapshot,
    },
  });
  const outcome = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`newsletter-email:${id}`}))`;
      const log = await tx.emailLog.findUnique({ where: { id } });
      if (!log || log.template !== "newsletter_gift" || log.to !== event.email) {
        throw Error("Newsletter log mismatch");
      }
      if (log.status === "SENT") {
        return "already-sent";
      }
      if (
        log.status === "REVIEW_REQUIRED" ||
        Date.now() - log.createdAt.getTime() >= 23 * 60 * 60 * 1000
      ) {
        // Resend's deduplication lasts 24h. Never automatically repeat an uncertain old send.
        await tx.emailLog.update({
          where: { id },
          data: {
            status: "REVIEW_REQUIRED",
            errorMessage: "Comprobar entrega en proveedor antes de reintentar",
          },
        });
        return "review-required";
      }
      const saved = log.metadata as Snapshot | null;
      if (
        !saved ||
        saved.giftVersion !== NEWSLETTER_GIFT_VERSION ||
        !saved.html ||
        !saved.text ||
        !saved.from ||
        !saved.unsubscribeUrl
      ) {
        throw Error("Newsletter log mismatch");
      }
      try {
        const result = await deliverEmail(
          {
            from: saved.from,
            to: log.to,
            replyTo: saved.replyTo,
            subject: log.subject || NEWSLETTER_GIFT_SUBJECT,
            html: saved.html,
            text: saved.text,
            headers: { "List-Unsubscribe": `<${saved.unsubscribeUrl}>` },
          },
          { idempotencyKey: id }
        );
        if (result.error || !result.data?.id) {
          throw Error("Newsletter delivery not confirmed");
        }
        await tx.emailLog.update({
          where: { id },
          data: {
            status: "SENT",
            providerMessageId: result.data.id,
            sentAt: new Date(),
            errorMessage: null,
          },
        });
        return "sent";
      } catch {
        await tx.emailLog.update({
          where: { id },
          data: { status: "FAILED", errorMessage: "Entrega pendiente de reintento" },
        });
        return "retry";
      }
    },
    { maxWait: 8000, timeout: 20000 }
  );
  if (outcome === "retry") {
    throw Error("Newsletter delivery pending");
  }
  return outcome;
}
