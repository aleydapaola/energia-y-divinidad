import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/orders/[id]/confirm-payment
 * Confirmar manualmente un pago (para Bre-B u otros pagos manuales)
 */
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

    // Obtener datos del body (opcional: referencia de transacción)
    let body: { transactionReference?: string; notes?: string } = {}
    try {
      body = await request.json()
    } catch {
      // Body vacío es válido
    }

    // Buscar la orden
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Verificar que la orden esté pendiente
    if (order.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        { error: `La orden no está pendiente (estado actual: ${order.paymentStatus})` },
        { status: 400 }
      )
    }

    // Guardar estado anterior para auditoría
    const previousStatus = order.paymentStatus

    // Actualizar orden a COMPLETED
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: 'COMPLETED',
        metadata: {
          ...(order.metadata as object || {}),
          manuallyConfirmedAt: new Date().toISOString(),
          manuallyConfirmedBy: session.user.id,
          transactionReference: body.transactionReference || null,
          confirmationNotes: body.notes || null,
        },
      },
    })

    // Crear entitlement según el tipo de orden
    if (order.userId) {
      const entitlementData = {
        userId: order.userId,
        type: getEntitlementType(order.orderType),
        resourceId: order.itemId,
        resourceName: order.itemName,
        orderId: order.id,
      }

      await prisma.entitlement.create({
        data: entitlementData,
      })
    }

    // Crear booking si es una sesión
    if (order.orderType === 'SESSION' && order.userId) {
      const metadata = order.metadata as Record<string, unknown> | null
      const scheduledAt = metadata?.scheduledAt as string | null

      await prisma.booking.create({
        data: {
          userId: order.userId,
          bookingType: 'SESSION_1_ON_1',
          resourceId: order.itemId,
          resourceName: order.itemName,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: 'CONFIRMED',
          amount: order.amount,
          currency: order.currency,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'COMPLETED',
        },
      })
    }

    // Registrar en AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: currentUser.email || session.user.email || 'unknown',
        entityType: 'order',
        entityId: order.id,
        action: 'MANUAL_PAYMENT_CONFIRMATION',
        before: { paymentStatus: previousStatus },
        after: { paymentStatus: 'COMPLETED' },
        reason: body.notes || 'Pago Bre-B confirmado manualmente',
        metadata: {
          transactionReference: body.transactionReference || null,
        },
      },
    })

    // Enviar email de confirmación
    const customerEmail = order.user?.email || order.guestEmail
    const customerName = order.user?.name || order.guestName

    if (customerEmail) {
      try {
        await sendPaymentConfirmationEmail({
          email: customerEmail,
          name: customerName || 'Cliente',
          orderNumber: order.orderNumber,
          orderType: order.orderType as 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'COURSE',
          itemName: order.itemName,
          amount: Number(order.amount),
          currency: order.currency as 'COP' | 'USD' | 'EUR',
          paymentMethod: order.paymentMethod || 'BREB_MANUAL',
        })

        // Registrar email enviado
        await prisma.emailLog.create({
          data: {
            to: customerEmail,
            template: 'order_confirmation',
            subject: `Confirmación de pago - ${order.orderNumber}`,
            entityType: 'order',
            entityId: order.id,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      } catch (emailError) {
        console.error('[ADMIN] Error sending confirmation email:', emailError)
        // No fallar la confirmación por error de email
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pago confirmado exitosamente',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
      },
    })
  } catch (error) {
    console.error('[ADMIN] Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Error al confirmar el pago' },
      { status: 500 }
    )
  }
}

function getEntitlementType(orderType: string): 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'EVENT' | 'SESSION_BUNDLE' | 'PRODUCT' | 'COURSE' {
  switch (orderType) {
    case 'MEMBERSHIP':
      return 'MEMBERSHIP'
    case 'SESSION':
      return 'SESSION_BUNDLE'
    case 'EVENT':
      return 'EVENT'
    case 'COURSE':
      return 'COURSE'
    case 'PREMIUM_CONTENT':
      return 'PREMIUM_CONTENT'
    default:
      return 'PRODUCT'
  }
}
