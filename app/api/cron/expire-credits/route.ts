import { NextRequest, NextResponse } from 'next/server'
import { expireCredits } from '@/lib/credits'

/**
 * POST /api/cron/expire-credits
 *
 * Cron job to audit expired credits.
 * The actual expiration is handled by the balance calculation (getCreditsBalance)
 * which already excludes expired credits. This job is for logging/monitoring.
 *
 * This endpoint should be called daily (3 AM) by Vercel Cron.
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
        console.error('[CRON/CREDITS] CRON_SECRET not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[CRON/CREDITS] Unauthorized cron request')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('[CRON/CREDITS] Starting credits expiration audit...')
    const startTime = Date.now()

    // Audit expired credits
    const result = await expireCredits()

    const duration = Date.now() - startTime
    console.log(`[CRON/CREDITS] Job completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      expired: result.expired,
    })
  } catch (error) {
    console.error('[CRON/CREDITS] Error in credits expiration job:', error)
    return NextResponse.json({ error: 'Error processing credit expiration' }, { status: 500 })
  }
}

// Allow GET for testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  return POST(request)
}
