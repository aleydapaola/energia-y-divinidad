/**
 * Event Replay Access Library
 * Handles access control and view tracking for event replays
 */

import { getActiveSubscription } from '@/lib/membership-access'
import { prisma } from '@/lib/prisma'
import { getEventById, Event } from '@/lib/sanity/queries/events'

// Types
export interface ReplayAccessResult {
  canAccess: boolean
  reason: 'booking_valid' | 'no_booking' | 'expired' | 'no_recording' | 'event_not_found'
  expiresAt?: Date | null // null = permanent access
  url?: string
  bookingId?: string
  viewCount?: number
  totalWatchedSeconds?: number
  lastPosition?: number
}

export interface ReplayExpirationResult {
  expiresAt: Date | null // null = permanent
  daysRemaining: number | null // null = permanent
  source: 'global_cutoff' | 'plan_based' | 'default' | 'permanent'
}

export interface ReplayStatus {
  hasReplay: boolean
  expiresAt: Date | null
  daysRemaining: number | null
  isExpired: boolean
  hasViewed: boolean
  viewCount: number
}

/**
 * Check if a user can access an event's replay
 */
export async function canAccessReplay(
  userId: string,
  eventId: string
): Promise<ReplayAccessResult> {
  // 1. Get event from Sanity
  const event = await getEventById(eventId)

  if (!event) {
    return { canAccess: false, reason: 'event_not_found' }
  }

  if (!event.recording?.url) {
    return { canAccess: false, reason: 'no_recording' }
  }

  // 2. Check if user has a confirmed booking
  const booking = await prisma.booking.findFirst({
    where: {
      userId,
      resourceId: eventId,
      bookingType: 'EVENT',
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
  })

  if (!booking) {
    return { canAccess: false, reason: 'no_booking' }
  }

  // 3. Calculate expiration
  const expiration = await getReplayExpiration(userId, eventId, event)

  // 4. Check if expired
  if (expiration.expiresAt && expiration.expiresAt < new Date()) {
    return {
      canAccess: false,
      reason: 'expired',
      expiresAt: expiration.expiresAt,
      bookingId: booking.id,
    }
  }

  // 5. Get existing view record (if any)
  const viewRecord = await prisma.eventReplayView.findUnique({
    where: { bookingId: booking.id },
  })

  return {
    canAccess: true,
    reason: 'booking_valid',
    expiresAt: expiration.expiresAt,
    url: event.recording.url,
    bookingId: booking.id,
    viewCount: viewRecord?.viewCount ?? 0,
    totalWatchedSeconds: viewRecord?.totalWatchedSeconds ?? 0,
    lastPosition: viewRecord?.lastPosition ?? 0,
  }
}

/**
 * Calculate replay expiration date for a user
 * Uses hybrid logic: returns the earlier of global cutoff or plan-based expiration
 */
export async function getReplayExpiration(
  userId: string,
  eventId: string,
  event?: Event | null
): Promise<ReplayExpirationResult> {
  // Get event if not provided
  if (!event) {
    event = await getEventById(eventId)
  }

  if (!event?.recording) {
    return { expiresAt: new Date(0), daysRemaining: 0, source: 'default' }
  }

  const eventDate = new Date(event.eventDate)
  const now = new Date()

  // Get global cutoff
  const globalCutoff = event.recording.availableUntil
    ? new Date(event.recording.availableUntil)
    : null

  // Get user's membership tier (if any)
  const subscription = await getActiveSubscription(userId)

  let planBasedExpiration: Date | null = null
  let source: ReplayExpirationResult['source'] = 'default'

  if (subscription && event.recording.replayByPlan?.length) {
    // Find matching tier in replayByPlan
    const tierConfig = event.recording.replayByPlan.find(
      (rp) => rp.tier?._id === subscription.membershipTierId
    )

    if (tierConfig) {
      if (tierConfig.durationDays === 0) {
        // Permanent access (within global cutoff)
        planBasedExpiration = null
        source = 'permanent'
      } else {
        planBasedExpiration = new Date(eventDate)
        planBasedExpiration.setDate(planBasedExpiration.getDate() + tierConfig.durationDays)
        source = 'plan_based'
      }
    }
  }

  // If no plan-based config, use default duration
  if (source === 'default' && event.recording.replayDurationDays) {
    planBasedExpiration = new Date(eventDate)
    planBasedExpiration.setDate(planBasedExpiration.getDate() + event.recording.replayDurationDays)
  }

  // Hybrid logic: use earlier of global cutoff and plan-based expiration
  let finalExpiration: Date | null = null

  if (source === 'permanent') {
    // Permanent means only global cutoff applies
    finalExpiration = globalCutoff
    source = globalCutoff ? 'global_cutoff' : 'permanent'
  } else if (globalCutoff && planBasedExpiration) {
    finalExpiration = globalCutoff < planBasedExpiration ? globalCutoff : planBasedExpiration
    source = globalCutoff < planBasedExpiration ? 'global_cutoff' : source
  } else {
    finalExpiration = globalCutoff || planBasedExpiration
  }

  // Calculate days remaining
  let daysRemaining: number | null = null
  if (finalExpiration) {
    daysRemaining = Math.max(
      0,
      Math.ceil((finalExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
  }

  return {
    expiresAt: finalExpiration,
    daysRemaining,
    source,
  }
}

/**
 * Get replay status for a booking (for dashboard display)
 */
export async function getReplayStatus(
  userId: string,
  eventId: string,
  bookingId: string,
  event?: Event | null
): Promise<ReplayStatus> {
  const now = new Date()

  // Get event if not provided
  if (!event) {
    event = await getEventById(eventId)
  }

  // No recording available
  if (!event?.recording?.url) {
    return {
      hasReplay: false,
      expiresAt: null,
      daysRemaining: null,
      isExpired: false,
      hasViewed: false,
      viewCount: 0,
    }
  }

  // Get expiration
  const expiration = await getReplayExpiration(userId, eventId, event)

  // Get view record
  const viewRecord = await prisma.eventReplayView.findUnique({
    where: { bookingId },
    select: { viewCount: true },
  })

  return {
    hasReplay: true,
    expiresAt: expiration.expiresAt,
    daysRemaining: expiration.daysRemaining,
    isExpired: expiration.expiresAt ? expiration.expiresAt < now : false,
    hasViewed: (viewRecord?.viewCount ?? 0) > 0,
    viewCount: viewRecord?.viewCount ?? 0,
  }
}

/**
 * Track a replay view (upsert progress)
 */
export async function trackReplayView(params: {
  bookingId: string
  eventId: string
  userId: string
  watchedSeconds: number
  lastPosition?: number
}): Promise<void> {
  const { bookingId, eventId, userId, watchedSeconds, lastPosition } = params

  await prisma.eventReplayView.upsert({
    where: { bookingId },
    create: {
      bookingId,
      eventId,
      userId,
      viewCount: 1,
      totalWatchedSeconds: watchedSeconds,
      lastPosition: lastPosition ?? watchedSeconds,
      firstViewedAt: new Date(),
      lastWatchedAt: new Date(),
    },
    update: {
      totalWatchedSeconds: watchedSeconds,
      lastPosition: lastPosition ?? watchedSeconds,
      lastWatchedAt: new Date(),
    },
  })
}

/**
 * Increment view count (called when user starts watching)
 */
export async function incrementViewCount(bookingId: string): Promise<void> {
  try {
    // Try to increment existing record
    await prisma.eventReplayView.update({
      where: { bookingId },
      data: {
        viewCount: { increment: 1 },
        lastWatchedAt: new Date(),
      },
    })
  } catch {
    // Record doesn't exist yet - will be created on first progress update
  }
}

/**
 * Get replay view stats for an event (admin/analytics)
 */
export async function getEventReplayStats(eventId: string): Promise<{
  totalViews: number
  uniqueViewers: number
  avgWatchedSeconds: number
}> {
  const views = await prisma.eventReplayView.findMany({
    where: { eventId },
    select: {
      viewCount: true,
      totalWatchedSeconds: true,
    },
  })

  const uniqueViewers = views.length
  const totalViews = views.reduce((sum, v) => sum + v.viewCount, 0)
  const totalSeconds = views.reduce((sum, v) => sum + v.totalWatchedSeconds, 0)
  const avgWatchedSeconds = uniqueViewers > 0 ? Math.round(totalSeconds / uniqueViewers) : 0

  return { totalViews, uniqueViewers, avgWatchedSeconds }
}
