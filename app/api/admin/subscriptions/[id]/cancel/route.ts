import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelSubscription } from '@/lib/services/subscription-cancellation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { reason, immediate = false } = body

    // Usar el servicio de cancelación
    const result = await cancelSubscription({
      subscriptionId: id,
      cancelledBy: 'admin',
      requestingUserId: session.user.id,
      requestingUserEmail: currentUser.email || session.user.email || undefined,
      reason,
      immediate,
      revokeEntitlementsNow: immediate,
    })

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        ALREADY_CANCELLED: 400,
        NO_ACTIVE_SUBSCRIPTION: 400,
        INTERNAL_ERROR: 500,
      }
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.errorCode!] || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      subscription: result.subscription,
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Error al cancelar suscripción' },
      { status: 500 }
    )
  }
}
