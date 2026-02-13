'use client'

import { Loader2, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

import { CommentForm } from './comment-form'
import { CommentList } from './comment-list'

interface Comment {
  id: string
  content: string
  createdAt: Date
  author: {
    name: string | null
    image: string | null
  }
  userId: string
  likesCount: number
  userHasLiked: boolean
}

interface CommentSectionProps {
  postId: string
  postSlug: string
  userId: string
  onCommentCountChange?: (count: number) => void
}

export function CommentSection({
  postId,
  postSlug,
  userId,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
  }, [postSlug])

  async function fetchComments() {
    try {
      const response = await fetch(`/api/membership/posts/${postSlug}/comments`)

      if (!response.ok) {
        throw new Error('Error al cargar comentarios')
      }

      const data = await response.json()
      setComments(data.comments || [])
      onCommentCountChange?.(data.comments?.length || 0)
    } catch (err: any) {
      console.error('Error fetching comments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentAdded = async (content: string) => {
    try {
      const response = await fetch(`/api/membership/posts/${postSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear comentario')
      }

      // Recargar comentarios
      await fetchComments()
    } catch (err: any) {
      console.error('Error adding comment:', err)
      throw err
    }
  }

  const handleCommentDeleted = async (commentId: string) => {
    try {
      const response = await fetch(`/api/membership/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar comentario')
      }

      // Actualizar lista de comentarios
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      onCommentCountChange?.(comments.length - 1)
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      alert(err.message)
    }
  }

  const handleCommentLiked = async (commentId: string) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            userHasLiked: !comment.userHasLiked,
            likesCount: comment.userHasLiked
              ? comment.likesCount - 1
              : comment.likesCount + 1,
          }
        }
        return comment
      })
    )

    try {
      const response = await fetch(`/api/membership/comments/${commentId}/like`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al dar like')
      }

      const data = await response.json()

      // Update with real data
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, likesCount: data.likesCount, userHasLiked: data.liked }
            : comment
        )
      )
    } catch (err) {
      console.error('Error liking comment:', err)
      // Revert optimistic update
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              userHasLiked: !comment.userHasLiked,
              likesCount: comment.userHasLiked
                ? comment.likesCount + 1
                : comment.likesCount - 1,
            }
          }
          return comment
        })
      )
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-brand" />
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Comentarios {!loading && `(${comments.length})`}
        </h2>
      </div>

      {/* Formulario de comentario */}
      <CommentForm onSubmit={handleCommentAdded} />

      {/* Lista de comentarios */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-6">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <CommentList
          comments={comments}
          currentUserId={userId}
          onDelete={handleCommentDeleted}
          onLike={handleCommentLiked}
        />
      )}
    </div>
  )
}
