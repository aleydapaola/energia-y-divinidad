import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import BlogCard from '@/components/blog/BlogCard'
import { getBlogPostsByCategory, getBlogCategories } from '@/lib/sanity/queries/blog'
import { BookOpen, ArrowLeft, Tag } from 'lucide-react'

interface PageProps {
  params: Promise<{ category: string }>
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

const categoryDescriptions: Record<string, string> = {
  'canalizacion': 'Mensajes y enseñanzas recibidas a través de la canalización de seres de luz.',
  'chamanismo': 'Prácticas ancestrales, ceremonias y conexión con la naturaleza y los espíritus.',
  'espiritualidad': 'Reflexiones sobre el camino espiritual, la consciencia y el despertar del alma.',
  'energia': 'Trabajo energético, limpieza de chakras y equilibrio de los cuerpos sutiles.',
  'sanacion': 'Técnicas y procesos de sanación física, emocional y espiritual.',
  'meditacion': 'Guías, técnicas y beneficios de la práctica meditativa.',
  'registros-akashicos': 'Lecturas y enseñanzas de los registros del alma.',
  'desarrollo-personal': 'Crecimiento interior, autoconocimiento y transformación personal.',
  'testimonios': 'Experiencias compartidas por nuestra comunidad.',
  'noticias': 'Novedades, eventos próximos y actualizaciones.',
}

const validCategories = Object.keys(categoryLabels)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params

  if (!validCategories.includes(category)) {
    return {
      title: 'Categoría no encontrada | Blog | Energía y Divinidad',
    }
  }

  const label = categoryLabels[category]
  const description = categoryDescriptions[category]

  return {
    title: `${label} | Blog | Energía y Divinidad`,
    description: description || `Artículos sobre ${label.toLowerCase()} en el blog de Energía y Divinidad.`,
    openGraph: {
      title: `${label} | Blog | Energía y Divinidad`,
      description: description || `Artículos sobre ${label.toLowerCase()}.`,
      type: 'website',
    },
  }
}

export async function generateStaticParams() {
  return validCategories.map((category) => ({
    category,
  }))
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params

  if (!validCategories.includes(category)) {
    notFound()
  }

  const posts = await getBlogPostsByCategory(category)
  const allCategories = await getBlogCategories()

  const label = categoryLabels[category]
  const description = categoryDescriptions[category]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header session={null} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#f8f0f5] to-white py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Back Link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Blog
            </Link>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 rounded-full">
                <Tag className="w-10 h-10 sm:w-12 sm:h-12 text-[#8A4BAF]" />
              </div>
            </div>

            {/* Title */}
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#654177] mb-5 sm:mb-6 leading-tight">
              {label}
            </h1>

            {/* Description */}
            {description && (
              <p className="font-dm-sans text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto mb-6">
                {description}
              </p>
            )}

            {/* Stats */}
            <div className="flex justify-center mt-8">
              <div className="text-center">
                <div className="font-dm-sans text-3xl font-semibold text-[#8A4BAF]">
                  {posts.length}
                </div>
                <div className="font-dm-sans text-sm text-gray-600 uppercase tracking-wide">
                  {posts.length === 1 ? 'Artículo' : 'Artículos'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Categories */}
      {allCategories.length > 1 && (
        <section className="py-6 bg-[#f8f0f5]/50">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="font-dm-sans text-sm text-gray-600 mr-2">Otras categorías:</span>
                {allCategories
                  .filter(cat => cat !== category)
                  .map((cat) => (
                    <Link
                      key={cat}
                      href={`/blog/categoria/${cat}`}
                      className="px-4 py-2 bg-white text-[#654177] text-sm rounded-full border border-[#8A4BAF]/20 hover:bg-[#8A4BAF] hover:text-white hover:border-[#8A4BAF] transition-all"
                    >
                      {categoryLabels[cat] || cat}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Posts Grid */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-[#f8f0f5] rounded-full">
                  <BookOpen className="w-10 h-10 text-[#8A4BAF]/50" />
                </div>
                <h3 className="font-gazeta text-xl md:text-2xl text-[#654177] mb-3">
                  Sin artículos aún
                </h3>
                <p className="font-dm-sans text-base text-gray-600 max-w-md mx-auto mb-6">
                  Aún no hay artículos en esta categoría.
                  Explora otras categorías o vuelve pronto.
                </p>
                <Link
                  href="/blog"
                  className="inline-block px-6 py-3 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-all font-dm-sans text-sm font-medium"
                >
                  Ver todos los artículos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {posts.map((post) => (
                  <BlogCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-white to-[#f8f0f5] py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF] mb-4 leading-snug">
              ¿Buscas algo más específico?
            </h2>
            <p className="font-dm-sans text-base md:text-lg text-gray-700 leading-relaxed mb-6">
              Explora todo nuestro contenido o agenda una sesión personalizada
              para profundizar en los temas que más te interesan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog"
                className="inline-block px-8 py-4 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-all transform hover:scale-105 font-dm-sans text-base font-medium shadow-lg"
              >
                Ver Todo el Blog
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
