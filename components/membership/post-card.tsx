'use client'

import Link from 'next/link'
import { POST_TYPE_ICONS, POST_TYPE_LABELS } from '@/types/membership'
import type { MembershipPostWithEngagement } from '@/types/membership'
import { Heart, MessageCircle, Eye } from 'lucide-react'

interface PostCardProps {
  post: MembershipPostWithEngagement
  onLike?: (postId: string) => void
  isNew?: boolean
}

export function PostCard({ post, onLike, isNew = false }: PostCardProps) {
  const typeIcon = POST_TYPE_ICONS[post.postType]
  const typeLabel = POST_TYPE_LABELS[post.postType]

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onLike && post.allowLikes) {
      onLike(post._id)
    }
  }

  // Formatear fecha al estilo "10 de Enero, 2025"
  const formatDateSpanish = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <Link
      href={`/dashboard/membresia/publicaciones/${post.slug.current}`}
      className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-[#e8d5e0] group"
    >
      {/* Banner de NUEVA PUBLICACIÓN */}
      {isNew && (
        <div className="bg-gradient-to-r from-[#8A4BAF] to-[#654177] px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-white text-sm font-dm-sans font-semibold tracking-wide">
            NUEVA PUBLICACIÓN
          </span>
        </div>
      )}

      {/* Pinned badge si es destacado pero no es nuevo */}
      {!isNew && post.pinned && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 flex items-center gap-2">
          <span className="text-white text-sm font-dm-sans font-semibold">
            📌 Publicación Destacada
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Badges: Tipo + Tier */}
        <div className="flex items-center gap-2 mb-3">
          {/* Badge de tipo */}
          <span className="inline-flex items-center gap-1.5 text-xs font-dm-sans font-medium text-[#654177] bg-[#f8f0f5] px-3 py-1.5 rounded-full border border-[#e8d5e0]">
            <span>{typeIcon}</span>
            <span>{typeLabel}</span>
          </span>

          {/* Badge de tier */}
          {post.requiredTierData && (
            <span
              className="text-xs font-dm-sans font-medium px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: post.requiredTierData.color
                  ? `${post.requiredTierData.color}15`
                  : '#f8f0f5',
                color: post.requiredTierData.color || '#8A4BAF',
                border: `1px solid ${post.requiredTierData.color || '#8A4BAF'}30`,
              }}
            >
              {post.requiredTierData.name}
            </span>
          )}
        </div>

        {/* Autor y fecha */}
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8A4BAF] to-[#654177] flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-dm-sans font-semibold text-[#4b316c]">
                Aleyda Vargas
              </span>
              <span className="text-xs bg-[#8A4BAF] text-white px-2 py-0.5 rounded font-dm-sans">
                Autor
              </span>
            </div>
            <time className="text-xs text-[#654177]/60 font-dm-sans">
              {formatDateSpanish(post.publishedAt)}
            </time>
          </div>
        </div>

        {/* Título */}
        <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-2 group-hover:text-[#654177] transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* Extracto */}
        {post.excerpt && (
          <p className="text-sm text-[#654177]/80 font-dm-sans mb-4 line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Duración para audio/video */}
        {post.duration && ['audio', 'video'].includes(post.postType) && (
          <div className="text-xs text-[#8A4BAF] font-dm-sans mb-3 flex items-center gap-1">
            <span>⏱</span>
            <span>{post.duration} min</span>
          </div>
        )}

        {/* Footer: Engagement */}
        <div className="flex items-center gap-4 pt-3 border-t border-[#e8d5e0]">
          {/* Likes */}
          {post.allowLikes && (
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-dm-sans transition-colors ${
                post.userHasLiked
                  ? 'text-rose-500'
                  : 'text-[#654177]/60 hover:text-rose-500'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${post.userHasLiked ? 'fill-current' : ''}`}
              />
              <span>{post.likesCount}</span>
            </button>
          )}

          {/* Comments */}
          {post.allowComments && (
            <div className="flex items-center gap-1.5 text-sm text-[#654177]/60 font-dm-sans">
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </div>
          )}

          {/* Views */}
          <div className="flex items-center gap-1.5 text-sm text-[#654177]/60 font-dm-sans">
            <Eye className="w-4 h-4" />
            <span>{post.viewsCount}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
