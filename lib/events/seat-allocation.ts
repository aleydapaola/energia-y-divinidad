/**
 * Event Seat Allocation & Waitlist Management Service
 *
 * This service manages event capacity and waitlist for events with limited spots.
 * Source of truth for seat counting is Prisma (SeatAllocation table), not Sanity.
 */

import { prisma } from '@/lib/prisma'
import { getEventById } from '@/lib/sanity/queries/events'
import { Prisma, SeatAllocationStatus, WaitlistStatus } from '@prisma/client'

// Configuration constants
const WAITLIST_OFFER_HOURS = parseInt(process.env.WAITLIST_OFFER_HOURS || '24', 10)
const WAITLIST_REMINDER_HOURS = parseInt(process.env.WAITLIST_REMINDER_HOURS || '6', 10)

// Types
export interface AvailabilityResult {
  eventId: string
  capacity: number | null // null = unlimited
  allocatedSeats: number
  availableSpots: number | null // null = unlimited
  waitlistCount: number
}

export interface WaitlistStats {
  waiting: number
  offerPending: number
  accepted: number
  declined: number
  expired: number
  cancelled: number
  total: number
}

export interface WaitlistEntryWithEvent {
  id: string
  eventId: string
  userId: string
  position: number
  seatsRequested: number
  status: WaitlistStatus
  offerSentAt: Date | null
  offerExpiresAt: Date | null
  reminderSentAt: Date | null
  respondedAt: Date | null
  resultingBookingId: string | null
  userEmail: string
  userName: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================
// SEAT AVAILABILITY FUNCTIONS
// ============================================

/**
 * Get current available spots for an event.
 * Returns null for unlimited capacity events.
 */
export async function getAvailableSpots(eventId: string): Promise<number | null> {
  const event = await getEventById(eventId)

  if (!event) {
    throw new Error(`Event not found: ${eventId}`)
  }

  // If no capacity set, spots are unlimited
  if (!event.capacity) {
    return null
  }

  // Count active seat allocations
  const allocatedCount = await prisma.seatAllocation.aggregate({
    where: {
      eventId,
      status: 'ACTIVE',
    },
    _sum: {
      seats: true,
    },
  })

  const totalAllocated = allocatedCount._sum.seats || 0
  return Math.max(0, event.capacity - totalAllocated)
}

/**
 * Get detailed availability info for an event.
 */
export async function getEventAvailability(eventId: string): Promise<AvailabilityResult> {
  const event = await getEventById(eventId)

  if (!event) {
    throw new Error(`Event not found: ${eventId}`)
  }

  // Count active seat allocations
  const allocatedCount = await prisma.seatAllocation.aggregate({
    where: {
      eventId,
      status: 'ACTIVE',
    },
    _sum: {
      seats: true,
    },
  })

  // Count waitlist entries (WAITING or OFFER_PENDING)
  const waitlistCount = await prisma.waitlistEntry.count({
    where: {
      eventId,
      status: { in: ['WAITING', 'OFFER_PENDING'] },
    },
  })

  const totalAllocated = allocatedCount._sum.seats || 0
  const available = event.capacity ? Math.max(0, event.capacity - totalAllocated) : null

  return {
    eventId,
    capacity: event.capacity || null,
    allocatedSeats: totalAllocated,
    availableSpots: available,
    waitlistCount,
  }
}

/**
 * Check if an event has available spots for the requested number of seats.
 */
export async function hasAvailableSpots(eventId: string, seatsRequested: number = 1): Promise<boolean> {
  const available = await getAvailableSpots(eventId)

  // Unlimited capacity
  if (available === null) {
    return true
  }

  return available >= seatsRequested
}

// ============================================
// SEAT ALLOCATION FUNCTIONS
// ============================================

/**
 * Allocate seats for a booking within a transaction.
 * Should be called when creating a confirmed booking.
 */
export async function allocateSeats(
  tx: Prisma.TransactionClient,
  params: {
    eventId: string
    bookingId: string
    userId: string
    seats: number
  }
): Promise<{ id: string } | null> {
  const { eventId, bookingId, userId, seats } = params

  // Verify availability within transaction to prevent race conditions
  const event = await getEventById(eventId)

  if (!event) {
    throw new Error(`Event not found: ${eventId}`)
  }

  // If event has capacity, check availability
  if (event.capacity) {
    const allocatedCount = await tx.seatAllocation.aggregate({
      where: {
        eventId,
        status: 'ACTIVE',
      },
      _sum: {
        seats: true,
      },
    })

    const totalAllocated = allocatedCount._sum.seats || 0
    const available = event.capacity - totalAllocated

    if (seats > available) {
      return null // Not enough spots
    }
  }

  // Create allocation
  const allocation = await tx.seatAllocation.create({
    data: {
      eventId,
      bookingId,
      userId,
      seats,
      status: 'ACTIVE',
    },
  })

  return { id: allocation.id }
}

/**
 * Release seats when a booking is cancelled.
 * This marks the allocation as RELEASED and triggers waitlist processing.
 */
export async function releaseSeats(bookingId: string): Promise<number> {
  // Find and update the allocation
  const allocation = await prisma.seatAllocation.findUnique({
    where: { bookingId },
  })

  if (!allocation || allocation.status === 'RELEASED') {
    return 0
  }

  // Mark as released
  await prisma.seatAllocation.update({
    where: { id: allocation.id },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
    },
  })

