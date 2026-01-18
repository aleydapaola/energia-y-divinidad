import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWompiApiUrl, WOMPI_CONFIG } from '@/lib/wompi'
import { sendPaymentConfirmationEmail } from '@/lib/email'

/**
 * GET /api/payments/wompi/verify
 * Verificar estado de una transacción de Wompi y actualizar la orden
 *
 * Query params:
 * - transactionId: ID de la transacción de Wompi
 * - ref: Referencia de la orden (orderNumber)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')
    const reference = searchParams.get('ref')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID requerido' }, { status: 400 })
    }

    // Consultar transacción en Wompi
    const wompiResponse = await fetch(
      `${getWompiApiUrl()}/transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
        },
      }
    )

    if (!wompiResponse.ok) {
      console.error('Error fetching Wompi transaction:', wompiResponse.status)
      return NextResponse.json(
        { error: 'Error consultando transacción' },
        { status: 500 }
      )
    }

    const wompiData = await wompiResponse.json()
    const transaction = wompiData.data

    // Buscar y actualizar la orden si tenemos la referencia
    let order = null
    if (reference) {
      order = await prisma.order.findFirst({
        where: { orderNumber: reference },
      })

      if (order && order.paymentStatus === 'PENDING') {
        // Mapear status de Wompi a nuestro modelo
        let paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' = 'PENDING'
        switch (transaction.status) {
          case 'APPROVED':
            paymentStatus = 'COMPLETED'
            break
          case 'DECLINED':
          case 'ERROR':
            paymentStatus = 'FAILED'
            break
          case 'VOIDED':
            paymentStatus = 'CANCELLED'
            break
        }

        // Actualizar orden si el estado cambió
        if (paymentStatus !== 'PENDING') {
          order = await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus,
              metadata: {
                ...(order.metadata as object),
                wompiTransactionId: transactionId,
                wompiStatus: transaction.status,
                verifiedAt: new Date().toISOString(),
              },
            },
            include: {
              user: true,
            },
          })

          // Enviar email de confirmación si el pago fue exitoso
          if (paymentStatus === 'COMPLETED') {
            const metadata = order.metadata as Record<string, any> | null
            const customerEmail = order.user?.email || order.guestEmail || metadata?.customerEmail
            const customerName = order.user?.name || order.guestName || metadata?.customerName || 'Cliente'

            if (customerEmail) {
              // Enviar email en background (no bloquear la respuesta)
              sendPaymentConfirmationEmail({
                email: customerEmail,
                name: customerName,
                orderNumber: order.orderNumber,
                orderType: order.orderType as 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT',
                itemName: order.itemName,
                amount: Number(order.amount),
                currency: order.currency as 'COP' | 'USD' | 'EUR',
                paymentMethod: order.paymentMethod || 'WOMPI_CARD',
                transactionId: transactionId,
              }).catch((err) => {
                console.error('Error sending payment confirmation email:', err)
              })
            }
          }
        }
      }
    }

    return NextResponse.json({
      transactionId: transaction.id,
      transactionStatus: transaction.status,
      statusMessage: transaction.status_message,
      amount: transaction.amount_in_cents / 100,
      currency: transaction.currency,
      paymentMethod: transaction.payment_method_type,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            itemName: order.itemName,
            amount: Number(order.amount),
            currency: order.currency,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
          }
        : null,
    })
  } catch (error) {
    console.error('Error verifying Wompi payment:', error)
    return NextResponse.json(
      { error: 'Error verificando pago' },
      { status: 500 }
    )
  }
}
