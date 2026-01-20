# Plan 11: Crear Proyecciones GROQ Reutilizables

## Objetivo
Crear proyecciones GROQ compartidas para evitar duplicación en las queries de Sanity.

## Contexto
Las mismas proyecciones se repiten en múltiples queries:
- Proyección de precios
- Proyección de acceso a membresía
- Proyección de SEO
- Proyección de imagen
- Proyección de autor

## Pasos de Implementación

### Paso 1: Crear archivo de proyecciones

Crear `sanity/lib/projections.ts`:

```typescript
/**
 * GROQ Projections
 * Proyecciones reutilizables para queries de Sanity
 */

/**
 * Proyección de precios
 * Uso: ${pricingProjection}
 */
export const pricingProjection = `
  "pricing": pricing {
    price,
    priceUSD,
    compareAtPrice,
    compareAtPriceUSD,
    memberDiscount,
    isFree
  }
`

/**
 * Proyección de acceso por membresía
 * Uso: ${membershipAccessProjection}
 */
export const membershipAccessProjection = `
  "membershipAccess": membershipAccess {
    includedInMembership,
    membershipTiers[]->{ _id, name, "slug": slug.current },
    memberOnlyPurchase
  }
`

/**
 * Proyección de SEO
 * Uso: ${seoProjection}
 */
export const seoProjection = `
  "seo": seo {
    metaTitle,
    metaDescription,
    "ogImageUrl": ogImage.asset->url
  }
`

/**
 * Proyección de imagen de portada
 * Uso: ${coverImageProjection}
 */
export const coverImageProjection = `
  "coverImage": coverImage {
    "url": asset->url,
    "lqip": asset->metadata.lqip,
    "dimensions": asset->metadata.dimensions,
    alt,
    caption,
    hotspot,
    crop
  }
`

/**
 * Proyección de imagen simple (solo URL y alt)
 * Uso: ${simpleImageProjection}
 */
export const simpleImageProjection = `
  "image": {
    "url": asset->url,
    "alt": alt
  }
`

/**
 * Proyección de autor
 * Uso: ${authorProjection}
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

/**
 * Proyección de video embed
 * Uso: ${videoEmbedProjection}
 */
export const videoEmbedProjection = `
  "video": video {
    videoType,
    url,
    duration,
    "thumbnailUrl": thumbnail.asset->url
  }
`

/**
 * Proyección de configuración de visualización
 * Uso: ${displaySettingsProjection}
 */
export const displaySettingsProjection = `
  "displaySettings": displaySettings {
    published,
    featured,
    displayOrder,
    publishedAt
  }
`

/**
 * Proyección de slug
 * Uso: ${slugProjection}
 */
export const slugProjection = `
  "slug": slug.current
`

/**
 * Proyección base para listados
 * Incluye campos comunes para cards/listados
 */
export const listingBaseProjection = `
  _id,
  _type,
  title,
  ${slugProjection},
  description,
  ${coverImageProjection},
  ${pricingProjection}
`

/**
 * Proyección de tier de membresía referenciado
 * Uso: ${membershipTierRefProjection}
 */
export const membershipTierRefProjection = `
  membershipTiers[]-> {
    _id,
    name,
    "slug": slug.current,
    "color": color.hex
  }
`

/**
 * Proyección de recursos descargables
 * Uso: ${resourcesProjection}
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

/**
 * Builder de proyecciones
 * Permite combinar proyecciones de forma limpia
 */
export function buildProjection(...projections: string[]): string {
  return projections.join(',\n  ')
}

/**
 * Proyección con campos opcionales
 * Agrega verificación de existencia
 */
export function optionalProjection(field: string, projection: string): string {
  return `"${field}": select(defined(${field}) => ${projection})`
}
```

### Paso 2: Actualizar queries principales

Actualizar `sanity/lib/queries.ts`:

```typescript
import { groq } from 'next-sanity'
import {
  pricingProjection,
  membershipAccessProjection,
  seoProjection,
  coverImageProjection,
  authorProjection,
  slugProjection,
  resourcesProjection,
  buildProjection,
} from './projections'

// =============================================================================
// COURSES
// =============================================================================

export const COURSES_QUERY = groq`
  *[_type == "course" && published == true] | order(displayOrder asc) {
    _id,
    title,
    ${slugProjection},
    description,
    ${coverImageProjection},
    ${pricingProjection},
    ${membershipAccessProjection},
    "moduleCount": count(modules),
    "lessonCount": count(modules[].lessons[])
  }
