import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  getNequiMode,
  createNequiPushPayment,
  formatNequiAmount,
  validateColombianPhoneNumber
} from '@/lib/nequi'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/pago/nequi/push
 * Send a push notification to the user's Nequi app for payment approval
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId, phoneNumber } = body

    if (!bookingId || !phoneNumber) {
      return NextResponse.json(
        { error: 'bookingId y phoneNumber son requeridos' },
        { status: 400 }
      )
    }

    // Validate phone number
    if (!validateColombianPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Número de celular inválido. Debe ser un número colombiano de 10 dígitos.' },
        { status: 400 }
      )
    }

    const nequiMode = getNequiMode()

    if (nequiMode !== 'push') {
      return NextResponse.json(
        { error: 'El modo push de Nequi no está habilitado' },
        { status: 400 }
      )
    }

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    // Verify ownership
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Check if payment is already completed
    if (booking.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Este pago ya fue completado' },
        { status: 400 }
      )
    }

    // Send push notification via Nequi API
    const amount = booking.amount?.toString() || '0'
    const nequiAmount = formatNequiAmount(Number(amount))
    const transactionCode = booking.nequiTransactionCode || `EYD-${Date.now()}`

    const pushResponse = await createNequiPushPayment({
      phoneNumber,
      code: transactionCode,
      value: nequiAmount,
    })

    if (!pushResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: pushResponse.error || 'Error al enviar notificación a Nequi'
        },
        { status: 500 }
      )
    }

    // Update booking with transaction info
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        nequiTransactionCode: transactionCode,
        nequiPaymentId: pushResponse.transactionId,
        paymentStatus: 'PROCESSING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Notificación enviada. El usuario debe aprobar en su app Nequi.',
      transactionId: pushResponse.transactionId,
    })
  } catch (error) {
    console.error('Error sending Nequi push notification:', error)
    return NextResponse.json(
      { error: 'Error al enviar notificación de pago' },
      { status: 500 }
    )
  }
}
