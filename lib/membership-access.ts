import { prisma } from './prisma'
import type { MembershipStatus, PremiumContentAccess, UserSubscription } from '@/types/membership'
import type { MembershipTier } from '@/types/membership'

/**
 * Verifica si un usuario tiene una membresía activa
 */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ['ACTIVE', 'TRIAL'],
      },
      currentPeriodEnd: {
        gte: new Date(),
      },
    },
  })

  return !!subscription
}

/**
 * Obtiene la suscripción activa de un usuario
 */
export async function getActiveSubscription(userId: string): Promise<UserSubscription | null> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ['ACTIVE', 'TRIAL'],
      },
      currentPeriodEnd: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!subscription) return null

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
    startDate: subscription.startDate,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEnd: subscription.trialEnd,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  }
}

/**
 * Obtiene el tier de membresía de un usuario (desde Sanity)
 */
export async function getUserMembershipTier(
  userId: string
): Promise<{ tierId: string; tierLevel: number } | null> {
  const subscription = await getActiveSubscription(userId)
  if (!subscription) return null

  // Aquí necesitarás hacer un fetch a Sanity para obtener el tierLevel
  // Por ahora retornamos solo el ID
  return {
    tierId: subscription.membershipTierId,
    tierLevel: 0, // Esto debe venir de Sanity
  }
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
      type: 'PREMIUM_CONTENT',
      resourceId: contentId,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
  })

  if (purchaseEntitlement) {
    return {
      contentId,
      hasAccess: true,
      reason: 'purchase',
      entitlement: purchaseEntitlement,
    }
  }

  // 2. Verificar si tiene acceso por membresía
  const subscription = await getActiveSubscription(userId)
  if (!subscription) {
    return {
      contentId,
      hasAccess: false,
      reason: 'no_access',
    }
  }

  // Aquí necesitarás verificar contra Sanity si el tier del usuario
  // está en la lista de tiers permitidos para este contenido
  // Por ahora asumimos que sí tiene acceso si tiene membresía activa

  return {
    contentId,
    hasAccess: true,
    reason: 'membership',
    subscription,
  }
}

/**
 * Verifica si un usuario puede acceder a publicaciones de membresía
 */
export async function canAccessMembershipPost(
  userId: string,
  requiredTierId: string
): Promise<boolean> {
  const subscription = await getActiveSubscription(userId)
  if (!subscription) return false

  // Aquí necesitarás comparar tierLevel del usuario vs tierLevel requerido
  // desde Sanity. Por ahora verificamos solo que tenga membresía activa
  return true
}

/**
 * Obtiene el estado completo de membresía de un usuario
 */
export async function getMembershipStatus(userId: string): Promise<MembershipStatus> {
  const subscription = await getActiveSubscription(userId)

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
    }
  }

  const now = new Date()
  const daysUntilRenewal = Math.ceil(
    (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    hasActiveMembership: true,
    subscription,
    tier: null, // Esto debe obtenerse desde Sanity
    canAccessPremiumContent: true,
    canAccessMembershipPosts: true,
    daysUntilRenewal,
    isCancelled: subscription.status === 'CANCELLED',
    isInTrial: subscription.status === 'TRIAL',
  }
}

/**
 * Verifica si un usuario puede acceder a contenido según su país
 */
export function getPaymentRegion(countryCode?: string): 'colombia' | 'international' {
  return countryCode?.toUpperCase() === 'CO' ? 'colombia' : 'international'
}

/**
 * Obtiene los métodos de pago disponibles para un usuario según su región
 */
export function getAvailablePaymentMethods(region: 'colombia' | 'international') {
  if (region === 'colombia') {
    return [
      {
        type: 'nequi_recurring' as const,
        label: 'Nequi Débito Automático',
        description: 'Cobro automático recurrente desde tu cuenta Nequi. Apruébalo en tu app.',
        available: true,
        icon: '💰',
        isRecurring: true,
        recommended: true,
      },
      {
        type: 'nequi_manual' as const,
        label: 'Nequi Manual',
        description: 'Pago manual cada mes (requiere aprobación administrativa)',
        available: true,
        icon: '💸',
        isRecurring: false,
        recommended: false,
      },
    ]
  }

  return [
    {
      type: 'stripe' as const,
      label: 'Tarjeta de crédito/débito',
      description: 'Cobro automático recurrente con tarjeta mediante Stripe',
      available: true,
      icon: '💳',
      isRecurring: true,
      recommended: true,
    },
    {
      type: 'paypal' as const,
      label: 'PayPal',
      description: 'Pago mediante PayPal',
      available: false, // TODO: Implementar PayPal
      icon: '🅿️',
      isRecurring: true,
      recommended: false,
    },
  ]
}

/**
 * Calcula el precio según la región y el intervalo de facturación
 */
export function calculatePrice(
  tier: Pick<MembershipTier, 'pricing'>,
  region: 'colombia' | 'international',
  interval: 'monthly' | 'yearly'
): { amount: number; currency: 'COP' | 'USD' } {
  if (region === 'colombia') {
    return {
      amount: interval === 'monthly' ? tier.pricing.monthlyPrice || 0 : tier.pricing.yearlyPrice || 0,
      currency: 'COP',
    }
  }

  return {
    amount:
      interval === 'monthly' ? tier.pricing.monthlyPriceUSD || 0 : tier.pricing.yearlyPriceUSD || 0,
    currency: 'USD',
  }
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
  return await prisma.entitlement.create({
    data: {
      userId,
      subscriptionId,
      orderId,
      type: 'MEMBERSHIP',
      resourceId: membershipTierId,
      resourceName: membershipTierName,
      expiresAt: null, // Las membresías no expiran mientras la suscripción esté activa
    },
  })
}

/**
 * Revoca todos los entitlements de un usuario cuando cancela su membresía
 */
export async function revokeMembershipEntitlements(subscriptionId: string, reason: string) {
  await prisma.entitlement.updateMany({
    where: {
      subscriptionId,
      type: 'MEMBERSHIP',
      revoked: false,
    },
    data: {
      revoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  })
}
