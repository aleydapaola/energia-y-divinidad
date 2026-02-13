import { NextRequest, NextResponse } from 'next/server'

import { processApprovedPayment } from '@/lib/payment-processor'
import { capturePayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'

interface CaptureBody {
  paypalOrderId: string
  reference?: string
}

/**
 * POST /api/checkout/paypal/capture
 * Capturar pago de PayPal después de la aprobación del usuario
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal no está configurado' },
        { status: 500 }
      )
    }

    const body: CaptureBody = await request.json()
    const { paypalOrderId, reference } = body

    if (!paypalOrderId) {
      return NextResponse.json(
        { error: 'paypalOrderId es requerido' },
        { status: 400 }
      )
    }

    console.log('[PAYPAL/CAPTURE] Capturing order:', paypalOrderId)

    // Buscar la orden en nuestra BD
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: reference || '' },
          {
            metadata: {
              path: ['paypalOrderId'],
              equals: paypalOrderId,
            },
          },
        ],
      },
      include: { user: true },
    })

    if (!order) {
      console.error('[PAYPAL/CAPTURE] Order not found for:', { paypalOrderId, reference })
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Si ya está completada, retornar éxito
    if (order.paymentStatus === 'COMPLETED') {
      console.log('[PAYPAL/CAPTURE] Order already completed:', order.orderNumber)
      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        reference: order.orderNumber,
        alreadyProcessed: true,
      })
    }

    // Capturar el pago en PayPal
    const captureResult = await capturePayPalOrder(paypalOrderId)

    if (!captureResult.success) {
      console.error('[PAYPAL/CAPTURE] Capture failed:', captureResult.error)

      // Actualizar orden como fallida
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          metadata: {
            ...(order.metadata as object),
            captureError: captureResult.error,
            captureAttemptedAt: new Date().toISOString(),
          },
        },
      })

      return NextResponse.json(
        { error: captureResult.error || 'Error al capturar el pago' },
        { status: 500 }
      )
    }

    console.log('[PAYPAL/CAPTURE] Capture successful:', captureResult.captureId)

    // Actualizar orden como completada
    order = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'COMPLETED',
        metadata: {
          ...(order.metadata as object),
          paypalCaptureId: captureResult.captureId,
          paypalCaptureStatus: captureResult.status,
          paypalPayerEmail: captureResult.payerEmail,
          capturedAt: new Date().toISOString(),
        },
      },
      include: { user: true },
    })

    // Procesar el pago aprobado (crear membresía, booking, etc.)
    try {
      await processApprovedPayment(order, {
        transactionId: captureResult.captureId,
      })
      console.log('[PAYPAL/CAPTURE] Payment processed successfully for:', order.orderNumber)
    } catch (processError) {
      console.error('[PAYPAL/CAPTURE] Error processing approved payment:', processError)
      // El pago ya fue capturado, así que no fallamos aquí
      // Pero registramos el error para investigación
      await prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...(order.metadata as object),
            processingError: processError instanceof Error ? processError.message : 'Unknown error',
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      status: 'COMPLETED',
      reference: order.orderNumber,
      captureId: captureResult.captureId,
    })
  } catch (error) {
    console.error('[PAYPAL/CAPTURE] Error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la captura' },
      { status: 500 }
    )
  }
}
