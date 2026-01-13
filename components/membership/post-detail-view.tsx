'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Heart, MessageCircle, Eye, Calendar, Clock, Download, Headphones } from 'lucide-react'
import { PortableText } from '@portabletext/react'
import { POST_TYPE_ICONS, POST_TYPE_LABELS } from '@/types/membership'
import type { MembershipPostSanity, MembershipTier } from '@/types/membership'
import { PollVoting } from './poll-voting'
import { CommentSection } from './comment-section'

// Extended type that includes resolved tier data
interface PostWithTierData extends MembershipPostSanity {
  requiredTierData?: MembershipTier
}

interface PostDetailViewProps {
  post: PostWithTierData
  engagement: {
    likesCount: number
    commentsCount: number
    viewsCount: number
    userHasLiked: boolean
  }
  userId: string
}

export function PostDetailView({ post, engagement: initialEngagement, userId }: PostDetailViewProps) {
  const [engagement, setEngagement] = useState(initialEngagement)
  const [isLiking, setIsLiking] = useState(false)

  const typeIcon = POST_TYPE_ICONS[post.postType]
  const typeLabel = POST_TYPE_LABELS[post.postType]

  // Formatear fecha
  const formatDateSpanish = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Incrementar contador de vistas al cargar
  useEffect(() => {
    async function trackView() {
      try {
        await fetch(`/api/membership/posts/${post.slug.current}`, {
          method: 'GET',
        })
      } catch (error) {
        console.error('Error tracking view:', error)
      }
    }
    trackView()
  }, [post.slug.current])

  const handleLike = async () => {
    if (isLiking || !post.allowLikes) return

    setIsLiking(true)

    // Optimistic update
    setEngagement((prev) => ({
      ...prev,
      userHasLiked: !prev.userHasLiked,
      likesCount: prev.userHasLiked ? prev.likesCount - 1 : prev.likesCount + 1,
    }))

    try {
      const response = await fetch(`/api/membership/posts/${post.slug.current}/like`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al dar like')
      }

      const data = await response.json()
      setEngagement((prev) => ({
        ...prev,
        likesCount: data.likesCount,
        userHasLiked: data.liked,
      }))
    } catch (error) {
      console.error('Error liking post:', error)
      // Revert optimistic update
      setEngagement((prev) => ({
        ...prev,
        userHasLiked: !prev.userHasLiked,
        likesCount: prev.userHasLiked ? prev.likesCount + 1 : prev.likesCount - 1,
      }))
    } finally {
      setIsLiking(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/membresia/publicaciones"
        className="inline-flex items-center gap-2 text-sm text-[#654177] hover:text-[#8A4BAF] transition-colors mb-6 font-dm-sans"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Publicaciones
      </Link>

      {/* Contenido principal */}
      <article className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8d5e0]">
        {/* Banner si es destacado */}
        {post.pinned && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3 flex items-center gap-2">
            <span className="text-white text-sm font-dm-sans font-semibold">
              📌 Publicación Destacada
            </span>
          </div>
        )}

        {/* Thumbnail */}
        {post.thumbnail?.asset?.url && (
          <div className="relative w-full h-64 sm:h-80 bg-[#f8f0f5]">
            <Image
              src={post.thumbnail.asset.url}
              alt={post.thumbnail.alt || post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Badges: Tipo y Tier */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
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
          <div className="flex items-center gap-3 mb-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8A4BAF] to-[#654177] flex items-center justify-center text-white font-bold">
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
              <div className="flex items-center gap-3 text-sm text-[#654177]/60 font-dm-sans mt-0.5">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateSpanish(post.publishedAt)}</span>
                </div>
                {post.duration && ['audio', 'video'].includes(post.postType) && (
                  <div className="flex items-center gap-1 text-[#8A4BAF]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{post.duration} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Título */}
          <h1 className="font-gazeta text-3xl sm:text-4xl text-[#4b316c] mb-4">
            {post.title}
          </h1>

          {/* Engagement */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#e8d5e0]">
            {post.allowLikes && (
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 text-sm font-dm-sans font-medium transition-colors ${
                  engagement.userHasLiked
                    ? 'text-rose-500'
                    : 'text-[#654177]/60 hover:text-rose-500'
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${engagement.userHasLiked ? 'fill-current' : ''}`}
                />
                <span>{engagement.likesCount}</span>
              </button>
            )}

            {post.allowComments && (
              <div className="flex items-center gap-2 text-sm font-dm-sans font-medium text-[#654177]/60">
                <MessageCircle className="w-5 h-5" />
                <span>{engagement.commentsCount}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-dm-sans font-medium text-[#654177]/60">
              <Eye className="w-5 h-5" />
              <span>{engagement.viewsCount}</span>
            </div>
          </div>

          {/* Extracto */}
          {post.excerpt && (
            <p className="text-lg text-[#654177] font-dm-sans mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Video */}
          {post.postType === 'video' && post.videoUrl && (
            <div className="mb-8">
              <div className="aspect-video bg-[#f8f0f5] rounded-xl overflow-hidden">
                <iframe
                  src={post.videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title={post.title}
                />
              </div>
            </div>
          )}

          {/* Audio */}
          {post.postType === 'audio' && post.audioFile?.asset?.url && (
            <div className="mb-8 bg-gradient-to-r from-[#8A4BAF]/10 to-[#654177]/10 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8A4BAF] to-[#654177] flex items-center justify-center">
                  <Headphones className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-dm-sans font-medium text-[#654177]">Audio</p>
                  {post.duration && (
                    <p className="text-sm text-[#654177]/60 font-dm-sans">
                      {post.duration} minutos
                    </p>
                  )}
                </div>
              </div>
              <audio controls className="w-full">
                <source src={post.audioFile.asset.url} type="audio/mpeg" />
                Tu navegador no soporta audio.
              </audio>
            </div>
          )}

          {/* Rich text content */}
          {post.content && (
            <div className="prose prose-lg max-w-none mb-8 prose-headings:font-gazeta prose-headings:text-[#4b316c] prose-p:text-[#654177] prose-p:font-dm-sans prose-a:text-[#8A4BAF] prose-strong:text-[#4b316c]">
              <PortableText value={post.content} />
            </div>
          )}

          {/* Poll */}
          {post.postType === 'poll' && post.pollOptions && (
            <div className="mb-8">
              <PollVoting
                postId={post._id}
                postSlug={post.slug.current}
                pollOptions={post.pollOptions.map(p => p.option)}
                pollEndsAt={post.pollEndsAt}
              />
            </div>
          )}

          {/* Archivos descargables */}
          {post.downloadableFiles && post.downloadableFiles.length > 0 && (
            <div className="mb-8">
              <h2 className="font-gazeta text-xl text-[#4b316c] mb-4">
                Archivos Descargables
              </h2>
              <div className="space-y-2">
                {post.downloadableFiles.map((file, index) => (
                  <a
                    key={index}
                    href={file.file.asset.url}
                    download
                    className="flex items-center gap-3 p-4 bg-[#f8f0f5] rounded-xl hover:bg-[#ede4ea] transition-colors border border-[#e8d5e0] group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-[#e8d5e0]">
                      <span className="text-2xl">📄</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-dm-sans font-medium text-[#4b316c] group-hover:text-[#8A4BAF] transition-colors">
                        {file.title || `Archivo ${index + 1}`}
                      </p>
                      {file.description && (
                        <p className="text-sm text-[#654177]/70 font-dm-sans">
                          {file.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[#8A4BAF] text-sm font-dm-sans font-medium">
                      <Download className="w-4 h-4" />
                      <span>Descargar</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Sección de comentarios */}
      {post.allowComments && (
        <div className="mt-8">
          <CommentSection
            postId={post._id}
            postSlug={post.slug.current}
            userId={userId}
            onCommentCountChange={(count) =>
              setEngagement((prev) => ({ ...prev, commentsCount: count }))
            }
          />
        </div>
      )}
    </div>
  )
}