  // Trigger waitlist processing (async, don't await)
  processWaitlistAfterRelease(allocation.eventId, allocation.seats).catch((error) => {
    console.error(`[SEAT-ALLOCATION] Error processing waitlist after release:`, error)
  })

  return allocation.seats
}

// ============================================
// WAITLIST FUNCTIONS
// ============================================

/**
 * Get user's waitlist position for an event.
 * Returns null if user is not in waitlist.
 */
export async function getWaitlistPosition(eventId: string, userId: string): Promise<number | null> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
    select: { position: true, status: true },
  })

  if (!entry || !['WAITING', 'OFFER_PENDING'].includes(entry.status)) {
    return null
  }

  return entry.position
}

/**
 * Get user's full waitlist entry for an event.
 */
export async function getWaitlistEntry(
  eventId: string,
  userId: string
): Promise<WaitlistEntryWithEvent | null> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  })

  return entry
}

/**
 * Add user to waitlist for an event.
 */
export async function addToWaitlist(params: {
  eventId: string
  userId: string
  seatsRequested: number
  userEmail: string
  userName?: string
  notes?: string
}): Promise<WaitlistEntryWithEvent> {
  const { eventId, userId, seatsRequested, userEmail, userName, notes } = params

  // Check if user already in waitlist
  const existing = await prisma.waitlistEntry.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  })

  if (existing && ['WAITING', 'OFFER_PENDING'].includes(existing.status)) {
    throw new Error('Ya estás en la lista de espera para este evento')
  }

  // Get next position
  const maxPosition = await prisma.waitlistEntry.aggregate({
    where: { eventId },
    _max: { position: true },
  })

  const nextPosition = (maxPosition._max.position || 0) + 1

  // If there was a previous entry (declined/expired/cancelled), update it
  if (existing) {
    const updated = await prisma.waitlistEntry.update({
      where: { id: existing.id },
      data: {
        position: nextPosition,
        seatsRequested,
        status: 'WAITING',
        offerSentAt: null,
        offerExpiresAt: null,
        reminderSentAt: null,
        respondedAt: null,
        resultingBookingId: null,
        userEmail,
        userName,
        notes,
      },
    })
    return updated
  }

  // Create new entry
  const entry = await prisma.waitlistEntry.create({
    data: {
      eventId,
      userId,
      position: nextPosition,
      seatsRequested,
      status: 'WAITING',
      userEmail,
      userName,
      notes,
    },
  })

  return entry
}

