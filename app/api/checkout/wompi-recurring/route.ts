import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { applyCheckoutDiscount } from "@/lib/checkout/discounts";
import { convertInternationalToCOP, type InternationalCurrency } from "@/lib/currency-conversion";
import { processApprovedPayment } from "@/lib/payment-processor";
import { prisma } from "@/lib/prisma";
import { client } from "@/lib/sanity/client";
import { getAppUrl } from "@/lib/utils";
import { createWompiPaymentSource, generateWompiReference } from "@/lib/wompi";

interface WompiRecurringBody {
  // Datos del producto
  productId: string;
  productName: string;
  amount: number; // en COP
  billingInterval: "monthly" | "yearly";
  displayAmount?: number;
  displayCurrency?: "COP" | InternationalCurrency;
  exchangeRate?: number;
  discountCode?: string;

  // Token de tarjeta (obtenido client-side por WompiCardForm)
  cardToken: string;
  acceptanceToken: string;
  cardLastFour: string;
  cardBrand: string;
  cardHolder: string;

  // Guest checkout (si no está autenticado)
  guestEmail?: string;
  guestName?: string;
}

/**
 * POST /api/checkout/wompi-recurring
 *
 * Flujo de activación para membresía recurrente con Wompi:
 * 1. Crea una Payment Source (tarjeta tokenizada) en Wompi
 * 2. Activa el primer mes gratis sin cobrar hoy
 * 3. Guarda la suscripción para que el cron cobre automáticamente al terminar el mes gratis
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Membresías requieren cuenta
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para adquirir una membresía" },
        { status: 401 }
      );
    }

    const body: WompiRecurringBody = await request.json();
    const {
      productId,
      productName,
      amount,
      billingInterval,
      displayAmount,
      displayCurrency = "COP",
      exchangeRate,
      discountCode,
      cardToken,
      acceptanceToken,
      cardLastFour,
      cardBrand,
      cardHolder,
    } = body;

    if (!productId || !productName || !amount || !cardToken || !acceptanceToken) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    if (!["COP", "USD", "EUR"].includes(displayCurrency)) {
      return NextResponse.json({ error: "Moneda no soportada para Wompi" }, { status: 400 });
    }

    const userId = session.user.id;
    const customerEmail = session.user.email;
    if (!customerEmail) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene un correo válido para registrar la tarjeta" },
        { status: 400 }
      );
    }
    const expectedPrice = await getMembershipPrice(productId, billingInterval, displayCurrency);

    if (!expectedPrice || expectedPrice.amount <= 0) {
      return NextResponse.json(
        { error: "No se pudo validar el precio de la membresía" },
        { status: 400 }
      );
    }

    const expectedAmount =
      displayCurrency === "COP"
        ? expectedPrice.amount
        : (await convertInternationalToCOP(expectedPrice.amount, displayCurrency)).convertedAmount;

    const amountToleranceCOP = displayCurrency === "COP" ? 0 : 1000;
    if (Math.abs(Math.round(amount) - Math.round(expectedAmount)) > amountToleranceCOP) {
      console.warn("[WOMPI-RECURRING] Monto inválido recibido:", {
        productId,
        billingInterval,
        received: amount,
        expected: expectedAmount,
        displayCurrency,
      });
      return NextResponse.json({ error: "Monto de membresía inválido" }, { status: 400 });
    }

    let discount: Awaited<ReturnType<typeof applyCheckoutDiscount>>;
    try {
      discount = await applyCheckoutDiscount({
        discountCode,
        userId,
        productType: "membership",
        amount: Math.round(expectedAmount),
        currency: "COP",
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Código de descuento inválido" },
        { status: 400 }
      );
    }

    if (discount.finalAmount <= 0) {
      return NextResponse.json(
        { error: "El cupón no puede dejar una membresía recurrente en $0" },
        { status: 400 }
      );
    }

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

    const reference = generateWompiReference("REC");
    const appUrl = getAppUrl();

    // 1. Crear Payment Source en Wompi (tarjeta tokenizada para cobros futuros)
    let paymentSource;
    try {
      paymentSource = await createWompiPaymentSource({
        type: "CARD",
        token: cardToken,
        customerEmail,
        acceptanceToken,
      });
    } catch (err) {
      console.error("[WOMPI-RECURRING] Error creando Payment Source:", err);
      return NextResponse.json(
        { error: "No se pudo registrar la tarjeta. Verifica los datos e intenta nuevamente." },
        { status: 422 }
      );
    }

    if (paymentSource.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "La tarjeta aún no quedó disponible para cobros recurrentes" },
        { status: 422 }
      );
    }

    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);

    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber: reference,
        orderType: "MEMBERSHIP",
        itemId: productId,
        itemName: productName,
        amount: 0,
        currency: "COP",
        paymentMethod: "WOMPI_CARD",
        paymentStatus: "COMPLETED",
        metadata: {
          productType: "membership",
          billingInterval,
          recurringAmount: discount.finalAmount,
          displayAmount: displayAmount ?? expectedPrice.amount,
          displayCurrency,
          exchangeRate,
          chargedAmountCOP: discount.finalAmount,
          originalRecurringAmount: Math.round(expectedAmount),
          freeTrial: true,
          trialEndsAt: trialEndsAt.toISOString(),
          isGuestCheckout: false,
          customerEmail,
          customerName: session.user.name || cardHolder,
          wompiPaymentSourceId: String(paymentSource.id),
          wompiCardLastFour: cardLastFour,
          wompiCardBrand: cardBrand,
          wompiStatus: "TRIAL_STARTED",
        },
        originalAmount: discount.originalAmount,
        discountAmount: discount.discountAmount > 0 ? discount.discountAmount : null,
        discountCodeId: discount.discountCodeId,
        discountCode: discount.discountCode,
      },
    });

    const approvedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { user: true },
    });

    if (!approvedOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 500 });
    }

    const result = await processApprovedPayment(approvedOrder, {
      transactionId: `wompi_trial_${paymentSource.id}`,
    });

    if (!result.success) {
      console.error("[WOMPI-RECURRING] Error activando prueba de membresía:", result.error);
      return NextResponse.json(
        { error: "La tarjeta se registró, pero no se pudo activar la membresía" },
        { status: 500 }
      );
    }

    const redirectUrl = `${appUrl}/pago/confirmacion?ref=${reference}`;

    return NextResponse.json({
      success: true,
      reference,
      status: "TRIAL",
      trialEndsAt: trialEndsAt.toISOString(),
      redirectUrl,
    });
  } catch (error) {
    console.error("[WOMPI-RECURRING] Error inesperado:", error);
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}

async function getMembershipPrice(
  productId: string,
  billingInterval: "monthly" | "yearly",
  currency: "COP" | InternationalCurrency
): Promise<{ amount: number; currency: "COP" | InternationalCurrency } | null> {
  const tier = await client.fetch<{
    pricing?: {
      monthlyPrice?: number;
      yearlyPrice?: number;
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

  if (currency === "COP") {
    return {
      amount:
        billingInterval === "yearly"
          ? tier.pricing.yearlyPrice || 0
          : tier.pricing.monthlyPrice || 0,
      currency,
    };
  }

  if (currency === "EUR") {
    const amount =
      billingInterval === "yearly"
        ? tier.pricing.yearlyPriceEUR || 0
        : tier.pricing.monthlyPriceEUR || 0;
    return amount > 0 ? { amount, currency } : null;
  }

  return {
    amount:
      billingInterval === "yearly"
        ? tier.pricing.yearlyPriceUSD || 0
        : tier.pricing.monthlyPriceUSD || 0,
    currency,
  };
}
