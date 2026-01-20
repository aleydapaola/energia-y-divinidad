# Plan 10: Migrar Esquemas de Sanity a Objetos Reutilizables

## Objetivo
Actualizar los esquemas existentes para usar los objetos reutilizables creados en el Plan 09.

## Prerequisitos
- ✅ Plan 09 completado (Objetos reutilizables creados)

## Contexto
Este plan migra los esquemas existentes para usar los nuevos objetos:
- `seo` en lugar de campos sueltos metaTitle/metaDescription
- `pricing` en lugar de price/priceUSD/memberDiscount repetidos
- `membershipAccess` en lugar de includedInMembership/membershipTiers
- `coverImage` en lugar de mainImage/coverImage inconsistentes

## IMPORTANTE: Migración de Datos

Esta migración cambia la estructura de los documentos. Se requiere:
1. **Backup del dataset** antes de migrar
2. **Script de migración** para mover datos existentes
3. **Actualizar queries** que leen estos campos

## Pasos de Implementación

### Paso 1: Backup del dataset

```bash
# Crear backup antes de cualquier cambio
cd sanity
npx sanity dataset export production backup-$(date +%Y%m%d).tar.gz
```

### Paso 2: Migrar esquema course.ts

**Archivo**: `sanity/schemas/course.ts`

**Cambios**:

```typescript
// Antes (campos sueltos)
defineField({
  name: 'price',
  title: 'Precio en Pesos (COP)',
  type: 'number',
}),
defineField({
  name: 'priceUSD',
  title: 'Precio en Dólares (USD)',
  type: 'number',
}),
defineField({
  name: 'memberDiscount',
  title: 'Descuento para Miembros (%)',
  type: 'number',
}),
defineField({
  name: 'includedInMembership',
  title: '¿Incluido en Membresía?',
  type: 'boolean',
}),
defineField({
  name: 'membershipTiers',
  title: 'Niveles con Acceso',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
}),
defineField({
  name: 'seo',
  type: 'object',
  fields: [
    { name: 'metaTitle', type: 'string' },
    { name: 'metaDescription', type: 'text' },
  ],
}),
defineField({
  name: 'coverImage',
  type: 'image',
  options: { hotspot: true },
  fields: [{ name: 'alt', type: 'string' }],
}),

// Después (objetos reutilizables)
defineField({
  name: 'pricing',
  title: 'Precios',
  type: 'pricing',
  group: 'pricing',
}),
defineField({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'membershipAccess',
  group: 'access',
}),
defineField({
  name: 'seo',
  title: 'SEO',
  type: 'seo',
  group: 'seo',
}),
defineField({
  name: 'coverImage',
  title: 'Imagen de Portada',
  type: 'coverImage',
}),
```

### Paso 3: Crear script de migración para course

Crear `sanity/migrations/migrate-course-to-objects.ts`:

```typescript
/**
 * Migración: course → objetos reutilizables
 *
 * Ejecutar con: npx sanity exec migrations/migrate-course-to-objects.ts --with-user-token
 */

import { getCliClient } from 'sanity/cli'

const client = getCliClient()

async function migrateCourses() {
  const courses = await client.fetch(`*[_type == "course"]`)
  console.log(`Found ${courses.length} courses to migrate`)

  for (const course of courses) {
    const patch = client.patch(course._id)

    // Migrar pricing
    if (course.price !== undefined || course.priceUSD !== undefined) {
      patch.set({
        pricing: {
          _type: 'pricing',
          price: course.price || 0,
          priceUSD: course.priceUSD || 0,
          compareAtPrice: course.compareAtPrice,
          compareAtPriceUSD: course.compareAtPriceUSD,
          memberDiscount: course.memberDiscount || 0,
          isFree: course.isFree || false,
        },
      })
      patch.unset([
        'price',
        'priceUSD',
        'compareAtPrice',
        'compareAtPriceUSD',
        'memberDiscount',
        'isFree',
      ])
    }

    // Migrar membershipAccess
    if (course.includedInMembership !== undefined) {
      patch.set({
        membershipAccess: {
          _type: 'membershipAccess',
          includedInMembership: course.includedInMembership || false,
          membershipTiers: course.membershipTiers || [],
          memberOnlyPurchase: false,
        },
      })
      patch.unset(['includedInMembership', 'membershipTiers'])
    }

    // Migrar SEO (si es objeto inline)
    if (course.seo && !course.seo._type) {
      patch.set({
        seo: {
          _type: 'seo',
          metaTitle: course.seo.metaTitle,
          metaDescription: course.seo.metaDescription,
        },
      })
    }

    // Migrar coverImage
    if (course.coverImage && !course.coverImage._type) {
      patch.set({
        coverImage: {
          _type: 'coverImage',
          asset: course.coverImage.asset,
          hotspot: course.coverImage.hotspot,
          crop: course.coverImage.crop,
          alt: course.coverImage.alt,
        },
      })
    }

    try {
      await patch.commit()
      console.log(`✓ Migrated course: ${course.title}`)
    } catch (error) {
      console.error(`✗ Failed to migrate course ${course._id}:`, error)
    }
  }

  console.log('Migration complete!')
}

migrateCourses()
```

