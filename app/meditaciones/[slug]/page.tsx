import { PortableText } from '@portabletext/react'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import AudioPlayer from '@/components/meditaciones/AudioPlayer'
import MeditationCard from '@/components/meditaciones/MeditationCard'
import YouTubePlayer from '@/components/meditaciones/YouTubePlayer'
import {
  getFreeContentBySlug,
  getRelatedFreeContent,
  incrementViewCount,
} from '@/lib/sanity/queries/freeContent'

import type { Metadata } from 'next'


interface MeditationPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: MeditationPageProps): Promise<Metadata> {
  const { slug } = await params
  const meditation = await getFreeContentBySlug(slug)

  if (!meditation) {
    return {
      title: 'Meditación no encontrada',
    }
  }

  const metaTitle = meditation.seo?.metaTitle || `${meditation.title} | Energía y Divinidad`
  const metaDescription =
    meditation.seo?.metaDescription ||
    meditation.description ||
    'Meditación guiada gratuita para tu crecimiento espiritual'

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      images: meditation.coverImage?.asset?.url
        ? [
            {
              url: meditation.coverImage.asset.url,
              width: 1200,
              height: 630,
              alt: meditation.coverImage.alt || meditation.title,
            },
          ]
        : [],
    },
  }
}

export default async function MeditationPage({ params }: MeditationPageProps) {
  const { slug } = await params
  const meditation = await getFreeContentBySlug(slug)

  if (!meditation) {
    notFound()
  }

  // Incrementar contador de vistas (async, no bloqueante)
  incrementViewCount(meditation._id).catch((error) => {
    console.error('Error incrementing view count:', error)
  })

  // Obtener meditaciones relacionadas
  const relatedMeditations = await getRelatedFreeContent(
    slug,
    meditation.topics || [],
    3
  )

  const contentTypeLabels = {
    meditation: 'Meditación Guiada',
    video: 'Video',
    audio: 'Audio',
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header session={null} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#FFF8F0] to-white py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-6 font-sans text-sm text-gray-600">
              <a href="/meditaciones" className="hover:text-brand transition-colors">
                ← Volver a Meditaciones
              </a>
            </nav>

            {/* Type Badge */}
            <div className="mb-4">
              <span className="inline-block bg-[#a87819]/10 text-brand px-4 py-2 rounded-full font-sans text-sm font-semibold uppercase tracking-wide">
                {contentTypeLabels[meditation.contentType]}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c] mb-4 leading-tight">
              {meditation.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 items-center text-gray-600 font-sans text-sm mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{meditation.duration} minutos</span>
              </div>

              {meditation.publishDate && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{new Date(meditation.publishDate).toLocaleDateString('es-ES')}</span>
                </div>
              )}

              {meditation.viewCount && meditation.viewCount > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>{meditation.viewCount} visualizaciones</span>
                </div>
              )}
            </div>

            {/* Topics */}
            {meditation.topics && meditation.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {meditation.topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-block bg-[#a87819]/10 text-[#a87819] px-3 py-1 rounded-full font-sans text-xs font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="font-sans text-base md:text-lg text-gray-700 leading-relaxed font-normal">
              {meditation.description}
            </p>
          </div>
        </div>
      </section>

      {/* Media Player Section */}
      <section className="py-8 sm:py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {meditation.videoUrl ? (
              <YouTubePlayer url={meditation.videoUrl} title={meditation.title} />
            ) : meditation.audioFile?.asset?.url ? (
              <AudioPlayer
                audioUrl={meditation.audioFile.asset.url}
                title={meditation.title}
                coverImage={meditation.coverImage?.asset?.url}
              />
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <p className="font-sans text-gray-600">
                  Contenido multimedia no disponible en este momento.
                </p>
              </div>
            )}

            {/* Download Button */}
            {meditation.downloadable && meditation.audioFile?.asset?.url && (
              <div className="mt-6 text-center">
                <a
                  href={meditation.audioFile.asset.url}
                  download
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#a87819] text-white rounded-lg hover:bg-[#8b6414] transition-all font-sans text-sm font-semibold uppercase tracking-wide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Descargar Audio
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Extended Description */}
      {meditation.extendedDescription && meditation.extendedDescription.length > 0 && (
        <section className="py-8 sm:py-12 bg-gradient-to-b from-white to-[#FFF8F0]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-lg">
              <PortableText value={meditation.extendedDescription} />
            </div>
          </div>
        </section>
      )}

      {/* Key Takeaways */}
      {meditation.keyTakeaways && meditation.keyTakeaways.length > 0 && (
        <section className="py-8 sm:py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6 leading-snug">
                Beneficios de esta meditación
              </h2>
              <ul className="space-y-3">
                {meditation.keyTakeaways.map((takeaway, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-brand text-xl mt-1">✓</span>
                    <span className="font-sans text-base md:text-lg text-gray-700 leading-relaxed font-normal">
                      {takeaway}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Transcript */}
      {meditation.transcript && (
        <section className="py-8 sm:py-12 bg-gradient-to-b from-white to-[#FFF8F0]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6 leading-snug">
                Transcripción
              </h2>
              <div className="bg-white rounded-lg p-6 shadow-lg border border-[#d4a574]/20">
                <p className="font-sans text-base text-gray-700 leading-relaxed font-normal whitespace-pre-wrap">
                  {meditation.transcript}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Meditations */}
      {relatedMeditations.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-8 text-center leading-snug">
                Meditaciones relacionadas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {relatedMeditations.map((relatedMeditation) => (
                  <MeditationCard key={relatedMeditation._id} meditation={relatedMeditation} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
