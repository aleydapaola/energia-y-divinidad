import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { hasActiveMembership } from '@/lib/membership-access'
import { togglePostLike } from '@/lib/membership-posts'
import { getMembershipPostBySlug } from '@/lib/sanity/queries/membership'

/**
 * POST /api/membership/posts/[slug]/like
 * Toggle like en una publicación
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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

    const post = await getMembershipPostBySlug(slug)

    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    if (!post.allowLikes) {
      return NextResponse.json(
        { error: 'Los likes están deshabilitados en esta publicación' },
        { status: 403 }
      )
    }

    const result = await togglePostLike(post._id, post.slug.current, session.user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error toggling post like:', error)
    return NextResponse.json({ error: 'Error al dar like' }, { status: 500 })
  }
}
