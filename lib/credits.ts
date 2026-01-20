/**
 * Credits System Library
 *
 * Provides core functionality for managing session credits for membership subscribers.
 * Credits are granted monthly and can be redeemed when booking 1:1 sessions.
 */

import { prisma } from '@/lib/prisma'
import { CreditReason } from '@prisma/client'
import { getMembershipTierById } from '@/lib/sanity/queries/membership'

// ============================================
// TYPES
// ============================================

export interface CreditBalance {
  available: number
  pending: number // Credits expiring within 7 days
  total: number
  nextExpiration?: {
    date: Date
    amount: number
  }
}

export interface CreditTransaction {
  id: string
  amount: number
  reason: CreditReason
  referenceId?: string
  expiresAt?: Date
  createdAt: Date
  notes?: string
}

// ============================================
// BALANCE FUNCTIONS
// ============================================

/**
 * Get user's current credit balance.
 * Only counts unexpired GRANT credits minus REDEEM entries using FIFO.
 */
export async function getCreditsBalance(userId: string): Promise<CreditBalance> {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get all credit entries for user
  const entries = await prisma.creditsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  // Separate grants and redemptions
  const grants: { amount: number; expiresAt: Date | null; createdAt: Date }[] = []
  let totalRedeemed = 0

  for (const entry of entries) {
    if (
      entry.reason === 'MONTHLY_GRANT' ||
      entry.reason === 'PROMO_GRANT' ||
      entry.reason === 'ADMIN_ADJUSTMENT' ||
      entry.reason === 'REFUND'
    ) {
      if (entry.amount > 0) {
        // Check if expired
        if (!entry.expiresAt || entry.expiresAt > now) {
          grants.push({
            amount: entry.amount,
            expiresAt: entry.expiresAt,
            createdAt: entry.createdAt,
          })
        }
      } else {
        // Negative adjustment counts as redemption
        totalRedeemed += Math.abs(entry.amount)
      }
    } else if (entry.reason === 'REDEEM') {
      totalRedeemed += Math.abs(entry.amount)
    }
  }

  // Apply redemptions using FIFO (oldest grants first)
  let available = 0
  let pending = 0
  let nextExpiration: { date: Date; amount: number } | undefined

  let remainingRedemptions = totalRedeemed
  for (const grant of grants) {
    if (remainingRedemptions >= grant.amount) {
      remainingRedemptions -= grant.amount
    } else {
      const remainingInGrant = grant.amount - remainingRedemptions
      remainingRedemptions = 0
      available += remainingInGrant

      // Check if expiring soon (within 7 days)
      if (grant.expiresAt && grant.expiresAt <= sevenDaysFromNow) {
        pending += remainingInGrant
        if (!nextExpiration || grant.expiresAt < nextExpiration.date) {
          nextExpiration = { date: grant.expiresAt, amount: remainingInGrant }
        }
      }
    }
  }

  return {
    available,
    pending,
    total: available,
    nextExpiration,
  }
}

// ============================================
// GRANT FUNCTIONS
// ============================================

/**
 * Grant monthly credits to user based on their subscription tier.
 * Called when subscription is created or renewed.
 */
