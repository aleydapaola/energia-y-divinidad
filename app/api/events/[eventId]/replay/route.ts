import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  canAccessReplay,
  trackReplayView,
  incrementViewCount,
} from '@/lib/events/replay-access'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

/**
 * GET /api/events/[eventId]/replay
 * Check access and get replay URL
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { eventId } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado', canAccess: false },
        { status: 401 }
      )
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID es requerido', canAccess: false },
        { status: 400 }
      )
    }

    const result = await canAccessReplay(session.user.id, eventId)

    if (!result.canAccess) {
      return NextResponse.json({
        canAccess: false,
        reason: result.reason,
        expiresAt: result.expiresAt?.toISOString() ?? null,
      })
    }

    // Increment view count on access
    if (result.bookingId) {
      await incrementViewCount(result.bookingId).catch(console.error)
    }

    return NextResponse.json({
      canAccess: true,
      url: result.url,
      expiresAt: result.expiresAt?.toISOString() ?? null,
      bookingId: result.bookingId,
      viewCount: result.viewCount,
      totalWatchedSeconds: result.totalWatchedSeconds,
      lastPosition: result.lastPosition,
    })
  } catch (error) {
    console.error('Error checking replay access:', error)
    return NextResponse.json(
      { error: 'Error al verificar acceso', canAccess: false },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/[eventId]/replay
 * Log view progress
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { eventId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID es requerido' }, { status: 400 })
    }

    const body = await request.json()
    const { bookingId, watchedSeconds, lastPosition } = body

    if (!bookingId || typeof watchedSeconds !== 'number') {
      return NextResponse.json(
        { error: 'bookingId y watchedSeconds son requeridos' },
        { status: 400 }
      )
    }

    // Verify the booking belongs to this user
    const accessResult = await canAccessReplay(session.user.id, eventId)

    if (!accessResult.canAccess || accessResult.bookingId !== bookingId) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta grabacion' },
        { status: 403 }
      )
    }

    await trackReplayView({
      bookingId,
      eventId,
      userId: session.user.id,
      watchedSeconds,
      lastPosition,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking replay view:', error)
    return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })
  }
}
