import { prisma } from "./prisma";

import type {
  MembershipStatus,
  PremiumContentAccess,
  UserSubscription,
  MembershipTier,
} from "@/types/membership";

/**
 * Verifica si un usuario tiene una membresía activa
 */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ["ACTIVE", "TRIAL"],
      },
      currentPeriodEnd: {
        gte: new Date(),
      },
    },
  });

  return !!subscription;
}

/**
 * Obtiene la suscripción activa de un usuario
 */
export async function getActiveSubscription(userId: string): Promise<UserSubscription | null> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ["ACTIVE", "TRIAL"],
      },
      currentPeriodEnd: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscription) {
    return null;
  }

  const pendingPlanChangeOrder = await prisma.order.findFirst({
    where: {
      userId,
      orderType: "MEMBERSHIP",
      paymentStatus: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingPlanChangeMetadata =
    pendingPlanChangeOrder?.metadata && typeof pendingPlanChangeOrder.metadata === "object"
      ? (pendingPlanChangeOrder.metadata as Record<string, unknown>)
      : null;

  const pendingPlanChange =
    pendingPlanChangeOrder &&
    pendingPlanChangeMetadata?.scheduledPlanChange === true &&
    pendingPlanChangeMetadata.sourceSubscriptionId === subscription.id
      ? {
          orderId: pendingPlanChangeOrder.id,
          targetTierId: pendingPlanChangeOrder.itemId,
          targetTierName: pendingPlanChangeOrder.itemName,
          amount: pendingPlanChangeOrder.amount.toNumber(),
          currency: pendingPlanChangeOrder.currency,
          billingInterval:
            (pendingPlanChangeMetadata.billingInterval as "monthly" | "yearly") ||
            (subscription.billingInterval === "YEARLY" ? "yearly" : "monthly"),
          effectiveAt: pendingPlanChangeMetadata.effectiveAt
            ? new Date(pendingPlanChangeMetadata.effectiveAt as string)
            : subscription.currentPeriodEnd,
          changeType:
            (pendingPlanChangeMetadata.changeType as "upgrade" | "downgrade" | "change") ||
            "change",
        }
      : null;

  // Convertir Decimal a number y asegurar todos los campos
  return {
    id: subscription.id,
    userId: subscription.userId,
    membershipTierId: subscription.membershipTierId,
    membershipTierName: subscription.membershipTierName,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    amount: subscription.amount.toNumber(),
    currency: subscription.currency,
    paymentProvider: subscription.paymentProvider,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    stripeCustomerId: subscription.stripeCustomerId,
    nequiSubscriptionId: subscription.nequiSubscriptionId,
    nequiPhoneNumber: subscription.nequiPhoneNumber,
    nequiApprovedAt: subscription.nequiApprovedAt,
    wompiPaymentSourceId: subscription.wompiPaymentSourceId,
    wompiCardLastFour: subscription.wompiCardLastFour,
    wompiCardBrand: subscription.wompiCardBrand,
    paypalSubscriptionId: subscription.paypalSubscriptionId,
    nextChargeDate: subscription.nextChargeDate,
    lastChargeDate: subscription.lastChargeDate,
    pendingPlanChange,
    startDate: subscription.startDate,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEnd: subscription.trialEnd,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

/**
 * Obtiene el tier de membresía de un usuario (desde Sanity)
 */
export async function getUserMembershipTier(
  userId: string
): Promise<{ tierId: string; tierLevel: number } | null> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return null;
  }

  // Aquí necesitarás hacer un fetch a Sanity para obtener el tierLevel
  // Por ahora retornamos solo el ID
  return {
    tierId: subscription.membershipTierId,
    tierLevel: 0, // Esto debe venir de Sanity
  };
}

/**
 * Verifica si un usuario puede acceder a contenido premium específico
 */
export async function canAccessPremiumContent(
  userId: string,
  contentId: string
): Promise<PremiumContentAccess> {
  // 1. Verificar si tiene acceso por compra individual
  const purchaseEntitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      type: "PREMIUM_CONTENT",
      resourceId: contentId,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
  });

  if (purchaseEntitlement) {
    return {
      contentId,
      hasAccess: true,
      reason: "purchase",
      entitlement: purchaseEntitlement,
    };
  }

  // 2. Verificar si tiene acceso por membresía
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return {
      contentId,
      hasAccess: false,
      reason: "no_access",
    };
  }

  // Aquí necesitarás verificar contra Sanity si el tier del usuario
  // está en la lista de tiers permitidos para este contenido
  // Por ahora asumimos que sí tiene acceso si tiene membresía activa

  return {
    contentId,
    hasAccess: true,
    reason: "membership",
    subscription,
  };
}

/**
 * Verifica si un usuario puede acceder a publicaciones de membresía
 */
export async function canAccessMembershipPost(
  userId: string,
  _requiredTierId: string
): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return false;
  }

  // Aquí necesitarás comparar tierLevel del usuario vs tierLevel requerido
  // desde Sanity. Por ahora verificamos solo que tenga membresía activa
  return true;
}

/**
 * Obtiene el estado completo de membresía de un usuario
 */
export async function getMembershipStatus(userId: string): Promise<MembershipStatus> {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return {
      hasActiveMembership: false,
      subscription: null,
      tier: null,
      canAccessPremiumContent: false,
      canAccessMembershipPosts: false,
      daysUntilRenewal: null,
      isCancelled: false,
      isInTrial: false,
    };
  }

  const now = new Date();
  const daysUntilRenewal = Math.ceil(
    (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    hasActiveMembership: true,
    subscription,
    tier: null, // Esto debe obtenerse desde Sanity
    canAccessPremiumContent: true,
    canAccessMembershipPosts: true,
    daysUntilRenewal,
    isCancelled: subscription.status === "CANCELLED",
    isInTrial: subscription.status === "TRIAL",
  };
}

