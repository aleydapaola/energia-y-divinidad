import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { hasActiveMembership } from '@/lib/membership-access'
import { getPostComments, createPostComment } from '@/lib/membership-posts'
import { getMembershipPostBySlug } from '@/lib/sanity/queries/membership'

/**
 * GET /api/membership/posts/[slug]/comments
 * Obtiene los comentarios de una publicación
 */
export async function GET(
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
        { error: 'Requiere membresía activa para ver comentarios' },
        { status: 403 }
      )
    }

    const post = await getMembershipPostBySlug(slug)

    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    const comments = await getPostComments(post._id, session.user.id)

    return NextResponse.json({
      comments,
      total: comments.length,
    })
  } catch (error) {
    console.error('Error getting post comments:', error)
    return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 })
  }
}

/**
 * POST /api/membership/posts/[slug]/comments
 * Crea un nuevo comentario en una publicación
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
        { error: 'Requiere membresía activa para comentar' },
        { status: 403 }
      )
    }

    const post = await getMembershipPostBySlug(slug)

    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    if (!post.allowComments) {
      return NextResponse.json(
        { error: 'Los comentarios están deshabilitados en esta publicación' },
        { status: 403 }
      )
    }

    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'El comentario no puede tener más de 2000 caracteres' },
        { status: 400 }
      )
    }

    const comment = await createPostComment(
      post._id,
      post.slug.current,
      session.user.id,
      content.trim()
    )

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating post comment:', error)
    return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 })
  }
}
