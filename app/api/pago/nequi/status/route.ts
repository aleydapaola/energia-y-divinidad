import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getNequiMode, checkNequiPaymentStatus } from '@/lib/nequi'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pago/nequi/status
 * Check payment status for a Nequi payment
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const bookingId = request.nextUrl.searchParams.get('booking_id')

    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id es requerido' }, { status: 400 })
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

    const nequiMode = getNequiMode()

    // For app mode, just return current status from DB (manual verification)
    if (nequiMode === 'app') {
      return NextResponse.json({
        status: booking.paymentStatus === 'COMPLETED' ? 'success' :
                booking.paymentStatus === 'FAILED' ? 'failed' : 'pending',
        bookingId: booking.id,
        amount: booking.amount,
        currency: booking.currency,
        nequiMode: 'app',
      })
    }

    // For push mode, check with Nequi API if we have a transaction code
    if (booking.nequiTransactionCode && booking.paymentStatus === 'PROCESSING') {
      const nequiStatus = await checkNequiPaymentStatus(booking.nequiTransactionCode)

      // Map Nequi status to our status
      let status: 'pending' | 'processing' | 'success' | 'failed' | 'expired' = 'processing'

      if (nequiStatus.success) {
        status = 'success'
        // Update booking status
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'CONFIRMED',
            nequiPaymentId: nequiStatus.transactionId,
          },
        })
      } else if (nequiStatus.status === '37') {
        status = 'failed'
        await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'FAILED' },
        })
      } else if (nequiStatus.status === '38') {
        status = 'expired'
      } else if (nequiStatus.status === '39') {
        status = 'failed'
        await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'CANCELLED' },
        })
      }

      return NextResponse.json({
        status,
        message: nequiStatus.message,
        bookingId: booking.id,
        amount: booking.amount,
        currency: booking.currency,
        transactionCode: booking.nequiTransactionCode,
        nequiMode: 'push',
      })
    }

    // Return current DB status
    return NextResponse.json({
      status: booking.paymentStatus === 'COMPLETED' ? 'success' :
              booking.paymentStatus === 'FAILED' ? 'failed' :
              booking.paymentStatus === 'PROCESSING' ? 'processing' : 'pending',
      bookingId: booking.id,
      amount: booking.amount,
      currency: booking.currency,
      nequiMode: 'push',
    })
  } catch (error) {
    console.error('Error checking Nequi payment status:', error)
    return NextResponse.json(
      { error: 'Error al consultar estado del pago' },
      { status: 500 }
    )
  }
}