export async function grantMonthlyCredits(
  userId: string,
  subscriptionId: string
): Promise<{ granted: number; expiresAt: Date | null }> {
  // Get subscription to find tier
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`)
  }

  // Get tier from Sanity to know how many credits to grant
  const tier = await getMembershipTierById(subscription.membershipTierId)

  if (!tier) {
    console.warn(`[CREDITS] Membership tier ${subscription.membershipTierId} not found in Sanity`)
    return { granted: 0, expiresAt: null }
  }

  // Use oneOnOneSessionsIncluded as the credits count
  const creditsToGrant = tier.benefits?.oneOnOneSessionsIncluded || 0
  const expireDays = tier.benefits?.creditsExpireDays ?? 30

  if (creditsToGrant <= 0) {
    console.log(`[CREDITS] Tier ${tier.name} has no session credits configured`)
    return { granted: 0, expiresAt: null }
  }

  // Calculate expiration date
  const expiresAt = expireDays > 0 ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : null

  // Check for duplicate grant in same period (prevent double-granting)
  const periodStart = subscription.currentPeriodStart
  const existingGrant = await prisma.creditsLedger.findFirst({
    where: {
      userId,
      subscriptionId,
      reason: 'MONTHLY_GRANT',
      createdAt: { gte: periodStart },
    },
  })

  if (existingGrant) {
    console.log(
      `[CREDITS] Credits already granted for subscription ${subscriptionId} in current period`
    )
    return { granted: 0, expiresAt: null }
  }

  // Create credit entry
  await prisma.creditsLedger.create({
    data: {
      userId,
      amount: creditsToGrant,
      reason: 'MONTHLY_GRANT',
      subscriptionId,
      expiresAt,
      notes: `Créditos mensuales - ${tier.name}`,
    },
  })

  console.log(
    `[CREDITS] Granted ${creditsToGrant} credits to user ${userId} (expires: ${expiresAt?.toISOString() || 'never'})`
  )

  return { granted: creditsToGrant, expiresAt }
}

// ============================================
// REDEMPTION FUNCTIONS
// ============================================

/**
 * Redeem a credit for a booking.
 * Called when user books a session using their credit.
 */
export async function redeemCredit(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  // Check balance
  const balance = await getCreditsBalance(userId)

  if (balance.available < 1) {
    return { success: false, error: 'No hay créditos disponibles' }
  }

  // Verify booking exists and belongs to user
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking || booking.userId !== userId) {
    return { success: false, error: 'Reserva no encontrada' }
  }

  // Check if already redeemed for this booking
  const existingRedemption = await prisma.creditsLedger.findFirst({
    where: {
      userId,
      bookingId,
      reason: 'REDEEM',
    },
  })

  if (existingRedemption) {
    return { success: false, error: 'Crédito ya canjeado para esta reserva' }
  }

  // Create redemption entry
  await prisma.creditsLedger.create({
    data: {
      userId,
      amount: -1,
      reason: 'REDEEM',
      bookingId,
      notes: `Canje para ${booking.resourceName}`,
    },
  })

  console.log(`[CREDITS] Credit redeemed by user ${userId} for booking ${bookingId}`)

  return { success: true }
}

/**
 * Refund a credit when booking is cancelled.
 * Creates a new credit with 30-day expiration.
 */
export async function refundCredit(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; refunded: boolean }> {
  // Check if booking was paid with credit
  const redemption = await prisma.creditsLedger.findFirst({
    where: {
      userId,
      bookingId,
      reason: 'REDEEM',
    },
  })

  if (!redemption) {
    // Booking was not paid with credit
    return { success: true, refunded: false }
  }

  // Check if already refunded
  const existingRefund = await prisma.creditsLedger.findFirst({
    where: {
      userId,
      bookingId,
      reason: 'REFUND',
    },
  })

  if (existingRefund) {
    // Already refunded
    return { success: true, refunded: false }
  }

  // Create refund entry with 30-day expiration
  await prisma.creditsLedger.create({
    data: {
      userId,
      amount: 1,
      reason: 'REFUND',
      bookingId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: 'Devolución por cancelación de reserva',
    },
  })

  console.log(`[CREDITS] Credit refunded to user ${userId} for cancelled booking ${bookingId}`)

  return { success: true, refunded: true }
}

// ============================================
// HISTORY & AUDIT FUNCTIONS
// ============================================

/**
 * Get credit history for user.
 */
export async function getCreditsHistory(
  userId: string,
  limit: number = 50
): Promise<CreditTransaction[]> {
  const entries = await prisma.creditsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return entries.map((entry) => ({
    id: entry.id,
    amount: entry.amount,
    reason: entry.reason,
    referenceId: entry.referenceId || undefined,
    expiresAt: entry.expiresAt || undefined,
    createdAt: entry.createdAt,
    notes: entry.notes || undefined,
  }))
}

/**
 * Expire credits that have passed their expiration date.
 * This is for audit/logging purposes - the balance calculation
 * already excludes expired credits.
 */
export async function expireCredits(): Promise<{ expired: number }> {
  const now = new Date()

  // Count expired grants (for logging)
  const expiredCount = await prisma.creditsLedger.count({
    where: {
      reason: { in: ['MONTHLY_GRANT', 'PROMO_GRANT', 'ADMIN_ADJUSTMENT', 'REFUND'] },
      amount: { gt: 0 },
      expiresAt: { lte: now },
    },
  })

  console.log(`[CREDITS] ${expiredCount} credit entries have expired`)

  return { expired: expiredCount }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Admin function to manually adjust credits.
 */
export async function adminAdjustCredits(
  userId: string,
  amount: number,
  notes: string,
  adminUserId: string,
  expiresInDays?: number
): Promise<void> {
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  await prisma.creditsLedger.create({
    data: {
      userId,
      amount,
      reason: 'ADMIN_ADJUSTMENT',
      expiresAt,
      notes,
      createdBy: adminUserId,
    },
  })

  console.log(`[CREDITS] Admin ${adminUserId} adjusted credits for user ${userId}: ${amount > 0 ? '+' : ''}${amount}`)
}

/**
 * Check if a booking was paid with credit.
 */
export async function wasBookingPaidWithCredit(bookingId: string): Promise<boolean> {
  const redemption = await prisma.creditsLedger.findFirst({
    where: {
      bookingId,
      reason: 'REDEEM',
    },
  })

  return !!redemption
}
