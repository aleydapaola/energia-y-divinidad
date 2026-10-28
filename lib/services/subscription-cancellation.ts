/**
 * Subscription Cancellation Service
 *
 * Servicio unificado para cancelar suscripciones de membresía.
 * Maneja cancelación en proveedores de pago, revocación de accesos y auditoría.
 */

import { SubscriptionStatus } from "@prisma/client";

import { createAuditLog } from "@/lib/audit";
import { queueMembershipNotice, deliverMembershipNotices } from "@/lib/membership-notifications";
import { cancelNequiSubscription, getNequiMode } from "@/lib/nequi";
import { cancelPayPalSubscription } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

// ============================================
// TYPES
// ============================================

export interface SubscriptionCancellationOptions {
  /** ID de la suscripción a cancelar */
  subscriptionId: string;
  /** Quién inició la cancelación */
  cancelledBy: "user" | "admin" | "system" | "payment_failed";
  /** ID del usuario que solicita (para validación) */
  requestingUserId?: string;
  /** Email del usuario que solicita (para auditoría) */
  requestingUserEmail?: string;
  /** Razón de la cancelación */
  reason?: string;
  /** Si cancelar inmediatamente o al final del período */
  immediate?: boolean;
  /** Si se deben revocar entitlements inmediatamente */
  revokeEntitlementsNow?: boolean;
}

export interface SubscriptionCancellationResult {
  success: boolean;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    membershipTierName: string;
    cancelledAt: Date | null;
    currentPeriodEnd: Date;
  };
  message?: string;
  error?: string;
  errorCode?:
    | "NOT_FOUND"
    | "ALREADY_CANCELLED"
    | "UNAUTHORIZED"
    | "NO_ACTIVE_SUBSCRIPTION"
    | "PROVIDER_ERROR"
    | "INTERNAL_ERROR";
}

// Estados que permiten cancelación
const CANCELLABLE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIAL", "PAST_DUE"];

// ============================================
// MAIN CANCELLATION FUNCTION
// ============================================

/**
 * Cancela una suscripción con todas las operaciones necesarias
 */