/**
 * Remove user from waitlist (cancel their entry).
 */
export async function cancelWaitlistEntry(entryId: string, userId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  })

  if (!entry) {
    throw new Error('Entrada de lista de espera no encontrada')
  }

  if (entry.userId !== userId) {
    throw new Error('No tienes permiso para cancelar esta entrada')
  }

  if (!['WAITING', 'OFFER_PENDING'].includes(entry.status)) {
    throw new Error('Esta entrada ya no está activa')
  }

  const wasOfferPending = entry.status === 'OFFER_PENDING'

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: 'CANCELLED',
      respondedAt: new Date(),
    },
  })

  // If they had an offer pending, process next in waitlist
  if (wasOfferPending) {
    const available = await getAvailableSpots(entry.eventId)
    if (available && available > 0) {
      offerSeatFromWaitlist(entry.eventId, available).catch((error) => {
        console.error(`[SEAT-ALLOCATION] Error offering seat after cancel:`, error)
      })
    }
  }
}

/**
 * Find and offer seat to next eligible user in waitlist.
 * Skips users who need more seats than available.
 */
export async function offerSeatFromWaitlist(
  eventId: string,
  availableSeats: number
): Promise<WaitlistEntryWithEvent | null> {
  if (availableSeats <= 0) {
    return null
  }

  // Find next WAITING entry that fits within available seats
  // Order by position to maintain fairness
  const nextEntry = await prisma.waitlistEntry.findFirst({
    where: {
      eventId,
      status: 'WAITING',
      seatsRequested: { lte: availableSeats },
    },
    orderBy: { position: 'asc' },
  })

  if (!nextEntry) {
    return null // No one in waitlist can fit
  }

  // Calculate offer expiration
  const offerExpiresAt = new Date()
  offerExpiresAt.setHours(offerExpiresAt.getHours() + WAITLIST_OFFER_HOURS)

  // Update entry to OFFER_PENDING
  const updatedEntry = await prisma.waitlistEntry.update({
    where: { id: nextEntry.id },
    data: {
      status: 'OFFER_PENDING',
      offerSentAt: new Date(),
      offerExpiresAt,
    },
  })

  // Send offer email (imported dynamically to avoid circular deps)
  try {
    const { sendWaitlistOfferEmail } = await import('@/lib/email')
    const event = await getEventById(eventId)

    if (event) {
      await sendWaitlistOfferEmail({
        email: updatedEntry.userEmail,
        name: updatedEntry.userName || 'Querida alma',
        eventTitle: event.title,
        eventDate: event.eventDate,
        seats: updatedEntry.seatsRequested,
        expiresAt: offerExpiresAt,
      })
    }
  } catch (error) {
    console.error(`[SEAT-ALLOCATION] Error sending waitlist offer email:`, error)
    // Don't fail the operation if email fails
  }

  return updatedEntry
}

/**
 * Accept a waitlist offer and create booking.
 * Returns the booking ID on success.
 */
