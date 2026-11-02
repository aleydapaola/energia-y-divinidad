import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { readNewsletterList } from "@/lib/newsletter-gift";
import { newsletterGiftConfiguration, validNewsletterCallback } from "@/lib/newsletter-gift-config";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

/** Read-only configuration diagnosis; no member list, secrets, addresses or messages returned. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (actor?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const config = newsletterGiftConfiguration();
  const checks = {
    enabled: config.enabled,
    giftUrlValid: !!config.giftUrl,
    signingSecretConfigured: config.signatureConfigured,
    mailchimpConfigured: config.mailchimpConfigured,
    emailConfigured:
      !!process.env.RESEND_API_KEY &&
      (!config.production || process.env.EMAIL_DELIVERY_MODE !== "preview"),
    callbackValid: validNewsletterCallback(config.callbackUrl, config.production),
    audienceVerified: false,
    webhookVerified: false,
  };
  const response = () => {
    const ready = Object.values(checks).every(Boolean);
    return NextResponse.json(
      { ready, environment: config.production ? "production" : "preview", checks },
      {
        status: ready ? 200 : 503,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  };
  if (!checks.mailchimpConfigured) {
    return response();
  }
  try {
    await readNewsletterList(config);
    checks.audienceVerified = true;
    if (!checks.callbackValid) {
      return response();
    }
    const result = await fetch(`${config.listUrl}/webhooks`, {
      headers: { Authorization: `Basic ${Buffer.from(`eyd:${config.apiKey}`).toString("base64")}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!result.ok) {
      return response();
    }
    const data = await result.json();
    const hooks = Array.isArray(data.webhooks) ? data.webhooks : [];
    const matching = hooks.filter((h: { url?: string }) => h.url === config.callbackUrl);
    if (matching.length !== 1) {
      return response();
    }
    const hook = matching[0];
    checks.webhookVerified =
      hook.list_id === config.listId &&
      hook.signing_enabled === true &&
      hook.events?.subscribe === true &&
      Object.entries(hook.events).every(([k, v]) => k === "subscribe" || v === false) &&
      hook.sources?.user === true &&
      hook.sources?.admin === false &&
      hook.sources?.api === false;
    return response();
  } catch {
    return response();
  }
}
