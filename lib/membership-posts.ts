import { prisma } from './prisma'
import type { MembershipPostWithEngagement, PostType, CommentWithAuthor } from '@/types/membership'

/**
 * Sincroniza un post de Sanity con Prisma para tracking de engagement
 */
export async function syncMembershipPost(sanityId: string, slug: string) {
  return await prisma.membershipPost.upsert({
    where: { sanityId },
    update: { slug },
    create: {
      sanityId,
      slug,
    },
  })
}

/**
 * Obtiene o crea un post en Prisma
 */
export async function getOrCreatePost(sanityId: string, slug: string) {
  let post = await prisma.membershipPost.findUnique({
    where: { sanityId },
  })

  if (!post) {
    post = await syncMembershipPost(sanityId, slug)
  }

  return post
}

/**
 * Obtiene las estadísticas de engagement de un post
 */
export async function getPostEngagement(sanityId: string, userId?: string) {
  const post = await prisma.membershipPost.findUnique({
    where: { sanityId },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true,
          views: true,
        },
      },
    },
  })

  if (!post) {
    return {
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      userHasLiked: false,
    }
  }

  let userHasLiked = false
  if (userId) {
    const like = await prisma.membershipPostLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: post.id,
        },
      },
    })
    userHasLiked = !!like
  }

  return {
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    viewsCount: post._count.views,
    userHasLiked,
  }
}

/**
 * Toggle like en un post
 */
export async function togglePostLike(sanityId: string, slug: string, userId: string) {
  const post = await getOrCreatePost(sanityId, slug)

  const existingLike = await prisma.membershipPostLike.findUnique({
    where: {
      userId_postId: {
        userId,
        postId: post.id,
      },
    },
  })

  if (existingLike) {
    // Remove like
    await prisma.membershipPostLike.delete({
      where: { id: existingLike.id },
    })
    return { liked: false }
  } else {
    // Add like
    await prisma.membershipPostLike.create({
      data: {
        userId,
        postId: post.id,
      },
    })
    return { liked: true }
  }
}

/**
 * Registra una vista en un post
 */
export async function incrementPostView(sanityId: string, slug: string, userId?: string) {
  const post = await getOrCreatePost(sanityId, slug)

  // Solo registramos una vista por usuario por día
  if (userId) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingView = await prisma.membershipPostView.findFirst({
      where: {
        postId: post.id,
        userId,
        createdAt: {
          gte: today,
        },
      },
    })

    if (existingView) {
      return // Ya vio el post hoy
    }
  }

  await prisma.membershipPostView.create({
    data: {
      postId: post.id,
      userId: userId || null,
    },
  })
}

/**
 * Obtiene los comentarios de un post
 */
export async function getPostComments(
  sanityId: string,
  userId?: string
): Promise<CommentWithAuthor[]> {
  const post = await prisma.membershipPost.findUnique({
    where: { sanityId },
  })

  if (!post) return []

  const comments = await prisma.membershipPostComment.findMany({
    where: { postId: post.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          likes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Verificar si el usuario dio like a cada comentario
  const commentsWithLikes = await Promise.all(
    comments.map(async (comment) => {
      let userHasLiked = false
      if (userId) {
        const like = await prisma.commentLike.findUnique({
          where: {
            userId_commentId: {
              userId,
              commentId: comment.id,
            },
          },
        })
        userHasLiked = !!like
      }

      return {
        id: comment.id,
        content: comment.content,
        userId: comment.userId,
        postId: comment.postId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
        likesCount: comment._count.likes,
        userHasLiked,
      }
    })
  )

  return commentsWithLikes
}

/**
 * Crea un comentario en un post
 */
export async function createPostComment(
  sanityId: string,
  slug: string,
  userId: string,
  content: string
) {
  const post = await getOrCreatePost(sanityId, slug)

  return await prisma.membershipPostComment.create({
    data: {
      postId: post.id,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  })
}

/**
 * Elimina un comentario (solo el autor o admin)
 */
export async function deletePostComment(commentId: string, userId: string) {
  const comment = await prisma.membershipPostComment.findUnique({
    where: { id: commentId },
  })

  if (!comment || comment.userId !== userId) {
    throw new Error('No tienes permiso para eliminar este comentario')
  }

  await prisma.membershipPostComment.delete({
    where: { id: commentId },
  })
}

/**
 * Toggle like en un comentario
 */
export async function toggleCommentLike(commentId: string, userId: string) {
  const existingLike = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId,
        commentId,
      },
    },
  })

  if (existingLike) {
    await prisma.commentLike.delete({
      where: { id: existingLike.id },
    })
    return { liked: false }
  } else {
    await prisma.commentLike.create({
      data: {
        userId,
        commentId,
      },
    })
    return { liked: true }
  }
}

/**
 * Vota en una encuesta
 */
export async function voteInPoll(
  sanityId: string,
  slug: string,
  userId: string,
  optionIndex: number
) {
  const post = await getOrCreatePost(sanityId, slug)

  // Verificar si ya votó
  const existingVote = await prisma.pollVote.findUnique({
    where: {
      userId_postId: {
        userId,
        postId: post.id,
      },
    },
  })

  if (existingVote) {
    // Cambiar voto
    await prisma.pollVote.update({
      where: { id: existingVote.id },
      data: { optionIndex },
    })
  } else {
    // Nuevo voto
    await prisma.pollVote.create({
      data: {
        userId,
        postId: post.id,
        optionIndex,
      },
    })
  }
}

/**
 * Obtiene los resultados de una encuesta
 */
export async function getPollResults(sanityId: string, pollOptions: Array<{ option: string }>) {
  const post = await prisma.membershipPost.findUnique({
    where: { sanityId },
    include: {
      pollVotes: true,
    },
  })

  if (!post) {
    return pollOptions.map((opt) => ({
      option: opt.option,
      votes: 0,
      percentage: 0,
    }))
  }

  const totalVotes = post.pollVotes.length

  return pollOptions.map((opt, index) => {
    const votes = post.pollVotes.filter((v) => v.optionIndex === index).length
    const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0

    return {
      option: opt.option,
      votes,
      percentage: Math.round(percentage * 10) / 10,
    }
  })
}

/**
 * Obtiene el voto del usuario en una encuesta
 */
export async function getUserPollVote(sanityId: string, userId: string): Promise<number | null> {
  const post = await prisma.membershipPost.findUnique({
    where: { sanityId },
  })

  if (!post) return null

  const vote = await prisma.pollVote.findUnique({
    where: {
      userId_postId: {
        userId,
        postId: post.id,
      },
    },
  })

  return vote?.optionIndex ?? null
}

/**
 * Formatea la fecha de un post
 */
export function formatPostDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInHours * 60)
    return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours)
    return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
  } else if (diffInHours < 168) {
    // 7 días
    const days = Math.floor(diffInHours / 24)
    return `Hace ${days} día${days !== 1 ? 's' : ''}`
  } else {
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
}
