import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { hasActiveMembership } from '@/lib/membership-access'
import { getPostEngagement } from '@/lib/membership-posts'
import { getRecentMembershipPosts, getAllMembershipPosts } from '@/lib/sanity/queries/membership'

import type { MembershipPostWithEngagement } from '@/types/membership'

/**
 * GET /api/membership/posts
 * Obtiene las publicaciones del feed de membresía
 * Query params:
 * - type: filtrar por tipo de post (editorial, video, etc)
 * - limit: número de posts a retornar (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario tenga membresía activa
    const hasMembership = await hasActiveMembership(session.user.id)

    if (!hasMembership) {
      return NextResponse.json(
        { error: 'Requiere membresía activa para acceder al contenido' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const postType = searchParams.get('type') || undefined
    const limit = parseInt(searchParams.get('limit') || '20')

    // Obtener posts desde Sanity
    const posts = await getAllMembershipPosts({
      postType,
      limit,
    })

    // Enriquecer con datos de engagement desde Prisma
    const postsWithEngagement: MembershipPostWithEngagement[] = await Promise.all(
      posts.map(async (post) => {
        const engagement = await getPostEngagement(post._id, session.user.id)

        return {
          ...post,
          ...engagement,
        }
      })
    )

    return NextResponse.json({
      posts: postsWithEngagement,
      total: postsWithEngagement.length,
    })
  } catch (error) {
    console.error('Error getting membership posts:', error)
    return NextResponse.json({ error: 'Error al obtener publicaciones' }, { status: 500 })
  }
}
