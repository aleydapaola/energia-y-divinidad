import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import BlogCard from '@/components/blog/BlogCard'
import { getBlogPosts, getFeaturedBlogPosts } from '@/lib/sanity/queries/blog'
import { BookOpen, Sparkles } from 'lucide-react'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Blog | Energía y Divinidad',
  description: 'Artículos sobre espiritualidad, canalización, chamanismo, meditación y desarrollo personal. Descubre contenido que nutre tu alma y expande tu consciencia.',
  keywords: [
    'blog espiritual',
    'artículos de espiritualidad',
    'canalización',
    'chamanismo',
    'meditación',
    'desarrollo personal',
    'registros akáshicos',
    'sanación espiritual',
  ],
  openGraph: {
    title: 'Blog | Energía y Divinidad',
    description: 'Artículos sobre espiritualidad, canalización, chamanismo, meditación y desarrollo personal.',
    type: 'website',
  },
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

export default async function BlogPage() {
  const [session, posts, featuredPosts] = await Promise.all([
    auth(),
    getBlogPosts(),
    getFeaturedBlogPosts(),
  ])

  // Filtrar posts destacados de la lista general para no repetirlos
  const featuredIds = new Set(featuredPosts.map(p => p._id))
  const regularPosts = posts.filter(p => !featuredIds.has(p._id))

  // Obtener categorías únicas de los posts
  const allCategories = posts.flatMap(p => p.categories || [])
  const uniqueCategories = [...new Set(allCategories)]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header session={session} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#f8f0f5] to-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 rounded-full">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-[#8A4BAF]" />
              </div>
            </div>

            {/* Title */}
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#654177] mb-5 sm:mb-6 leading-tight">
              Blog
            </h1>

            {/* Description */}
            <p className="font-dm-sans text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto mb-6">
              Reflexiones, enseñanzas y mensajes canalizados para nutrir tu alma
              y acompañarte en tu camino de despertar espiritual.
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="font-dm-sans text-3xl font-semibold text-[#8A4BAF]">
                  {posts.length}
                </div>
                <div className="font-dm-sans text-sm text-gray-600 uppercase tracking-wide">
                  {posts.length === 1 ? 'Artículo' : 'Artículos'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-dm-sans text-3xl font-semibold text-[#8A4BAF]">
                  {uniqueCategories.length}
                </div>
                <div className="font-dm-sans text-sm text-gray-600 uppercase tracking-wide">
                  {uniqueCategories.length === 1 ? 'Categoría' : 'Categorías'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              {/* Section Title */}
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF]">
                  Artículos Destacados
                </h2>
              </div>

              {/* Featured Post - Large */}
              {featuredPosts[0] && (
                <div className="mb-8">
                  <BlogCard post={featuredPosts[0]} featured />
                </div>
              )}

              {/* More Featured - Grid */}
              {featuredPosts.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredPosts.slice(1).map((post) => (
                    <BlogCard key={post._id} post={post} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Categories Filter */}
      {uniqueCategories.length > 0 && (
        <section className="py-6 bg-[#f8f0f5]/50">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="font-dm-sans text-sm text-gray-600 mr-2">Explorar:</span>
                {uniqueCategories.map((category) => (
                  <a
                    key={category}
                    href={`/blog/categoria/${category}`}
                    className="px-4 py-2 bg-white text-[#654177] text-sm rounded-full border border-[#8A4BAF]/20 hover:bg-[#8A4BAF] hover:text-white hover:border-[#8A4BAF] transition-all"
                  >
                    {categoryLabels[category] || category}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Posts Grid */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            {featuredPosts.length > 0 && regularPosts.length > 0 && (
              <h2 className="font-gazeta text-2xl md:text-3xl text-[#8A4BAF] mb-8">
                Todos los Artículos
              </h2>
            )}

            {posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-[#f8f0f5] rounded-full">
                  <BookOpen className="w-10 h-10 text-[#8A4BAF]/50" />
                </div>
                <h3 className="font-gazeta text-xl md:text-2xl text-[#654177] mb-3">
                  Próximamente
                </h3>
                <p className="font-dm-sans text-base text-gray-600 max-w-md mx-auto">
                  Estamos preparando artículos llenos de luz y sabiduría para ti.
                  Suscríbete a nuestra newsletter para recibir notificaciones.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {(featuredPosts.length > 0 ? regularPosts : posts).map((post) => (
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
              ¿Quieres una experiencia más profunda?
            </h2>
            <p className="font-dm-sans text-base md:text-lg text-gray-700 leading-relaxed mb-6">
              Agenda una sesión de canalización personalizada o únete a nuestra membresía
              para acceso exclusivo a contenido premium, sesiones grupales y más.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/sesiones"
                className="inline-block px-8 py-4 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-all transform hover:scale-105 font-dm-sans text-base font-medium shadow-lg"
              >
                Ver Sesiones
              </a>
              <a
                href="/membresia"
                className="inline-block px-8 py-4 bg-white text-[#4944a4] border-2 border-[#4944a4] rounded-lg hover:bg-[#4944a4] hover:text-white transition-all transform hover:scale-105 font-dm-sans text-base font-medium"
              >
                Conocer Membresía
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
