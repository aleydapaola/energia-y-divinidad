import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";
import {
  createWompiPaymentSource,
  chargeWompiPaymentSource,
  generateWompiReference,
} from "@/lib/wompi";

interface WompiRecurringBody {
  // Datos del producto
  productId: string;
  productName: string;
  amount: number; // en COP
  billingInterval: "monthly" | "yearly";

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
 * Flujo de primer pago para membresía recurrente con Wompi:
 * 1. Crea una Payment Source (tarjeta tokenizada) en Wompi
 * 2. Cobra el primer período
 * 3. Crea la Order en BD — el webhook activa la Subscription
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
      cardToken,
      acceptanceToken,
      cardLastFour,
      cardBrand,
      cardHolder,
    } = body;

    if (!productId || !productName || !amount || !cardToken || !acceptanceToken) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const userId = session.user.id;
    const customerEmail = session.user.email!;

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

    // 2. Crear Order en BD (pendiente — el webhook la completará)
    const amountInCents = Math.round(amount * 100);

    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber: reference,
        orderType: "MEMBERSHIP",
        itemId: productId,
        itemName: productName,
        amount,
        currency: "COP",
        paymentMethod: "WOMPI_CARD",
        paymentStatus: "PENDING",
        metadata: {
          productType: "membership",
          billingInterval,
          isGuestCheckout: false,
          customerEmail,
          customerName: session.user.name || cardHolder,
          wompiPaymentSourceId: paymentSource.id,
          wompiCardLastFour: cardLastFour,
          wompiCardBrand: cardBrand,
        },
      },
    });

    // 3. Cobrar el primer período usando la Payment Source
    let transaction;
    try {
      transaction = await chargeWompiPaymentSource({
        paymentSourceId: paymentSource.id,
        amountInCents,
        reference,
        customerEmail,
      });
    } catch (err) {
      // Si el cobro falla, eliminar la orden (no queremos una orden fantasma)
      await prisma.order.delete({ where: { id: order.id } });
      console.error("[WOMPI-RECURRING] Error en primer cobro:", err);
      return NextResponse.json(
        { error: "La tarjeta fue rechazada. Verifica el saldo o usa otro método de pago." },
        { status: 422 }
      );
    }

    // 4. Actualizar Order con el transactionId de Wompi
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...(order.metadata as object),
          wompiTransactionId: transaction.id,
          wompiStatus: transaction.status,
        },
      },
    });

    // Si la transacción ya es APPROVED (Wompi a veces aprueba sincrónicamente),
    // el webhook también llegará — la idempotencia del webhook-processor evita duplicados.
    const redirectUrl = `${appUrl}/pago/confirmacion?ref=${reference}`;

    return NextResponse.json({
      success: true,
      reference,
      transactionId: transaction.id,
      status: transaction.status,
      redirectUrl,
    });
  } catch (error) {
    console.error("[WOMPI-RECURRING] Error inesperado:", error);
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}
