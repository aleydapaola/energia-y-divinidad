/**
 * Subscription Cancellation Service
 *
 * Servicio unificado para cancelar suscripciones de membresía.
 * Maneja cancelación en proveedores de pago, revocación de accesos y auditoría.
 */

import { SubscriptionStatus } from '@prisma/client'

import { createAuditLog } from '@/lib/audit'
import { cancelNequiSubscription, getNequiMode } from '@/lib/nequi'
import { prisma } from '@/lib/prisma'


// ============================================
// TYPES
// ============================================

export interface SubscriptionCancellationOptions {
  /** ID de la suscripción a cancelar */
  subscriptionId: string
  /** Quién inició la cancelación */
  cancelledBy: 'user' | 'admin' | 'system' | 'payment_failed'
  /** ID del usuario que solicita (para validación) */
  requestingUserId?: string
  /** Email del usuario que solicita (para auditoría) */
  requestingUserEmail?: string
  /** Razón de la cancelación */
  reason?: string
  /** Si cancelar inmediatamente o al final del período */
  immediate?: boolean
  /** Si se deben revocar entitlements inmediatamente */
  revokeEntitlementsNow?: boolean
}

export interface SubscriptionCancellationResult {
  success: boolean
  subscription?: {
    id: string
    status: SubscriptionStatus
    membershipTierName: string
    cancelledAt: Date | null
    currentPeriodEnd: Date
  }
  message?: string
  error?: string
  errorCode?: 'NOT_FOUND' | 'ALREADY_CANCELLED' | 'UNAUTHORIZED' | 'NO_ACTIVE_SUBSCRIPTION' | 'PROVIDER_ERROR' | 'INTERNAL_ERROR'
}

