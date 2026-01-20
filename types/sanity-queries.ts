/**
 * Tipos para resultados de queries de Sanity
 *
 * Estos tipos representan la estructura de datos devuelta por las queries GROQ
 * que usan las proyecciones reutilizables definidas en sanity/lib/projections.ts
 */

import type {
  SanityPricing,
  SanitySeo,
  SanityCoverImage,
} from './sanity'

// ============================================
// BASE TYPES
// ============================================

/**
 * Base para todos los documentos listables
 */
export interface SanityListingBase {
  _id: string
  _type: string
  title: string
  slug: string
  description?: string
  coverImage?: SanityCoverImage
  pricing?: SanityPricing
}

/**
 * Base extendida con campos normalizados de pricing y membership
 */
export interface SanityListingWithAccess extends SanityListingBase {
  // Campos normalizados de pricing (desde coalesce)
  price?: number
  priceUSD?: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  memberDiscount?: number
  isFree?: boolean
  // Campos normalizados de membership access (desde coalesce)
  includedInMembership?: boolean
  memberOnlyPurchase?: boolean
  membershipTiers?: Array<{
    _id: string
    name: string
    tierLevel?: number
  }>
}

// ============================================
// COURSE TYPES
// ============================================

/**
 * Curso en listado
 */
export interface SanityCourseListItem extends SanityListingWithAccess {
  _type: 'course'
  shortDescription?: string
  courseType?: string
  difficulty?: string
  totalDuration?: number
  topics?: string[]
  instructor?: string
  featured?: boolean
  moduleCount?: number
  lessonCount?: number
}

/**
 * Curso detalle completo
 */
export interface SanityCourseDetail extends SanityCourseListItem {
  extendedDescription?: any[] // Portable text
  seo?: SanitySeo
  dripEnabled?: boolean
  defaultDripDays?: number
  hasCertificate?: boolean
  finalQuizId?: string
  requiresFinalQuizToComplete?: boolean
  modules?: Array<{
    _id: string
    title: string
    description?: string
    order?: number
    unlockDate?: string
    lessons?: SanityLessonListItem[]
  }>
  simpleLesson?: SanityLessonListItem
}

/**
 * Lección en listado (dentro de módulo)
 */
export interface SanityLessonListItem {
  _id: string
  title: string
  slug: string
  description?: string
  order?: number
  lessonType?: string
  videoDuration?: number
  isFreePreview?: boolean
  published?: boolean
  dripMode?: string
  dripOffsetDays?: number
  availableAt?: string
  quizId?: string
  requiresQuizToComplete?: boolean
  liveSession?: {
    scheduledAt?: string
    estimatedDuration?: number
    recordingUrl?: string
  }
}

/**
 * Lección completa con recursos
 */
export interface SanityLessonDetail extends SanityLessonListItem {
  resources?: Array<{
    title: string
    resourceType: string
    fileUrl?: string
    fileName?: string
    fileSize?: number
    externalUrl?: string
    description?: string
  }>
}

// ============================================
// EVENT TYPES
// ============================================

/**
 * Evento en listado
 */
export interface SanityEventListItem extends SanityListingWithAccess {
  _type: 'event'
  eventDate: string
  endDate?: string
  eventType: string
  locationType?: 'online' | 'in_person'
  status?: 'upcoming' | 'sold_out' | 'cancelled' | 'completed'
  capacity?: number
  availableSpots?: number
  featured?: boolean
  earlyBirdPrice?: number
  earlyBirdDeadline?: string
}

/**
 * Evento detalle completo
 */
export interface SanityEventDetail extends SanityEventListItem {
  content?: any[] // Portable text
  seo?: SanitySeo
  venue?: {
    name?: string
    address?: string
    city?: string
    country?: string
    instructions?: string
  }
  zoom?: {
    meetingUrl?: string
    meetingId?: string
    password?: string
  }
  recording?: {
    url?: string
    availableUntil?: string
    replayDurationDays?: number
  }
  whatToBring?: string[]
  requirements?: string
  includes?: string[]
  perks?: Array<{
    type: string
    title: string
    description?: string
    cap?: number
  }>
}

