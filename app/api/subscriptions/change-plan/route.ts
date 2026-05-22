import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipTierById } from "@/lib/sanity/queries/membership";

interface ChangePlanBody {
  tierId: string;
}

function getPaymentMethod(paymentProvider: string): "WOMPI_CARD" | "PAYPAL_DIRECT" | "NEQUI" {
  if (paymentProvider === "paypal_direct" || paymentProvider === "paypal_card") {
    return "PAYPAL_DIRECT";
  }
  if (paymentProvider === "nequi") {
    return "NEQUI";
  }
  return "WOMPI_CARD";
}

function getTierOrder(tier: { tierLevel?: number; displayOrder?: number }) {
  return tier.tierLevel || tier.displayOrder || 0;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body: ChangePlanBody = await request.json();
    if (!body.tierId) {
      return NextResponse.json({ error: "Falta el plan destino" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
        cancelledAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No tienes una membresía activa" }, { status: 404 });
    }

    if (subscription.membershipTierId === body.tierId) {
      return NextResponse.json({ error: "Ya tienes este plan activo" }, { status: 400 });
    }

    if (subscription.paymentProvider !== "wompi_card") {
      return NextResponse.json(
        {
          error:
            "El cambio programado automático está disponible por ahora para membresías con tarjeta Wompi.",
        },
        { status: 400 }
      );
    }

    const targetTier = await getMembershipTierById(body.tierId);
    const currentTier = await getMembershipTierById(subscription.membershipTierId);

    if (!targetTier) {
      return NextResponse.json({ error: "No se encontró el plan destino" }, { status: 404 });
    }

    const billingInterval = subscription.billingInterval === "YEARLY" ? "yearly" : "monthly";
    const amount =
      billingInterval === "yearly"
        ? targetTier.pricing.yearlyPrice
        : targetTier.pricing.monthlyPrice;

    if (!amount) {
      return NextResponse.json(
        { error: "El plan destino no tiene precio configurado para tu facturación actual" },
        { status: 400 }
      );
    }

    const currentOrder = currentTier ? getTierOrder(currentTier) : 0;
    const targetOrder = getTierOrder(targetTier);
    const changeType =
      targetOrder > currentOrder ? "upgrade" : targetOrder < currentOrder ? "downgrade" : "change";

    const existingPendingOrders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        orderType: "MEMBERSHIP",
        paymentStatus: "PENDING",
      },
      select: { id: true, metadata: true },
    });

    const pendingChangeOrderIds = existingPendingOrders
      .filter((order) => {
        const metadata =
          order.metadata && typeof order.metadata === "object"
            ? (order.metadata as Record<string, unknown>)
            : null;
        return (
          metadata?.scheduledPlanChange === true &&
          metadata.sourceSubscriptionId === subscription.id
        );
      })
      .map((order) => order.id);

    if (pendingChangeOrderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: pendingChangeOrderIds } },
        data: { paymentStatus: "CANCELLED" },
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        orderNumber: `CHG-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        orderType: "MEMBERSHIP",
        itemId: targetTier._id,
        itemName: targetTier.name,
        amount,
        currency: subscription.currency,
        paymentMethod: getPaymentMethod(subscription.paymentProvider),
        paymentStatus: "PENDING",
        metadata: {
          scheduledPlanChange: true,
          sourceSubscriptionId: subscription.id,
          currentTierId: subscription.membershipTierId,
          currentTierName: subscription.membershipTierName,
          targetTierId: targetTier._id,
          targetTierName: targetTier.name,
          billingInterval,
          effectiveAt: subscription.currentPeriodEnd.toISOString(),
          changeType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tu cambio a ${targetTier.name} quedó programado para el próximo período.`,
      pendingPlanChange: {
        orderId: order.id,
        targetTierId: targetTier._id,
        targetTierName: targetTier.name,
        amount,
        currency: subscription.currency,
        billingInterval,
        effectiveAt: subscription.currentPeriodEnd,
        changeType,
      },
    });
  } catch (error) {
    console.error("[SUBSCRIPTIONS/CHANGE-PLAN] Error:", error);
    return NextResponse.json({ error: "Error al programar el cambio de plan" }, { status: 500 });
  }
}
