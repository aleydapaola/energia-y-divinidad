'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, Headphones, FileText, Download, X, Clock, Sparkles } from 'lucide-react'

interface PremiumContent {
  _id: string
  title: string
  description?: string
  contentType: 'video' | 'audio' | 'masterclass' | 'document' | 'meditation' | 'channeling_recording' | 'guided_ritual' | 'video_series' | 'workshop_recording'
  coverImage?: {
    asset: {
      url: string
    }
    alt?: string
  }
  thumbnail?: {
    asset: {
      url: string
    }
    alt?: string
  }
  videoUrl?: string
  audioFile?: {
    asset: {
      url: string
    }
  }
  downloadableFile?: {
    asset: {
      url: string
    }
  }
  documentFile?: {
    asset: {
      url: string
    }
  }
  duration?: number
  tags?: string[]
  topics?: string[]
  featured?: boolean
}

interface PremiumLibraryProps {
  content: PremiumContent[]
}

const CONTENT_FILTERS = [
  { value: 'all', label: 'Todo', icon: '📋' },
  { value: 'video', label: 'Videos', icon: '🎬' },
  { value: 'audio', label: 'Audios', icon: '🎧' },
  { value: 'masterclass', label: 'Masterclasses', icon: '🎓' },
  { value: 'meditation', label: 'Meditaciones', icon: '🧘' },
  { value: 'channeling_recording', label: 'Canalizaciones', icon: '🔮' },
  { value: 'document', label: 'Documentos', icon: '📄' },
]

const getContentTypeEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    video: '🎬',
    audio: '🎧',
    masterclass: '🎓',
    meditation: '🧘',
    channeling_recording: '🔮',
    guided_ritual: '✨',
    document: '📄',
    video_series: '📺',
    workshop_recording: '🎥',
  }
  return emojis[type] || '📁'
}

const getContentTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    video: 'Video',
    audio: 'Audio',
    masterclass: 'Masterclass',
    meditation: 'Meditación',
    channeling_recording: 'Canalización',
    guided_ritual: 'Ritual Guiado',
    document: 'Documento',
    video_series: 'Serie',
    workshop_recording: 'Workshop',
  }
  return labels[type] || 'Contenido'
}

