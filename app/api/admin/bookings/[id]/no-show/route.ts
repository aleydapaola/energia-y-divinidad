import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

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
    const notes = body?.notes

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
    }

    // Solo permitir marcar no-show en bookings confirmados o pendientes
    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'No se puede marcar no-show en una sesión cancelada' }, { status: 400 })
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'No se puede marcar no-show en una sesión completada' }, { status: 400 })
    }

    if (booking.status === 'NO_SHOW') {
      return NextResponse.json({ error: 'La sesión ya está marcada como no-show' }, { status: 400 })
    }

    const before = { status: booking.status }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        ...(notes && { adminNotes: notes }),
      },
    })

    await createAuditLog({
      actorId: session.user.id,
      actorEmail: currentUser.email || 'unknown',
      entityType: 'booking',
      entityId: id,
      action: 'no_show',
      before,
      after: { status: updated.status },
      metadata: notes ? { notes } : undefined,
    })

    // No enviamos email en caso de no-show, es una acción interna

    return NextResponse.json({ success: true, booking: updated })
  } catch (error) {
    console.error('Error marking booking as no-show:', error)
    return NextResponse.json(
      { error: 'Error al marcar la sesión como no-show' },
      { status: 500 }
    )
  }
}
