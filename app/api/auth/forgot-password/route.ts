import { randomBytes } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { sendPasswordResetEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/forgot-password
 * Genera un token de recuperación y envía email al usuario
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'El email es requerido' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true }
    })

    // IMPORTANTE: Siempre devolver éxito para no revelar si el email existe
    // Esto previene ataques de enumeración de usuarios
    if (!user) {
      console.log(`[FORGOT-PASSWORD] Email no encontrado: ${normalizedEmail}`)
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace de recuperación'
      })
    }

    // Eliminar tokens anteriores para este email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail }
    })

    // Generar nuevo token (1 hora de validez para reset de contraseña)
    const resetToken = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: resetToken,
        expires
      }
    })

    // Enviar email de recuperación
    await sendPasswordResetEmail({
      email: normalizedEmail,
      name: user.name || 'Usuario',
      token: resetToken
    })

    console.log(`[FORGOT-PASSWORD] Email de recuperación enviado a: ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace de recuperación'
    })
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
