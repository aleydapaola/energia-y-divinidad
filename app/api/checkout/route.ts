/**
 * Unified Checkout Endpoint
 * Endpoint único para todos los métodos de pago
 *
 * POST /api/checkout
 *
 * Body:
 * {
 *   productType: 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'COURSE' | 'PRODUCT' | 'PREMIUM_CONTENT'
 *   productId: string
 *   productName: string
 *   amount: number
 *   currency: 'COP' | 'USD'
 *   paymentMethod: 'CARD' | 'NEQUI' | 'PSE' | 'PAYPAL' | 'BANK_TRANSFER' | 'CASH'
 *   customerEmail?: string  // Requerido para guest checkout
 *   customerName?: string   // Requerido para guest checkout
 *   customerPhone?: string
 *   scheduledAt?: string    // ISO date para sesiones/eventos
 *   seats?: number          // Para eventos
 *   billingInterval?: 'monthly' | 'yearly'  // Para membresías
 *   discountCode?: string
 *   metadata?: Record<string, unknown>
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   redirectUrl?: string  // URL para redirigir al checkout de la pasarela
 *   reference?: string    // Número de orden
 *   order?: { id: string, orderNumber: string }
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  validateCheckoutRequest,
  validateProductSpecificRequirements,
  processCheckout,
} from '@/lib/checkout'
import { applyRateLimit, getClientIP } from '@/lib/rate-limit'
import { getAppUrl } from '@/lib/utils'

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute
  const rateLimitResponse = applyRateLimit(request, { maxRequests: 10, windowMs: 60_000 })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Autenticación (opcional para guest checkout)
    const session = await auth()
    const userId = session?.user?.id || null
    const userEmail = session?.user?.email || null
    const userName = session?.user?.name || null

    // Parsear y validar body
    const body = await request.json()
    const validation = validateCheckoutRequest(body)

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validaciones específicas por producto
    const productError = validateProductSpecificRequirements(data)
    if (productError) {
      return NextResponse.json({ success: false, error: productError }, { status: 400 })
    }

    // Membresías requieren cuenta (por acceso recurrente a contenido)
    if (data.productType === 'MEMBERSHIP' && !userId) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para adquirir una membresía' },
        { status: 401 }
      )
    }

    // Requerir datos de cliente si es guest checkout
    if (!userId) {
      if (!data.customerEmail || !data.customerName) {
        return NextResponse.json(
          { success: false, error: 'Email y nombre son requeridos para compras sin cuenta' },
          { status: 400 }
        )
      }
    }

    // Determinar email a usar
    const checkoutEmail = data.customerEmail || userEmail
    if (!checkoutEmail) {
      return NextResponse.json(
        { success: false, error: 'Se requiere email para continuar' },
        { status: 400 }
      )
    }

    // Procesar checkout
    const baseUrl = getAppUrl()
    const clientIP = getClientIP(request)

    const result = await processCheckout({
      data,
      userId,
      userEmail: checkoutEmail,
      userName: data.customerName || userName,
      clientIP,
      baseUrl,
    })

    if (!result.success) {
      const statusMap: Record<string, number> = {
        VALIDATION: 400,
        DUPLICATE: 409,
        DISCOUNT_INVALID: 400,
        GATEWAY_ERROR: 502,
        INTERNAL: 500,
      }
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusMap[result.errorCode || 'INTERNAL'] || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      redirectUrl: result.redirectUrl,
      reference: result.reference,
      order: result.order,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API-CHECKOUT] Error:', error)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