`

export const FEATURED_COURSES_QUERY = groq`
  *[_type == "course" && published == true && featured == true] | order(displayOrder asc)[0...$limit] {
    _id,
    title,
    ${slugProjection},
    description,
    ${coverImageProjection},
    ${pricingProjection}
  }
`

export const COURSE_BY_SLUG_QUERY = groq`
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    title,
    ${slugProjection},
    description,
    extendedDescription,
    ${coverImageProjection},
    ${pricingProjection},
    ${membershipAccessProjection},
    ${seoProjection},
    duration,
    level,
    "modules": modules[] {
      _key,
      title,
      description,
      "lessons": lessons[]-> {
        _id,
        title,
        ${slugProjection},
        description,
        duration,
        videoUrl,
        isFree,
        ${resourcesProjection}
      }
    },
    "certificate": certificate-> {
      _id,
      title,
      template
    }
  }
`

// =============================================================================
// EVENTS
// =============================================================================

export const EVENTS_QUERY = groq`
  *[_type == "event" && published == true] | order(eventDate asc) {
    _id,
    title,
    ${slugProjection},
    description,
    ${coverImageProjection},
    ${pricingProjection},
    ${membershipAccessProjection},
    eventDate,
    eventEndDate,
    eventType,
    location,
    capacity,
    "spotsRemaining": capacity - coalesce(bookedCount, 0)
  }
`

export const UPCOMING_EVENTS_QUERY = groq`
  *[_type == "event" && published == true && eventDate > now()] | order(eventDate asc)[0...$limit] {
    _id,
    title,
    ${slugProjection},
    description,
    ${coverImageProjection},
    ${pricingProjection},
    eventDate,
    eventType
  }
`

export const EVENT_BY_SLUG_QUERY = groq`
  *[_type == "event" && slug.current == $slug][0] {
    _id,
    title,
    ${slugProjection},
    description,
    content,
    ${coverImageProjection},
    ${pricingProjection},
    ${membershipAccessProjection},
    ${seoProjection},
    eventDate,
    eventEndDate,
    eventType,
    location,
    capacity,
    "spotsRemaining": capacity - coalesce(bookedCount, 0),
    zoomLink,
    replayUrl,
    replayAvailableUntil
  }
`

// =============================================================================
// BLOG
// =============================================================================

export const BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && published == true] | order(publishedAt desc) {
    _id,
    title,
    ${slugProjection},
    excerpt,
    ${coverImageProjection},
    ${authorProjection},
    publishedAt,
    "categories": categories[]->{ _id, title, slug }
  }
`

export const BLOG_POST_BY_SLUG_QUERY = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title,
    ${slugProjection},
    excerpt,
    content,
    ${coverImageProjection},
    ${authorProjection},
    ${seoProjection},
    publishedAt,
    "categories": categories[]->{ _id, title, slug },
    "relatedPosts": relatedPosts[]-> {
      _id,
      title,
      ${slugProjection},
      ${coverImageProjection},
      publishedAt
    }
  }
`

// =============================================================================
// PRODUCTS
// =============================================================================

export const PRODUCTS_QUERY = groq`
  *[_type == "product" && published == true] | order(displayOrder asc) {
    _id,
    title,
    ${slugProjection},
    shortDescription,
    ${coverImageProjection},
    ${pricingProjection},
    ${membershipAccessProjection},
    productType
  }
`

export const PRODUCT_BY_SLUG_QUERY = groq`
  *[_type == "product" && slug.current == $slug][0] {
    _id,
    title,
    ${slugProjection},
    shortDescription,
    description,
    ${coverImageProjection},
    "gallery": images[] {
      "url": asset->url,
      alt
    },
    ${pricingProjection},
    ${membershipAccessProjection},
    ${seoProjection},
    productType,
    downloadUrl,
    "relatedProducts": relatedProducts[]-> {
      _id,
      title,
      ${slugProjection},
      ${coverImageProjection},
      ${pricingProjection}
    }
  }
`

// =============================================================================
// MEMBERSHIP
// =============================================================================

export const MEMBERSHIP_TIERS_QUERY = groq`
  *[_type == "membershipTier" && published == true] | order(displayOrder asc) {
    _id,
    name,
    ${slugProjection},
    description,
    "color": color.hex,
    monthlyPrice,
    monthlyPriceUSD,
    yearlyPrice,
    yearlyPriceUSD,
    features,
    highlighted,
    monthlyCredits
  }
