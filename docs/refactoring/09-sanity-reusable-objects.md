# Plan 09: Crear Objetos Reutilizables en Sanity

## Objetivo
Crear objetos reutilizables en Sanity para campos que se repiten en múltiples esquemas (SEO, precios, acceso por membresía, imagen de portada).

## Contexto
Los siguientes campos están duplicados en 7-14 esquemas:
- SEO (metaTitle, metaDescription) - 14 esquemas
- Precios (price, priceUSD, memberDiscount, compareAtPrice) - 7 esquemas
- Acceso por membresía (includedInMembership, membershipTiers) - 7 esquemas
- Imagen de portada (mainImage/coverImage con hotspot y alt) - 9 esquemas

## Pasos de Implementación

### Paso 1: Crear carpeta para objetos

```bash
mkdir -p sanity/schemas/objects
```

### Paso 2: Crear objeto SEO

Crear `sanity/schemas/objects/seo.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Título',
      type: 'string',
      description: 'Título para buscadores (máx. 60 caracteres)',
      validation: (Rule) =>
        Rule.max(60).warning('El título no debe exceder 60 caracteres'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Descripción',
      type: 'text',
      rows: 3,
      description: 'Descripción para buscadores (máx. 160 caracteres)',
      validation: (Rule) =>
        Rule.max(160).warning('La descripción no debe exceder 160 caracteres'),
    }),
    defineField({
      name: 'ogImage',
      title: 'Imagen para Redes Sociales',
      type: 'image',
      description: 'Imagen que aparece al compartir en redes (1200x630px recomendado)',
      options: {
        hotspot: true,
      },
    }),
  ],
  options: {
    collapsible: true,
    collapsed: true,
  },
})
```

### Paso 3: Crear objeto Pricing

Crear `sanity/schemas/objects/pricing.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'pricing',
  title: 'Precios',
  type: 'object',
  fields: [
    defineField({
      name: 'price',
      title: 'Precio en Pesos (COP)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio en Dólares (USD)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Precio Anterior COP',
      type: 'number',
      description: 'Mostrar precio tachado para indicar descuento',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPriceUSD',
      title: 'Precio Anterior USD',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      type: 'number',
      description: 'Porcentaje de descuento para miembros (0-100)',
      validation: (Rule) => Rule.min(0).max(100),
      initialValue: 0,
    }),
    defineField({
      name: 'isFree',
      title: '¿Es Gratuito?',
      type: 'boolean',
      description: 'Marcar si el contenido es gratuito',
      initialValue: false,
    }),
  ],
  options: {
    collapsible: true,
    collapsed: false,
  },
})
```

### Paso 4: Crear objeto MembershipAccess

Crear `sanity/schemas/objects/membershipAccess.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'object',
  description: 'Configuración de acceso para miembros',
  fields: [
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en Membresía?',
      type: 'boolean',
      description: 'Los miembros pueden acceder sin pago adicional',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía con Acceso',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'membershipTier' }],
        },
      ],
      description: 'Selecciona los niveles de membresía que tienen acceso',
      hidden: ({ parent }) => !parent?.includedInMembership,
    }),
    defineField({
      name: 'memberOnlyPurchase',
      title: '¿Solo Miembros Pueden Comprar?',
      type: 'boolean',
      description: 'Solo los miembros pueden adquirir este producto (aunque no sea gratis para ellos)',
      initialValue: false,
    }),
  ],
  options: {
    collapsible: true,
    collapsed: true,
  },
})
```

### Paso 5: Crear objeto CoverImage

Crear `sanity/schemas/objects/coverImage.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'coverImage',
  title: 'Imagen de Portada',
  type: 'image',
  options: {
    hotspot: true,
  },
  fields: [
    defineField({
      name: 'alt',
      title: 'Texto Alternativo',
      type: 'string',
      description: 'Descripción de la imagen para accesibilidad y SEO',
      validation: (Rule) =>
        Rule.custom((alt, context) => {
          // @ts-ignore
          if (context.parent?.asset && !alt) {
            return 'El texto alternativo es requerido cuando hay una imagen'
          }
          return true
        }),
    }),
    defineField({
      name: 'caption',
      title: 'Leyenda',
      type: 'string',
      description: 'Leyenda opcional para mostrar debajo de la imagen',
    }),
  ],
  preview: {
    select: {
      imageUrl: 'asset.url',
      alt: 'alt',
    },
    prepare({ alt }) {
      return {
        title: alt || 'Sin texto alternativo',
      }
    },
  },
})
```