export async function acceptWaitlistOffer(
  entryId: string,
  userId: string
): Promise<{ bookingId: string; orderId: string }> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  })

  if (!entry) {
    throw new Error('Entrada de lista de espera no encontrada')
  }

  if (entry.userId !== userId) {
    throw new Error('No tienes permiso para aceptar esta oferta')
  }

  if (entry.status !== 'OFFER_PENDING') {
    throw new Error('Esta oferta ya no está disponible')
  }

  if (entry.offerExpiresAt && entry.offerExpiresAt < new Date()) {
    // Offer expired, mark it and process next
    await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    })
    throw new Error('La oferta ha expirado. Se ha pasado al siguiente en la lista.')
  }

  // Get event info for booking
  const event = await getEventById(entry.eventId)
  if (!event) {
    throw new Error('Evento no encontrado')
  }

  // Create booking and allocation in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Verify spots are still available
    const allocatedCount = await tx.seatAllocation.aggregate({
      where: {
        eventId: entry.eventId,
        status: 'ACTIVE',
      },
      _sum: { seats: true },
    })

    const totalAllocated = allocatedCount._sum.seats || 0
    const available = event.capacity ? event.capacity - totalAllocated : entry.seatsRequested

    if (available < entry.seatsRequested) {
      throw new Error('Los cupos ya no están disponibles')
    }

    // Generate order number
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const orderNumber = `EVT-${year}${month}${day}-${random}`

    // Create order (payment handled separately if needed)
    const order = await tx.order.create({
      data: {
        userId: entry.userId,
        orderNumber,
        orderType: 'EVENT',
        itemId: entry.eventId,
        itemName: event.title,
        amount: event.price || 0,
        currency: 'COP',
        paymentMethod: 'FREE', // Will be updated when payment is processed
        paymentStatus: event.price ? 'PENDING' : 'COMPLETED',
        metadata: {
          fromWaitlist: true,
          waitlistEntryId: entry.id,
          seats: entry.seatsRequested,
        },
      },
    })

    // Create booking
    const booking = await tx.booking.create({
      data: {
        userId: entry.userId,
        bookingType: 'EVENT',
        resourceId: entry.eventId,
        resourceName: event.title,
        scheduledAt: new Date(event.eventDate),
        status: event.price ? 'PENDING_PAYMENT' : 'CONFIRMED',
        amount: event.price || 0,
        currency: 'COP',
        paymentStatus: event.price ? 'PENDING' : 'COMPLETED',
        metadata: {
          seats: entry.seatsRequested,
          fromWaitlist: true,
          waitlistEntryId: entry.id,
        },
      },
    })

    // Create seat allocation
    await tx.seatAllocation.create({
      data: {
        eventId: entry.eventId,
        bookingId: booking.id,
        userId: entry.userId,
        seats: entry.seatsRequested,
        status: 'ACTIVE',
      },
    })

    // Create entitlement if event is free
    if (!event.price) {
      await tx.entitlement.create({
        data: {
          userId: entry.userId,
          type: 'EVENT',
          resourceId: entry.eventId,
          resourceName: event.title,
          orderId: order.id,
          expiresAt: event.endDate ? new Date(event.endDate) : new Date(event.eventDate),
        },
      })
    }

    // Update waitlist entry
    await tx.waitlistEntry.update({
      where: { id: entryId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
        resultingBookingId: booking.id,
      },
    })

    return { bookingId: booking.id, orderId: order.id }
  })

  return result
}

/**
 * Decline a waitlist offer.
 */
export async function declineWaitlistOffer(entryId: string, userId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  })

  if (!entry) {
    throw new Error('Entrada de lista de espera no encontrada')
  }

  if (entry.userId !== userId) {
    throw new Error('No tienes permiso para rechazar esta oferta')
  }

  if (entry.status !== 'OFFER_PENDING') {
    throw new Error('Esta oferta ya no está disponible')
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: 'DECLINED',
      respondedAt: new Date(),
    },
  })

  // Offer to next person in line
  const available = await getAvailableSpots(entry.eventId)
  if (available && available > 0) {
    offerSeatFromWaitlist(entry.eventId, available).catch((error) => {
      console.error(`[SEAT-ALLOCATION] Error offering seat after decline:`, error)
    })
  }
}

/**
 * Expire a waitlist offer that has passed its deadline.
 */
export async function expireWaitlistOffer(entryId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  })

  if (!entry || entry.status !== 'OFFER_PENDING') {
    return
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: 'EXPIRED',
      respondedAt: new Date(),
    },
  })

  // Send expiration email
  try {
    const { sendWaitlistOfferExpiredEmail } = await import('@/lib/email')
    const event = await getEventById(entry.eventId)

    if (event) {
      await sendWaitlistOfferExpiredEmail({
        email: entry.userEmail,
        name: entry.userName || 'Querida alma',
        eventTitle: event.title,
      })
    }
  } catch (error) {
    console.error(`[SEAT-ALLOCATION] Error sending expiration email:`, error)
  }

  // Offer to next person in line
  const available = await getAvailableSpots(entry.eventId)
  if (available && available > 0) {
    offerSeatFromWaitlist(entry.eventId, available).catch((error) => {
      console.error(`[SEAT-ALLOCATION] Error offering seat after expire:`, error)
    })
  }
}

