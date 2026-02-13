import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { validateDiscountCode, formatDiscount } from '@/lib/discount-codes'

export async function POST(request: NextRequest) {
  try {
    // Get user session (optional - for single-use validation per user)
    const session = await auth()
    const userId = session?.user?.id || 'anonymous'

    const body = await request.json()
    const { code, courseIds, amount, currency } = body

    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'El código es requerido' },
        { status: 400 }
      )
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Debes seleccionar al menos un curso' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { valid: false, error: 'El monto es inválido' },
        { status: 400 }
      )
    }

    if (!currency || !['COP', 'USD'].includes(currency)) {
      return NextResponse.json(
        { valid: false, error: 'La moneda debe ser COP o USD' },
        { status: 400 }
      )
    }

    // Validate the discount code
    const result = await validateDiscountCode({
      code,
      userId,
      courseIds,
      amount,
      currency,
    })

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
      })
    }

    // Return success with discount info
    return NextResponse.json({
      valid: true,
      discountCode: result.discountCode!.code,
      discountCodeId: result.discountCode!._id,
      discountType: result.discountCode!.discountType,
      discountValue: result.discountCode!.discountValue,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      formattedDiscount: formatDiscount(result.discountCode!),
    })
  } catch (error) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { valid: false, error: 'Error al validar el código' },
      { status: 500 }
    )
  }
}