### Paso 6: Crear objeto VideoEmbed

Crear `sanity/schemas/objects/videoEmbed.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'videoEmbed',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({
      name: 'videoType',
      title: 'Tipo de Video',
      type: 'string',
      options: {
        list: [
          { title: 'YouTube', value: 'youtube' },
          { title: 'Vimeo', value: 'vimeo' },
          { title: 'URL Directa', value: 'direct' },
        ],
        layout: 'radio',
      },
      initialValue: 'youtube',
    }),
    defineField({
      name: 'url',
      title: 'URL del Video',
      type: 'url',
      description: 'URL completa del video',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Duración (minutos)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Miniatura Personalizada',
      type: 'image',
      description: 'Opcional: usar en lugar de la miniatura automática',
      options: {
        hotspot: true,
      },
    }),
  ],
  options: {
    collapsible: true,
    collapsed: false,
  },
})
```

### Paso 7: Crear objeto DisplaySettings

Crear `sanity/schemas/objects/displaySettings.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'displaySettings',
  title: 'Configuración de Visualización',
  type: 'object',
  fields: [
    defineField({
      name: 'published',
      title: '¿Publicado?',
      type: 'boolean',
      description: 'El contenido es visible públicamente',
      initialValue: false,
    }),
    defineField({
      name: 'featured',
      title: '⭐ Destacado',
      type: 'boolean',
      description: 'Mostrar en secciones destacadas',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Orden de Visualización',
      type: 'number',
      description: 'Número menor = aparece primero',
      initialValue: 0,
    }),
    defineField({
      name: 'publishedAt',
      title: 'Fecha de Publicación',
      type: 'datetime',
      description: 'Fecha en que se publicó o se publicará',
    }),
  ],
  options: {
    collapsible: true,
    collapsed: true,
  },
})
```

### Paso 8: Registrar objetos en index.ts

Actualizar `sanity/schemas/index.ts`:

```typescript
// Objetos reutilizables
import seo from './objects/seo'
import pricing from './objects/pricing'
import membershipAccess from './objects/membershipAccess'
import coverImage from './objects/coverImage'
import videoEmbed from './objects/videoEmbed'
import displaySettings from './objects/displaySettings'

// ... otros imports existentes

export const schemaTypes = [
  // Objetos reutilizables (deben ir primero)
  seo,
  pricing,
  membershipAccess,
  coverImage,
  videoEmbed,
  displaySettings,

  // Sesiones (configuración unificada)
  sessionConfig,

  // Eventos
  event,

  // ... resto de esquemas
]
```

### Paso 9: Verificar que Sanity Studio compila

```bash
cd sanity && npm run build
```

### Paso 10: Verificar que los objetos aparecen

Iniciar Sanity Studio y verificar que los nuevos tipos de objetos están disponibles:

```bash
cd sanity && npm run dev
```

## Archivos a Crear
- ✅ `sanity/schemas/objects/seo.ts`
- ✅ `sanity/schemas/objects/pricing.ts`
- ✅ `sanity/schemas/objects/membershipAccess.ts`
- ✅ `sanity/schemas/objects/coverImage.ts`
- ✅ `sanity/schemas/objects/videoEmbed.ts`
- ✅ `sanity/schemas/objects/displaySettings.ts`

## Archivos a Modificar
- 📝 `sanity/schemas/index.ts` - Agregar imports y registrar objetos

## Archivos que NO se modifican (aún)
- Los esquemas existentes se migrarán en el Plan 10

## Criterios de Éxito
- [ ] Todos los archivos de objetos creados
- [ ] Objetos registrados en index.ts
- [ ] Sanity Studio compila sin errores
- [ ] Los objetos están disponibles como tipos

## Rollback
```bash
rm -rf sanity/schemas/objects/
# Revertir cambios en index.ts
git checkout -- sanity/schemas/index.ts
```

## Riesgo
**Bajo** - Solo se crean nuevos tipos, no se modifican existentes.

## Tiempo Estimado
1 hora

## Siguiente Paso
- Plan 10: Migrar esquemas para usar objetos reutilizables
