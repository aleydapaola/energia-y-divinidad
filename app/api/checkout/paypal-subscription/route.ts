import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createPayPalSubscription, getPayPalPlanId } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

interface PayPalSubscriptionBody {
  productId: string;
  productName: string;
  amount: number;
  currency: "USD" | "COP";
  billingInterval: "monthly" | "yearly";
  guestEmail?: string;
  guestName?: string;
}

/**
 * POST /api/checkout/paypal-subscription
 *
 * Inicia el flujo de suscripción recurrente con PayPal Billing Plans.
 * 1. Determina el plan ID desde variables de entorno
 * 2. Crea una Order local PENDING
 * 3. Crea la suscripción en PayPal
 * 4. Retorna la URL de aprobación para redirigir al usuario
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para adquirir una membresía" },
        { status: 401 }
      );
    }

    const body: PayPalSubscriptionBody = await request.json();
    const { productId, productName, amount, currency, billingInterval, guestName } = body;

    if (!productId || !productName || !amount || !billingInterval) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const userId = session.user.id;
    const customerEmail = session.user.email!;
    const customerName = session.user.name || guestName || "";

    // Verificar si ya tiene suscripción activa con este plan
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        membershipTierId: productId,
        status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
      },
    });

    if (existingSubscription) {
      return NextResponse.json({ error: "Ya tienes este plan activo" }, { status: 400 });
    }

    // Obtener el planId de PayPal desde env vars
    const planId = getPayPalPlanId(productId, billingInterval);
    if (!planId) {
      console.error(
        `[PAYPAL-SUB] Plan ID no configurado para ${productId} / ${billingInterval}`
      );
      return NextResponse.json(
        { error: "Este plan no está disponible por el momento" },
        { status: 503 }
      );
    }

    const appUrl = getAppUrl();

    // Crear Order local PENDING antes de ir a PayPal
    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber: `PPLS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        orderType: "MEMBERSHIP",
        itemId: productId,
        itemName: productName,
        amount,
        currency,
        paymentMethod: "PAYPAL_DIRECT",
        paymentStatus: "PENDING",
        metadata: {
          productType: "membership",
          billingInterval,
          isGuestCheckout: false,
          customerEmail,
          customerName,
          paypalPlanId: planId,
        },
      },
    });

    // Crear suscripción en PayPal
    const result = await createPayPalSubscription({
      planId,
      subscriberEmail: customerEmail,
      subscriberName: customerName,
      returnUrl: `${appUrl}/api/checkout/paypal-subscription/activate?orderId=${order.id}`,
      cancelUrl: `${appUrl}/membresia?cancelled=true`,
      customId: order.id,
    });

    if (!result.success || !result.subscriptionId || !result.approvalUrl) {
      await prisma.order.delete({ where: { id: order.id } });
      return NextResponse.json(
        { error: result.error || "No se pudo iniciar el pago con PayPal" },
        { status: 502 }
      );
    }

    // Guardar el PayPal subscription ID en la orden
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...(order.metadata as object),
          paypalSubscriptionId: result.subscriptionId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paypalSubscriptionId: result.subscriptionId,
      approvalUrl: result.approvalUrl,
    });
  } catch (error) {
    console.error("[PAYPAL-SUB] Error inesperado:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
