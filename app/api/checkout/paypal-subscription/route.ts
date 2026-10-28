import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { COMMERCIAL_POLICY_VERSION } from "@/lib/commercial-policy";
import { assertMembershipPlan, moneyMinor } from "@/lib/membership-billing";
import { getMembershipQuote } from "@/lib/membership-catalog";
import { assertRecurringConsent, membershipIntent } from "@/lib/membership-intent";
import { createPayPalSubscription, getPayPalBillingPlan } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inicia sesión para ver tu oferta" }, { status: 401 });
  }
  try {
    const query = request.nextUrl.searchParams;
    const quote = await getMembershipQuote(
      session.user.id,
      query.get("tier") || "",
      query.get("interval"),
      query.get("currency")
    );
    return NextResponse.json(
      {
        tierId: quote.tierId,
        tierName: quote.tierName,
        amount: quote.amount,
        currency: quote.currency,
        billingInterval: quote.billingInterval,
        trialDays: quote.trialDays,
        available: !!quote.planId,
        termsVersion: COMMERCIAL_POLICY_VERSION,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Plan, moneda o período no disponible" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para adquirir una membresía" },
      { status: 401 }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    assertRecurringConsent(body);
  } catch {
    return NextResponse.json(
      { error: "Revisa las condiciones y autoriza la renovación recurrente" },
      { status: 400 }
    );
  }
  try {
    const quote = await getMembershipQuote(
      session.user.id,
      String(body.productId || ""),
      body.billingInterval,
      body.currency
    );
    if (
      body.discountCode ||
      moneyMinor(body.amount) !== moneyMinor(quote.amount) ||
      body.trialDays !== quote.trialDays
    ) {
      return NextResponse.json(
        {
          error:
            "El resumen ha cambiado. Revisa el precio; los cupones no están disponibles para esta suscripción.",
        },
        { status: 400 }
      );
    }
    if (!quote.planId) {
      return NextResponse.json(
        { error: "Este plan recurrente aún no está habilitado para pruebas" },
        { status: 503 }
      );
    }
    assertMembershipPlan(
      await getPayPalBillingPlan(quote.planId),
      {
        planId: quote.planId,
        amount: quote.amount,
        currency: quote.currency,
        interval: quote.billingInterval,
      },
      { newAgreement: true }
    );
    const userId = session.user.id;
    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-user:${userId}`}))`;
      const active = await tx.subscription.findFirst({
        where: {
          userId,
          status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
          OR: [{ currentPeriodEnd: { gt: new Date() } }, { cancelledAt: null }],
        },
      });
      if (active) {
        throw new Error("ACTIVE_MEMBERSHIP");
      }
      const pending = await tx.order.findFirst({
        where: {
          userId,
          orderType: "MEMBERSHIP",
          paymentStatus: { in: ["PENDING", "PROCESSING"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (pending) {
        const intent = membershipIntent(pending.metadata);
        if (
          pending.itemId !== quote.tierId ||
          intent.paypalPlanId !== quote.planId ||
          intent.recurringAmount !== quote.amount ||
          intent.currency !== quote.currency ||
          intent.billingInterval !== quote.billingInterval ||
          pending.createdAt.getTime() < Date.now() - 60 * 3600000
        ) {
          throw new Error("PENDING_MEMBERSHIP");
        }
        return pending;
      }
      // Recheck eligibility inside the same user lock used for activation.
      const usedTrial = await tx.subscription.findFirst({
        where: { userId, trialEnd: { not: null } },
        select: { id: true },
      });
      const trialDays = usedTrial ? 0 : quote.trialDays;
      const now = new Date();
      const trialEndsAt = trialDays
        ? new Date(now.getTime() + trialDays * 86400000).toISOString()
        : null;
      return tx.order.create({
        data: {
          userId,
          orderNumber: `PPLS-${randomUUID()}`,
          orderType: "MEMBERSHIP",
          itemId: quote.tierId,
          itemName: quote.tierName,
          amount: trialDays ? 0 : quote.amount,
          currency: quote.currency,
          paymentMethod: "PAYPAL_DIRECT",
          paymentStatus: "PENDING",
          metadata: {
            membershipFlowVersion: 2,
            productType: "membership",
            billingInterval: quote.billingInterval,
            recurringAmount: quote.amount,
            currency: quote.currency,
            freeTrial: trialDays > 0,
            trialDays,
            trialEndsAt,
            acceptedTermsVersion: COMMERCIAL_POLICY_VERSION,
            acceptedRecurring: true,
            acceptedAt: now.toISOString(),
            customerEmail: session.user!.email!,
            customerName: session.user!.name || "",
            paypalPlanId: quote.planId,
          },
        },
      });
    });
    const intent = membershipIntent(order.metadata);
    if (intent.approvalUrl && intent.paypalSubscriptionId) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        approvalUrl: intent.approvalUrl,
      });
    }
    const appUrl = getAppUrl();
    const result = await createPayPalSubscription({
      planId: intent.paypalPlanId,
      subscriberEmail: session.user.email,
      subscriberName: session.user.name || "",
      ...(intent.trialEndsAt ? { startTime: intent.trialEndsAt } : {}),
      returnUrl: `${appUrl}/api/checkout/paypal-subscription/activate?orderId=${encodeURIComponent(order.id)}`,
      cancelUrl: `${appUrl}/membresia/checkout?tier=${encodeURIComponent(order.itemId)}&interval=${intent.billingInterval}&cancelled=true`,
      customId: order.id,
    });
    // Keep an uncertain creation for reconciliation/retry with the SAME PayPal-Request-Id.
    if (!result.success || !result.subscriptionId || !result.approvalUrl) {
      return NextResponse.json(
        {
          error:
            "No se confirmó la creación en PayPal. Vuelve a este mismo resumen; no abras otra membresía.",
        },
        { status: 502 }
      );
    }
    const approval = new URL(result.approvalUrl);
    if (
      approval.protocol !== "https:" ||
      !["www.paypal.com", "www.sandbox.paypal.com"].includes(approval.hostname)
    ) {
      throw new Error("URL de autorización no válida");
    }
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-user:${userId}`}))`;
      const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      const freshIntent = membershipIntent(fresh.metadata);
      if (
        freshIntent.paypalSubscriptionId &&
        freshIntent.paypalSubscriptionId !== result.subscriptionId
      ) {
        throw new Error("Conflicting provider authorization");
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...freshIntent,
            paypalSubscriptionId: result.subscriptionId,
            approvalUrl: result.approvalUrl,
          } as Prisma.InputJsonObject,
        },
      });
    });
    return NextResponse.json({ success: true, orderId: order.id, approvalUrl: result.approvalUrl });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const message =
      code === "ACTIVE_MEMBERSHIP"
        ? "Ya tienes una membresía vigente o una renovación pendiente. Gestiona la actual antes de contratar otra."
        : code === "PENDING_MEMBERSHIP"
          ? "Existe otra autorización de membresía pendiente. Contacta con Aleyda antes de iniciar un segundo plan."
          : "No se pudo verificar el plan recurrente. Revisa el resumen o contacta con Aleyda.";
    return NextResponse.json(
      { error: message },
      { status: ["ACTIVE_MEMBERSHIP", "PENDING_MEMBERSHIP"].includes(code) ? 409 : 400 }
    );
  }
}
