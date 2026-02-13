import { sanityFetch } from '@/sanity/lib/fetch'
import { coverImageProjection, seoProjection } from '@/sanity/lib/projections'

import { client } from '../client'

// Interface para Free Content
export interface FreeContent {
  _id: string
  _type: 'freeContent'
  title: string
  slug: {
    current: string
  }
  contentType: 'meditation' | 'video' | 'audio'
  description: string
  extendedDescription?: any[]
  coverImage: {
    asset: {
      _ref: string
      url: string
    }
    alt?: string
  }
  videoUrl?: string
  audioFile?: {
    asset: {
      _ref: string
      url: string
    }
  }
  duration: number
  topics?: string[]
  transcript?: string
  keyTakeaways?: string[]
  featured: boolean
  published: boolean
  publishDate: string
  downloadable?: boolean
  displayOrder: number
  viewCount?: number
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
}

// Query base para campos comunes
// Usa proyecciones reutilizables para coverImage y seo
const freeContentFields = `
  _id,
  _type,
  title,
  slug,
  contentType,
  description,
  extendedDescription,
  ${coverImageProjection},
  videoUrl,
  audioFile {
    asset-> {
      _ref,
      url
    }
  },
  duration,
  topics,
  transcript,
  keyTakeaways,
  featured,
  published,
  publishDate,
  downloadable,
  displayOrder,
  viewCount,
  ${seoProjection}
`

/**
 * Obtener todas las meditaciones/contenido gratuito publicado
 * Ordenado por displayOrder y fecha de publicación
 */
export async function getAllFreeContent(): Promise<FreeContent[]> {
  const query = `
    *[_type == "freeContent" && published == true] | order(displayOrder asc, publishDate desc) {
      ${freeContentFields}
    }
  `

  return sanityFetch({ query, tags: ['free-content'] })
}

/**
 * Obtener contenido gratuito destacado
 * Máximo 3 items para mostrar en homepage
 */
export async function getFeaturedFreeContent(limit: number = 3): Promise<FreeContent[]> {
  const query = `
    *[_type == "freeContent" && published == true && featured == true] | order(displayOrder asc, publishDate desc) [0...${limit}] {
      ${freeContentFields}
    }
  `

  return sanityFetch({ query, tags: ['free-content'] })
}

/**
 * Obtener contenido gratuito por slug
 */
export async function getFreeContentBySlug(slug: string): Promise<FreeContent | null> {
  const query = `
    *[_type == "freeContent" && slug.current == $slug && published == true][0] {
      ${freeContentFields}
    }
  `

  return sanityFetch({ query, params: { slug }, tags: ['free-content'] })
}

/**
 * Obtener contenido gratuito por tipo
 * @param contentType - 'meditation', 'video', 'audio'
 */
export async function getFreeContentByType(
  contentType: 'meditation' | 'video' | 'audio'
): Promise<FreeContent[]> {
  const query = `
    *[_type == "freeContent" && published == true && contentType == $contentType] | order(displayOrder asc, publishDate desc) {
      ${freeContentFields}
    }
  `

  return sanityFetch({ query, params: { contentType }, tags: ['free-content'] })
}

/**
 * Obtener solo meditaciones gratuitas
 */
export async function getAllFreeMeditations(): Promise<FreeContent[]> {
  return getFreeContentByType('meditation')
}

/**
 * Obtener contenido gratuito por tema
 * @param topic - Tema a filtrar (ej: 'abundancia', 'chakras')
 */
export async function getFreeContentByTopic(topic: string): Promise<FreeContent[]> {
  const query = `
    *[_type == "freeContent" && published == true && $topic in topics] | order(displayOrder asc, publishDate desc) {
      ${freeContentFields}
    }
  `

  return sanityFetch({ query, params: { topic }, tags: ['free-content'] })
}

/**
 * Obtener todos los temas únicos del contenido gratuito publicado
 */
export async function getAllFreeContentTopics(): Promise<string[]> {
  const query = `
    *[_type == "freeContent" && published == true].topics[] | unique
  `

  return sanityFetch({ query, tags: ['free-content'] })
}

/**
 * Obtener contenido gratuito relacionado
 * Basado en temas similares, excluyendo el item actual
 */
export async function getRelatedFreeContent(
  currentSlug: string,
  topics: string[],
  limit: number = 3
): Promise<FreeContent[]> {
  if (!topics || topics.length === 0) {
    // Si no hay temas, devolver los más recientes
    const query = `
      *[_type == "freeContent" && published == true && slug.current != $currentSlug] | order(publishDate desc) [0...${limit}] {
        ${freeContentFields}
      }
    `
    return sanityFetch({ query, params: { currentSlug }, tags: ['free-content'] })
  }

  const query = `
    *[_type == "freeContent" && published == true && slug.current != $currentSlug && count((topics[])[@ in $topics]) > 0] | order(count((topics[])[@ in $topics]) desc, publishDate desc) [0...${limit}] {
      ${freeContentFields}
    }
  `

  return sanityFetch({ query, params: { currentSlug, topics }, tags: ['free-content'] })
}

/**
 * Incrementar contador de vistas
 * @param id - ID del documento
 */
export async function incrementViewCount(id: string): Promise<void> {
  const query = `*[_id == $id][0].viewCount`
  const currentCount = (await client.fetch(query, { id })) || 0

  await client
    .patch(id)
    .set({ viewCount: currentCount + 1 })
    .commit()
}

/**
 * Obtener estadísticas del contenido gratuito
 */
export async function getFreeContentStats(): Promise<{
  total: number
  meditations: number
  videos: number
  audios: number
  totalViews: number
}> {
  const query = `
    {
      "total": count(*[_type == "freeContent" && published == true]),
      "meditations": count(*[_type == "freeContent" && published == true && contentType == "meditation"]),
      "videos": count(*[_type == "freeContent" && published == true && contentType == "video"]),
      "audios": count(*[_type == "freeContent" && published == true && contentType == "audio"]),
      "totalViews": sum(*[_type == "freeContent" && published == true].viewCount)
    }
  `

  return await client.fetch(query)
}
