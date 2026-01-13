import { prisma } from './prisma'

/**
 * Genera un código único para pack de sesiones
 * Formato: PACK-XXXXXX (6 caracteres alfanuméricos)
 * Excluye caracteres confusos: I, O, 0, 1
 */
export function generatePackCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'PACK-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export interface CreatePackCodeParams {
  userId: string
  bookingId: string
  amount: number
  currency: 'COP' | 'USD' | 'EUR'
}

export interface PackCodeResult {
  code: string
  expiresAt: Date
  sessionsTotal: number
}

/**
 * Crea un nuevo código de pack en la base de datos
 * - Genera código único (reintenta si hay colisión)
 * - Establece expiración a 1 año
 * - Vincula con booking original
 */
export async function createPackCode(params: CreatePackCodeParams): Promise<PackCodeResult> {
  const { userId, bookingId, amount, currency } = params

  // Verificar que no existe ya un código para este booking
  const existingCode = await prisma.sessionPackCode.findUnique({
    where: { originalBookingId: bookingId }
  })

  if (existingCode) {
    return {
      code: existingCode.code,
      expiresAt: existingCode.expiresAt!,
      sessionsTotal: existingCode.sessionsTotal
    }
  }

  // Calcular fecha de expiración (1 año desde ahora)
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  // Intentar crear con código único (hasta 5 intentos por colisiones)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePackCode()

    try {
      const packCode = await prisma.sessionPackCode.create({
        data: {
          code,
          userId,
          packName: 'Pack de 8 Sesiones (7+1 Gratis)',
          sessionsTotal: 8,
          sessionsUsed: 0,
          priceAtPurchase: amount,
          currency,
          active: true,
          expiresAt,
          originalBookingId: bookingId,
        },
      })

      return {
        code: packCode.code,
        expiresAt: packCode.expiresAt!,
        sessionsTotal: packCode.sessionsTotal
      }
    } catch (error: unknown) {
      // P2002 = Unique constraint violation (código duplicado)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        continue
      }
      throw error
    }
  }

  throw new Error('No se pudo generar un código único después de múltiples intentos')
}

/**
 * Obtiene un código de pack por su ID de booking original
 */
export async function getPackCodeByBookingId(bookingId: string) {
  return prisma.sessionPackCode.findUnique({
    where: { originalBookingId: bookingId },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  })
}

/**
 * Obtiene un código de pack por el código mismo
 */
export async function getPackCodeByCode(code: string) {
  return prisma.sessionPackCode.findUnique({
    where: { code },
    include: {
      user: {
        select: { name: true, email: true }
      },
      redemptions: {
        select: { redeemedAt: true, bookingId: true }
      }
    }
  })
}
