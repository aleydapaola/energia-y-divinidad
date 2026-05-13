/**
 * Subscription Renewal Service
 *
 * Gestiona los cobros recurrentes automáticos de membresías con Wompi.
 * PayPal cobra directamente vía su propia plataforma — solo necesitamos
 * procesar los webhooks de renovación de PayPal (ya manejados en el webhook).
 *
 * Flujo para Wompi:
 * 1. El cron diario llama processRenewalBatch()
 * 2. Se buscan suscripciones con nextChargeDate <= hoy
 * 3. Para cada una: se intenta el cobro con la tarjeta tokenizada
 * 4. Si falla: se reintenta 2 veces más con 2 días de margen cada vez
 * 5. Al 3er fallo: la suscripción pasa a PAST_DUE y se revoca el acceso
 */

import { chargeWompiPaymentSource, generateWompiReference } from "@/lib/wompi";
import { prisma } from "@/lib/prisma";

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_DAYS = 2;

export interface RenewalResult {
  subscriptionId: string;
  success: boolean;
  transactionId?: string;
  error?: string;
  chargeId?: string;
}

export interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  results: RenewalResult[];
}

/**
 * Procesa todas las suscripciones Wompi con cobro pendiente para hoy.
 * Llamado por el cron diario.
 */
export async function processRenewalBatch(): Promise<BatchResult> {
  const now = new Date();

  // Buscar suscripciones Wompi que necesitan renovación hoy
  // Incluye reintentos (RETRYING) y cobros normales (ACTIVE)
  const subscriptions = await prisma.subscription.findMany({
    where: {
      wompiPaymentSourceId: { not: null },
      cancelledAt: null,
      status: { in: ["ACTIVE", "PAST_DUE"] },
      nextChargeDate: { lte: now },
    },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  const results: RenewalResult[] = [];

  for (const subscription of subscriptions) {
    const result = await renewWompiSubscription(subscription.id);
    results.push(result);
  }

  return {
    processed: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Intenta renovar una suscripción Wompi específica.
 * El webhook de Wompi procesará el resultado del cobro y actualizará la BD.
 */
export async function renewWompiSubscription(subscriptionId: string): Promise<RenewalResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!subscription) {
    return { subscriptionId, success: false, error: "Suscripción no encontrada" };
  }

  if (!subscription.wompiPaymentSourceId) {
    return { subscriptionId, success: false, error: "Sin fuente de pago Wompi" };
  }

  if (!subscription.user?.email) {
    return { subscriptionId, success: false, error: "Sin email de usuario" };
  }

  const reference = generateWompiReference("RENEW");
  const amountInCents = Math.round(Number(subscription.amount) * 100);

  // Crear RecurringCharge en estado PENDING antes del intento
  const recurringCharge = await prisma.recurringCharge.create({
    data: {
      subscriptionId,
      reference,
      amount: subscription.amount,
      currency: subscription.currency,
      status: "PENDING",
      retryCount: subscription.chargeFailureCount,
    },
  });

  try {
    const transaction = await chargeWompiPaymentSource({
      paymentSourceId: subscription.wompiPaymentSourceId,
      amountInCents,
      reference,
      customerEmail: subscription.user.email,
    });

    // La transacción fue iniciada — el webhook de Wompi procesará el resultado final
    // (APPROVED / DECLINED) y actualizará RecurringCharge + Subscription

    console.log(
      `[RENEWAL] Cobro iniciado para suscripción ${subscriptionId}: ${transaction.id} (${transaction.status})`
    );

    return {
      subscriptionId,
      success: true,
      transactionId: transaction.id,
      chargeId: recurringCharge.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    const failureCount = (subscription.chargeFailureCount || 0) + 1;
    const isLastAttempt = failureCount >= MAX_RETRY_COUNT;
    const nextRetryAt = isLastAttempt
      ? null
      : new Date(Date.now() + RETRY_DELAY_DAYS * 24 * 60 * 60 * 1000);

    // Actualizar RecurringCharge como fallido
    await prisma.recurringCharge.update({
      where: { id: recurringCharge.id },
      data: {
        status: isLastAttempt ? "FAILED" : "RETRYING",
        failureReason: errorMessage,
        retryCount: failureCount,
        nextRetryAt,
      },
    });

    // Actualizar Subscription
    const updateData: any = {
      chargeFailureCount: failureCount,
      chargeFailureReason: errorMessage,
      nextChargeDate: nextRetryAt,
    };

    if (isLastAttempt) {
      updateData.status = "PAST_DUE";

      // Revocar entitlements al agotar intentos
      await prisma.entitlement.updateMany({
        where: { subscriptionId, revoked: false },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: "Pago fallido después de 3 intentos",
        },
      });
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    console.error(
      `[RENEWAL] Fallo en cobro (intento ${failureCount}/${MAX_RETRY_COUNT}) para ${subscriptionId}: ${errorMessage}`
    );

    return { subscriptionId, success: false, error: errorMessage, chargeId: recurringCharge.id };
  }
}
