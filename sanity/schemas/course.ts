import { defineType, defineField } from 'sanity'

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)

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
        slugify,
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
      type: 'coverImage',
      group: 'basic',
      description: `📐 TAMAÑO RECOMENDADO: 1200 x 630 píxeles (formato horizontal 16:9)
📦 FORMATO: JPG o PNG
📏 PESO MÁXIMO: 2 MB`,
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
    defineField({
      name: 'simpleLessonDripMode',
      title: 'Modo de liberación de la lección en este curso',
      type: 'string',
      group: 'content',
      hidden: ({ parent }) => parent?.courseType !== 'simple',
      description: 'Opcional. Si se deja vacío, se usa la configuración global de la lección.',
      options: {
        list: [
          { title: 'Inmediato (disponible al inscribirse)', value: 'immediate' },
          { title: 'Días desde inscripción', value: 'offset' },
          { title: 'Fecha fija', value: 'fixed' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'simpleLessonDripOffsetDays',
      title: 'Días desde inscripción',
      type: 'number',
      group: 'content',
      hidden: ({ parent }) =>
        parent?.courseType !== 'simple' || parent?.simpleLessonDripMode !== 'offset',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'simpleLessonAvailableAt',
      title: 'Fecha de liberación',
      type: 'datetime',
      group: 'content',
      hidden: ({ parent }) =>
        parent?.courseType !== 'simple' || parent?.simpleLessonDripMode !== 'fixed',
      description: 'Fecha propia de este curso para liberar la lección.',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),

    // Para cursos MODULARES (varios módulos)
    defineField({
      name: 'modules',
      title: 'Módulos del Curso',
      type: 'array',
      group: 'content',
      hidden: ({ parent }) => parent?.courseType !== 'modular',
      description:
        'Asigna módulos al curso y configura sus fechas de activación propias. Las referencias antiguas siguen funcionando, pero para configurar fechas por curso usa "Módulo configurado para este curso".',
      of: [
        {
          type: 'object',
          name: 'courseModuleAssignment',
          title: 'Módulo configurado para este curso',
          fields: [
            defineField({
              name: 'module',
              title: 'Módulo',
              type: 'reference',
              to: [{ type: 'courseModule' }],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'order',
              title: 'Orden en este curso',
              type: 'number',
              description: 'Opcional. Si se deja vacío, se usa el orden del módulo.',
              validation: (Rule) => Rule.min(1),
            }),
            defineField({
              name: 'customTitle',
              title: 'Título personalizado en este curso',
              type: 'string',
              description: 'Opcional. Si se deja vacío, se usa el título del módulo.',
              validation: (Rule) => Rule.max(150),
            }),
            defineField({
              name: 'customDescription',
              title: 'Descripción personalizada en este curso',
              type: 'text',
              rows: 3,
              description: 'Opcional. Si se deja vacío, se usa la descripción del módulo.',
            }),
            defineField({
              name: 'unlockDate',
              title: 'Fecha de activación del módulo en este curso',
              type: 'datetime',
              description:
                'Opcional. Esta fecha aplica solo para este curso, aunque el módulo se reutilice en otros cursos.',
              options: {
                dateFormat: 'DD/MM/YYYY',
                timeFormat: 'HH:mm',
              },
            }),
            defineField({
              name: 'lessons',
              title: 'Lecciones configuradas para este curso',
              type: 'array',
              description:
                'Opcional. Si se deja vacío, se usarán las lecciones del módulo con su configuración global. Añade lecciones aquí para configurar fechas propias en este curso.',
              of: [
                {
                  type: 'object',
                  name: 'courseLessonAssignment',
                  title: 'Lección configurada para este curso',
                  fields: [
                    defineField({
                      name: 'lesson',
                      title: 'Lección',
                      type: 'reference',
                      to: [{ type: 'courseLesson' }],
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'dripMode',
                      title: 'Modo de liberación en este curso',
                      type: 'string',
                      description:
                        'Opcional. Si se deja vacío, se usa la configuración global de la lección.',
                      options: {
                        list: [
                          { title: 'Inmediato (disponible al inscribirse)', value: 'immediate' },
                          { title: 'Días desde inscripción', value: 'offset' },
                          { title: 'Fecha fija', value: 'fixed' },
                        ],
                        layout: 'radio',
                      },
                    }),
                    defineField({
                      name: 'dripOffsetDays',
                      title: 'Días desde inscripción en este curso',
                      type: 'number',
                      hidden: ({ parent }) => parent?.dripMode !== 'offset',
                      validation: (Rule) => Rule.min(0),
                    }),
                    defineField({
                      name: 'availableAt',
                      title: 'Fecha de liberación en este curso',
                      type: 'datetime',
                      hidden: ({ parent }) => parent?.dripMode !== 'fixed',
                      options: {
                        dateFormat: 'DD/MM/YYYY',
                        timeFormat: 'HH:mm',
                      },
                    }),
                    defineField({
                      name: 'isFreePreview',
                      title: 'Vista previa gratuita en este curso',
                      type: 'boolean',
                      description:
                        'Opcional. Si se deja vacío, se usa la configuración global de la lección.',
                    }),
                    defineField({
                      name: 'published',
                      title: 'Publicada en este curso',
                      type: 'boolean',
                      description:
                        'Opcional. Si se deja vacío, se usa la configuración global de la lección.',
                    }),
                  ],
                  preview: {
                    select: {
                      title: 'lesson.title',
                      dripMode: 'dripMode',
                      availableAt: 'availableAt',
                      dripOffsetDays: 'dripOffsetDays',
                    },
                    prepare(selection) {
                      const { title, dripMode, availableAt, dripOffsetDays } = selection
                      const dripText =
                        dripMode === 'fixed'
                          ? `Fecha fija: ${availableAt || 'sin fecha'}`
                          : dripMode === 'offset'
                            ? `${dripOffsetDays ?? 0} días desde inscripción`
                            : dripMode === 'immediate'
                              ? 'Inmediata'
                              : 'Usa configuración global'

                      return {
                        title: title || 'Lección sin seleccionar',
                        subtitle: dripText,
                      }
                    },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: {
              title: 'module.title',
              customTitle: 'customTitle',
              lessons: 'lessons',
              unlockDate: 'unlockDate',
            },
            prepare(selection) {
              const { title, customTitle, lessons, unlockDate } = selection
              const lessonCount = lessons?.length || 0
              const lockText = unlockDate ? ` · activa: ${unlockDate}` : ''

              return {
                title: customTitle || title || 'Módulo sin seleccionar',
                subtitle: `${lessonCount ? `${lessonCount} lecciones configuradas` : 'Usa lecciones del módulo'}${lockText}`,
              }
            },
          },
        },
        {
          type: 'reference',
          title: 'Referencia de módulo (legacy)',
          to: [{ type: 'courseModule' }],
        },
      ],
    }),

    // --- Drip Content (Liberación Programada) ---
    defineField({
      name: 'dripEnabled',
      title: '📅 Liberación Programada',
      type: 'boolean',
      group: 'content',
      description: 'Activar liberación programada de lecciones (drip content)',
      initialValue: false,
    }),
    defineField({
      name: 'defaultDripDays',
      title: 'Días entre lecciones',
      type: 'number',
      group: 'content',
      description:
        'Días entre liberación de cada lección (ej: 7 = lección 1 día 0, lección 2 día 7, lección 3 día 14...)',
      hidden: ({ parent }) => !parent?.dripEnabled,
      validation: (Rule) => Rule.min(1),
    }),

    // --- Evaluación y Certificación ---
    defineField({
      name: 'finalQuiz',
      title: '📝 Examen Final',
      type: 'reference',
      group: 'content',
      to: [{ type: 'quiz' }],
      description: 'Quiz final que el estudiante debe aprobar para obtener el certificado',
    }),
    defineField({
      name: 'certificate',
      title: '🏆 Certificado',
      type: 'reference',
      group: 'content',
      to: [{ type: 'certificate' }],
      description: 'Plantilla de certificado para este curso',
    }),
    defineField({
      name: 'requiresFinalQuizToComplete',
      title: 'Requiere Examen Final',
      type: 'boolean',
      group: 'content',
      description: 'Si está activo, el estudiante debe aprobar el examen final para obtener el certificado',
      initialValue: true,
      hidden: ({ parent }) => !parent?.finalQuiz,
    }),

    // ============================================
    // GRUPO: Precios (usando objeto reutilizable)
    // ============================================
    defineField({
      name: 'pricing',
      title: 'Precios',
      type: 'pricing',
      group: 'pricing',
      validation: (Rule) =>
        Rule.custom((pricing, context) => {
          const document = context.document as {
            published?: boolean
            status?: string
            visibility?: string
            price?: number
          }

          const isCatalogCourse =
            document?.published === true &&
            document?.status === 'active' &&
            (document?.visibility ?? 'public') === 'public'

          if (!isCatalogCourse) {
            return true
          }

          const price = (pricing as { price?: number; isFree?: boolean } | undefined)?.price
          const isFree = (pricing as { isFree?: boolean } | undefined)?.isFree === true
          const legacyPrice = document?.price

          if (!isFree && !(price && price > 0) && !(legacyPrice && legacyPrice > 0)) {
            return 'Para aparecer en Academia, marca el curso como gratuito o añade un precio mayor que 0.'
          }

          return true
        }),
    }),

    // --- Campos legacy (ocultos, para compatibilidad) ---
    defineField({
      name: 'price',
      title: 'Precio en Pesos (COP) [LEGACY]',
      type: 'number',
      group: 'pricing',
      hidden: true,
      deprecated: { reason: 'Usar el campo pricing en su lugar' },
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio en Dólares (USD) [LEGACY]',
      type: 'number',
      group: 'pricing',
      hidden: true,
      deprecated: { reason: 'Usar el campo pricing en su lugar' },
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Precio Anterior COP (Tachado) [LEGACY]',
      type: 'number',
      group: 'pricing',
      hidden: true,
      deprecated: { reason: 'Usar el campo pricing en su lugar' },
    }),
    defineField({
      name: 'compareAtPriceUSD',
      title: 'Precio Anterior USD (Tachado) [LEGACY]',
      type: 'number',
      group: 'pricing',
      hidden: true,
      deprecated: { reason: 'Usar el campo pricing en su lugar' },
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
    defineField({
      name: 'visibility',
      title: 'Visibilidad en Academia',
      type: 'string',
      group: 'basic',
      description:
        'Público aparece en el catálogo y se puede comprar. Privado solo aparece a usuarios con acceso asignado.',
      options: {
        list: [
          { title: '🌐 Público (visible y comprable)', value: 'public' },
          { title: '🔒 Privado (solo usuarios asignados)', value: 'private' },
        ],
        layout: 'radio',
      },
      initialValue: 'public',
      validation: (Rule) => Rule.required(),
    }),

    // ============================================
    // GRUPO: Membresía (usando objeto reutilizable)
    // ============================================
    defineField({
      name: 'membershipAccess',
      title: 'Acceso por Membresía',
      type: 'membershipAccess',
      group: 'membership',
    }),

    // --- Campos legacy (ocultos, para compatibilidad) ---
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en la Membresía? [LEGACY]',
      type: 'boolean',
      group: 'membership',
      hidden: true,
      deprecated: { reason: 'Usar el campo membershipAccess en su lugar' },
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía [LEGACY]',
      type: 'array',
      group: 'membership',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: true,
      deprecated: { reason: 'Usar el campo membershipAccess en su lugar' },
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%) [LEGACY]',
      type: 'number',
      group: 'membership',
      hidden: true,
      deprecated: { reason: 'Usar el campo pricing.memberDiscount en su lugar' },
    }),

    // ============================================
    // GRUPO: SEO (usando objeto reutilizable)
    // ============================================
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      courseType: 'courseType',
      status: 'status',
      featured: 'featured',
      published: 'published',
      price: 'pricing.price',
      legacyPrice: 'price',
      media: 'coverImage',
    },
    prepare(selection) {
      const { title, courseType, status, featured, published, price, legacyPrice } = selection

      const statusEmoji: Record<string, string> = {
        draft: '📝',
        coming_soon: '🔜',
        active: '✅',
        archived: '📦',
      }

      const typeLabel = courseType === 'simple' ? '📖 Simple' : '📚 Modular'
      const displayPrice = price || legacyPrice
      const priceText = displayPrice ? `$${displayPrice.toLocaleString('es-CO')} COP` : 'Sin precio'

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
      by: [{ field: 'pricing.price', direction: 'asc' }],
    },
  ],
})
