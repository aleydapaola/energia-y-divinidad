import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { toggleCommentLike } from '@/lib/membership-posts'
import { hasActiveMembership } from '@/lib/membership-access'

/**
 * POST /api/membership/comments/[commentId]/like
 * Toggle like en un comentario
 */
export async function POST(
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
        { error: 'Requiere membresía activa para interactuar' },
        { status: 403 }
      )
    }

    const result = await toggleCommentLike(commentId, session.user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error toggling comment like:', error)
    return NextResponse.json({ error: 'Error al dar like' }, { status: 500 })
  }
}
