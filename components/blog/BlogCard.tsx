import { Calendar, Clock, Lock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { BlogPostPreview } from "@/lib/sanity/queries/blog"

interface BlogCardProps {
  post: BlogPostPreview
  featured?: boolean
}

// Mapeo de categorías a etiquetas legibles
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

export default function BlogCard({ post, featured = false }: BlogCardProps) {
  const imageUrl = post.mainImage?.asset?.url || '/placeholder-blog.jpg'

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className={`group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${
        featured ? 'md:flex' : ''
      }`}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${
        featured ? 'md:w-1/2 aspect-[16/9] md:aspect-auto' : 'aspect-[16/9]'
      }`}>
        <Image
          src={imageUrl}
          alt={post.mainImage?.alt || post.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Premium Badge */}
        {post.isPremium && (
          <span className="absolute top-4 right-4 bg-[#8A4BAF] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Premium
          </span>
        )}

        {/* Featured Badge */}
        {post.featured && !featured && (
          <span className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Destacado
          </span>
        )}
      </div>

      {/* Content */}
      <div className={`p-6 ${featured ? 'md:w-1/2 md:flex md:flex-col md:justify-center' : ''}`}>
        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories.slice(0, 2).map((category) => (
              <span
                key={category}
                className="px-3 py-1 bg-[#8A4BAF]/10 text-[#8A4BAF] text-xs font-medium rounded-full"
              >
                {categoryLabels[category] || category}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className={`font-gazeta text-[#654177] mb-3 group-hover:text-[#8A4BAF] transition-colors line-clamp-2 ${
          featured ? 'text-2xl md:text-3xl' : 'text-xl'
        }`}>
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className={`text-gray-600 mb-4 line-clamp-2 ${featured ? 'md:line-clamp-3' : ''}`}>
          {post.excerpt}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-[#8A4BAF]" />
            <span>{formatDate(post.publishedAt)}</span>
          </div>

          {post.readingTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#8A4BAF]" />
              <span>{post.readingTime} min</span>
            </div>
          )}
        </div>

        {/* Read More */}
        {featured && (
          <div className="mt-6">
            <span className="inline-flex items-center px-5 py-2 bg-[#4944a4] text-white rounded-lg text-sm font-medium group-hover:bg-[#3d3a8a] transition-colors">
              Leer Artículo
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