### Paso 4: Migrar esquema event.ts

**Archivo**: `sanity/schemas/event.ts`

Similar a course, además resolver la ambigüedad `includedInMembership` vs `requiresMembership`:

```typescript
// Después
defineField({
  name: 'pricing',
  title: 'Precios',
  type: 'pricing',
  group: 'pricing',
}),
defineField({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'membershipAccess',
  group: 'access',
}),
// Eliminar: includedInMembership, requiresMembership (usar membershipAccess)
```

### Paso 5: Crear script de migración para event

Crear `sanity/migrations/migrate-event-to-objects.ts`:

```typescript
import { getCliClient } from 'sanity/cli'

const client = getCliClient()

async function migrateEvents() {
  const events = await client.fetch(`*[_type == "event"]`)
  console.log(`Found ${events.length} events to migrate`)

  for (const event of events) {
    const patch = client.patch(event._id)

    // Migrar pricing
    if (event.price !== undefined || event.priceUSD !== undefined) {
      patch.set({
        pricing: {
          _type: 'pricing',
          price: event.price || 0,
          priceUSD: event.priceUSD || 0,
          memberDiscount: event.memberDiscount || 0,
          isFree: event.isFree || false,
        },
      })
      patch.unset(['price', 'priceUSD', 'memberDiscount', 'isFree'])
    }

    // Migrar membershipAccess
    // Resolver ambigüedad: usar includedInMembership si existe
    const includedInMembership = event.includedInMembership || event.requiresMembership || false
    if (event.includedInMembership !== undefined || event.requiresMembership !== undefined) {
      patch.set({
        membershipAccess: {
          _type: 'membershipAccess',
          includedInMembership,
          membershipTiers: event.membershipTiers || [],
          memberOnlyPurchase: event.requiresMembership && !event.includedInMembership,
        },
      })
      patch.unset(['includedInMembership', 'requiresMembership', 'membershipTiers'])
    }

    // Migrar mainImage → coverImage
    if (event.mainImage) {
      patch.set({
        coverImage: {
          _type: 'coverImage',
          asset: event.mainImage.asset,
          hotspot: event.mainImage.hotspot,
          crop: event.mainImage.crop,
          alt: event.mainImage.alt,
        },
      })
      patch.unset(['mainImage'])
    }

    // Migrar SEO
    if (event.seo && !event.seo._type) {
      patch.set({
        seo: {
          _type: 'seo',
          metaTitle: event.seo.metaTitle,
          metaDescription: event.seo.metaDescription,
        },
      })
    }

    try {
      await patch.commit()
      console.log(`✓ Migrated event: ${event.title}`)
    } catch (error) {
      console.error(`✗ Failed to migrate event ${event._id}:`, error)
    }
  }

  console.log('Migration complete!')
}

migrateEvents()
```

### Paso 6: Repetir para otros esquemas

Crear migraciones similares para:
- `product.ts`
- `premiumContent.ts`
- `blogPost.ts`
- `freeContent.ts`
- `membershipPost.ts`
- `page.ts`

### Paso 7: Actualizar queries de Sanity

**Archivo**: `sanity/lib/queries.ts`

Actualizar proyecciones para usar la nueva estructura:

```typescript
// Antes
export const COURSE_BY_SLUG_QUERY = groq`
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    title,
    price,
    priceUSD,
    memberDiscount,
    includedInMembership,
    membershipTiers[]->{ _id, name },
    "seo": {
      "metaTitle": seo.metaTitle,
      "metaDescription": seo.metaDescription
    },
    coverImage {
      asset->,
      alt
    }
  }
`

// Después
export const COURSE_BY_SLUG_QUERY = groq`
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    title,
    pricing {
      price,
      priceUSD,
      compareAtPrice,
      compareAtPriceUSD,
      memberDiscount,
      isFree
    },
    membershipAccess {
      includedInMembership,
      membershipTiers[]->{ _id, name, slug },
      memberOnlyPurchase
    },
    seo {
      metaTitle,
      metaDescription,
      "ogImageUrl": ogImage.asset->url
    },
    coverImage {
      "url": asset->url,
      "metadata": asset->metadata,
      alt,
      caption
    }
  }
`
```

