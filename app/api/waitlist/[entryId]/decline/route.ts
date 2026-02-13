import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { declineWaitlistOffer } from '@/lib/events/seat-allocation'

interface RouteParams {
  params: Promise<{ entryId: string }>
}

/**
 * POST /api/waitlist/[entryId]/decline
 * Decline a waitlist offer
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para rechazar esta oferta' },
        { status: 401 }
      )
    }

    const { entryId } = await params

    if (!entryId) {
      return NextResponse.json(
        { error: 'ID de entrada requerido' },
        { status: 400 }
      )
    }

    // Decline the offer
    await declineWaitlistOffer(entryId, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Has rechazado la oferta. El cupo ha sido ofrecido a la siguiente persona.',
    })
  } catch (error) {
    console.error('Error declining waitlist offer:', error)

    if (error instanceof Error) {
      if (error.message.includes('no encontrada') || error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Oferta no encontrada' },
          { status: 404 }
        )
      }
      if (error.message.includes('permiso') || error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'No tienes permiso para esta acción' },
          { status: 403 }
        )
      }
      if (error.message.includes('disponible')) {
        return NextResponse.json(
          { error: 'Esta oferta ya no está disponible' },
          { status: 410 } // Gone
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al rechazar la oferta' },
      { status: 500 }
    )
  }
}
