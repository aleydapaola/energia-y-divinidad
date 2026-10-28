import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { assertMembershipPlan, moneyMinor } from "@/lib/membership-billing";
import {
  ensurePayPalSandboxMembershipPlan,
  ensurePayPalSandboxMembershipEvents,
} from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { client } from "@/lib/sanity/client";

export const maxDuration = 120;
export async function POST(request: NextRequest) {
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.PAYPAL_ENVIRONMENT !== "sandbox" ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "81jpalr2" ||
    process.env.NEXT_PUBLIC_SANITY_DATASET !== "preview"
  ) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
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
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no válido" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (body.acknowledge !== "EYD_PREVIEW_SANDBOX_ONLY") {
    return NextResponse.json({ error: "Confirma el entorno de pruebas" }, { status: 400 });
  }
  try {
    const tiers = await client.withConfig({ useCdn: false }).fetch<
      Array<{
        _id: string;
        name: string;
        slug: { current: string };
        pricing: { monthlyPriceUSD?: number; yearlyPriceUSD?: number };
      }>
    >('*[_type == "membershipTier" && active == true && _id in ["membership-esencia", "membership-divinidad"]]{_id,name,slug,pricing}', {}, { cache: "no-store" });
    if (tiers.length !== 2) {
      throw new Error("No se encontraron los dos planes de EYD esperados");
    }
    const prepared = [];
    for (const tier of tiers) {
      if (!["esencia", "divinidad"].includes(tier.slug?.current)) {
        throw new Error("Catálogo de pruebas no reconocido");
      }
      for (const interval of ["monthly", "yearly"] as const) {
        const amount =
          interval === "yearly" ? tier.pricing.yearlyPriceUSD : tier.pricing.monthlyPriceUSD;
        if (typeof amount !== "number" || moneyMinor(amount) <= 0) {
          throw new Error("Precio de pruebas no disponible");
        }
        const key = `${tier.slug.current.toUpperCase()}_USD_${interval.toUpperCase()}`;
        const plan = await ensurePayPalSandboxMembershipPlan({
          key,
          tierName: tier.name,
          amount,
          interval,
          currency: "USD",
        });
        assertMembershipPlan(
          plan,
          { planId: plan.id, amount, interval, currency: "USD" },
          { newAgreement: true }
        );
        prepared.push({
          key: `PREVIEW_PAYPAL_PLAN_ID_${key}`,
          planId: plan.id,
          tier: tier.name,
          amount,
          currency: "USD",
          interval,
        });
      }
    }
    const webhook = await ensurePayPalSandboxMembershipEvents();
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email || "ADMIN Preview",
        entityType: "subscription",
        entityId: "eyd-preview-paypal-plans",
        action: "create",
        reason: "Preparación autorizada de catálogo PayPal sandbox; sin compradores ni cargos",
        metadata: { prepared, webhook },
      },
    });
    return NextResponse.json(
      { environment: "EYD Preview sandbox", prepared, webhook },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preparación pendiente de revisión" },
      { status: 502 }
    );
  }
}
