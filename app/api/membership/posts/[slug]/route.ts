import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMembershipPostBySlug } from '@/lib/sanity/queries/membership'
import { getPostEngagement, incrementPostView } from '@/lib/membership-posts'
import { hasActiveMembership } from '@/lib/membership-access'

/**
 * GET /api/membership/posts/[slug]
 * Obtiene una publicación específica por slug
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
        { error: 'Requiere membresía activa para acceder al contenido' },
        { status: 403 }
      )
    }

    const post = await getMembershipPostBySlug(slug)

    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    // Obtener engagement
    const engagement = await getPostEngagement(post._id, session.user.id)

    // Registrar vista
    await incrementPostView(post._id, post.slug.current, session.user.id)

    return NextResponse.json({
      ...post,
      ...engagement,
    })
  } catch (error) {
    console.error('Error getting membership post:', error)
    return NextResponse.json({ error: 'Error al obtener publicación' }, { status: 500 })
  }
}
