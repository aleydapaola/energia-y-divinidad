import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createPayPalSubscription, getPayPalPlanId } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { client } from "@/lib/sanity/client";
import { getAppUrl } from "@/lib/utils";

interface PayPalSubscriptionBody {
  productId: string;
  productSlug?: string;
  productName: string;
  amount: number;
  currency: "USD" | "EUR";
  billingInterval: "monthly" | "yearly";
  discountCode?: string;
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
    const {
      productId,
      productSlug,
      productName,
      amount,
      currency,
      billingInterval,
      discountCode,
      guestName,
    } = body;

    if (!productId || !productName || !amount || !billingInterval) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    if (!["USD", "EUR"].includes(currency)) {
      return NextResponse.json(
        { error: "PayPal está disponible solo para pagos internacionales en USD o EUR" },
        { status: 400 }
      );
    }

    if (discountCode?.trim()) {
      return NextResponse.json(
        {
          error:
            "Los cupones de membresía no están disponibles con PayPal recurrente. Para aplicar un descuento, elige pago con tarjeta.",
        },
        { status: 400 }
      );
    }

    const expectedAmount = await getMembershipPrice(productId, billingInterval, currency);
    if (!expectedAmount || Math.abs(Number(amount) - expectedAmount) > 0.01) {
      console.warn("[PAYPAL-SUB] Monto inválido recibido:", {
        productId,
        billingInterval,
        currency,
        received: amount,
        expected: expectedAmount,
      });
      return NextResponse.json({ error: "Monto de membresía inválido" }, { status: 400 });
    }

    const userId = session.user.id;
    const customerEmail = session.user.email;
    if (!customerEmail) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene un correo válido para crear la suscripción" },
        { status: 400 }
      );
    }
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
    const planKey = productSlug || productId;
    const planId = getPayPalPlanId(planKey, billingInterval, currency);
    if (!planId) {
      console.error(
        `[PAYPAL-SUB] Plan ID no configurado para ${planKey} / ${currency} / ${billingInterval}`
      );
      return NextResponse.json(
        { error: `Este plan no está disponible en ${currency} por el momento` },
        { status: 503 }
      );
    }

    const appUrl = getAppUrl();
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);

    // Crear Order local PENDING antes de ir a PayPal. La suscripción empieza con 1 mes gratis,
    // así que la orden local se registra en 0 y guardamos el monto recurrente para renovaciones.
    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber: `PPLS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        orderType: "MEMBERSHIP",
        itemId: productId,
        itemName: productName,
        amount: 0,
        currency,
        paymentMethod: "PAYPAL_DIRECT",
        paymentStatus: "PENDING",
        metadata: {
          productType: "membership",
          billingInterval,
          recurringAmount: amount,
          freeTrial: true,
          trialEndsAt: trialEndsAt.toISOString(),
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
      startTime: trialEndsAt.toISOString(),
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

async function getMembershipPrice(
  productId: string,
  billingInterval: "monthly" | "yearly",
  currency: "USD" | "EUR"
): Promise<number | null> {
  const tier = await client.fetch<{
    pricing?: {
      monthlyPriceUSD?: number;
      yearlyPriceUSD?: number;
      monthlyPriceEUR?: number;
      yearlyPriceEUR?: number;
    };
  } | null>(
    `*[_type == "membershipTier" && _id == $productId][0]{
      pricing
    }`,
    { productId }
  );

  if (!tier?.pricing) {
    return null;
  }

  const amount =
    currency === "EUR"
      ? billingInterval === "yearly"
        ? tier.pricing.yearlyPriceEUR
        : tier.pricing.monthlyPriceEUR
      : billingInterval === "yearly"
        ? tier.pricing.yearlyPriceUSD
        : tier.pricing.monthlyPriceUSD;

  return amount && amount > 0 ? amount : null;
}
