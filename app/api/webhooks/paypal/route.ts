import { NextRequest, NextResponse } from "next/server";

import { sendMembershipRenewalSuccessEmail, sendMembershipPaymentFailedEmail } from "@/lib/email";
import { processPaymentWebhook } from "@/lib/payments";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ received: true, error: "Invalid signature" }, { status: 200 });
  }

  const eventType: string = event.event_type;

  // Eventos de suscripción recurrente
  if (
    eventType.startsWith("BILLING.SUBSCRIPTION.") ||
    eventType.startsWith("PAYMENT.SALE.")
  ) {
    return handleSubscriptionWebhook(event);
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
    return NextResponse.json({ received: true, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ received: true, processed: result.processed, eventId: result.eventId });
}

/**
 * GET /api/webhooks/paypal
 * PayPal puede enviar GET para verificar el endpoint
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// ============================================
// SUBSCRIPTION EVENT HANDLERS
// ============================================

async function handleSubscriptionWebhook(event: {
  event_type: string;
  resource: Record<string, unknown>;
}): Promise<NextResponse> {
  const resource = event.resource;
  const eventType = event.event_type;

  // Para PAYMENT.SALE.* el ID de suscripción está en billing_agreement_id
  // Para BILLING.SUBSCRIPTION.* está directamente en resource.id
  const paypalSubscriptionId =
    (resource.billing_agreement_id as string) || (resource.id as string);

  if (!paypalSubscriptionId) {
    console.error("[WEBHOOK/PAYPAL-SUB] No se encontró subscription ID en evento:", eventType);
    return NextResponse.json({ received: true });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { paypalSubscriptionId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!subscription) {
    // Puede ser que la suscripción aún no esté creada (evento adelantado)
    console.warn(
      `[WEBHOOK/PAYPAL-SUB] Suscripción no encontrada para PayPal ID: ${paypalSubscriptionId} (evento: ${eventType})`
    );
    return NextResponse.json({ received: true });
  }

  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      // La suscripción fue activada en PayPal (generalmente ya la procesamos en /activate)
      if (subscription.status !== "ACTIVE") {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "ACTIVE" },
        });
        console.log(`[WEBHOOK/PAYPAL-SUB] Suscripción ${subscription.id} activada`);
      }
      break;

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "CANCELLED",
            cancelledAt: subscription.cancelledAt || new Date(),
          },
        }),
        prisma.entitlement.updateMany({
          where: { subscriptionId: subscription.id, revoked: false },
          data: {
            revoked: true,
            revokedAt: new Date(),
            revokedReason:
              eventType === "BILLING.SUBSCRIPTION.CANCELLED"
                ? "Suscripción cancelada en PayPal"
                : "Suscripción expirada en PayPal",
          },
        }),
      ]);
      console.log(`[WEBHOOK/PAYPAL-SUB] Suscripción ${subscription.id} ${eventType}`);
      break;
    }

    case "BILLING.SUBSCRIPTION.SUSPENDED":
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "PAST_DUE" },
      });
      break;

    case "PAYMENT.SALE.COMPLETED": {
      // Renovación exitosa — extender período
      const periodStart = new Date(subscription.currentPeriodEnd);
      const periodEnd = new Date(subscription.currentPeriodEnd);

      if (subscription.billingInterval === "YEARLY") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const nextChargeDate = new Date(periodEnd);
      nextChargeDate.setDate(nextChargeDate.getDate() - 1);

      const saleId = resource.id as string;
      const saleAmount = (resource.amount as { total?: string } | undefined)?.total;

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextChargeDate,
            lastChargeDate: new Date(),
            chargeFailureCount: 0,
            chargeFailureReason: null,
          },
        }),
        prisma.entitlement.updateMany({
          where: { subscriptionId: subscription.id, revoked: false },
          data: { expiresAt: periodEnd },
        }),
      ]);

      if (subscription.user?.email) {
        await sendMembershipRenewalSuccessEmail({
          email: subscription.user.email,
          name: subscription.user.name || "Miembro",
          plan: subscription.membershipTierName,
          amount: saleAmount ? parseFloat(saleAmount) : Number(subscription.amount),
          currency: subscription.currency as "COP" | "USD",
          nextRenewalDate: nextChargeDate,
          transactionId: saleId,
        }).catch((err) =>
          console.error("[WEBHOOK/PAYPAL-SUB] Error enviando email renovación:", err)
        );
      }

      console.log(
        `[WEBHOOK/PAYPAL-SUB] Renovación exitosa: ${subscription.id} → ${periodEnd.toISOString()}`
      );
      break;
    }

    case "PAYMENT.SALE.DENIED":
    case "PAYMENT.SALE.REFUNDED": {
      if (eventType === "PAYMENT.SALE.DENIED") {
        const failureCount = (subscription.chargeFailureCount || 0) + 1;
        const isLastAttempt = failureCount >= 3;
        const nextRetryAt = isLastAttempt
          ? null
          : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: isLastAttempt ? "PAST_DUE" : "ACTIVE",
            chargeFailureCount: failureCount,
            chargeFailureReason: "Pago rechazado por PayPal",
            nextChargeDate: nextRetryAt,
          },
        });

        if (isLastAttempt) {
          await prisma.entitlement.updateMany({
            where: { subscriptionId: subscription.id, revoked: false },
            data: {
              revoked: true,
              revokedAt: new Date(),
              revokedReason: "Pago fallido después de 3 intentos",
            },
          });
        }

        if (subscription.user?.email) {
          await sendMembershipPaymentFailedEmail({
            email: subscription.user.email,
            name: subscription.user.name || "Miembro",
            plan: subscription.membershipTierName,
            retryDate: nextRetryAt,
            isLastAttempt,
          }).catch((err) =>
            console.error("[WEBHOOK/PAYPAL-SUB] Error enviando email fallo:", err)
          );
        }

        console.error(
          `[WEBHOOK/PAYPAL-SUB] Cobro fallido (intento ${failureCount}/3): ${subscription.id}`
        );
      }
      break;
    }

    default:
      console.log(`[WEBHOOK/PAYPAL-SUB] Evento no manejado: ${eventType}`);
  }

  return NextResponse.json({ received: true, processed: true });
}
