import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendRescheduleEmail } from '@/lib/email'

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

    const { newDate, reason } = await request.json()

    if (!newDate) {
      return NextResponse.json({ error: 'Nueva fecha requerida' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
    }

    // Snapshot del estado anterior
    const before = {
      scheduledAt: booking.scheduledAt?.toISOString(),
      status: booking.status,
      rescheduleCount: booking.rescheduleCount,
    }

    // Actualizar booking
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        previousScheduledAt: booking.scheduledAt,
        scheduledAt: new Date(newDate),
        rescheduledAt: new Date(),
        rescheduledBy: session.user.id,
        rescheduleCount: { increment: 1 },
        rescheduleReason: reason,
        status: 'CONFIRMED',
      },
    })

    // Crear audit log
    await createAuditLog({
      actorId: session.user.id,
      actorEmail: currentUser.email || 'unknown',
      entityType: 'booking',
      entityId: id,
      action: 'reschedule',
      before,
      after: {
        scheduledAt: updated.scheduledAt?.toISOString(),
        status: updated.status,
        rescheduleCount: updated.rescheduleCount,
      },
      reason,
    })

    // Enviar email al usuario
    await sendRescheduleEmail({
      email: booking.user.email,
      name: booking.user.name || 'Usuario',
      sessionName: booking.resourceName,
      previousDate: booking.scheduledAt,
      newDate: updated.scheduledAt!,
      rescheduledBy: 'admin',
      reason,
    })

    return NextResponse.json({ success: true, booking: updated })
  } catch (error) {
    console.error('Error rescheduling booking:', error)
    return NextResponse.json(
      { error: 'Error al reprogramar la sesión' },
      { status: 500 }
    )
  }
}