// Estados que permiten cancelación
const CANCELLABLE_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'PAST_DUE']

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
  } = options

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
    })

    if (!subscription) {
      return {
        success: false,
        error: 'Suscripción no encontrada',
        errorCode: 'NOT_FOUND',
      }
    }

    // 2. Validar que no esté ya cancelada
    if (subscription.status === 'CANCELLED') {
      return {
        success: false,
        error: 'La suscripción ya está cancelada',
        errorCode: 'ALREADY_CANCELLED',
      }
    }

    // 3. Si ya está marcada para cancelación (tiene cancelledAt pero sigue ACTIVE)
    if (subscription.cancelledAt && cancelledBy === 'user') {
      return {
        success: false,
        error: 'Esta suscripción ya está cancelada',
        errorCode: 'ALREADY_CANCELLED',
      }
    }

    // 4. Validar que esté en estado cancelable
    if (!CANCELLABLE_STATUSES.includes(subscription.status)) {
      return {
        success: false,
        error: `No se puede cancelar una suscripción en estado ${subscription.status}`,
        errorCode: 'NO_ACTIVE_SUBSCRIPTION',
      }
    }

    // 5. Validar permisos si es cancelación de usuario
    if (cancelledBy === 'user' && requestingUserId) {
      if (subscription.userId !== requestingUserId) {
        return {
          success: false,
          error: 'No tienes permiso para cancelar esta suscripción',
          errorCode: 'UNAUTHORIZED',
        }
      }
    }

    const now = new Date()
    const previousStatus = subscription.status

    // 6. Cancelar en el proveedor de pago
    const providerResult = await cancelInPaymentProvider(subscription, immediate)
    if (!providerResult.success) {
      console.error(`[SUB-CANCEL] Error cancelando en proveedor:`, providerResult.error)
      // Solo fallar si es crítico
      if (cancelledBy !== 'admin') {
        // Para usuarios, intentamos continuar aunque falle el proveedor
        // El webhook se encargará de sincronizar después
      }
    }

    // 7. Determinar nueva fecha de período según tipo de cancelación
    const newPeriodEnd = immediate ? now : subscription.currentPeriodEnd
    const shouldRevokeNow = immediate || revokeEntitlementsNow

    // 8. Actualizar suscripción
    // Para cancelación de usuario: mantener status ACTIVE pero marcar cancelledAt
    // Para cancelación inmediata/admin: cambiar status a CANCELLED
    const newStatus = immediate ? 'CANCELLED' : subscription.status

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: newStatus,
        cancelledAt: now,
        currentPeriodEnd: newPeriodEnd,
      },
    })

    // 9. Revocar entitlements si es inmediato
    if (shouldRevokeNow && subscription.entitlements.length > 0) {
      await prisma.entitlement.updateMany({
        where: {
          subscriptionId,
          revoked: false,
        },
        data: {
          revoked: true,
          revokedAt: now,
          revokedReason: reason || (cancelledBy === 'admin' ? 'Cancelación administrativa de suscripción' : 'Cancelación de suscripción'),
        },
      })
      console.log(`[SUB-CANCEL] Entitlements revocados para suscripción ${subscriptionId}`)
    }

    // 10. Crear audit log si es cancelación de admin
    if (cancelledBy === 'admin' && requestingUserId) {
      try {
        await createAuditLog({
          actorId: requestingUserId,
          actorEmail: requestingUserEmail || 'unknown',
          entityType: 'subscription',
          entityId: subscriptionId,
          action: 'cancel',
          before: {
            status: previousStatus,
            cancelledAt: null,
          },
          after: {
            status: newStatus,
            cancelledAt: now.toISOString(),
            immediate,
          },
          reason: reason || 'Cancelación administrativa',
          metadata: {
            userId: subscription.userId,
            userEmail: subscription.user.email,
            membershipTier: subscription.membershipTierName,
            immediate,
            providerCancellation: providerResult,
          },
        })
      } catch (auditError) {
        console.error(`[SUB-CANCEL] Error creando audit log:`, auditError)
        // No fallar la cancelación si falla el audit log
      }
    }

    console.log(`[SUB-CANCEL] Suscripción ${subscriptionId} cancelada por ${cancelledBy}`)

    // 11. Construir mensaje de respuesta
    let message: string
    if (immediate) {
      message = 'Suscripción cancelada inmediatamente'
    } else {
      message = `Tu suscripción ha sido cancelada. Mantendrás acceso hasta ${subscription.currentPeriodEnd.toLocaleDateString('es-ES')}`
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
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`[SUB-CANCEL] Error cancelando suscripción ${subscriptionId}:`, error)
    return {
      success: false,
      error: errorMessage || 'Error interno al cancelar la suscripción',
      errorCode: 'INTERNAL_ERROR',
    }
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
    paymentProvider: string
    stripeSubscriptionId: string | null
    nequiSubscriptionId: string | null
  },
  immediate: boolean
): Promise<{ success: boolean; error?: string }> {
  const provider = subscription.paymentProvider

  try {
    if (provider === 'stripe' && subscription.stripeSubscriptionId) {
      // LEGACY: Stripe ya no está soportado para nuevas suscripciones
      // Las suscripciones históricas de Stripe solo se marcan como canceladas localmente
      // El usuario debe cancelar manualmente en Stripe si aún tiene acceso
      console.warn(`LEGACY: Attempting to cancel Stripe subscription ${subscription.stripeSubscriptionId}. Manual cancellation may be required.`)
      return {
        success: true,
        error: 'Suscripción Stripe marcada como cancelada. Si el cobro continúa, contacta soporte.'
      }
    }

    if (provider === 'nequi' && subscription.nequiSubscriptionId) {
      // Verificar si Nequi Push está habilitado
      if (getNequiMode() === 'push') {
        await cancelNequiSubscription(subscription.nequiSubscriptionId)
      }
      return { success: true }
    }

    // Si no hay proveedor externo (manual, etc.), la cancelación es solo local
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: errorMessage }
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
      status: {
        in: CANCELLABLE_STATUSES,
      },
    },
  })
}

/**
 * Cancela la suscripción activa de un usuario
 * Útil para el endpoint de usuario que no requiere ID específico
 */
export async function cancelUserActiveSubscription(
  userId: string,
  reason?: string
): Promise<SubscriptionCancellationResult> {
  const subscription = await findActiveSubscription(userId)

  if (!subscription) {
    return {
      success: false,
      error: 'No tienes una suscripción activa',
      errorCode: 'NO_ACTIVE_SUBSCRIPTION',
    }
  }

  return cancelSubscription({
    subscriptionId: subscription.id,
    cancelledBy: 'user',
    requestingUserId: userId,
    reason,
    immediate: false, // Usuario siempre cancela al final del período
  })
}
