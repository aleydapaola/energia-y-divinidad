import { NextRequest, NextResponse } from 'next/server'

import { processApprovedPayment } from '@/lib/payment-processor'
import { prisma } from '@/lib/prisma'
import { getWompiApiUrl, WOMPI_CONFIG } from '@/lib/wompi'

/**
 * GET /api/payments/wompi/verify-by-reference
 * Buscar y verificar una transacción de Wompi por referencia de orden
 *
 * Útil cuando Wompi no incluye el transactionId en la redirección
 * (fallback para cuando el id no viene en la URL)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('ref')

    console.log('[VERIFY-BY-REF] === INICIANDO VERIFICACIÓN POR REFERENCIA ===')
    console.log('[VERIFY-BY-REF] reference:', reference)

    if (!reference) {
      return NextResponse.json({ error: 'Referencia requerida' }, { status: 400 })
    }

    // Buscar la orden en nuestra BD
    const order = await prisma.order.findFirst({
      where: { orderNumber: reference },
      include: { user: true },
    })

    if (!order) {
      console.log('[VERIFY-BY-REF] Order not found')
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    console.log('[VERIFY-BY-REF] Order found:', order.id)
    console.log('[VERIFY-BY-REF] Order status:', order.paymentStatus)

    // Si ya está completada, no necesitamos verificar
    if (order.paymentStatus === 'COMPLETED') {
      console.log('[VERIFY-BY-REF] Order already completed')
      return NextResponse.json({
        transactionStatus: 'APPROVED',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          itemName: order.itemName,
          amount: order.amount,
          currency: order.currency,
          paymentStatus: 'COMPLETED',
          paymentMethod: order.paymentMethod,
          metadata: order.metadata,
        },
      })
    }

    // Obtener el payment link ID de metadata
    const metadata = order.metadata as any
    const paymentLinkId = metadata?.wompiPaymentLinkId

    if (!paymentLinkId) {
      console.log('[VERIFY-BY-REF] No payment link ID in metadata')
      return NextResponse.json({
        error: 'No se encontró ID de link de pago',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
      })
    }

    console.log('[VERIFY-BY-REF] Payment link ID:', paymentLinkId)

    // Buscar transacciones del payment link en Wompi
    const wompiUrl = `${getWompiApiUrl()}/payment_links/${paymentLinkId}`
    console.log('[VERIFY-BY-REF] Fetching payment link from Wompi:', wompiUrl)

    const wompiResponse = await fetch(wompiUrl, {
      headers: {
        Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
      },
    })

    if (!wompiResponse.ok) {
      console.error('[VERIFY-BY-REF] Error fetching payment link:', wompiResponse.status)
      return NextResponse.json({
        error: 'Error consultando Wompi',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
      })
    }

    const paymentLinkData = await wompiResponse.json()
    console.log('[VERIFY-BY-REF] Payment link status:', paymentLinkData.data?.status)

    // Buscar transacciones asociadas al payment link
    const transactionsUrl = `${getWompiApiUrl()}/transactions?payment_link_id=${paymentLinkId}`
    console.log('[VERIFY-BY-REF] Fetching transactions:', transactionsUrl)

    const transactionsResponse = await fetch(transactionsUrl, {
      headers: {
        Authorization: `Bearer ${WOMPI_CONFIG.privateKey}`,
      },
    })

    if (!transactionsResponse.ok) {
      console.error('[VERIFY-BY-REF] Error fetching transactions:', transactionsResponse.status)
      return NextResponse.json({
        transactionStatus: 'PENDING',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
      })
    }

    const transactionsData = await transactionsResponse.json()
    const transactions = transactionsData.data || []
    console.log('[VERIFY-BY-REF] Found transactions:', transactions.length)

    // Buscar la transacción más reciente aprobada
    const approvedTransaction = transactions.find((t: any) => t.status === 'APPROVED')
    const latestTransaction = approvedTransaction || transactions[0]

    if (!latestTransaction) {
      console.log('[VERIFY-BY-REF] No transactions found')
      return NextResponse.json({
        transactionStatus: 'PENDING',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
      })
    }

    console.log('[VERIFY-BY-REF] Latest transaction:', latestTransaction.id, latestTransaction.status)

    // Actualizar orden con los datos de la transacción
    const isApproved = latestTransaction.status === 'APPROVED'
    const newPaymentStatus = isApproved ? 'COMPLETED' : (latestTransaction.status === 'PENDING' ? 'PENDING' : 'FAILED')

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: newPaymentStatus as any,
        metadata: {
          ...metadata,
          wompiTransactionId: latestTransaction.id,
          wompiStatus: latestTransaction.status,
          wompiVerifiedAt: new Date().toISOString(),
        },
      },
      include: { user: true },
    })

    console.log('[VERIFY-BY-REF] Order updated to:', newPaymentStatus)

    // Si el pago fue aprobado, procesar con el servicio centralizado
    // Nota: order.paymentStatus ya no puede ser COMPLETED aquí debido al early return
    if (isApproved) {
      console.log('[VERIFY-BY-REF] Payment approved, processing...')

      const result = await processApprovedPayment(updatedOrder, {
        transactionId: latestTransaction.id,
      })

      if (!result.success) {
        console.error('[VERIFY-BY-REF] Error processing payment:', result.error)
      } else {
        console.log('[VERIFY-BY-REF] Payment processed successfully')
      }
    }

    return NextResponse.json({
      transactionStatus: latestTransaction.status,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        orderType: updatedOrder.orderType,
        itemName: updatedOrder.itemName,
        amount: updatedOrder.amount,
        currency: updatedOrder.currency,
        paymentStatus: newPaymentStatus,
        paymentMethod: updatedOrder.paymentMethod,
        metadata: updatedOrder.metadata,
      },
    })
  } catch (error: any) {
    console.error('[VERIFY-BY-REF] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error verificando transacción' },
      { status: 500 }
    )
  }
}