// ============================================
// BLOG TYPES
// ============================================

/**
 * Blog post en listado
 */
export interface SanityBlogPostListItem {
  _id: string
  title: string
  slug: { current: string }
  excerpt?: string
  mainImage?: {
    asset?: {
      _id: string
      url: string
      width?: number
      height?: number
    }
    alt?: string
    caption?: string
  }
  categories?: string[]
  readingTime?: number
  publishedAt: string
  isPremium?: boolean
  featured?: boolean
}

/**
 * Blog post detalle completo
 */
export interface SanityBlogPostDetail extends SanityBlogPostListItem {
  author?: {
    _id?: string
    name: string
    slug?: string
    image?: string
    bio?: any[]
  }
  content?: any[] // Portable text
  tags?: string[]
  seo?: SanitySeo
  membershipTiers?: Array<{
    _id: string
    name: string
  }>
  relatedPosts?: SanityBlogPostListItem[]
  relatedSessions?: Array<{
    _id: string
    title: string
    slug: { current: string }
    shortDescription?: string
  }>
  relatedEvents?: Array<{
    _id: string
    title: string
    slug: { current: string }
    eventDate: string
  }>
  updatedAt?: string
  published?: boolean
}

// ============================================
// MEMBERSHIP TYPES
// ============================================

/**
 * Tier de membresía
 */
export interface SanityMembershipTierItem {
  _id: string
  _type: 'membershipTier'
  name: string
  slug: { current: string }
  tierLevel: number
  tagline?: string
  description?: any[]
  icon?: {
    asset?: {
      url: string
    }
    alt?: string
  }
  color?: { hex: string }
  pricing?: {
    monthly?: number
    monthlyUSD?: number
    yearly?: number
    yearlyUSD?: number
  }
  features?: string[]
  benefits?: string[]
  limitations?: string[]
  trialPeriod?: number
  recommendedFor?: string
  popularityBadge?: string
  displayOrder?: number
  ctaButtonText?: string
  active: boolean
  featured?: boolean
}

// ============================================
// FREE CONTENT TYPES
// ============================================

/**
 * Contenido gratuito (meditaciones, videos, audios)
 */
export interface SanityFreeContentItem {
  _id: string
  _type: 'freeContent'
  title: string
  slug: { current: string }
  contentType: 'meditation' | 'video' | 'audio'
  description?: string
  extendedDescription?: any[]
  coverImage?: SanityCoverImage
  videoUrl?: string
  audioFile?: {
    asset?: {
      url: string
    }
  }
  duration?: number
  topics?: string[]
  transcript?: string
  keyTakeaways?: string[]
  featured?: boolean
  published?: boolean
  publishDate?: string
  downloadable?: boolean
  displayOrder?: number
  viewCount?: number
  seo?: SanitySeo
}

// ============================================
// PRODUCT TYPES
// ============================================

/**
 * Producto en listado
 */
export interface SanityProductListItem extends SanityListingWithAccess {
  _type: 'product'
  shortDescription?: string
  productType?: string
  status?: string
  featured?: boolean
}

/**
 * Producto detalle completo
 * Nota: Omite 'description' de base para redefinirlo como Portable Text
 */
export interface SanityProductDetail extends Omit<SanityProductListItem, 'description'> {
  description?: string // Short description from listing
  fullDescription?: any[] // Portable text for detail view
  gallery?: Array<{
    url: string
    alt?: string
  }>
  seo?: SanitySeo
  downloadUrl?: string
  relatedProducts?: SanityProductListItem[]
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Resultado de query con paginación
 */
export interface SanityPaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

/**
 * Parámetros comunes de query
 */
export interface SanityQueryParams {
  slug?: string
  id?: string
  limit?: number
  offset?: number
  category?: string
}
