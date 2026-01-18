import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Prevent self-demotion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'No puedes cambiar tu propio rol' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { role, reason } = body

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido. Debe ser USER o ADMIN' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (targetUser.role === role) {
      return NextResponse.json(
        { error: `El usuario ya tiene el rol ${role}` },
        { status: 400 }
      )
    }

    // Update user role and create audit log in a transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: id,
          action: 'role_change',
          actorId: session.user.id,
          actorEmail: currentUser.email || session.user.email || 'unknown',
          reason: reason || `Cambio de rol de ${targetUser.role} a ${role}`,
          metadata: {
            previousRole: targetUser.role,
            newRole: role,
            targetEmail: targetUser.email,
          },
        },
      }),
    ])

    return NextResponse.json({
      message: `Rol actualizado a ${role}`,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el rol del usuario' },
      { status: 500 }
    )
  }
}