export function PremiumLibrary({ content }: PremiumLibraryProps) {
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedContent, setSelectedContent] = useState<PremiumContent | null>(null)

  const filteredContent =
    selectedType === 'all'
      ? content
      : content.filter((item) => item.contentType === selectedType)

  // Separar contenido destacado
  const featuredContent = filteredContent.filter((item) => item.featured)
  const regularContent = filteredContent.filter((item) => !item.featured)

  return (
    <div>
      {/* Filtros con estilo de chips/pills */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-[#e8d5e0]">
        <div className="flex flex-wrap gap-2">
          {CONTENT_FILTERS.map((filter) => {
            const count =
              filter.value === 'all'
                ? content.length
                : content.filter((item) => item.contentType === filter.value).length

            if (count === 0 && filter.value !== 'all') return null

            return (
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
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    selectedType === filter.value
                      ? 'bg-white/20 text-white'
                      : 'bg-[#8A4BAF]/10 text-[#8A4BAF]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido destacado */}
      {featuredContent.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-gazeta text-xl text-[#654177]">Destacados</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {featuredContent.map((item) => (
              <ContentCard
                key={item._id}
                item={item}
                onClick={() => setSelectedContent(item)}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid de contenido */}
      {regularContent.length === 0 && featuredContent.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#e8d5e0]">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-[#654177] font-dm-sans mb-2">
            No hay contenido disponible en esta categoría
          </p>
          <p className="text-sm text-[#654177]/60 font-dm-sans">
            El contenido se actualiza regularmente
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularContent.map((item) => (
            <ContentCard
              key={item._id}
              item={item}
              onClick={() => setSelectedContent(item)}
            />
          ))}
        </div>
      )}

      {/* Modal de contenido */}
      {selectedContent && (
        <ContentModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  )
}

// Tarjeta de contenido
function ContentCard({
  item,
  onClick,
  featured = false,
}: {
  item: PremiumContent
  onClick: () => void
  featured?: boolean
}) {
  const thumbnail = item.coverImage || item.thumbnail

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8d5e0] hover:shadow-md hover:border-[#8A4BAF]/30 transition-all cursor-pointer group ${
        featured ? 'ring-2 ring-amber-400/50' : ''
      }`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      {thumbnail?.asset?.url ? (
        <div className="relative w-full h-40 bg-[#f8f0f5]">
          <Image
            src={thumbnail.asset.url}
            alt={thumbnail.alt || item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              {item.contentType === 'video' || item.contentType === 'masterclass' ? (
                <Play className="w-6 h-6 text-[#8A4BAF] ml-1" />
              ) : item.contentType === 'audio' || item.contentType === 'meditation' ? (
                <Headphones className="w-6 h-6 text-[#8A4BAF]" />
              ) : (
                <FileText className="w-6 h-6 text-[#8A4BAF]" />
              )}
            </div>
          </div>
          {featured && (
            <div className="absolute top-3 left-3 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-dm-sans font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Destacado
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-[#8A4BAF]/20 to-[#654177]/10 flex items-center justify-center">
          <span className="text-4xl">{getContentTypeEmoji(item.contentType)}</span>
        </div>
      )}

      {/* Contenido */}
      <div className="p-4">
        {/* Badge de tipo */}
        <span className="inline-flex items-center gap-1.5 text-xs font-dm-sans font-medium text-[#654177] bg-[#f8f0f5] px-2.5 py-1 rounded-full mb-2 border border-[#e8d5e0]">
          <span>{getContentTypeEmoji(item.contentType)}</span>
          <span>{getContentTypeLabel(item.contentType)}</span>
        </span>

        {/* Título */}
        <h3 className="font-gazeta text-lg text-[#4b316c] mb-2 line-clamp-2 group-hover:text-[#8A4BAF] transition-colors">
          {item.title}
        </h3>

        {/* Descripción */}
        {item.description && (
          <p className="text-sm text-[#654177]/70 font-dm-sans line-clamp-2 mb-3">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[#654177]/60 font-dm-sans pt-2 border-t border-[#e8d5e0]">
          {item.duration ? (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{item.duration} min</span>
            </div>
          ) : (
            <span />
          )}
          {(item.downloadableFile || item.documentFile) && (
            <div className="flex items-center gap-1 text-[#8A4BAF]">
              <Download className="w-3.5 h-3.5" />
              <span>Descargable</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Modal para mostrar el contenido
function ContentModal({
  content,
  onClose,
}: {
  content: PremiumContent
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {/* Badge de tipo */}
              <span className="inline-flex items-center gap-1.5 text-xs font-dm-sans font-medium text-[#654177] bg-[#f8f0f5] px-3 py-1.5 rounded-full mb-3 border border-[#e8d5e0]">
                <span>{getContentTypeEmoji(content.contentType)}</span>
                <span>{getContentTypeLabel(content.contentType)}</span>
              </span>

              <h2 className="font-gazeta text-2xl sm:text-3xl text-[#4b316c] mb-2">
                {content.title}
              </h2>
              {content.description && (
                <p className="text-[#654177]/80 font-dm-sans">
                  {content.description}
                </p>
              )}
              {content.duration && (
                <div className="flex items-center gap-1 text-sm text-[#8A4BAF] mt-2 font-dm-sans">
                  <Clock className="w-4 h-4" />
                  <span>{content.duration} minutos</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#f8f0f5] rounded-full transition-colors ml-4"
            >
              <X className="w-6 h-6 text-[#654177]" />
            </button>
          </div>

          {/* Video Player */}
          {(content.contentType === 'video' ||
            content.contentType === 'masterclass' ||
            content.contentType === 'video_series' ||
            content.contentType === 'workshop_recording') &&
            content.videoUrl && (
              <div className="mb-6">
                <div className="aspect-video bg-[#f8f0f5] rounded-xl overflow-hidden">
                  <iframe
                    src={content.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={content.title}
                  />
                </div>
              </div>
            )}

          {/* Audio Player */}
          {(content.contentType === 'audio' ||
            content.contentType === 'meditation' ||
            content.contentType === 'channeling_recording') &&
            content.audioFile?.asset?.url && (
              <div className="mb-6 bg-gradient-to-r from-[#8A4BAF]/10 to-[#654177]/10 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8A4BAF] to-[#654177] flex items-center justify-center">
                    <Headphones className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-dm-sans font-medium text-[#654177]">
                      {getContentTypeLabel(content.contentType)}
                    </p>
                    {content.duration && (
                      <p className="text-sm text-[#654177]/60 font-dm-sans">
                        {content.duration} minutos
                      </p>
                    )}
                  </div>
                </div>
                <audio controls className="w-full">
                  <source src={content.audioFile.asset.url} type="audio/mpeg" />
                  Tu navegador no soporta audio.
                </audio>
              </div>
            )}

          {/* Download buttons */}
          <div className="flex flex-wrap gap-3">
            {content.downloadableFile?.asset?.url && (
              <a
                href={content.downloadableFile.asset.url}
                download
                className="inline-flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Download className="w-5 h-5" />
                Descargar Archivo
              </a>
            )}
            {content.documentFile?.asset?.url && (
              <a
                href={content.documentFile.asset.url}
                download
                className="inline-flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Download className="w-5 h-5" />
                Descargar PDF
              </a>
            )}
          </div>

          {/* Topics/Tags */}
          {((content.topics && content.topics.length > 0) ||
            (content.tags && content.tags.length > 0)) && (
            <div className="mt-6 pt-6 border-t border-[#e8d5e0]">
              <p className="text-sm font-dm-sans font-medium text-[#654177] mb-3">
                Temas relacionados
              </p>
              <div className="flex flex-wrap gap-2">
                {(content.topics || content.tags || []).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-[#f8f0f5] text-[#654177] font-dm-sans px-3 py-1.5 rounded-full border border-[#e8d5e0]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
