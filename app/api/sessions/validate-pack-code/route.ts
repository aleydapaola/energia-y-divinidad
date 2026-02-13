import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/sessions/validate-pack-code
 * Validates a session pack code and returns remaining sessions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Código requerido' },
        { status: 400 }
      )
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.toUpperCase().trim()

    // Find the pack code
    const packCode = await prisma.sessionPackCode.findUnique({
      where: { code: normalizedCode },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    })

    if (!packCode) {
      return NextResponse.json(
        { valid: false, error: 'Código no encontrado' },
        { status: 404 }
      )
    }

    // Check if pack belongs to this user
    if (packCode.userId !== session.user.id) {
      return NextResponse.json(
        { valid: false, error: 'Este código pertenece a otro usuario' },
        { status: 403 }
      )
    }

    // Check if pack is active
    if (!packCode.active) {
      return NextResponse.json(
        { valid: false, error: 'Este pack ya no está activo' },
        { status: 400 }
      )
    }

    // Check if expired
    if (packCode.expiresAt && new Date() > packCode.expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Este pack ha expirado' },
        { status: 400 }
      )
    }

    // Check remaining sessions
    const sessionsRemaining = packCode.sessionsTotal - packCode.sessionsUsed
    if (sessionsRemaining <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Ya has usado todas las sesiones de este pack' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      packCode: {
        id: packCode.id,
        code: packCode.code,
        packName: packCode.packName,
        sessionsTotal: packCode.sessionsTotal,
        sessionsUsed: packCode.sessionsUsed,
        sessionsRemaining,
        expiresAt: packCode.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error validating pack code:', error)
    return NextResponse.json(
      { error: 'Error al validar el código' },
      { status: 500 }
    )
  }
}
