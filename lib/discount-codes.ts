/**
 * Discount Codes Library
 * Handles validation and usage tracking of discount codes managed in Sanity
 */

import { client } from '@/sanity/lib/client'
import { DISCOUNT_CODE_BY_CODE_QUERY } from '@/sanity/lib/queries'
import { prisma } from '@/lib/prisma'

// Types for discount codes from Sanity
export interface SanityDiscountCode {
  _id: string
  code: string
  description?: string
  active: boolean
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  currency?: string
  usageType: 'single_use' | 'multi_use'
  maxUses?: number
  validFrom?: string
  validUntil?: string
  minPurchaseAmount?: number
  appliesToCourses?: { _id: string; title: string }[]
}

export interface DiscountValidationResult {
  valid: boolean
  discountCode?: SanityDiscountCode
  discountAmount?: number
  finalAmount?: number
  error?: string
}

/**
 * Get discount code from Sanity by code string
 */
export async function getDiscountCodeByCode(code: string): Promise<SanityDiscountCode | null> {
  const discountCode = await client.fetch<SanityDiscountCode | null>(
    DISCOUNT_CODE_BY_CODE_QUERY,
    { code: code.toUpperCase() }
  )
  return discountCode
}

/**
 * Get usage count for a discount code from Prisma
 */
export async function getDiscountUsageCount(discountCodeId: string): Promise<number> {
  const count = await prisma.discountUsage.count({
    where: { discountCodeId },
  })
  return count
}

/**
 * Check if a user has already used a single-use discount code
 */
export async function hasUserUsedCode(discountCodeId: string, userId: string): Promise<boolean> {
  const usage = await prisma.discountUsage.findFirst({
    where: {
      discountCodeId,
      userId,
    },
  })
  return !!usage
}

/**
 * Calculate discount amount based on type and value
 */
export function calculateDiscount(
  originalAmount: number,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return Math.round((originalAmount * discountValue) / 100)
  }
  // Fixed amount - can't discount more than the original amount
  return Math.min(discountValue, originalAmount)
}

/**
 * Validate a discount code for a purchase
 */
export async function validateDiscountCode(params: {
  code: string
  userId: string
  courseIds: string[]
  amount: number
  currency: 'COP' | 'USD'
}): Promise<DiscountValidationResult> {
  const { code, userId, courseIds, amount, currency } = params

  // 1. Get discount code from Sanity
  const discountCode = await getDiscountCodeByCode(code)

  if (!discountCode) {
    return { valid: false, error: 'Código de descuento no encontrado' }
  }

  // 2. Check if code is active
  if (!discountCode.active) {
    return { valid: false, error: 'Este código de descuento está desactivado' }
  }

  // 3. Check validity dates
  const now = new Date()

  if (discountCode.validFrom) {
    const validFrom = new Date(discountCode.validFrom)
    if (now < validFrom) {
      return { valid: false, error: 'Este código de descuento aún no es válido' }
    }
  }

  if (discountCode.validUntil) {
    const validUntil = new Date(discountCode.validUntil)
    if (now > validUntil) {
      return { valid: false, error: 'Este código de descuento ha expirado' }
    }
  }

  // 4. Check usage limits
  if (discountCode.usageType === 'single_use') {
    // Single use: check if ANYONE has used it
    const usageCount = await getDiscountUsageCount(discountCode._id)
    if (usageCount > 0) {
      return { valid: false, error: 'Este código de descuento ya ha sido utilizado' }
    }
  } else if (discountCode.maxUses) {
    // Multi-use with limit: check total usage count
    const usageCount = await getDiscountUsageCount(discountCode._id)
    if (usageCount >= discountCode.maxUses) {
      return { valid: false, error: 'Este código de descuento ha alcanzado su límite de usos' }
    }
  }

  // 5. Check if code applies to the courses in the cart
  if (discountCode.appliesToCourses && discountCode.appliesToCourses.length > 0) {
    const applicableCourseIds = discountCode.appliesToCourses.map((c) => c._id)
    const hasApplicableCourse = courseIds.some((id) => applicableCourseIds.includes(id))
    if (!hasApplicableCourse) {
      return { valid: false, error: 'Este código no aplica a los cursos seleccionados' }
    }
  }

  // 6. Check minimum purchase amount
  if (discountCode.minPurchaseAmount && amount < discountCode.minPurchaseAmount) {
    const formattedMin = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(discountCode.minPurchaseAmount)
    return {
      valid: false,
      error: `El monto mínimo de compra es ${formattedMin}`,
    }
  }

  // 7. Check currency for fixed amount discounts
  if (discountCode.discountType === 'fixed_amount' && discountCode.currency !== currency) {
    return {
      valid: false,
      error: `Este código solo aplica para pagos en ${discountCode.currency}`,
    }
  }

  // 8. Calculate discount amount
  const discountAmount = calculateDiscount(
    amount,
    discountCode.discountType,
    discountCode.discountValue
  )
  const finalAmount = Math.max(0, amount - discountAmount)

  return {
    valid: true,
    discountCode,
    discountAmount,
    finalAmount,
  }
}

/**
 * Record usage of a discount code after successful payment
 */
export async function recordDiscountUsage(params: {
  discountCodeId: string
  discountCode: string
  userId: string
  orderId: string
  discountAmount: number
  currency: string
}): Promise<void> {
  const { discountCodeId, discountCode, userId, orderId, discountAmount, currency } = params

  await prisma.discountUsage.create({
    data: {
      discountCodeId,
      discountCode: discountCode.toUpperCase(),
      userId,
      orderId,
      discountAmount,
      currency,
    },
  })
}

/**
 * Format discount for display
 */
export function formatDiscount(discountCode: SanityDiscountCode): string {
  if (discountCode.discountType === 'percentage') {
    return `${discountCode.discountValue}%`
  }

  const currency = discountCode.currency || 'COP'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(discountCode.discountValue)
}
