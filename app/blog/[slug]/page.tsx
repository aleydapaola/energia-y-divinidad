import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import PortableTextRenderer from '@/components/blog/PortableTextRenderer'
import BlogCard from '@/components/blog/BlogCard'
import { getBlogPostBySlug, getBlogPosts } from '@/lib/sanity/queries/blog'
import { Calendar, Clock, ArrowLeft, Tag, User, Lock, ChevronRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Mapeo de categorías
const categoryLabels: Record<string, string> = {
  'canalizacion': 'Canalización',
  'chamanismo': 'Chamanismo',
  'espiritualidad': 'Espiritualidad',
  'energia': 'Energía',
  'sanacion': 'Sanación',
  'meditacion': 'Meditación',
  'registros-akashicos': 'Registros Akáshicos',
  'desarrollo-personal': 'Desarrollo Personal',
  'testimonios': 'Testimonios',
  'noticias': 'Noticias',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Artículo no encontrado | Energía y Divinidad',
    }
  }

  return {
    title: post.seo?.metaTitle || `${post.title} | Blog | Energía y Divinidad`,
    description: post.seo?.metaDescription || post.excerpt,
    keywords: post.seo?.keywords || post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: post.mainImage?.asset?.url ? [
        {
          url: post.mainImage.asset.url,
          width: 1200,
          height: 630,
          alt: post.mainImage.alt || post.title,
        },
      ] : undefined,
    },
  }
}

export async function generateStaticParams() {
  const posts = await getBlogPosts()
  return posts.map((post) => ({
    slug: post.slug.current,
  }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const imageUrl = post.mainImage?.asset?.url || '/placeholder-blog.jpg'

  const authorImageUrl = post.author?.image?.asset?.url || null

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header session={null} />

      {/* Hero Section */}
      <section className="relative">
        {/* Featured Image */}
        <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] w-full">
          <Image
            src={imageUrl}
            alt={post.mainImage?.alt || post.title}
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto pb-8 sm:pb-12">
              {/* Back Link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Blog
              </Link>

              {/* Categories */}
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories.map((category) => (
                    <Link
                      key={category}
                      href={`/blog/categoria/${category}`}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full hover:bg-white/30 transition-colors"
                    >
                      {categoryLabels[category] || category}
                    </Link>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-white leading-tight mb-4">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.publishedAt)}</span>
                </div>

                {post.readingTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{post.readingTime} min de lectura</span>
                  </div>
                )}

                {post.isPremium && (
                  <div className="flex items-center gap-2 text-amber-300">
                    <Lock className="w-4 h-4" />
                    <span>Contenido Premium</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Excerpt */}
            <p className="text-xl text-gray-600 leading-relaxed mb-10 font-dm-sans italic border-l-4 border-[#8A4BAF] pl-6">
              {post.excerpt}
            </p>

            {/* Main Content */}
            <div className="font-dm-sans">
              <PortableTextRenderer content={post.content} />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="w-5 h-5 text-[#8A4BAF]" />
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#f8f0f5] text-[#654177] text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Author Info */}
            {post.author && (
              <div className="mt-12 p-6 bg-[#f8f0f5] rounded-2xl">
                <div className="flex items-start gap-4">
                  {authorImageUrl ? (
                    <Image
                      src={authorImageUrl}
                      alt={post.author.name || 'Autor'}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-[#8A4BAF]" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Escrito por</p>
                    <h3 className="font-gazeta text-xl text-[#654177]">
                      {post.author.name}
                    </h3>
                    {post.author.bio && (
                      <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                        {post.author.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Related Sessions */}
      {post.relatedSessions && post.relatedSessions.length > 0 && (
        <section className="py-12 bg-[#eef1fa]">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF] mb-8">
                Sesiones Relacionadas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {post.relatedSessions.map((session) => (
                  <Link
                    key={session._id}
                    href={`/sesiones/${session.slug.current}`}
                    className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all"
                  >
                    <h3 className="font-gazeta text-lg text-[#654177] group-hover:text-[#8A4BAF] transition-colors mb-2">
                      {session.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {session.shortDescription}
                    </p>
                    <span className="inline-flex items-center text-[#4944a4] text-sm font-medium group-hover:gap-2 transition-all">
                      Ver Sesión
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Events */}
      {post.relatedEvents && post.relatedEvents.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF] mb-8">
                Eventos Relacionados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {post.relatedEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={`/eventos/${event.slug.current}`}
                    className="group bg-[#f8f0f5] rounded-xl p-6 hover:bg-[#8A4BAF]/10 transition-all"
                  >
                    <div className="flex items-center gap-2 text-sm text-[#8A4BAF] mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.eventDate)}</span>
                    </div>
                    <h3 className="font-gazeta text-lg text-[#654177] group-hover:text-[#8A4BAF] transition-colors mb-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {event.excerpt}
                    </p>
                    <span className="inline-flex items-center text-[#4944a4] text-sm font-medium group-hover:gap-2 transition-all">
                      Ver Evento
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Posts */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF] mb-8">
                Artículos Relacionados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {post.relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost._id} post={relatedPost} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-white to-[#f8f0f5] py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF] mb-4 leading-snug">
              ¿Te ha gustado este artículo?
            </h2>
            <p className="font-dm-sans text-base md:text-lg text-gray-700 leading-relaxed mb-6">
              Descubre más contenido en nuestro blog o agenda una sesión personalizada
              para profundizar en tu camino espiritual.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog"
                className="inline-block px-8 py-4 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-all transform hover:scale-105 font-dm-sans text-base font-medium shadow-lg"
              >
                Explorar Blog
              </Link>
              <Link
                href="/sesiones"
                className="inline-block px-8 py-4 bg-white text-[#4944a4] border-2 border-[#4944a4] rounded-lg hover:bg-[#4944a4] hover:text-white transition-all transform hover:scale-105 font-dm-sans text-base font-medium"
              >
                Agendar Sesión
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
