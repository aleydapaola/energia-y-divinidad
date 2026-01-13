'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './post-card'
import { POST_TYPE_ICONS, POST_TYPE_LABELS } from '@/types/membership'
import type { MembershipPostWithEngagement, PostType } from '@/types/membership'
import { Loader2 } from 'lucide-react'

interface PostsFeedProps {
  userId: string
}

// Filtros con iconos al estilo de la imagen de referencia
const POST_FILTERS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'all', label: 'Todos', icon: '📋' },
  { value: 'editorial', label: 'Artículos', icon: '📝' },
  { value: 'event', label: 'Eventos', icon: '📅' },
  { value: 'announcement', label: 'Anuncios', icon: '📢' },
  { value: 'audio', label: 'Audios', icon: '🎧' },
  { value: 'video', label: 'Vídeos', icon: '🎬' },
  { value: 'poll', label: 'Encuestas', icon: '📊' },
  { value: 'resource', label: 'Recursos', icon: '📚' },
  { value: 'qna', label: 'Q&A', icon: '💬' },
  { value: 'bts', label: 'BTS', icon: '🎭' },
]

export function PostsFeed({ userId }: PostsFeedProps) {
  const [posts, setPosts] = useState<MembershipPostWithEngagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true)
      setError(null)

      try {
        const url = selectedType === 'all'
          ? '/api/membership/posts'
          : `/api/membership/posts?type=${selectedType}`

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Error al cargar publicaciones')
        }

        const data = await response.json()
        setPosts(data.posts || [])
      } catch (err: any) {
        console.error('Error fetching posts:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [selectedType])

  const handleLike = async (postId: string) => {
    try {
      // Optimistic update
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              userHasLiked: !post.userHasLiked,
              likesCount: post.userHasLiked
                ? post.likesCount - 1
                : post.likesCount + 1,
            }
          }
          return post
        })
      )

      // Call API
      const response = await fetch(`/api/membership/posts/${postId}/like`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al dar like')
      }

      const data = await response.json()

      // Update with real data
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? { ...post, likesCount: data.likesCount, userHasLiked: data.liked }
            : post
        )
      )
    } catch (err) {
      console.error('Error toggling like:', err)
      // Revert optimistic update
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              userHasLiked: !post.userHasLiked,
              likesCount: post.userHasLiked
                ? post.likesCount + 1
                : post.likesCount - 1,
            }
          }
          return post
        })
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filtros con estilo de chips/pills */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-[#e8d5e0]">
        <div className="flex flex-wrap gap-2">
          {POST_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedType(filter.value)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm-sans font-medium transition-all ${
                selectedType === filter.value
                  ? 'bg-[#8A4BAF] text-white shadow-md'
                  : 'bg-[#f8f0f5] text-[#654177] hover:bg-[#ede4ea] border border-transparent hover:border-[#8A4BAF]/20'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de posts */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#e8d5e0]">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-[#654177] font-dm-sans mb-2">
            No hay publicaciones disponibles
          </p>
          <p className="text-sm text-[#654177]/60 font-dm-sans">
            Las nuevas publicaciones aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              isNew={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
