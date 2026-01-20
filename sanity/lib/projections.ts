/**
 * Proyecciones GROQ Reutilizables
 *
 * Este archivo centraliza las proyecciones comunes usadas en múltiples queries.
 * Beneficios:
 * - Consistencia: Los mismos campos se devuelven igual en todas las queries
 * - Mantenibilidad: Un solo lugar para modificar cuando cambian los esquemas
 * - Legibilidad: Las queries son más cortas y fáciles de entender
 * - Compatibilidad: Soporta tanto campos legacy como nuevos objetos reutilizables
 */

// ============================================
// PROYECCIÓN: SEO
// ============================================
/**
 * Proyección para campos SEO
 * Soporta tanto el objeto seo reutilizable como campos legacy
 */
export const seoProjection = `
  seo {
    metaTitle,
    metaDescription,
    "ogImageUrl": ogImage.asset->url
  }
`

// ============================================
// PROYECCIÓN: PRICING (Precios)
// ============================================
/**
 * Proyección para precios - soporta el nuevo objeto pricing y campos legacy
 * Prioriza campos del nuevo objeto, fallback a legacy
 */
export const pricingProjection = `
  "price": coalesce(pricing.price, price),
  "priceUSD": coalesce(pricing.priceUSD, priceUSD),
  "compareAtPrice": coalesce(pricing.compareAtPrice, compareAtPrice),
  "compareAtPriceUSD": coalesce(pricing.compareAtPriceUSD, compareAtPriceUSD),
  "memberDiscount": coalesce(pricing.memberDiscount, memberDiscount, 0),
  "isFree": coalesce(pricing.isFree, false)
`

/**
 * Proyección completa del objeto pricing
 */
export const pricingObjectProjection = `
  pricing {
    price,
    priceUSD,
    compareAtPrice,
    compareAtPriceUSD,
    memberDiscount,
    isFree
  }
`

// ============================================
// PROYECCIÓN: MEMBERSHIP ACCESS
// ============================================
/**
 * Proyección para acceso de membresía - soporta nuevos y legacy
 */
export const membershipAccessProjection = `
  "includedInMembership": coalesce(membershipAccess.includedInMembership, includedInMembership, false),
  "membershipTiers": coalesce(
    membershipAccess.membershipTiers[]-> {
      _id,
      name,
      tierLevel
    },
    membershipTiers[]-> {
      _id,
      name,
      tierLevel
    }
  ),
  "memberOnlyPurchase": coalesce(membershipAccess.memberOnlyPurchase, requiresMembership, false)
`

/**
 * Proyección compacta de membresía (solo IDs)
 */
export const membershipAccessCompactProjection = `
  "includedInMembership": coalesce(membershipAccess.includedInMembership, includedInMembership, false),
  "membershipTierIds": coalesce(
    membershipAccess.membershipTiers[]._ref,
    membershipTiers[]._ref
  )
`

// ============================================
// PROYECCIÓN: COVER IMAGE
// ============================================
/**
 * Proyección para imagen de portada
 * El tipo coverImage ya tiene campos alt y caption integrados
 */
export const coverImageProjection = `
  coverImage {
    asset-> {
      _id,
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height
    },
    alt,
    caption,
    hotspot,
    crop
  }
`

/**
 * Proyección compacta para imagen (solo URL y alt)
 */
export const coverImageCompactProjection = `
  "coverImageUrl": coverImage.asset->url,
  "coverImageAlt": coverImage.alt
`

/**
 * Proyección para mainImage (usado en events, blogPosts)
 */
export const mainImageProjection = `
  mainImage {
    asset-> {
      _id,
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height
    },
    alt,
    caption,
    hotspot,
    crop
  }
`

// ============================================
// PROYECCIÓN: DISPLAY SETTINGS
// ============================================
/**
 * Proyección para configuración de visualización
 */
export const displaySettingsProjection = `
  published,
  featured,
  displayOrder,
  publishedAt
`

// ============================================
// PROYECCIÓN: SLUG
// ============================================
/**
 * Proyección estándar para slug
 */
export const slugProjection = `
  "slug": slug.current
`

// ============================================
// PROYECCIONES COMBINADAS
// ============================================

/**
 * Proyección base para listados de contenido
 * Incluye: id, título, slug, imagen, estado
 */
export const listingBaseProjection = `
  _id,
  _type,
  title,
  ${slugProjection},
  ${coverImageCompactProjection},
  published,
  featured
`

