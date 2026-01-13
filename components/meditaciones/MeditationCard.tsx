import Link from 'next/link'
import Image from 'next/image'
import { FreeContent } from '@/lib/sanity/queries/freeContent'

interface MeditationCardProps {
  meditation: FreeContent
}

export default function MeditationCard({ meditation }: MeditationCardProps) {
  const contentTypeIcons = {
    meditation: '🧘',
    video: '🎥',
    audio: '🎧',
  }

  const contentTypeLabels = {
    meditation: 'Meditación',
    video: 'Video',
    audio: 'Audio',
  }

  const icon = contentTypeIcons[meditation.contentType] || '🎁'
  const label = contentTypeLabels[meditation.contentType] || 'Contenido'

  return (
    <Link href={`/meditaciones/${meditation.slug.current}`}>
      <div className="group bg-gradient-to-b from-white to-[#FFF8F0] rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-[#d4a574]/20 h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-video overflow-hidden">
          <Image
            src={meditation.coverImage.asset.url}
            alt={meditation.coverImage.alt || meditation.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Overlay con tipo de contenido */}
          <div className="absolute top-3 right-3 bg-[#a87819]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-sans font-semibold uppercase tracking-wide flex items-center gap-1">
            <span>{icon}</span>
            <span>{label}</span>
          </div>

          {/* Duración */}
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-sans font-medium">
            {meditation.duration} min
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Topics */}
          {meditation.topics && meditation.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {meditation.topics.slice(0, 2).map((topic) => (
                <span
                  key={topic}
                  className="text-xs font-sans font-medium text-[#a87819] bg-[#a87819]/10 px-2 py-1 rounded-full"
                >
                  {topic}
                </span>
              ))}
              {meditation.topics.length > 2 && (
                <span className="text-xs font-sans font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  +{meditation.topics.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-sans text-xl md:text-2xl font-semibold text-brand mb-2 leading-snug group-hover:text-brand/80 transition-colors">
            {meditation.title}
          </h3>

          {/* Description */}
          <p className="font-sans text-sm md:text-base text-gray-700 leading-relaxed font-normal line-clamp-3 flex-1">
            {meditation.description}
          </p>

          {/* CTA */}
          <div className="mt-4 pt-4 border-t border-[#d4a574]/20">
            <span className="inline-flex items-center text-brand hover:text-brand/80 font-sans text-sm font-semibold uppercase tracking-wide transition-colors group-hover:gap-2 gap-1">
              Escuchar ahora
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
