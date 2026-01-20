import { NextRequest, NextResponse } from 'next/server'
import { processExpiredOffers } from '@/lib/events/seat-allocation'

/**
 * POST /api/cron/expire-waitlist-offers
 *
 * Cron job to:
 * 1. Expire waitlist offers that have passed their deadline
 * 2. Send reminder emails for offers expiring in 6 hours
 * 3. Offer seats to next person in waitlist after expiration
 *
 * This endpoint should be called hourly by Vercel Cron or external scheduler.
 * Secured with CRON_SECRET authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In development, allow without secret
    if (process.env.NODE_ENV !== 'development') {
      if (!cronSecret) {
        console.error('[CRON] CRON_SECRET not configured')
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[CRON] Unauthorized cron request')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('[CRON] Starting waitlist offer expiration job...')
    const startTime = Date.now()

    // Process expired offers and send reminders
    const result = await processExpiredOffers()

    const duration = Date.now() - startTime
    console.log(`[CRON] Job completed in ${duration}ms:`, result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        expiredOffers: result.expired,
        remindersSent: result.reminders,
      },
    })
  } catch (error) {
    console.error('[CRON] Error in waitlist expiration job:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error processing waitlist offers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Method not allowed in production' },
      { status: 405 }
    )
  }

  // In development, redirect to POST
  return POST(request)
}
