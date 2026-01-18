import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendPaymentConfirmationEmail } from '@/lib/email'

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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Solo reenviar para órdenes completadas
    if (order.paymentStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Solo se puede reenviar confirmación de pagos completados' },
        { status: 400 }
      )
    }

    const recipientEmail = order.user?.email || order.guestEmail
    const recipientName = order.user?.name || order.guestName || 'Usuario'

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No hay email de destinatario' },
        { status: 400 }
      )
    }

    // Enviar email de confirmación
    const emailResult = await sendPaymentConfirmationEmail({
      email: recipientEmail,
      name: recipientName,
      orderNumber: order.orderNumber,
      orderType: order.orderType as 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'COURSE',
      itemName: order.itemName,
      amount: Number(order.amount),
      currency: order.currency as 'COP' | 'USD' | 'EUR',
      paymentMethod: order.paymentMethod || 'N/A',
      transactionId: (order.metadata as Record<string, unknown>)?.transactionId as string | undefined,
    })

    // Crear audit log
    await createAuditLog({
      actorId: session.user.id,
      actorEmail: currentUser.email || session.user.email || 'unknown',
      entityType: 'order',
      entityId: id,
      action: 'resend_email',
      metadata: {
        emailSent: emailResult.success,
        recipientEmail,
      },
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Error al enviar email', details: emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Email reenviado a ${recipientEmail}`,
    })
  } catch (error) {
    console.error('Error resending confirmation:', error)
    return NextResponse.json(
      { error: 'Error al reenviar confirmación' },
      { status: 500 }
    )
  }
}
