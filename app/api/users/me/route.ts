import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users/me - Obtener perfil del usuario actual
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            orders: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/users/me - Actualizar perfil del usuario
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image } = body;

    // Validar que al menos un campo fue enviado
    if (!name && !image) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Preparar datos para actualizar
    const updateData: { name?: string; image?: string } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'El nombre debe tener al menos 2 caracteres' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (image !== undefined) {
      updateData.image = image;
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
