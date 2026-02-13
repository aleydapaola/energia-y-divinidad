/**
 * Checkout Service
 * Servicio centralizado para procesar checkouts
 */

import { validateDiscountCode, calculateDiscount } from '@/lib/discount-codes'
import { generateOrderNumber, type OrderPrefix } from '@/lib/order-utils'
import {
  getGatewayForPayment,
  type CreatePaymentParams,
  type PaymentMethodType,
  type Currency,
} from '@/lib/payments'
import { prisma } from '@/lib/prisma'

import type { CheckoutInput } from './validation'

export interface CheckoutOptions {
  /** Datos validados del checkout */
  data: CheckoutInput
  /** ID del usuario autenticado (null para guest) */
  userId: string | null
  /** Email del usuario (de sesión o de datos de cliente) */
  userEmail: string
  /** Nombre del usuario */
  userName: string | null
  /** IP del cliente */
  clientIP: string
  /** URL base para retorno */
  baseUrl: string
}

export interface CheckoutResult {
  success: boolean
  /** URL para redirigir al usuario */
  redirectUrl?: string
  /** Orden creada */
  order?: {
    id: string
    orderNumber: string
  }
  /** Referencia de pago */
  reference?: string
  /** Error si falló */
  error?: string
  errorCode?: 'VALIDATION' | 'DUPLICATE' | 'DISCOUNT_INVALID' | 'GATEWAY_ERROR' | 'INTERNAL'
}

/**
 * Mapea productType a OrderPrefix
 */
function getOrderPrefix(productType: string): OrderPrefix {
  const prefixMap: Record<string, OrderPrefix> = {
    SESSION: 'ORD',
    EVENT: 'EVT',
    MEMBERSHIP: 'MEM',
    COURSE: 'CRS',
    PRODUCT: 'ORD',
    PREMIUM_CONTENT: 'ORD',
  }
  return prefixMap[productType] || 'ORD'
}

/**
 * Mapea productType a OrderType
 */
function getOrderType(
  productType: string
): 'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'COURSE' {
  const typeMap: Record<
    string,
    'PRODUCT' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'PREMIUM_CONTENT' | 'COURSE'
  > = {
    SESSION: 'SESSION',
    EVENT: 'EVENT',
    MEMBERSHIP: 'MEMBERSHIP',
    COURSE: 'COURSE',
    PRODUCT: 'PRODUCT',
    PREMIUM_CONTENT: 'PREMIUM_CONTENT',
  }
  return typeMap[productType] || 'PRODUCT'
}

/**
 * Mapea gateway y método de pago a PaymentMethod de Prisma
 */
function getPaymentMethodEnum(
  gatewayName: string,
  paymentMethod: PaymentMethodType
): 'WOMPI_NEQUI' | 'WOMPI_CARD' | 'WOMPI_PSE' | 'PAYPAL_DIRECT' | 'PAYPAL_CARD' {
  if (gatewayName === 'wompi') {
    switch (paymentMethod) {
      case 'NEQUI':
        return 'WOMPI_NEQUI'
      case 'PSE':
        return 'WOMPI_PSE'
      case 'BANK_TRANSFER':
        return 'WOMPI_PSE'
      default:
        return 'WOMPI_CARD'
    }
  } else if (gatewayName === 'paypal') {
    switch (paymentMethod) {
      case 'CARD':
        return 'PAYPAL_CARD'
      default:
        return 'PAYPAL_DIRECT'
    }
  } else if (gatewayName === 'nequi') {
    return 'WOMPI_NEQUI' // Nequi directo también se marca como WOMPI_NEQUI
  }
  return 'WOMPI_CARD'
}

/**
 * Procesa un checkout completo
 */
