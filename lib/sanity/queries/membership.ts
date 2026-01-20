import { sanityFetch } from '@/sanity/lib/fetch'
import type { MembershipTier, MembershipPostSanity } from '@/types/membership'
// Nota: Las proyecciones de membership son específicas y no usan las genéricas
// porque los schemas de membershipTier y membershipPost tienen campos propios

// ============================================
// MEMBERSHIP TIERS QUERIES
// ============================================

const membershipTierProjection = `
  _id,
  _type,
  name,
  slug,
  tierLevel,
  tagline,
  description,
  icon {
    asset-> {
      _ref,
      url
    },
    alt
  },
  color,
  pricing,
  features,
  benefits,
  limitations,
  trialPeriod,
  recommendedFor,
  popularityBadge,
  displayOrder,
  ctaButtonText,
  active,
  featured,
  seo
`

/**
 * Obtiene todos los tiers de membresía activos
 */
export async function getAllMembershipTiers(): Promise<MembershipTier[]> {
  const query = `*[_type == "membershipTier" && active == true] | order(displayOrder asc) {
    ${membershipTierProjection}
  }`

  return sanityFetch({ query, tags: ['membership'] })
}

/**
 * Obtiene un tier de membresía por ID
 */
export async function getMembershipTierById(id: string): Promise<MembershipTier | null> {
  const query = `*[_type == "membershipTier" && _id == $id][0] {
    ${membershipTierProjection}
  }`

  return sanityFetch({ query, params: { id }, tags: ['membership'] })
}

/**
 * Obtiene un tier de membresía por slug
 */
export async function getMembershipTierBySlug(slug: string): Promise<MembershipTier | null> {
  const query = `*[_type == "membershipTier" && slug.current == $slug][0] {
    ${membershipTierProjection}
  }`

  return sanityFetch({ query, params: { slug }, tags: ['membership'] })
}

/**
 * Obtiene los tiers destacados para mostrar en la página principal
 */
export async function getFeaturedMembershipTiers(): Promise<MembershipTier[]> {
  const query = `*[_type == "membershipTier" && active == true && featured == true] | order(displayOrder asc) {
    ${membershipTierProjection}
  }`

  return sanityFetch({ query, tags: ['membership'] })
}

// ============================================
// MEMBERSHIP POSTS QUERIES
// ============================================

const membershipPostProjection = `
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  slug,
  postType,
  excerpt,
  content,
  thumbnail {
    asset-> {
      _ref,
      url
    },
    alt
  },
  videoUrl,
  audioFile {
    asset-> {
      _ref,
      url
    }
  },
  duration,
  downloadableFiles[] {
    title,
    file {
      asset-> {
        _ref,
        url
      }
    },
    description
  },
  pollOptions,
  pollEndsAt,
  requiredTier-> {
    _id,
    name,
    slug,
    tierLevel,
    color
  },
  publishedAt,
  expirationDate,
  relatedPosts[]-> {
    _id,
    title,
    slug,
    postType,
    thumbnail {
      asset-> {
        url
      },
      alt
    }
  },
  relatedPremiumContent[]-> {
    _id,
    title,
    slug,
    contentType,
    coverImage {
      asset-> {
        url
      },
      alt
    }
  },
  pinned,
  allowComments,
  allowLikes,
  seo,
  published
`

/**
 * Obtiene todas las publicaciones de membresía publicadas
 */
export async function getAllMembershipPosts(options?: {
  postType?: string
  requiredTierId?: string
  limit?: number
}): Promise<MembershipPostSanity[]> {
  const { postType, requiredTierId, limit = 50 } = options || {}

  let filters = '_type == "membershipPost" && published == true'

  if (postType) {
    filters += ` && postType == "${postType}"`
  }

  if (requiredTierId) {
    filters += ` && requiredTier._ref == "${requiredTierId}"`
  }

  // Filtrar posts no expirados
  const now = new Date().toISOString()
  filters += ` && (expirationDate == null || expirationDate > "${now}")`

  const query = `*[${filters}] | order(pinned desc, publishedAt desc) [0...${limit}] {
    ${membershipPostProjection}
  }`

  return sanityFetch({ query, tags: ['membership-post'] })
}

/**
 * Obtiene una publicación de membresía por slug
 */
export async function getMembershipPostBySlug(
  slug: string
): Promise<MembershipPostSanity | null> {
  const query = `*[_type == "membershipPost" && slug.current == $slug && published == true][0] {
    ${membershipPostProjection}
  }`

  return sanityFetch({ query, params: { slug }, tags: ['membership-post'] })
}

/**
 * Obtiene una publicación de membresía por ID
 */
export async function getMembershipPostById(id: string): Promise<MembershipPostSanity | null> {
  const query = `*[_type == "membershipPost" && _id == $id][0] {
    ${membershipPostProjection}
  }`

  return sanityFetch({ query, params: { id }, tags: ['membership-post'] })
}

/**
 * Obtiene las publicaciones destacadas (pinned)
 */
export async function getPinnedMembershipPosts(): Promise<MembershipPostSanity[]> {
  const now = new Date().toISOString()

  const query = `*[_type == "membershipPost" && published == true && pinned == true && (expirationDate == null || expirationDate > "${now}")] | order(publishedAt desc) {
    ${membershipPostProjection}
  }`

  return sanityFetch({ query, tags: ['membership-post'] })
}

/**
 * Obtiene publicaciones recientes del feed
 */
export async function getRecentMembershipPosts(limit: number = 10): Promise<MembershipPostSanity[]> {
  const now = new Date().toISOString()

  const query = `*[_type == "membershipPost" && published == true && publishedAt <= "${now}" && (expirationDate == null || expirationDate > "${now}")] | order(pinned desc, publishedAt desc) [0...${limit}] {
    ${membershipPostProjection}
  }`

  return sanityFetch({ query, tags: ['membership-post'] })
}

/**
 * Busca publicaciones de membresía por término
 */
export async function searchMembershipPosts(searchTerm: string): Promise<MembershipPostSanity[]> {
  const now = new Date().toISOString()

  const query = `*[_type == "membershipPost" && published == true && (expirationDate == null || expirationDate > "${now}") && (title match $searchTerm || excerpt match $searchTerm)] | order(publishedAt desc) [0...20] {
    ${membershipPostProjection}
  }`

  return sanityFetch({ query, params: { searchTerm: `*${searchTerm}*` }, tags: ['membership-post'] })
}

// ============================================
// PREMIUM CONTENT QUERIES (con membresía)
// ============================================

/**
 * Obtiene contenido premium accesible por un tier específico
 */
export async function getPremiumContentForTier(tierId: string): Promise<any[]> {
  const query = `*[_type == "premiumContent" && published == true && accessLevel.requiresMembership == true && $tierId in accessLevel.membershipTiers[]._ref] | order(releaseDate desc) {
    _id,
    title,
    slug,
    contentType,
    description,
    coverImage {
      asset-> {
        url
      },
      alt
    },
    duration,
    topics,
    releaseDate,
    featured
  }`

  return sanityFetch({ query, params: { tierId }, tags: ['premium'] })
}

/**
 * Verifica si un contenido premium está disponible para un tier
 */
export async function isPremiumContentAvailableForTier(
  contentId: string,
  tierId: string
): Promise<boolean> {
  const query = `*[_type == "premiumContent" && _id == $contentId && published == true && accessLevel.requiresMembership == true && $tierId in accessLevel.membershipTiers[]._ref][0] {
    _id
  }`

  const result = await sanityFetch<{ _id: string } | null>({
    query,
    params: { contentId, tierId },
    tags: ['premium'],
  })
  return !!result
}
