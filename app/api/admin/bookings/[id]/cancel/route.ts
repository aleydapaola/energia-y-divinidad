import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendCancellationEmail } from '@/lib/email'

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

    const body = await request.json()
    const reason = body?.reason

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
    }

    // No permitir cancelar bookings ya cancelados o completados
    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'La sesión ya está cancelada' }, { status: 400 })
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'No se puede cancelar una sesión completada' }, { status: 400 })
    }

    const before = { status: booking.status }

    // Verificar si hay un pack redemption asociado
    const packRedemption = await prisma.packRedemption.findUnique({
      where: { bookingId: id },
      include: { packCode: true },
    })

    let packSessionReturned = false
    if (packRedemption?.packCode) {
      await prisma.sessionPackCode.update({
        where: { id: packRedemption.packCode.id },
        data: {
          sessionsUsed: { decrement: 1 },
        },
      })
      packSessionReturned = true
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Cancelada por administrador',
      },
    })

    await createAuditLog({
      actorId: session.user.id,
      actorEmail: currentUser.email || 'unknown',
      entityType: 'booking',
      entityId: id,
      action: 'cancel',
      before,
      after: { status: updated.status },
      reason,
      metadata: { packSessionReturned },
    })

    await sendCancellationEmail({
      email: booking.user.email,
      name: booking.user.name || 'Usuario',
      sessionName: booking.resourceName,
      scheduledDate: booking.scheduledAt,
      cancelledBy: 'admin',
      reason,
      packSessionReturned,
    })

    return NextResponse.json({ success: true, booking: updated, packSessionReturned })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la sesión' },
      { status: 500 }
    )
  }
}
