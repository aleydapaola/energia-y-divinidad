import { NextRequest, NextResponse } from "next/server";

import { processApprovedPayment } from "@/lib/payment-processor";
import { getPayPalSubscriptionDetails } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

/**
 * GET /api/checkout/paypal-subscription/activate?orderId=...&subscription_id=...
 *
 * PayPal redirige aquí después de que el usuario aprueba la suscripción.
 * Parámetros que envía PayPal: subscription_id, ba_token, token
 *
 * 1. Verifica el estado de la suscripción en PayPal
 * 2. Llama processApprovedPayment para crear Subscription + Entitlement local
 * 3. Redirige a la página de confirmación
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const paypalSubscriptionId = searchParams.get("subscription_id");
  const appUrl = getAppUrl();

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/pago/error?reason=missing_order`);
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.redirect(`${appUrl}/pago/error?reason=order_not_found`);
    }

    if (order.paymentStatus === "COMPLETED") {
      // Ya procesado — redirigir a confirmación directamente
      return NextResponse.redirect(
        `${appUrl}/pago/confirmacion?ref=${order.orderNumber}`
      );
    }

    const metadata = (order.metadata as Record<string, unknown>) || {};
    const subId = paypalSubscriptionId || (metadata.paypalSubscriptionId as string);

    if (!subId) {
      return NextResponse.redirect(`${appUrl}/pago/error?reason=missing_subscription`);
    }

    // Verificar en PayPal que la suscripción está activa/aprobada
    const details = await getPayPalSubscriptionDetails(subId);

    if (!details) {
      return NextResponse.redirect(`${appUrl}/pago/error?reason=subscription_not_found`);
    }

    const validStatuses = ["ACTIVE", "APPROVAL_PENDING", "APPROVED"];
    if (!validStatuses.includes(details.status)) {
      return NextResponse.redirect(
        `${appUrl}/pago/error?reason=subscription_not_approved&status=${details.status}`
      );
    }

    // Actualizar la orden con el subscription ID confirmado
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: {
          ...metadata,
          paypalSubscriptionId: subId,
          paypalStatus: details.status,
          activatedAt: new Date().toISOString(),
        },
      },
      include: { user: true },
    });

    // Procesar el pago aprobado — crea Subscription + Entitlement en BD
    const result = await processApprovedPayment(updatedOrder as Parameters<typeof processApprovedPayment>[0], {
      transactionId: subId,
    });

    if (!result.success) {
      console.error("[PAYPAL-SUB/ACTIVATE] Error procesando pago:", result.error);
      return NextResponse.redirect(`${appUrl}/pago/error?reason=processing_failed`);
    }

    return NextResponse.redirect(
      `${appUrl}/pago/confirmacion?ref=${order.orderNumber}`
    );
  } catch (error) {
    console.error("[PAYPAL-SUB/ACTIVATE] Error inesperado:", error);
    return NextResponse.redirect(`${appUrl}/pago/error?reason=server_error`);
  }
}
