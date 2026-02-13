import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { hasActiveMembership } from '@/lib/membership-access'
import { deletePostComment } from '@/lib/membership-posts'

/**
 * DELETE /api/membership/comments/[commentId]
 * Elimina un comentario (solo el autor puede eliminarlo)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar membresía activa
    const hasMembership = await hasActiveMembership(session.user.id)

    if (!hasMembership) {
      return NextResponse.json(
        { error: 'Requiere membresía activa' },
        { status: 403 }
      )
    }

    await deletePostComment(commentId, session.user.id)

    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    console.error('Error deleting comment:', error)

    if (error.message?.includes('No tienes permiso')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ error: 'Error al eliminar comentario' }, { status: 500 })
  }
}
