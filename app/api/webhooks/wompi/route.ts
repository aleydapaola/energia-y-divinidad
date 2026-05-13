import { NextRequest, NextResponse } from "next/server";

import { sendMembershipRenewalSuccessEmail, sendMembershipPaymentFailedEmail } from "@/lib/email";
import { processPaymentWebhook } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { verifyWompiWebhookSignature } from "@/lib/wompi";

/**
 * POST /api/webhooks/wompi
 *
 * Maneja dos tipos de referencias:
 * - RENEW-* → cobro de renovación automática (generado por el cron)
 * - Cualquier otra → primer pago / pago puntual (delegado al procesador genérico)
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verificar firma antes de cualquier procesamiento
  const signature = request.headers.get("x-event-checksum") || "";
  const timestamp = request.headers.get("x-event-timestamp") || Date.now().toString();

  if (!verifyWompiWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transaction = payload?.data?.transaction;
  const reference: string = transaction?.reference || "";

  // Cobro de renovación automática
  if (reference.startsWith("RENEW-")) {
    return handleRenewalWebhook(transaction, reference);
  }

  // Primer pago o pago puntual — procesador genérico
  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  });

  const result = await processPaymentWebhook("wompi", clonedRequest, rawBody);

  if (!result.success) {
    return NextResponse.json(
      { received: true, error: result.error },
      { status: result.error?.includes("Invalid") ? 401 : 500 }
    );
  }

  return NextResponse.json({
    received: true,
    processed: result.processed,
    eventId: result.eventId,
  });
}

/**
 * Procesa un webhook de renovación recurrente (referencia RENEW-*)
 */
async function handleRenewalWebhook(
  transaction: any,
  reference: string
): Promise<NextResponse> {
  const transactionId: string = transaction?.id || "";
  const status: string = transaction?.status || "";

  // Buscar el RecurringCharge por referencia
  const recurringCharge = await prisma.recurringCharge.findUnique({
    where: { reference },
    include: {
      subscription: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  if (!recurringCharge) {
    console.error(`[WEBHOOK/WOMPI-RENEWAL] RecurringCharge no encontrado: ${reference}`);
    return NextResponse.json({ received: true, error: "RecurringCharge not found" });
  }

  const subscription = recurringCharge.subscription;

  if (status === "APPROVED") {
    // Calcular nuevo período
    const periodStart = new Date(subscription.currentPeriodEnd);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    if (subscription.billingInterval === "YEARLY") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const nextChargeDate = new Date(periodEnd);
    nextChargeDate.setDate(nextChargeDate.getDate() - 1);

    await prisma.$transaction([
      // Marcar cobro como completado
      prisma.recurringCharge.update({
        where: { id: recurringCharge.id },
        data: {
          status: "COMPLETED",
          externalId: transactionId,
          completedAt: new Date(),
        },
      }),
      // Extender período de suscripción
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
      // Extender el entitlement de membresía
      prisma.entitlement.updateMany({
        where: { subscriptionId: subscription.id, revoked: false },
        data: { expiresAt: periodEnd },
      }),
    ]);

    // Email de renovación exitosa
    if (subscription.user?.email) {
      await sendMembershipRenewalSuccessEmail({
        email: subscription.user.email,
        name: subscription.user.name || "Miembro",
        plan: subscription.membershipTierName,
        amount: Number(subscription.amount),
        currency: subscription.currency as "COP" | "USD",
        nextRenewalDate: nextChargeDate,
        transactionId,
      }).catch((err) =>
        console.error("[WEBHOOK/WOMPI-RENEWAL] Error enviando email de renovación:", err)
      );
    }

    console.log(`[WEBHOOK/WOMPI-RENEWAL] Renovación exitosa: ${subscription.id} → ${periodEnd.toISOString()}`);
  } else if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
    const failureCount = (subscription.chargeFailureCount || 0) + 1;
    const isLastAttempt = failureCount >= 3;

    // Calcular próximo reintento o pasar a PAST_DUE
    const nextRetryAt = isLastAttempt ? null : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.recurringCharge.update({
        where: { id: recurringCharge.id },
        data: {
          status: isLastAttempt ? "FAILED" : "RETRYING",
          externalId: transactionId,
          failureReason: transaction?.status_message || status,
          retryCount: recurringCharge.retryCount + 1,
          nextRetryAt,
        },
      }),
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: isLastAttempt ? "PAST_DUE" : "ACTIVE",
          chargeFailureCount: failureCount,
          chargeFailureReason: transaction?.status_message || status,
          nextChargeDate: nextRetryAt,
        },
      }),
      // Si es último intento, revocar entitlements
      ...(isLastAttempt
        ? [
            prisma.entitlement.updateMany({
              where: { subscriptionId: subscription.id, revoked: false },
              data: {
                revoked: true,
                revokedAt: new Date(),
                revokedReason: "Pago fallido después de 3 intentos",
              },
            }),
          ]
        : []),
    ]);

    // Email de pago fallido
    if (subscription.user?.email) {
      await sendMembershipPaymentFailedEmail({
        email: subscription.user.email,
        name: subscription.user.name || "Miembro",
        plan: subscription.membershipTierName,
        retryDate: nextRetryAt,
        isLastAttempt,
      }).catch((err) =>
        console.error("[WEBHOOK/WOMPI-RENEWAL] Error enviando email de fallo:", err)
      );
    }

    console.error(
      `[WEBHOOK/WOMPI-RENEWAL] Cobro fallido (intento ${failureCount}/3): ${subscription.id}`
    );
  }

  return NextResponse.json({ received: true, processed: true });
}
