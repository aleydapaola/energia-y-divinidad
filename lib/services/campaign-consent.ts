import { createHash } from "node:crypto";

import { z } from "zod";

import { readNewsletterList } from "@/lib/newsletter-gift";
import { newsletterGiftConfiguration } from "@/lib/newsletter-gift-config";
import { prisma } from "@/lib/prisma";

const member = z.object({
  id: z.string(),
  list_id: z.string(),
  email_address: z.string().trim().toLowerCase(),
  status: z.string(),
});

export async function campaignNewsletterSettings() {
  const config = newsletterGiftConfiguration();
  const { unsubscribeUrl, postalAddress } = await readNewsletterList(config);
  return { config, footer: { unsubscribeUrl, postalAddress } };
}

type NewsletterConfig = Awaited<ReturnType<typeof campaignNewsletterSettings>>["config"];
type Eligibility = { action: "send" } | { action: "skip" | "defer"; reason: string };

export async function campaignRecipientEligibility(
  recipient: { email: string; userId: string | null },
  newsletter?: NewsletterConfig
): Promise<Eligibility> {
  const normalizedEmail = recipient.email.trim().toLowerCase();
  try {
    const optedOut = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          ...(recipient.userId ? [{ id: recipient.userId }] : []),
        ],
        emailPreferences: { is: { unsubscribedAllAt: { not: null } } },
      },
      select: { id: true },
    });
    if (optedOut) {
      return { action: "skip", reason: "Preferencia de baja de todos los correos" };
    }
    if (!newsletter) {
      return { action: "send" };
    }
    if (!newsletter.mailchimpConfigured || !newsletter.listUrl) {
      throw new Error("Mailchimp no disponible");
    }
    const hash = createHash("md5").update(normalizedEmail).digest("hex");
    const response = await fetch(
      `${newsletter.listUrl}/members/${hash}?fields=id,list_id,email_address,status`,
      {
        cache: "no-store",
        redirect: "error",
        headers: {
          Authorization: `Basic ${Buffer.from(`eyd:${newsletter.apiKey}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (response.status === 404) {
      return { action: "skip", reason: "Sin suscripción activa al newsletter" };
    }
    if (!response.ok) {
      throw new Error("Mailchimp no disponible");
    }
    const current = member.parse(await response.json());
    if (
      current.id !== hash ||
      current.list_id !== newsletter.listId ||
      current.email_address !== normalizedEmail
    ) {
      throw new Error("No se pudo verificar la suscripción");
    }
    return current.status === "subscribed"
      ? { action: "send" }
      : { action: "skip", reason: "Sin suscripción activa al newsletter" };
  } catch {
    return { action: "defer", reason: "No se pudieron comprobar las preferencias de correo" };
  }
}