/**
 * Proyección completa para tarjetas de productos/cursos
 */
export const productCardProjection = `
  _id,
  title,
  ${slugProjection},
  shortDescription,
  ${coverImageProjection},
  ${pricingProjection},
  ${membershipAccessCompactProjection},
  featured,
  status
`

/**
 * Proyección para tarjetas de eventos
 * Soporta tanto el nuevo objeto pricing/membershipAccess como campos legacy
 */
export const eventCardProjection = `
  _id,
  title,
  ${slugProjection},
  eventType,
  eventDate,
  endDate,
  locationType,
  status,
  ${mainImageProjection},
  "price": coalesce(pricing.price, price),
  "priceUSD": coalesce(pricing.priceUSD, priceUSD),
  "memberDiscount": coalesce(pricing.memberDiscount, memberDiscount, 0),
  "isFree": coalesce(pricing.isFree, false),
  earlyBirdPrice,
  earlyBirdDeadline,
  capacity,
  availableSpots,
  "includedInMembership": coalesce(membershipAccess.includedInMembership, includedInMembership, false),
  "memberOnlyPurchase": coalesce(membershipAccess.memberOnlyPurchase, requiresMembership, false),
  featured
`

/**
 * Proyección para tarjetas de blog
 */
export const blogCardProjection = `
  _id,
  title,
  ${slugProjection},
  excerpt,
  ${mainImageProjection},
  publishedAt,
  "authorName": author.name,
  categories,
  featured,
  isPremium,
  readingTime
`

/**
 * Proyección para contenido gratuito
 */
export const freeContentCardProjection = `
  _id,
  title,
  ${slugProjection},
  description,
  contentType,
  ${coverImageCompactProjection},
  duration,
  topics,
  featured,
  publishDate
`

// ============================================
// UTILIDADES
// ============================================

/**
 * Combina múltiples proyecciones en una sola query
 * @example
 * const query = `*[_type == "course"]{${combineProjections([pricingProjection, seoProjection])}}`
 */
export function combineProjections(projections: string[]): string {
  return projections.join(',\n  ')
}

/**
 * Crea una proyección condicional
 * @example
 * conditionalProjection('published == true', pricingProjection)
 */
export function conditionalProjection(condition: string, projection: string): string {
  return `select(${condition} => {${projection}}, null)`
}

// ============================================
// PROYECCIÓN: AUTHOR
// ============================================
/**
 * Proyección de autor para blog posts
 */
export const authorProjection = `
  "author": author-> {
    _id,
    name,
    "slug": slug.current,
    "image": image.asset->url,
    bio
  }
`

// ============================================
// PROYECCIÓN: VIDEO EMBED
// ============================================
/**
 * Proyección de video embed
 */
export const videoEmbedProjection = `
  "video": video {
    videoType,
    url,
    duration,
    "thumbnailUrl": thumbnail.asset->url
  }
`

// ============================================
// PROYECCIÓN: RESOURCES
// ============================================
/**
 * Proyección de recursos descargables
 */
export const resourcesProjection = `
  "resources": resources[] {
    title,
    resourceType,
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename,
    "fileSize": file.asset->size,
    externalUrl,
    description
  }
`

// ============================================
// PROYECCIÓN: MEMBERSHIP TIER REF
// ============================================
/**
 * Proyección de tier de membresía referenciado
 */
export const membershipTierRefProjection = `
  membershipTiers[]-> {
    _id,
    name,
    "slug": slug.current,
    "color": color.hex
  }
`

// ============================================
// QUERY BUILDERS
// ============================================

/**
 * Helper para crear queries de listado con opciones
 */
export interface ListQueryOptions {
  type: string
  filter?: string
  orderBy?: string
  limit?: number
  projection?: string
}

export function createListQuery(options: ListQueryOptions): string {
  const {
    type,
    filter = 'published == true',
    orderBy = 'displayOrder asc',
    limit,
    projection = listingBaseProjection,
  } = options

  const limitClause = limit ? `[0...${limit}]` : ''

  return `
    *[_type == "${type}" && ${filter}] | order(${orderBy})${limitClause} {
      ${projection}
    }
  `
}

/**
 * Helper para crear query de detalle por slug
 */
export function createDetailBySlugQuery(type: string, projection: string): string {
  return `
    *[_type == "${type}" && slug.current == $slug][0] {
      ${projection}
    }
  `
}