/**
 * Verifica si un usuario puede acceder a contenido según su país
 */
export function getPaymentRegion(countryCode?: string): "colombia" | "international" {
  return countryCode?.toUpperCase() === "CO" ? "colombia" : "international";
}

/**
 * Tipos de métodos de pago disponibles
 */
export type PaymentMethodType =
  | "wompi_nequi" // Nequi via Wompi (Colombia)
  | "wompi_card" // Tarjeta via Wompi automático (deshabilitado temporalmente)
  | "wompi_manual" // Wompi con link de pago genérico (Colombia + Internacional)
  | "breb_manual" // Bre-B transferencia manual con llave (Colombia)
  | "paypal_direct" // PayPal directo (Colombia + Internacional)
  | "paypal_card"; // Tarjeta via PayPal (Internacional)

export interface PaymentMethod {
  type: PaymentMethodType;
  label: string;
  description: string;
  available: boolean;
  icon: string;
  gateway: "wompi" | "paypal" | "breb";
  currency: "COP" | "USD" | "EUR";
  isRecurring: boolean;
  recommended: boolean;
}

/**
 * Obtiene los métodos de pago disponibles para un usuario según su región
 *
 * ESTRATEGIA DE PAGOS:
 * - Colombia: Tarjeta (Wompi), Bre-B (manual)
 * - Internacional: Tarjeta Wompi (equivalente COP) o PayPal (directo en USD/EUR)
 *
 * Wompi procesa en COP - tarjetas internacionales son aceptadas, el banco del cliente hace la conversión
 * PayPal procesa en USD/EUR según la moneda internacional seleccionada
 * Bre-B es pago manual con llave Bancolombia (sin comisiones, solo Colombia)
 */
export function getAvailablePaymentMethods(region: "colombia" | "international"): PaymentMethod[] {
  if (region === "colombia") {
    return [
      {
        type: "wompi_nequi",
        label: "Nequi",
        description: "Paga directamente desde tu cuenta Nequi. Apruébalo en tu app.",
        available: true,
        icon: "💜",
        gateway: "wompi",
        currency: "COP",
        isRecurring: true,
        recommended: true,
      },
      {
        type: "wompi_card",
        label: "Tarjeta de crédito/débito",
        description: "Paga con tu tarjeta Visa, Mastercard o American Express.",
        available: true,
        icon: "💳",
        gateway: "wompi",
        currency: "COP",
        isRecurring: true,
        recommended: false,
      },
      {
        type: "breb_manual",
        label: "Bre-B (Llave Bancolombia)",
        description: "Transferencia instantánea sin comisión desde tu app bancaria.",
        available: true,
        icon: "🔑",
        gateway: "breb",
        currency: "COP",
        isRecurring: false, // Bre-B manual no soporta recurrencia
        recommended: false,
      },
    ];
  }

  // Internacional
  return [
    {
      type: "wompi_card",
      label: "Tarjeta de crédito/débito",
      description:
        "Pay with your international card. Wompi charges the equivalent amount in COP automatically each billing period.",
      available: true,
      icon: "💳",
      gateway: "wompi",
      currency: "COP",
      isRecurring: true,
      recommended: true,
    },
    {
      type: "paypal_direct",
      label: "PayPal",
      description:
        "Pay securely with your PayPal account. Charged automatically each billing period.",
      available: true,
      icon: "🅿️",
      gateway: "paypal",
      currency: "USD",
      isRecurring: true,
      recommended: false,
    },
  ];
}

/**
 * Obtiene la pasarela de pago según el método seleccionado
 */
export function getPaymentGateway(methodType: PaymentMethodType): "wompi" | "paypal" | "breb" {
  if (methodType.startsWith("wompi_")) {
    return "wompi";
  }
  if (methodType === "breb_manual") {
    return "breb";
  }
  return "paypal";
}

/**
 * Obtiene la moneda según la región
 */
export function getCurrencyForRegion(region: "colombia" | "international"): "COP" | "USD" {
  return region === "colombia" ? "COP" : "USD";
}

/**
 * Calcula el precio según la región y el intervalo de facturación
 */
export function calculatePrice(
  tier: Pick<MembershipTier, "pricing">,
  region: "colombia" | "international",
  interval: "monthly" | "yearly"
): { amount: number; currency: "COP" | "USD" } {
  if (region === "colombia") {
    return {
      amount:
        interval === "monthly" ? tier.pricing.monthlyPrice || 0 : tier.pricing.yearlyPrice || 0,
      currency: "COP",
    };
  }

  return {
    amount:
      interval === "monthly" ? tier.pricing.monthlyPriceUSD || 0 : tier.pricing.yearlyPriceUSD || 0,
    currency: "USD",
  };
}

/**
 * Crea un entitlement de membresía cuando se completa un pago
 */
export async function createMembershipEntitlement(
  userId: string,
  subscriptionId: string,
  membershipTierId: string,
  membershipTierName: string,
  orderId?: string
) {
  return prisma.entitlement.create({
    data: {
      userId,
      subscriptionId,
      orderId,
      type: "MEMBERSHIP",
      resourceId: membershipTierId,
      resourceName: membershipTierName,
      expiresAt: null, // Las membresías no expiran mientras la suscripción esté activa
    },
  });
}

/**
 * Revoca todos los entitlements de un usuario cuando cancela su membresía
 */
export async function revokeMembershipEntitlements(subscriptionId: string, reason: string) {
  await prisma.entitlement.updateMany({
    where: {
      subscriptionId,
      type: "MEMBERSHIP",
      revoked: false,
    },
    data: {
      revoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}
