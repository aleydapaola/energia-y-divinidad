/**
 * Event Perks Allocation Service
 *
 * Handles:
 * - Allocating perks to bookings after confirmation
 * - Checking cap availability
 * - Priority plan logic
 * - Delivery tracking
 */

import { prisma } from '@/lib/prisma'
import { getEventById } from '@/lib/sanity/queries/events'
import { PerkAllocationStatus } from '@prisma/client'
import type {
  EventPerk,
  PerkAllocationResult,
  BookingPerks,
  PerkType,
  PerkStats,
  PerkAllocationWithUser,
} from '@/types/events'

/**
 * Allocate all eligible perks for a booking
 * Called after booking is confirmed (payment completed)
 */
export async function allocatePerks(bookingId: string): Promise<PerkAllocationResult[]> {
  // 1. Get booking with user info
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: { membershipTierId: true },
          },
        },
      },
    },
  })

  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`)
  }

  // 2. Get event with perks from Sanity
  const event = await getEventById(booking.resourceId)

  if (!event || !event.perks || event.perks.length === 0) {
    return [] // No perks defined
  }

  // 3. Get user's active membership tier IDs
  const userTierIds = booking.user.subscriptions.map((s) => s.membershipTierId)

  // 4. Process each perk
  const results: PerkAllocationResult[] = []

  for (let i = 0; i < event.perks.length; i++) {
    const perk = event.perks[i] as EventPerk
    const result = await allocateSinglePerk({
      eventId: event._id,
      bookingId,
      userId: booking.userId,
      perk,
      perkIndex: i,
      userTierIds,
    })
    results.push(result)
  }

  return results
}

/**
 * Allocate a single perk to a booking
 */
async function allocateSinglePerk(params: {
  eventId: string
  bookingId: string
  userId: string
  perk: EventPerk
  perkIndex: number
  userTierIds: string[]
}): Promise<PerkAllocationResult> {
  const { eventId, bookingId, userId, perk, perkIndex, userTierIds } = params

  // Check if already allocated
  const existing = await prisma.perkAllocation.findUnique({
    where: {
      bookingId_perkType: { bookingId, perkType: perk.type },
    },
  })

  if (existing) {
    return {
      perkType: perk.type,
      perkTitle: perk.title,
      allocated: true,
      reason: 'already_allocated',
      status: existing.status,
    }
  }

  // Check if user has priority plan
  const hasPriorityPlan = perk.priorityPlans?.some((plan) =>
    userTierIds.includes(plan._id)
  )

  // Check cap availability (if not priority)
  let canAllocate = true
  let status: PerkAllocationStatus = 'PENDING'

  if (!hasPriorityPlan && perk.cap) {
    const allocatedCount = await prisma.perkAllocation.count({
      where: {
        eventId,
        perkType: perk.type,
        status: { not: 'UNAVAILABLE' },
      },
    })

    if (allocatedCount >= perk.cap) {
      canAllocate = false
      status = 'UNAVAILABLE'
    }
  }

  // Determine if auto-delivery applies
  const shouldAutoDeliver =
    perk.deliveryMode === 'automatic' && perk.assetUrl && canAllocate

  if (shouldAutoDeliver) {
    status = 'DELIVERED'
  }

  // Create allocation
  await prisma.perkAllocation.create({
    data: {
      eventId,
      bookingId,
      userId,
      perkType: perk.type,
      perkTitle: perk.title,
      perkIndex,
      status,
      assetUrl: shouldAutoDeliver ? perk.assetUrl : null,
      deliveredAt: shouldAutoDeliver ? new Date() : null,
      metadata: {
        hasPriorityPlan,
        priorityPlanId: hasPriorityPlan
          ? userTierIds.find((id) => perk.priorityPlans?.some((p) => p._id === id))
          : null,
        deliveryMode: perk.deliveryMode,
      },
    },
  })

  return {
    perkType: perk.type,
    perkTitle: perk.title,
    allocated: canAllocate,
    reason: hasPriorityPlan
      ? 'priority_plan'
      : canAllocate
        ? 'available'
        : 'cap_reached',
    status,
  }
}

/**
 * Get all perks for a booking
 */
export async function getBookingPerks(bookingId: string): Promise<BookingPerks | null> {
  const allocations = await prisma.perkAllocation.findMany({
    where: { bookingId },
    orderBy: { perkIndex: 'asc' },
  })

  if (allocations.length === 0) {
    return null
  }

  return {
    bookingId,
    eventId: allocations[0].eventId,
    allocations: allocations.map((a) => ({
      id: a.id,
      perkType: a.perkType as PerkType,
      perkTitle: a.perkTitle,
      status: a.status,
      assetUrl: a.assetUrl || undefined,
      deliveredAt: a.deliveredAt || undefined,
    })),
  }
}

/**
 * Get perks for multiple bookings at once (optimized)
 */
export async function getPerksForBookings(
  bookingIds: string[]
): Promise<Map<string, BookingPerks>> {
  const allocations = await prisma.perkAllocation.findMany({
    where: { bookingId: { in: bookingIds } },
    orderBy: { perkIndex: 'asc' },
  })

  const perksMap = new Map<string, BookingPerks>()

  for (const allocation of allocations) {
    let bookingPerks = perksMap.get(allocation.bookingId)
    if (!bookingPerks) {
      bookingPerks = {
        bookingId: allocation.bookingId,
        eventId: allocation.eventId,
        allocations: [],
      }
      perksMap.set(allocation.bookingId, bookingPerks)
    }

    bookingPerks.allocations.push({
      id: allocation.id,
      perkType: allocation.perkType as PerkType,
      perkTitle: allocation.perkTitle,
      status: allocation.status,
      assetUrl: allocation.assetUrl || undefined,
      deliveredAt: allocation.deliveredAt || undefined,
    })
  }

  return perksMap
}

/**
 * Mark a perk as delivered (admin action)
 */
export async function deliverPerk(params: {
  allocationId: string
  assetUrl?: string
  adminUserId: string
}): Promise<void> {
  const { allocationId, assetUrl, adminUserId } = params

  const allocation = await prisma.perkAllocation.findUnique({
    where: { id: allocationId },
  })

  if (!allocation) {
    throw new Error('Allocation not found')
  }

  if (allocation.status === 'UNAVAILABLE') {
    throw new Error('Cannot deliver an unavailable perk')
  }

  await prisma.perkAllocation.update({
    where: { id: allocationId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      deliveredBy: adminUserId,
      assetUrl: assetUrl || allocation.assetUrl,
    },
  })
}

/**
 * Bulk deliver perks for an event
 */
export async function bulkDeliverPerks(params: {
  eventId: string
  perkType: string
  assetUrl: string
  adminUserId: string
}): Promise<{ updated: number }> {
  const { eventId, perkType, assetUrl, adminUserId } = params

  const result = await prisma.perkAllocation.updateMany({
    where: {
      eventId,
      perkType,
      status: 'PENDING',
    },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      deliveredBy: adminUserId,
      assetUrl,
    },
  })

  return { updated: result.count }
}

/**
 * Get perk allocation stats for an event
 */
export async function getEventPerkStats(eventId: string): Promise<PerkStats[]> {
  const allocations = await prisma.perkAllocation.groupBy({
    by: ['perkType', 'perkTitle', 'status'],
    where: { eventId },
    _count: { status: true },
  })

  // Aggregate by perk type
  const statsMap = new Map<
    string,
    PerkStats
  >()

  for (const row of allocations) {
    const key = row.perkType
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        perkType: row.perkType,
        perkTitle: row.perkTitle,
        total: 0,
        delivered: 0,
        pending: 0,
        unavailable: 0,
      })
    }

    const stat = statsMap.get(key)!
    stat.total += row._count.status

    switch (row.status) {
      case 'DELIVERED':
        stat.delivered += row._count.status
        break
      case 'PENDING':
        stat.pending += row._count.status
        break
      case 'UNAVAILABLE':
        stat.unavailable += row._count.status
        break
    }
  }

  return Array.from(statsMap.values())
}

/**
 * Get all allocations for an event with user info (for admin)
 */
export async function getEventAllocations(
  eventId: string,
  filters?: { perkType?: string; status?: PerkAllocationStatus }
): Promise<PerkAllocationWithUser[]> {
  const allocations = await prisma.perkAllocation.findMany({
    where: {
      eventId,
      ...(filters?.perkType && { perkType: filters.perkType }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ perkIndex: 'asc' }, { createdAt: 'desc' }],
  })

  return allocations.map((a) => ({
    id: a.id,
    eventId: a.eventId,
    bookingId: a.bookingId,
    userId: a.userId,
    perkType: a.perkType as PerkType,
    perkTitle: a.perkTitle,
    perkIndex: a.perkIndex,
    status: a.status,
    assetUrl: a.assetUrl || undefined,
    deliveredAt: a.deliveredAt || undefined,
    deliveredBy: a.deliveredBy || undefined,
    createdAt: a.createdAt,
    user: a.user,
  }))
}
