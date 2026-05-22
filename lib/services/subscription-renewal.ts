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

import { prisma } from "@/lib/prisma";
import { chargeWompiPaymentSource, generateWompiReference } from "@/lib/wompi";

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

interface PendingPlanChange {
  orderId: string;
  targetTierId: string;
  targetTierName: string;
  amount: number;
  currency: string;
}

/**
 * Procesa todas las suscripciones Wompi con cobro pendiente para hoy.
 * Llamado por el cron diario.
 */
export async function processRenewalBatch(): Promise<BatchResult> {
  const now = new Date();

  // Buscar suscripciones Wompi que necesitan renovación hoy
  // Incluye pruebas gratis vencidas (TRIAL), reintentos y cobros normales.
  const subscriptions = await prisma.subscription.findMany({
    where: {
      wompiPaymentSourceId: { not: null },
      cancelledAt: null,
      status: { in: ["TRIAL", "ACTIVE", "PAST_DUE"] },
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
  const pendingPlanChange = await getPendingPlanChange(subscription.id);
  const chargeAmount = pendingPlanChange?.amount ?? Number(subscription.amount);
  const chargeCurrency = pendingPlanChange?.currency ?? subscription.currency;
  const amountInCents = Math.round(chargeAmount * 100);

  // Crear RecurringCharge en estado PENDING antes del intento
  const recurringCharge = await prisma.recurringCharge.create({
    data: {
      subscriptionId,
      reference,
      amount: chargeAmount,
      currency: chargeCurrency,
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

    if (transaction.status === "APPROVED") {
      await applySuccessfulRenewal(subscription.id, recurringCharge.id, transaction.id);
    } else if (
      transaction.status === "DECLINED" ||
      transaction.status === "ERROR" ||
      transaction.status === "VOIDED"
    ) {
      throw new Error(transaction.statusMessage || transaction.status);
    }

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

async function applySuccessfulRenewal(
  subscriptionId: string,
  recurringChargeId: string,
  transactionId: string
) {
  const recurringCharge = await prisma.recurringCharge.findUnique({
    where: { id: recurringChargeId },
    include: { subscription: true },
  });

  if (!recurringCharge || recurringCharge.status === "COMPLETED") {
    return;
  }

  const subscription = recurringCharge.subscription;
  const pendingPlanChange = await getPendingPlanChange(subscriptionId);
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
    prisma.recurringCharge.update({
      where: { id: recurringCharge.id },
      data: {
        status: "COMPLETED",
        externalId: transactionId,
        completedAt: new Date(),
      },
    }),
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        ...(pendingPlanChange
          ? {
              membershipTierId: pendingPlanChange.targetTierId,
              membershipTierName: pendingPlanChange.targetTierName,
              amount: pendingPlanChange.amount,
              currency: pendingPlanChange.currency,
            }
          : {}),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextChargeDate,
        lastChargeDate: new Date(),
        chargeFailureCount: 0,
        chargeFailureReason: null,
      },
    }),
    prisma.entitlement.updateMany({
      where: { subscriptionId, revoked: false },
      data: {
        ...(pendingPlanChange
          ? {
              resourceId: pendingPlanChange.targetTierId,
              resourceName: pendingPlanChange.targetTierName,
            }
          : {}),
        expiresAt: periodEnd,
      },
    }),
    ...(pendingPlanChange
      ? [
          prisma.order.update({
            where: { id: pendingPlanChange.orderId },
            data: { paymentStatus: "COMPLETED" },
          }),
        ]
      : []),
  ]);
}

async function getPendingPlanChange(subscriptionId: string): Promise<PendingPlanChange | null> {
  const orders = await prisma.order.findMany({
    where: {
      orderType: "MEMBERSHIP",
      paymentStatus: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const order = orders.find((candidate) => {
    const metadata =
      candidate.metadata && typeof candidate.metadata === "object"
        ? (candidate.metadata as Record<string, unknown>)
        : null;

    return (
      metadata?.scheduledPlanChange === true && metadata.sourceSubscriptionId === subscriptionId
    );
  });

  if (!order) {
    return null;
  }

  return {
    orderId: order.id,
    targetTierId: order.itemId,
    targetTierName: order.itemName,
    amount: Number(order.amount),
    currency: order.currency,
  };
}