/**
 * Get all active waitlist entries for a user.
 */
export async function getUserWaitlistEntries(userId: string): Promise<WaitlistEntryWithEvent[]> {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      userId,
      status: { in: ['WAITING', 'OFFER_PENDING'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  return entries
}

/**
 * Get waitlist statistics for an event.
 */
export async function getEventWaitlistStats(eventId: string): Promise<WaitlistStats> {
  const counts = await prisma.waitlistEntry.groupBy({
    by: ['status'],
    where: { eventId },
    _count: { status: true },
  })

  const stats: WaitlistStats = {
    waiting: 0,
    offerPending: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
    cancelled: 0,
    total: 0,
  }

  counts.forEach((count) => {
    const statusKey = count.status.toLowerCase().replace('_', '') as keyof Omit<WaitlistStats, 'total'>
    const mappedKey = count.status === 'OFFER_PENDING' ? 'offerPending' : statusKey
    if (mappedKey in stats) {
      stats[mappedKey as keyof Omit<WaitlistStats, 'total'>] = count._count.status
    }
    stats.total += count._count.status
  })

  return stats
}

// ============================================
// CRON JOB HELPERS
// ============================================

/**
 * Process expired waitlist offers.
 * Called by cron job.
 */
export async function processExpiredOffers(): Promise<{ expired: number; reminders: number }> {
  const now = new Date()
  let expiredCount = 0
  let reminderCount = 0

  // Find expired offers
  const expiredEntries = await prisma.waitlistEntry.findMany({
    where: {
      status: 'OFFER_PENDING',
      offerExpiresAt: { lt: now },
    },
  })

  // Process each expired offer
  for (const entry of expiredEntries) {
    try {
      await expireWaitlistOffer(entry.id)
      expiredCount++
    } catch (error) {
      console.error(`[CRON] Error expiring waitlist offer ${entry.id}:`, error)
    }
  }

  // Find offers that need reminder (6 hours before expiry, not yet reminded)
  const reminderThreshold = new Date()
  reminderThreshold.setHours(reminderThreshold.getHours() + WAITLIST_REMINDER_HOURS)

  const needReminder = await prisma.waitlistEntry.findMany({
    where: {
      status: 'OFFER_PENDING',
      offerExpiresAt: { lte: reminderThreshold, gt: now },
      reminderSentAt: null,
    },
  })

  // Send reminders
  for (const entry of needReminder) {
    try {
      const event = await getEventById(entry.eventId)
      if (event && entry.offerExpiresAt) {
        const hoursRemaining = Math.ceil(
          (entry.offerExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
        )

        const { sendWaitlistOfferReminderEmail } = await import('@/lib/email')
        await sendWaitlistOfferReminderEmail({
          email: entry.userEmail,
          name: entry.userName || 'Querida alma',
          eventTitle: event.title,
          hoursRemaining,
        })

        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { reminderSentAt: now },
        })

        reminderCount++
      }
    } catch (error) {
      console.error(`[CRON] Error sending reminder for ${entry.id}:`, error)
    }
  }

  return { expired: expiredCount, reminders: reminderCount }
}

/**
 * Process waitlist after seats are released.
 * Called when a booking is cancelled.
 */
async function processWaitlistAfterRelease(eventId: string, releasedSeats: number): Promise<void> {
  // Get current availability
  const available = await getAvailableSpots(eventId)

  if (available === null || available <= 0) {
    return
  }

  // Offer to next eligible person
  await offerSeatFromWaitlist(eventId, available)
}