### Paso 8: Actualizar queries en lib/sanity/queries/

Actualizar también:
- `lib/sanity/queries/events.ts`
- `lib/sanity/queries/membership.ts`
- `lib/sanity/queries/blog.ts`
- `lib/sanity/queries/freeContent.ts`

### Paso 9: Actualizar tipos TypeScript

**Archivo**: `types/sanity.ts` (o donde estén los tipos)

```typescript
// Tipos para objetos reutilizables
export interface SanityPricing {
  price: number
  priceUSD: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  memberDiscount: number
  isFree: boolean
}

export interface SanityMembershipAccess {
  includedInMembership: boolean
  membershipTiers?: Array<{ _id: string; name: string; slug: { current: string } }>
  memberOnlyPurchase: boolean
}

export interface SanitySeo {
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
}

export interface SanityCoverImage {
  url: string
  metadata?: {
    dimensions: { width: number; height: number }
    lqip?: string
  }
  alt?: string
  caption?: string
}

// Actualizar tipos de documentos
export interface SanityCourse {
  _id: string
  title: string
  slug: { current: string }
  pricing: SanityPricing
  membershipAccess: SanityMembershipAccess
  seo: SanitySeo
  coverImage: SanityCoverImage
  // ...
}
```

### Paso 10: Ejecutar migraciones

```bash
cd sanity

# 1. Verificar en sandbox primero (si tienes un dataset de desarrollo)
npx sanity dataset export development dev-backup.tar.gz
npx sanity exec migrations/migrate-course-to-objects.ts --with-user-token --dataset development

# 2. Verificar que todo funciona en development

# 3. Ejecutar en producción
npx sanity exec migrations/migrate-course-to-objects.ts --with-user-token --dataset production
npx sanity exec migrations/migrate-event-to-objects.ts --with-user-token --dataset production
# ... repetir para otros scripts
```

### Paso 11: Verificar que todo funciona

1. Abrir Sanity Studio
2. Verificar que los documentos migrados se muestran correctamente
3. Editar un documento y guardarlo
4. Verificar que el frontend muestra los datos correctamente

### Paso 12: Verificar build

```bash
# Sanity Studio
cd sanity && npm run build

# Next.js app
cd .. && npm run build
```

## Archivos a Modificar

### Esquemas Sanity
- 📝 `sanity/schemas/course.ts`
- 📝 `sanity/schemas/event.ts`
- 📝 `sanity/schemas/product.ts`
- 📝 `sanity/schemas/premiumContent.ts`
- 📝 `sanity/schemas/blogPost.ts`
- 📝 `sanity/schemas/freeContent.ts`
- 📝 `sanity/schemas/membershipPost.ts`
- 📝 `sanity/schemas/page.ts`

### Queries
- 📝 `sanity/lib/queries.ts`
- 📝 `lib/sanity/queries/events.ts`
- 📝 `lib/sanity/queries/membership.ts`
- 📝 `lib/sanity/queries/blog.ts`
- 📝 `lib/sanity/queries/freeContent.ts`

### Tipos
- 📝 `types/sanity.ts` (o equivalente)

## Archivos a Crear
- ✅ `sanity/migrations/migrate-course-to-objects.ts`
- ✅ `sanity/migrations/migrate-event-to-objects.ts`
- ✅ `sanity/migrations/migrate-product-to-objects.ts`
- ✅ `sanity/migrations/migrate-premium-content-to-objects.ts`
- ✅ `sanity/migrations/migrate-blog-post-to-objects.ts`
- ✅ `sanity/migrations/migrate-free-content-to-objects.ts`

## Criterios de Éxito
- [ ] Todos los esquemas actualizados
- [ ] Migraciones ejecutadas exitosamente
- [ ] Sanity Studio funciona correctamente
- [ ] Queries actualizadas
- [ ] Tipos TypeScript actualizados
- [ ] Frontend muestra datos correctamente
- [ ] Build completa sin errores

## Rollback
```bash
# Restaurar backup
cd sanity
npx sanity dataset import backup-YYYYMMDD.tar.gz production --replace

# Revertir cambios de código
git checkout -- sanity/schemas/
git checkout -- sanity/lib/queries.ts
git checkout -- lib/sanity/queries/
```

## Riesgo
**Alto** - Modifica estructura de datos en producción. Requiere backup y testing exhaustivo.

## Tiempo Estimado
4 horas

## Recomendaciones

1. **Ejecutar primero en development** si tienes un dataset de prueba
2. **Hacer backup antes de cada paso**
3. **Migrar un esquema a la vez**, verificando que funciona
4. **Notificar al equipo** antes de ejecutar migraciones en producción
5. **Tener tiempo de rollback** disponible por si algo falla
