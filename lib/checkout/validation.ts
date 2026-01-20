/**
 * Checkout Validation
 * Validaciones comunes para todos los checkouts
 */

import { z } from 'zod'

export const checkoutSchema = z.object({
  // Producto
  productType: z.enum(['SESSION', 'EVENT', 'MEMBERSHIP', 'COURSE', 'PRODUCT', 'PREMIUM_CONTENT']),
  productId: z.string().min(1),
  productName: z.string().min(1),

  // Precio
  amount: z.number().positive(),
  currency: z.enum(['COP', 'USD']),

  // Método de pago
  paymentMethod: z.enum(['CARD', 'NEQUI', 'PSE', 'PAYPAL', 'BANK_TRANSFER', 'CASH']),

  // Cliente (requerido para guest checkout)
  customerEmail: z.string().email().optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),

  // Datos específicos según tipo
  scheduledAt: z.string().datetime().optional(), // Para sesiones/eventos
  seats: z.number().int().positive().optional(), // Para eventos
  billingInterval: z.enum(['monthly', 'yearly']).optional(), // Para membresías

  // Descuentos
  discountCode: z.string().optional(),

  // Metadata adicional
  metadata: z.record(z.unknown()).optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

export interface CheckoutValidationResult {
  valid: boolean
  data?: CheckoutInput
  errors?: { field: string; message: string }[]
}

export function validateCheckoutRequest(body: unknown): CheckoutValidationResult {
  const result = checkoutSchema.safeParse(body)

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }
  }

  return {
    valid: true,
    data: result.data,
  }
}

/**
 * Validaciones adicionales según tipo de producto
 */
export function validateProductSpecificRequirements(data: CheckoutInput): string | null {
  switch (data.productType) {
    case 'SESSION':
      // Las sesiones individuales requieren fecha, pero los packs no
      // Esta validación se hace según metadata.isPack
      if (!data.scheduledAt && !data.metadata?.isPack) {
        return 'Las sesiones individuales requieren fecha programada'
      }
      break

    case 'EVENT':
      if (!data.seats || data.seats < 1) {
        return 'Debe especificar al menos 1 asiento'
      }
      break

    case 'MEMBERSHIP':
      if (!data.billingInterval) {
        return 'Debe especificar el intervalo de facturación'
      }
      break
  }

  return null
}