export async function processCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  const { data, userId, userEmail, userName, clientIP, baseUrl } = options

  try {
    // 1. Verificar si intenta comprar el mismo plan
    if (data.productType === 'MEMBERSHIP' && userId) {
      const samePlanExists = await checkExistingMembership(userId, data.productId)
      if (samePlanExists) {
        return {
          success: false,
          error: 'Ya tienes este plan activo',
          errorCode: 'DUPLICATE',
        }
      }
      // Si tiene otro plan, es un upgrade/downgrade - permitir continuar
    }

    // 2. Procesar código de descuento si existe
    let finalAmount = data.amount
    let discountInfo: { id: string; code: string; amount: number } | null = null

    if (data.discountCode && userId) {
      const discountResult = await validateDiscountCode({
        code: data.discountCode,
        userId,
        courseIds: data.productType === 'COURSE' ? [data.productId] : [],
        amount: data.amount,
        currency: data.currency as 'COP' | 'USD',
      })

      if (discountResult.valid && discountResult.discountCode) {
        const discountAmount = calculateDiscount(
          data.amount,
          discountResult.discountCode.discountType,
          discountResult.discountCode.discountValue
        )
        discountInfo = {
          id: discountResult.discountCode._id,
          code: data.discountCode.toUpperCase(),
          amount: discountAmount,
        }
        finalAmount = Math.max(0, data.amount - discountAmount)
      }
    }

    // 3. Generar número de orden
    const orderNumber = generateOrderNumber(getOrderPrefix(data.productType))

    // 4. Seleccionar gateway
    const gateway = getGatewayForPayment(
      data.paymentMethod as PaymentMethodType,
      data.currency as Currency
    )

    // 5. Crear orden en base de datos
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        guestEmail: !userId ? data.customerEmail : null,
        guestName: !userId ? data.customerName : null,
        orderType: getOrderType(data.productType),
        itemId: data.productId,
        itemName: data.productName,
        amount: finalAmount,
        currency: data.currency,
        paymentMethod: getPaymentMethodEnum(gateway.name, data.paymentMethod as PaymentMethodType),
        paymentStatus: 'PENDING',
        discountCodeId: discountInfo?.id,
        discountCode: discountInfo?.code,
        discountAmount: discountInfo?.amount,
        originalAmount: discountInfo ? data.amount : null,
        metadata: {
          productType: data.productType,
          originalAmount: data.amount,
          scheduledAt: data.scheduledAt || null,
          seats: data.seats || null,
          billingInterval: data.billingInterval || null,
          isGuestCheckout: !userId,
          customerEmail: data.customerEmail || userEmail,
          customerName: data.customerName || userName,
          customerPhone: data.customerPhone || null,
          clientIP,
          gatewayName: gateway.name,
          ...data.metadata,
        },
      },
    })

    // 6. Crear pago en el gateway
    const paymentParams: CreatePaymentParams = {
      amount: finalAmount,
      currency: data.currency as Currency,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customer: {
        email: data.customerEmail || userEmail,
        name: data.customerName || userName || 'Cliente',
        phone: data.customerPhone,
      },
      description: `${data.productName} - Energía y Divinidad`,
      paymentMethod: data.paymentMethod as PaymentMethodType,
      metadata: {
        productType: data.productType,
        productId: data.productId,
        userId: userId || undefined,
      },
      returnUrl: `${baseUrl}/pago/confirmacion?ref=${order.orderNumber}`,
      webhookUrl: `${baseUrl}/api/webhooks/${gateway.name}`,
    }

    const paymentResult = await gateway.createPayment(paymentParams)

    if (!paymentResult.success) {
      // Marcar orden como fallida
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          metadata: {
            ...(order.metadata as object),
            gatewayError: paymentResult.error,
            gatewayErrorCode: paymentResult.errorCode,
          },
        },
      })

      return {
        success: false,
        error: paymentResult.error || 'Error al crear el pago',
        errorCode: 'GATEWAY_ERROR',
      }
    }

    // 7. Actualizar orden con ID de transacción
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...(order.metadata as object),
          gatewayTransactionId: paymentResult.transactionId,
          gatewayReference: paymentResult.reference,
        },
      },
    })

    return {
      success: true,
      redirectUrl: paymentResult.redirectUrl,
      reference: order.orderNumber,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[CHECKOUT] Error:', error)
    return {
      success: false,
      error: errorMessage,
      errorCode: 'INTERNAL',
    }
  }
}

/**
 * Verifica si el usuario ya tiene una membresía activa del MISMO tier
 * Retorna true solo si tiene el mismo plan (bloquear)
 * Retorna false si no tiene membresía o tiene un plan diferente (permitir upgrade/downgrade)
 */
async function checkExistingMembership(userId: string, tierId?: string): Promise<boolean> {
  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
    },
  })

  // Si no tiene membresía activa, permitir
  if (!existing) {return false}

  // Si tiene membresía pero es diferente tier, permitir (upgrade/downgrade)
  if (tierId && existing.membershipTierId !== tierId) {return false}

  // Mismo tier - bloquear
  return true
}
