import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMembershipPostBySlug } from '@/lib/sanity/queries/membership'
import { voteInPoll, getPollResults, getUserPollVote } from '@/lib/membership-posts'
import { hasActiveMembership } from '@/lib/membership-access'

/**
 * POST /api/membership/posts/[slug]/vote
 * Votar en una encuesta
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
        { error: 'Requiere membresía activa para votar' },
        { status: 403 }
      )
    }

    const post = await getMembershipPostBySlug(slug)

    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    if (post.postType !== 'poll') {
      return NextResponse.json({ error: 'Esta publicación no es una encuesta' }, { status: 400 })
    }

    // Verificar si la encuesta ya cerró
    if (post.pollEndsAt && new Date(post.pollEndsAt) < new Date()) {
      return NextResponse.json({ error: 'Esta encuesta ya ha cerrado' }, { status: 400 })
    }

    const { optionIndex } = await request.json()

    if (typeof optionIndex !== 'number') {
      return NextResponse.json({ error: 'Índice de opción inválido' }, { status: 400 })
    }

    if (!post.pollOptions || optionIndex < 0 || optionIndex >= post.pollOptions.length) {
      return NextResponse.json({ error: 'Opción de encuesta inválida' }, { status: 400 })
    }

    // Registrar voto
    await voteInPoll(post._id, post.slug.current, session.user.id, optionIndex)

    // Obtener resultados actualizados
    const results = await getPollResults(post._id, post.pollOptions)

    return NextResponse.json({
      voted: true,
      optionIndex,
      results,
    })
  } catch (error) {
    console.error('Error voting in poll:', error)
    return NextResponse.json({ error: 'Error al votar' }, { status: 500 })
  }
}

/**
 * GET /api/membership/posts/[slug]/vote
 * Obtiene los resultados de una encuesta y el voto del usuario
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

    const hasMembership = await hasActiveMembership(session.user.id)

    if (!hasMembership) {
      return NextResponse.json(
        { error: 'Requiere membresía activa' },
        { status: 403 }
      )
    }

    const post = await getMembershipPostBySlug(slug)

    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    if (post.postType !== 'poll' || !post.pollOptions) {
      return NextResponse.json({ error: 'Esta publicación no es una encuesta' }, { status: 400 })
    }

    const userVote = await getUserPollVote(post._id, session.user.id)
    const results = await getPollResults(post._id, post.pollOptions)

    return NextResponse.json({
      userVote,
      results,
      hasVoted: userVote !== null,
      isClosed: post.pollEndsAt ? new Date(post.pollEndsAt) < new Date() : false,
    })
  } catch (error) {
    console.error('Error getting poll results:', error)
    return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 })
  }
}
