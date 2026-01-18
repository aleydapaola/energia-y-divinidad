import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/set-password
 * Permite a usuarios de guest checkout establecer su contraseña
 * También verifica el email automáticamente
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    // Buscar token válido
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
      },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      )
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Actualizar usuario con contraseña y verificar email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
      },
    })

    // Eliminar token usado
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña establecida correctamente. Ya puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Error setting password:', error)
    return NextResponse.json(
      { error: 'Error al establecer contraseña' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/set-password?token=xxx
 * Valida si un token es válido antes de mostrar el formulario
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { valid: false, error: 'Token no proporcionado' },
      { status: 400 }
    )
  }

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      expires: { gt: new Date() },
    },
  })

  if (!verificationToken) {
    return NextResponse.json(
      { valid: false, error: 'Token inválido o expirado' },
      { status: 400 }
    )
  }

  // Verificar que el usuario existe y no tiene contraseña
  const user = await prisma.user.findUnique({
    where: { email: verificationToken.identifier },
    select: { email: true, name: true, password: true },
  })

  if (!user) {
    return NextResponse.json(
      { valid: false, error: 'Usuario no encontrado' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    valid: true,
    email: user.email,
    name: user.name,
    hasPassword: !!user.password,
  })
}
