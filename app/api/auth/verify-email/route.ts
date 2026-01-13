import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token de verificación requerido' },
        { status: 400 }
      );
    }

    // Buscar el token de verificación
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Token de verificación inválido o ya utilizado' },
        { status: 400 }
      );
    }

    // Verificar si el token ha expirado
    if (new Date() > verificationToken.expires) {
      // Eliminar token expirado
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.json(
        { error: 'El enlace de verificación ha expirado. Por favor solicita uno nuevo.' },
        { status: 400 }
      );
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya está verificado
    if (user.emailVerified) {
      // Eliminar token usado
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.json({
        success: true,
        message: 'Tu email ya estaba verificado',
        alreadyVerified: true,
      });
    }

    // Actualizar usuario como verificado
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Eliminar token usado
    await prisma.verificationToken.delete({
      where: { token },
    });

    // Enviar email de bienvenida
    try {
      await sendWelcomeEmail({
        email: user.email,
        name: user.name || 'Usuario',
      });
    } catch (emailError) {
      console.error('Error enviando email de bienvenida:', emailError);
      // No fallamos si el email de bienvenida no se envía
    }

    return NextResponse.json({
      success: true,
      message: '¡Tu email ha sido verificado exitosamente! Ya puedes iniciar sesión.',
    });
  } catch (error) {
    console.error('Error verificando email:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
