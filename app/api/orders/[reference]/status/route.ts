import { NextRequest, NextResponse } from "next/server";

import { getBrebConfiguration } from "@/lib/breb";
import { checkoutHoldStatus, requiresCheckoutHold } from "@/lib/checkout/hold-store";
import { canAccessOrder } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orders/[reference]/status
 * Consultar estado de una orden por su referencia (orderNumber)
 *
 * Query params:
 * - verify=true: Verificar con Wompi si el pago está pendiente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json({ error: "Referencia requerida" }, { status: 400 });
    }

    // Buscar orden por orderNumber
    const order = await prisma.order.findFirst({
      where: { orderNumber: reference },
      select: {
        id: true,
        userId: true,
        entitlements: {
          where: { type: "MEMBERSHIP" },
          take: 1,
          select: {
            subscription: {
              select: {
                status: true,
                trialEnd: true,
                currentPeriodEnd: true,
                nextChargeDate: true,
                cancelledAt: true,
                amount: true,
                billingInterval: true,
              },
            },
          },
        },
        manualPayment: { select: { referenceNumber: true, approved: true } },
        checkoutHold: { select: { state: true, expiresAt: true } },
        orderNumber: true,
        orderType: true,
        itemId: true,
        itemName: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        paymentStatus: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (!(await canAccessOrder(order))) {
      return NextResponse.json({ error: "Pedido no disponible en esta sesión." }, { status: 404 });
    }
    const paymentStatus = order.paymentStatus;
    const metadata = order.metadata as Record<string, any> | null;
    // Resolved once: the QR flag and the key come from the same configuration.
    const reservation =
      checkoutHoldStatus(order.checkoutHold) ??
      (requiresCheckoutHold(order)
        ? {
            state: "UNRESERVED",
            expiresAt: order.createdAt.toISOString(),
            expired: true,
            canPay: false,
          }
        : null);
    const configuration = order.paymentMethod === "BREB_MANUAL" ? getBrebConfiguration() : null;
    const breb =
      configuration && reservation && !reservation.canPay
        ? { ...configuration, enabled: false, key: "", recipient: "", qrConfigured: false }
        : configuration;

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      itemName: order.itemName,
      itemId: order.itemId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      metadata: {
        isGuestCheckout: !!metadata?.isGuestCheckout,
        convertedFromGuest: !!metadata?.convertedFromGuest,
        userWasCreated: !!metadata?.userWasCreated,
      },
      ...(breb
        ? {
            breb,
            qrAvailable: breb.qrConfigured,
            reported: !!order.manualPayment,
            reportedReference: order.manualPayment?.referenceNumber,
          }
        : {}),
      paymentStatus,
      ...(order.orderType === "MEMBERSHIP" && metadata?.membershipFlowVersion === 2
        ? {
            membership: {
              isTrialActivation: metadata?.membershipActivation === "trial",
              trialEndsAt: metadata?.trialEndsAt || null,
              recurringAmount: Number(metadata?.recurringAmount),
              billingInterval: metadata?.billingInterval,
              currentPeriodEnd: order.entitlements?.[0]?.subscription?.currentPeriodEnd || null,
              renewalStopped: !!order.entitlements?.[0]?.subscription?.cancelledAt,
            },
          }
        : {}),
      reservation,
      amount: Number(order.amount),
    });
  } catch (error) {
    console.error("Error fetching order status:", error);
    return NextResponse.json({ error: "Error al consultar orden" }, { status: 500 });
  }
}
