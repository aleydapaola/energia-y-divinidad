'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Heart, Trash2 } from 'lucide-react'
import Image from 'next/image'

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

interface CommentListProps {
  comments: Comment[]
  currentUserId: string
  onDelete: (commentId: string) => void
  onLike: (commentId: string) => void
}

export function CommentList({ comments, currentUserId, onDelete, onLike }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">
          No hay comentarios aún. ¡Sé el primero en comentar!
        </p>
      </div>
    )
  }

  const handleDelete = (commentId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      onDelete(commentId)
    }
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => {
        const isOwner = comment.userId === currentUserId

        return (
          <div
            key={comment.id}
            className="flex gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {comment.author.image ? (
                <Image
                  src={comment.author.image}
                  alt={comment.author.name || 'Usuario'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center">
                  <span className="text-brand font-semibold">
                    {comment.author.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>

            {/* Contenido del comentario */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {comment.author.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>

                {/* Botón de eliminar (solo para el autor) */}
                {isOwner && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                    title="Eliminar comentario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Contenido */}
              <p className="text-neutral-700 dark:text-neutral-300 mb-3 whitespace-pre-wrap break-words">
                {comment.content}
              </p>

              {/* Acciones */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onLike(comment.id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    comment.userHasLiked
                      ? 'text-rose-500'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-rose-500'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${comment.userHasLiked ? 'fill-current' : ''}`}
                  />
                  {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
