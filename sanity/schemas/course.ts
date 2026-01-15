import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'course',
  title: 'Cursos',
  type: 'document',
  icon: () => '🎓',

  groups: [
    { name: 'basic', title: 'Información Básica', default: true },
    { name: 'content', title: 'Contenido del Curso' },
    { name: 'pricing', title: 'Precios' },
    { name: 'details', title: 'Detalles' },
    { name: 'membership', title: 'Membresía' },
    { name: 'seo', title: 'SEO (Opcional)' },
  ],

  fields: [
    // ============================================
    // GRUPO: Información Básica
    // ============================================
    defineField({
      name: 'title',
      title: 'Título del Curso',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: 'slug',
      title: 'URL del Curso',
      type: 'slug',
      group: 'basic',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Descripción Corta',
      type: 'text',
      group: 'basic',
      rows: 3,
      description: 'Resumen breve que aparecerá en las tarjetas del catálogo (máx. 200 caracteres)',
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'description',
      title: 'Descripción Completa',
      type: 'array',
      group: 'basic',
      description: 'Descripción detallada del curso',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Título', value: 'h2' },
            { title: 'Subtítulo', value: 'h3' },
            { title: 'Cita', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Imagen de Portada',
      type: 'image',
      group: 'basic',
      description: `📐 TAMAÑO RECOMENDADO: 1200 x 630 píxeles (formato horizontal 16:9)
📦 FORMATO: JPG o PNG
📏 PESO MÁXIMO: 2 MB`,
      options: {
        hotspot: true,
        accept: 'image/jpeg,image/png,image/webp',
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Descripción de la imagen',
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'previewVideoUrl',
      title: 'Video de Presentación (Opcional)',
      type: 'url',
      group: 'basic',
      description: 'URL de YouTube de un video gratuito que presenta el curso',
    }),

    // ============================================
    // GRUPO: Contenido del Curso
    // ============================================
    defineField({
      name: 'courseType',
      title: 'Tipo de Curso',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: '📖 Simple (una sola lección)', value: 'simple' },
          { title: '📚 Modular (varios módulos con lecciones)', value: 'modular' },
        ],
        layout: 'radio',
      },
      initialValue: 'modular',
      validation: (Rule) => Rule.required(),
    }),

    // Para cursos SIMPLES (una sola lección)
    defineField({
      name: 'simpleLesson',
      title: 'Lección',
      type: 'reference',
      group: 'content',
      to: [{ type: 'courseLesson' }],
      hidden: ({ parent }) => parent?.courseType !== 'simple',
      description: 'Selecciona la única lección de este curso',
    }),

    // Para cursos MODULARES (varios módulos)
    defineField({
      name: 'modules',
      title: 'Módulos del Curso',
      type: 'array',
      group: 'content',
      hidden: ({ parent }) => parent?.courseType !== 'modular',
      description: 'Arrastra para reordenar los módulos',
      of: [
        {
          type: 'reference',
          to: [{ type: 'courseModule' }],
        },
      ],
    }),

    // ============================================
    // GRUPO: Precios
    // ============================================
    defineField({
      name: 'price',
      title: 'Precio en Pesos (COP)',
      type: 'number',
      group: 'pricing',
      description: 'Precio para pagos en Colombia. Ej: 297000',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio en Dólares (USD)',
      type: 'number',
      group: 'pricing',
      description: 'Precio para pagos internacionales. Ej: 97',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Precio Anterior COP (Tachado)',
      type: 'number',
      group: 'pricing',
      description: 'Opcional - Precio original antes del descuento (aparecerá tachado)',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPriceUSD',
      title: 'Precio Anterior USD (Tachado)',
      type: 'number',
      group: 'pricing',
      description: 'Opcional - Precio original en USD antes del descuento',
      validation: (Rule) => Rule.min(0),
    }),

    // ============================================
    // GRUPO: Detalles
    // ============================================
    defineField({
      name: 'instructor',
      title: 'Instructor/a',
      type: 'string',
      group: 'details',
      initialValue: 'Aleyda',
    }),
    defineField({
      name: 'totalDuration',
      title: 'Duración Total (minutos)',
      type: 'number',
      group: 'details',
      description: 'Duración aproximada de todo el curso en minutos. Ej: 180 para 3 horas',
    }),
    defineField({
      name: 'difficulty',
      title: 'Nivel de Dificultad',
      type: 'string',
      group: 'details',
      options: {
        list: [
          { title: '🌱 Principiante', value: 'beginner' },
          { title: '🌿 Intermedio', value: 'intermediate' },
          { title: '🌳 Avanzado', value: 'advanced' },
        ],
        layout: 'radio',
      },
      initialValue: 'beginner',
    }),
    defineField({
      name: 'topics',
      title: 'Temas/Categorías',
      type: 'array',
      group: 'details',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Meditación', value: 'meditacion' },
          { title: 'Canalización', value: 'canalizacion' },
          { title: 'Sanación', value: 'sanacion' },
          { title: 'Desarrollo Personal', value: 'desarrollo_personal' },
          { title: 'Espiritualidad', value: 'espiritualidad' },
          { title: 'Registros Akáshicos', value: 'registros_akashicos' },
          { title: 'Cristales', value: 'cristales' },
          { title: 'Abundancia', value: 'abundancia' },
          { title: 'Relaciones', value: 'relaciones' },
        ],
      },
    }),
    defineField({
      name: 'whatYouWillLearn',
      title: '¿Qué Aprenderás?',
      type: 'array',
      group: 'details',
      description: 'Lista de puntos clave que aprenderán (aparecerán con checkmarks)',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: 'requirements',
      title: 'Requisitos Previos',
      type: 'array',
      group: 'details',
      description: 'Opcional - Qué necesitan saber o tener antes de tomar este curso',
      of: [{ type: 'string' }],
    }),

    // ============================================
    // GRUPO: Estado y Visibilidad
    // ============================================
    defineField({
      name: 'status',
      title: 'Estado del Curso',
      type: 'string',
      group: 'basic',
      options: {
        list: [
          { title: '📝 Borrador', value: 'draft' },
          { title: '🔜 Próximamente', value: 'coming_soon' },
          { title: '✅ Activo', value: 'active' },
          { title: '📦 Archivado', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: '⭐ Curso Destacado',
      type: 'boolean',
      group: 'basic',
      description: 'Mostrar en la página principal y en posición destacada',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Orden de Visualización',
      type: 'number',
      group: 'basic',
      description: 'Número menor aparece primero en el catálogo',
      initialValue: 0,
    }),
    defineField({
      name: 'published',
      title: '✅ Publicado',
      type: 'boolean',
      group: 'basic',
      description: 'Solo los cursos publicados serán visibles en la web',
      initialValue: false,
    }),

    // ============================================
    // GRUPO: Membresía
    // ============================================
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en la Membresía?',
      type: 'boolean',
      group: 'membership',
      description: 'Los miembros pueden acceder sin pagar extra',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía',
      type: 'array',
      group: 'membership',
      description: 'Qué niveles de membresía tienen acceso a este curso',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: ({ parent }) => !parent?.includedInMembership,
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      type: 'number',
      group: 'membership',
      description: 'Porcentaje de descuento para miembros (ej: 20 = 20%)',
      validation: (Rule) => Rule.min(0).max(100),
      hidden: ({ parent }) => parent?.includedInMembership,
    }),

    // ============================================
    // GRUPO: SEO
    // ============================================
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      group: 'seo',
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        {
          name: 'metaTitle',
          title: 'Título para Google',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Descripción para Google',
          type: 'text',
          rows: 2,
          validation: (Rule) => Rule.max(160),
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      courseType: 'courseType',
      status: 'status',
      featured: 'featured',
      published: 'published',
      price: 'price',
      media: 'coverImage',
    },
    prepare(selection) {
      const { title, courseType, status, featured, published, price } = selection

      const statusEmoji: Record<string, string> = {
        draft: '📝',
        coming_soon: '🔜',
        active: '✅',
        archived: '📦',
      }

      const typeLabel = courseType === 'simple' ? '📖 Simple' : '📚 Modular'
      const priceText = price ? `$${price.toLocaleString('es-CO')} COP` : 'Sin precio'

      let prefix = ''
      if (!published) prefix += '🔒 '
      if (featured) prefix += '⭐ '

      return {
        title: `${prefix}${statusEmoji[status] || ''} ${title}`,
        subtitle: `${typeLabel} · ${priceText}`,
        media: selection.media,
      }
    },
  },

  orderings: [
    {
      title: 'Orden de visualización',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
    {
      title: 'Título A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
    {
      title: 'Precio (menor a mayor)',
      name: 'priceAsc',
      by: [{ field: 'price', direction: 'asc' }],
    },
  ],
})
