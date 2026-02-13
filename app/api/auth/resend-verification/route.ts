import { randomBytes } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { sendVerificationEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, se enviará un nuevo enlace de verificación',
      });
    }

    // Verificar si ya está verificado
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Este email ya está verificado' },
        { status: 400 }
      );
    }

    // Eliminar tokens anteriores para este email
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // Generar nuevo token de verificación
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Expira en 24 horas

    // Guardar nuevo token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: tokenExpiry,
      },
    });

    // Enviar email de verificación
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name || 'Usuario',
        token: verificationToken,
      });
    } catch (emailError) {
      console.error('Error enviando email de verificación:', emailError);
      return NextResponse.json(
        { error: 'Error al enviar el email. Por favor intenta de nuevo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Se ha enviado un nuevo enlace de verificación a tu email',
    });
  } catch (error) {
    console.error('Error reenviando verificación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
