import { NextRequest, NextResponse } from "next/server";

import { processPaymentWebhook } from "@/lib/payments";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { processMembershipWebhook, type MembershipEvent } from "@/lib/paypal-memberships";

/**
 * POST /api/webhooks/paypal
 *
 * Maneja dos tipos de eventos:
 * - Eventos de suscripción (BILLING.SUBSCRIPTION.*, PAYMENT.SALE.*) → renovación recurrente
 * - Eventos de orden/captura (CHECKOUT.ORDER.*, PAYMENT.CAPTURE.*) → primer pago / pago puntual
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const { valid, event, error: verifyError } = await verifyPayPalWebhook(request.headers, rawBody);

  if (!valid || !event) {
    console.error("[WEBHOOK/PAYPAL] Signature inválida:", verifyError);
    return NextResponse.json({ received: false, error: "Invalid signature" }, { status: 400 });
  }

  const eventType: string = event.event_type;

  // Eventos de suscripción recurrente
  if (eventType.startsWith("BILLING.SUBSCRIPTION.") || eventType.startsWith("PAYMENT.SALE.")) {
    try {
      const result = await processMembershipWebhook(event as unknown as MembershipEvent);
      return NextResponse.json({ received: true, ...result });
    } catch {
      return NextResponse.json(
        { received: false, error: "Membership reconciliation pending" },
        { status: 500 }
      );
    }
  }

  // Primer pago / pago puntual — procesador genérico
  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  });

  const result = await processPaymentWebhook("paypal", clonedRequest, rawBody);

  if (!result.success) {
    console.error("[WEBHOOK/PAYPAL] Error procesando webhook:", result.error);
    return NextResponse.json({ received: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    processed: result.processed,
    eventId: result.eventId,
  });
}

/**
 * GET /api/webhooks/paypal
 * PayPal puede enviar GET para verificar el endpoint
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