`
```

### Paso 3: Actualizar queries en lib/sanity/queries/

Actualizar cada archivo para usar las proyecciones:

**`lib/sanity/queries/events.ts`**:
```typescript
import { groq } from 'next-sanity'
import {
  pricingProjection,
  membershipAccessProjection,
  coverImageProjection,
  seoProjection,
  slugProjection,
} from '@/sanity/lib/projections'

export const getEventsQuery = groq`
  *[_type == "event" && published == true] | order(eventDate asc) {
    _id,
    title,
    ${slugProjection},
    description,
    ${coverImageProjection},
    ${pricingProjection},
    ${membershipAccessProjection},
    eventDate,
    eventType,
    capacity
  }
`
```

### Paso 4: Crear helper para queries parametrizadas

Agregar a `sanity/lib/projections.ts`:

```typescript
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

  return groq`
    *[_type == "${type}" && ${filter}] | order(${orderBy})${limitClause} {
      ${projection}
    }
  `
}

/**
 * Helper para crear query de detalle por slug
 */
export function createDetailBySlugQuery(type: string, projection: string): string {
  return groq`
    *[_type == "${type}" && slug.current == $slug][0] {
      ${projection}
    }
  `
}
```

### Paso 5: Actualizar tipos para queries

Crear `types/sanity-queries.ts`:

```typescript
/**
 * Tipos para resultados de queries de Sanity
 */

import type {
  SanityPricing,
  SanityMembershipAccess,
  SanitySeo,
  SanityCoverImage,
} from './sanity'

// Base para todos los documentos listables
export interface SanityListingBase {
  _id: string
  _type: string
  title: string
  slug: string
  description?: string
  coverImage?: SanityCoverImage
  pricing?: SanityPricing
}

// Curso en listado
export interface SanityCourseListItem extends SanityListingBase {
  _type: 'course'
  membershipAccess?: SanityMembershipAccess
  moduleCount: number
  lessonCount: number
}

// Curso detalle
export interface SanityCourseDetail extends SanityCourseListItem {
  extendedDescription?: any[] // Portable text
  seo?: SanitySeo
  duration?: number
  level?: string
  modules: Array<{
    _key: string
    title: string
    description?: string
    lessons: Array<{
      _id: string
      title: string
      slug: string
      description?: string
      duration?: number
      videoUrl?: string
      isFree?: boolean
      resources?: Array<{
        title: string
        resourceType: string
        fileUrl?: string
        fileName?: string
        externalUrl?: string
      }>
    }>
  }>
  certificate?: {
    _id: string
    title: string
    template: any
  }
}

// Evento en listado
export interface SanityEventListItem extends SanityListingBase {
  _type: 'event'
  membershipAccess?: SanityMembershipAccess
  eventDate: string
  eventEndDate?: string
  eventType: string
  location?: string
  capacity?: number
  spotsRemaining?: number
}

// ... más tipos según necesidad
```

### Paso 6: Verificar que compila

```bash
npm run build
```

### Paso 7: Testing

1. Verificar que las queries devuelven los datos esperados
2. Verificar que el frontend muestra los datos correctamente
3. Verificar que no hay errores de tipos

## Archivos a Crear
- ✅ `sanity/lib/projections.ts`
- ✅ `types/sanity-queries.ts`

## Archivos a Modificar
- 📝 `sanity/lib/queries.ts`
- 📝 `lib/sanity/queries/events.ts`
- 📝 `lib/sanity/queries/membership.ts`
- 📝 `lib/sanity/queries/blog.ts`
- 📝 `lib/sanity/queries/freeContent.ts`
- 📝 `lib/sanity/queries/sessionConfig.ts`

## Criterios de Éxito
- [ ] Archivo de proyecciones creado
- [ ] Queries principales actualizadas
- [ ] Queries específicas actualizadas
- [ ] Tipos TypeScript actualizados
- [ ] Build completa sin errores
- [ ] Frontend funciona correctamente

## Rollback
```bash
git checkout -- sanity/lib/
git checkout -- lib/sanity/queries/
rm sanity/lib/projections.ts
rm types/sanity-queries.ts
```

## Riesgo
**Bajo** - Es reorganización de código existente, no cambia funcionalidad.

## Tiempo Estimado
2 horas
