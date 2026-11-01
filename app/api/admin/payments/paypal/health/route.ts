import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { assertMembershipPlan } from "@/lib/membership-billing";
import { MEMBERSHIP_WEBHOOK_EVENTS } from "@/lib/membership-webhook-events";
import {
  PAYPAL_CONFIG,
  getPayPalBillingPlan,
  getPayPalPlanId,
  getPayPalWebhookDetails,
} from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { client } from "@/lib/sanity/client";

export const maxDuration = 60;

/** Read-only readiness check. Never creates a buyer agreement, order, charge or webhook. */
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
  const production = process.env.VERCEL_ENV === "production";
  const expectedMode = production ? "live" : "sandbox";
  const checks = {
    mode: PAYPAL_CONFIG.environment === expectedMode,
    credentialsPresent: !!(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret),
    webhookConfigured: !!PAYPAL_CONFIG.webhookId,
    plansValid: false,
    webhookValid: false,
  };
  const response = (ready: boolean) =>
    NextResponse.json(
      { ready, environment: expectedMode, checks },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "private, no-store" } }
    );
  if (!checks.mode || !checks.credentialsPresent || !checks.webhookConfigured) {
    return response(false);
  }
  try {
    const tiers = await client.withConfig({ useCdn: false }).fetch<
      Array<{
        _id: string;
        slug: { current: string };
        pricing: { monthlyPriceUSD?: number; yearlyPriceUSD?: number };
      }>
    >('*[_type == "membershipTier" && active == true && _id in ["membership-esencia", "membership-divinidad"]]{_id,slug,pricing}', {}, { cache: "no-store" });
    if (tiers.length !== 2 || new Set(tiers.map((t) => t.slug?.current)).size !== 2) {
      return response(false);
    }
    for (const tier of tiers) {
      if (!["esencia", "divinidad"].includes(tier.slug?.current)) {
        return response(false);
      }
      for (const interval of ["monthly", "yearly"] as const) {
        const amount =
          interval === "yearly" ? tier.pricing.yearlyPriceUSD : tier.pricing.monthlyPriceUSD;
        const planId = getPayPalPlanId(tier.slug.current, interval, "USD");
        if (!planId || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
          return response(false);
        }
        assertMembershipPlan(
          await getPayPalBillingPlan(planId),
          { planId, amount, interval, currency: "USD" },
          { newAgreement: true }
        );
      }
    }
    checks.plansValid = true;
    const webhook = await getPayPalWebhookDetails();
    if (!webhook || webhook.id !== PAYPAL_CONFIG.webhookId) {
      return response(false);
    }
    const url = new URL(webhook.url);
    const hosts = production
      ? ["www.energiaydivinidad.com"]
      : [
          "preview.energiaydivinidad.com",
          "energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app",
        ];
    const events = new Set([
      "PAYMENT.CAPTURE.COMPLETED",
      "PAYMENT.CAPTURE.DECLINED",
      "PAYMENT.CAPTURE.DENIED",
      ...MEMBERSHIP_WEBHOOK_EVENTS,
    ]);
    checks.webhookValid =
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      hosts.includes(url.hostname) &&
      url.pathname === "/api/webhooks/paypal" &&
      (!production || !url.search) &&
      webhook.event_types.length === events.size &&
      events.size === new Set(webhook.event_types.map((e) => e.name)).size &&
      webhook.event_types.every((event) => events.has(event.name));
    return response(checks.webhookValid);
  } catch {
    return response(false);
  }
}