export async function cancelSubscription(
  options: SubscriptionCancellationOptions
): Promise<SubscriptionCancellationResult> {
  const {
    subscriptionId,
    cancelledBy,
    requestingUserId,
    requestingUserEmail,
    reason,
    immediate = false,
    revokeEntitlementsNow = false,
  } = options;

  try {
    // 1. Obtener suscripción con usuario y entitlements
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        entitlements: true,
      },
    });

    if (!subscription) {
      return {
        success: false,
        error: "Suscripción no encontrada",
        errorCode: "NOT_FOUND",
      };
    }

    // 2. Validar que no esté ya cancelada
    if (subscription.status === "CANCELLED") {
      return {
        success: false,
        error: "La suscripción ya está cancelada",
        errorCode: "ALREADY_CANCELLED",
      };
    }

    // 3. Si ya está marcada para cancelación (tiene cancelledAt pero sigue ACTIVE)
    if (subscription.cancelledAt && cancelledBy === "user") {
      return {
        success: false,
        error: "Esta suscripción ya está cancelada",
        errorCode: "ALREADY_CANCELLED",
      };
    }

    // 4. Validar que esté en estado cancelable
    if (!CANCELLABLE_STATUSES.includes(subscription.status)) {
      return {
        success: false,
        error: `No se puede cancelar una suscripción en estado ${subscription.status}`,
        errorCode: "NO_ACTIVE_SUBSCRIPTION",
      };
    }

    // 5. Validar permisos si es cancelación de usuario
    if (cancelledBy === "user") {
      if (!requestingUserId || subscription.userId !== requestingUserId) {
        return {
          success: false,
          error: "No tienes permiso para cancelar esta suscripción",
          errorCode: "UNAUTHORIZED",
        };
      }
    }

    const now = new Date();
    const previousStatus = subscription.status;

    let providerResult: { success: boolean; error?: string } = { success: false };
    const newStatus = immediate ? "CANCELLED" : subscription.status;
    const updatedSubscription = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-user:${subscription.userId}`}))`;
        const current = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
        providerResult = await cancelInPaymentProvider(current, immediate);
        if (!providerResult.success) {
          throw new Error("PROVIDER_ERROR");
        }
        // A renewal may have completed while the request was being prepared.
        const updated = await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: immediate ? "CANCELLED" : current.status,
            cancelledAt: current.cancelledAt || now,
            currentPeriodEnd: immediate ? now : current.currentPeriodEnd,
            nextChargeDate: null,
          },
        });
        if (immediate || revokeEntitlementsNow) {
          await tx.entitlement.updateMany({
            where: { subscriptionId, revoked: false },
            data: {
              revoked: true,
              revokedAt: now,
              revokedReason: reason || "Cancelación inmediata de suscripción",
            },
          });
        }
        if (current.paypalSubscriptionId && !immediate) {
          const order = await tx.order.findFirst({
            where: {
              userId: current.userId,
              orderType: "MEMBERSHIP",
              metadata: { path: ["paypalSubscriptionId"], equals: current.paypalSubscriptionId },
            },
          });
          if (order) {
            await queueMembershipNotice(tx, {
              key: `cancelled:${subscriptionId}`,
              kind: "cancelled",
              to: subscription.user.email!,
              orderNumber: order.orderNumber,
              subscriptionId,
              plan: current.membershipTierName,
              amount: Number(current.amount),
              currency: current.currency,
              interval: current.billingInterval === "YEARLY" ? "yearly" : "monthly",
              periodEnd: current.currentPeriodEnd,
            });
          }
        }
        return updated;
      },
      { maxWait: 10000, timeout: 120000 }
    );
    if (subscription.paypalSubscriptionId) {
      await deliverMembershipNotices(subscriptionId).catch(() => undefined);
    }

    // 10. Crear audit log si es cancelación de admin
    if (cancelledBy === "admin" && requestingUserId) {
      try {
        await createAuditLog({
          actorId: requestingUserId,
          actorEmail: requestingUserEmail || "unknown",
          entityType: "subscription",
          entityId: subscriptionId,
          action: "cancel",
          before: {
            status: previousStatus,
            cancelledAt: null,
          },
          after: {
            status: newStatus,
            cancelledAt: now.toISOString(),
            immediate,
          },
          reason: reason || "Cancelación administrativa",
          metadata: {
            userId: subscription.userId,
            userEmail: subscription.user.email,
            membershipTier: subscription.membershipTierName,
            immediate,
            providerCancellation: providerResult,
          },
        });
      } catch (auditError) {
        console.error(`[SUB-CANCEL] Error creando audit log:`, auditError);
        // No fallar la cancelación si falla el audit log
      }
    }

    console.log(`[SUB-CANCEL] Suscripción ${subscriptionId} cancelada por ${cancelledBy}`);

    // 11. Construir mensaje de respuesta
    let message: string;
    if (immediate) {
      message = "Suscripción cancelada inmediatamente";
    } else {
      message = `Tu suscripción ha sido cancelada. Mantendrás acceso hasta ${updatedSubscription.currentPeriodEnd.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`;
    }

    return {
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        membershipTierName: updatedSubscription.membershipTierName,
        cancelledAt: updatedSubscription.cancelledAt,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
      message,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[SUB-CANCEL] Error cancelando suscripción ${subscriptionId}:`, error);
    return {
      success: false,
      error:
        errorMessage === "PROVIDER_ERROR"
          ? "No se pudo confirmar la cancelación en PayPal. La renovación no figura desactivada; vuelve a intentarlo o contacta con Aleyda."
          : "Error interno al cancelar la suscripción",
      errorCode: errorMessage === "PROVIDER_ERROR" ? "PROVIDER_ERROR" : "INTERNAL_ERROR",
    };
  }
}

// ============================================
// HELPER: CANCEL IN PAYMENT PROVIDER
// ============================================

/**
 * Cancela la suscripción en el proveedor de pago
 */
async function cancelInPaymentProvider(
  subscription: {
    paymentProvider: string;
    stripeSubscriptionId: string | null;
    nequiSubscriptionId: string | null;
    paypalSubscriptionId?: string | null;
  },
  _immediate: boolean
): Promise<{ success: boolean; error?: string }> {
  const provider = subscription.paymentProvider;

  try {
    if (provider === "stripe" && subscription.stripeSubscriptionId) {
      // LEGACY: Stripe ya no está soportado para nuevas suscripciones
      console.warn(
        `LEGACY: Attempting to cancel Stripe subscription ${subscription.stripeSubscriptionId}. Manual cancellation may be required.`
      );
      return {
        success: true,
        error: "Suscripción Stripe marcada como cancelada. Si el cobro continúa, contacta soporte.",
      };
    }

    if (provider === "nequi" && subscription.nequiSubscriptionId) {
      if (getNequiMode() === "push") {
        await cancelNequiSubscription(subscription.nequiSubscriptionId);
      }
      return { success: true };
    }

    if (subscription.paypalSubscriptionId) {
      const result = await cancelPayPalSubscription(
        subscription.paypalSubscriptionId,
        "Cancelado por el usuario"
      );
      return result;
    }

    // Wompi y métodos manuales: cancelación solo local (no hay suscripción en proveedor)
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: errorMessage };
  }
}

// ============================================
// FIND ACTIVE SUBSCRIPTION
// ============================================

/**
 * Busca la suscripción activa de un usuario
 */
export async function findActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: CANCELLABLE_STATUSES },
      OR: [{ currentPeriodEnd: { gt: new Date() } }, { cancelledAt: null }],
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Cancela la suscripción activa de un usuario
 * Útil para el endpoint de usuario que no requiere ID específico
 */
export async function cancelUserActiveSubscription(
  userId: string,
  reason?: string
): Promise<SubscriptionCancellationResult> {
  const subscription = await findActiveSubscription(userId);

  if (!subscription) {
    return {
      success: false,
      error: "No tienes una suscripción activa",
      errorCode: "NO_ACTIVE_SUBSCRIPTION",
    };
  }

  return cancelSubscription({
    subscriptionId: subscription.id,
    cancelledBy: "user",
    requestingUserId: userId,
    reason,
    immediate: false, // Usuario siempre cancela al final del período
  });
}
