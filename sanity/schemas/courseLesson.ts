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
  name: 'courseLesson',
  title: 'Lecciones de Curso',
  type: 'document',
  icon: () => '📚',

  groups: [
    { name: 'basic', title: 'Información Básica', default: true },
    { name: 'content', title: 'Contenido' },
    { name: 'resources', title: 'Recursos Adjuntos' },
    { name: 'settings', title: 'Configuración' },
  ],

  fields: [
    // ============================================
    // GRUPO: Información Básica
    // ============================================
    defineField({
      name: 'title',
      title: 'Título de la Lección',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: 'slug',
      title: 'URL de la Lección',
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
      name: 'description',
      title: 'Descripción Breve',
      type: 'text',
      group: 'basic',
      rows: 3,
      description: 'Resumen de lo que se aprenderá en esta lección',
    }),
    defineField({
      name: 'order',
      title: 'Orden',
      type: 'number',
      group: 'basic',
      description: 'Posición dentro del módulo (1 = primera lección)',
      initialValue: 1,
      validation: (Rule) => Rule.required().min(1),
    }),

    // ============================================
    // GRUPO: Contenido
    // ============================================
    defineField({
      name: 'lessonType',
      title: 'Tipo de Lección',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: '🎥 Video (YouTube)', value: 'video' },
          { title: '🔴 Sesión en Vivo (Zoom)', value: 'live' },
          { title: '📝 Texto/Artículo', value: 'text' },
        ],
        layout: 'radio',
      },
      initialValue: 'video',
      validation: (Rule) => Rule.required(),
    }),

    // --- Campos para VIDEO ---
    defineField({
      name: 'videoUrl',
      title: 'URL del Video (YouTube)',
      type: 'url',
      group: 'content',
      description: 'Pega la URL completa del video de YouTube (puede ser oculto/unlisted)',
      hidden: ({ parent }) => parent?.lessonType !== 'video',
      validation: (Rule) =>
        Rule.custom((url, context) => {
          const parent = context.parent as { lessonType?: string }
          if (parent?.lessonType === 'video' && !url) {
            return 'La URL del video es obligatoria'
          }
          return true
        }),
    }),
    defineField({
      name: 'videoDuration',
      title: 'Duración del Video (minutos)',
      type: 'number',
      group: 'content',
      description: 'Duración aproximada en minutos',
      hidden: ({ parent }) => parent?.lessonType !== 'video',
      validation: (Rule) => Rule.min(1).max(300),
    }),

    // --- Campos para SESIÓN EN VIVO ---
    defineField({
      name: 'liveSession',
      title: 'Información de la Sesión en Vivo',
      type: 'object',
      group: 'content',
      hidden: ({ parent }) => parent?.lessonType !== 'live',
      fields: [
        {
          name: 'scheduledAt',
          title: 'Fecha y Hora Programada',
          type: 'datetime',
          options: {
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            timeStep: 15,
          },
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'zoomUrl',
          title: 'Link de Zoom',
          type: 'url',
          description: 'Se enviará a los estudiantes que tengan acceso',
        },
        {
          name: 'zoomMeetingId',
          title: 'ID de la Reunión',
          type: 'string',
        },
        {
          name: 'zoomPassword',
          title: 'Contraseña de Zoom',
          type: 'string',
        },
        {
          name: 'recordingUrl',
          title: 'Grabación (YouTube)',
          type: 'url',
          description: 'Después del evento, sube la grabación a YouTube y pega el link aquí. Esto reemplazará la sesión en vivo.',
        },
        {
          name: 'estimatedDuration',
          title: 'Duración Estimada (minutos)',
          type: 'number',
          validation: (Rule) => Rule.min(15).max(300),
        },
      ],
    }),

    // --- Campos para TEXTO ---
    defineField({
      name: 'content',
      title: 'Contenido de Texto',
      type: 'array',
      group: 'content',
      hidden: ({ parent }) => parent?.lessonType !== 'text',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Título', value: 'h2' },
            { title: 'Subtítulo', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Cita', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numerada', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
              { title: 'Código', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Enlace',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Texto alternativo',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Pie de imagen',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'submodules',
      title: 'Submódulos de la Lección',
      type: 'array',
      group: 'content',
      description:
        'Organiza la lección en bloques: texto, videos, audios, imágenes o recursos, en el orden en que deben mostrarse.',
      of: [
        {
          type: 'object',
          name: 'lessonSubmodule',
          title: 'Submódulo',
          fields: [
            defineField({
              name: 'title',
              title: 'Título del Submódulo',
              type: 'string',
              validation: (Rule) => Rule.required().max(150),
            }),
            defineField({
              name: 'description',
              title: 'Descripción del Submódulo',
              type: 'text',
              rows: 2,
            }),
            defineField({
              name: 'blocks',
              title: 'Bloques de Contenido',
              type: 'array',
              validation: (Rule) =>
                Rule.required().min(1).error('Añade al menos un bloque al submódulo'),
              of: [
                {
                  type: 'object',
                  name: 'lessonContentBlock',
                  title: 'Bloque',
                  fields: [
                    defineField({
                      name: 'blockType',
                      title: 'Tipo de Bloque',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Texto', value: 'text' },
                          { title: 'Video', value: 'video' },
                          { title: 'Audio', value: 'audio' },
                          { title: 'Imagen', value: 'image' },
                          { title: 'Recurso/Descarga', value: 'resource' },
                        ],
                        layout: 'radio',
                      },
                      initialValue: 'text',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'title',
                      title: 'Título del Bloque',
                      type: 'string',
                      validation: (Rule) => Rule.max(150),
                    }),
                    defineField({
                      name: 'text',
                      title: 'Texto',
                      type: 'array',
                      hidden: ({ parent }) => parent?.blockType !== 'text',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            { title: 'Normal', value: 'normal' },
                            { title: 'Título', value: 'h2' },
                            { title: 'Subtítulo', value: 'h3' },
                            { title: 'H4', value: 'h4' },
                            { title: 'Cita', value: 'blockquote' },
                          ],
                          lists: [
                            { title: 'Bullet', value: 'bullet' },
                            { title: 'Numerada', value: 'number' },
                          ],
                          marks: {
                            decorators: [
                              { title: 'Negrita', value: 'strong' },
                              { title: 'Cursiva', value: 'em' },
                              { title: 'Código', value: 'code' },
                            ],
                            annotations: [
                              {
                                name: 'link',
                                type: 'object',
                                title: 'Enlace',
                                fields: [{ name: 'href', type: 'url', title: 'URL' }],
                              },
                            ],
                          },
                        },
                        {
                          type: 'image',
                          options: { hotspot: true },
                          fields: [
                            { name: 'alt', type: 'string', title: 'Texto alternativo' },
                            { name: 'caption', type: 'string', title: 'Pie de imagen' },
                          ],
                        },
                      ],
                    }),
                    defineField({
                      name: 'videoUrl',
                      title: 'URL del Video',
                      type: 'url',
                      description: 'YouTube, Vimeo o archivo de video externo',
                      hidden: ({ parent }) => parent?.blockType !== 'video',
                    }),
                    defineField({
                      name: 'audioFile',
                      title: 'Archivo de Audio',
                      type: 'file',
                      options: { accept: '.mp3,.wav,.m4a,.aac,.ogg,audio/*' },
                      hidden: ({ parent }) => parent?.blockType !== 'audio',
                    }),
                    defineField({
                      name: 'image',
                      title: 'Imagen',
                      type: 'image',
                      options: { hotspot: true, accept: 'image/*' },
                      hidden: ({ parent }) => parent?.blockType !== 'image',
                      fields: [
                        { name: 'alt', type: 'string', title: 'Texto alternativo' },
                      ],
                    }),
                    defineField({
                      name: 'resource',
                      title: 'Recurso',
                      type: 'courseResource',
                      hidden: ({ parent }) => parent?.blockType !== 'resource',
                    }),
                    defineField({
                      name: 'caption',
                      title: 'Pie o nota',
                      type: 'text',
                      rows: 2,
                      hidden: ({ parent }) =>
                        !['video', 'audio', 'image'].includes(parent?.blockType),
                    }),
                  ],
                  preview: {
                    select: {
                      title: 'title',
                      blockType: 'blockType',
                    },
                    prepare(selection) {
                      const icons: Record<string, string> = {
                        text: '📝',
                        video: '🎥',
                        audio: '🎧',
                        image: '🖼️',
                        resource: '📎',
                      }

                      return {
                        title: `${icons[selection.blockType] || '📌'} ${selection.title || 'Bloque sin título'}`,
                      }
                    },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: {
              title: 'title',
              blocks: 'blocks',
            },
            prepare(selection) {
              const count = selection.blocks?.length || 0
              return {
                title: selection.title,
                subtitle: `${count} ${count === 1 ? 'bloque' : 'bloques'}`,
              }
            },
          },
        },
      ],
    }),

    // ============================================
    // GRUPO: Recursos Adjuntos
    // ============================================
    defineField({
      name: 'resources',
      title: 'Recursos Adjuntos',
      type: 'array',
      group: 'resources',
      description: 'PDFs, audios, presentaciones, enlaces, etc.',
      of: [{ type: 'courseResource' }],
    }),

    // ============================================
    // GRUPO: Configuración
    // ============================================
    defineField({
      name: 'isFreePreview',
      title: '👀 Vista Previa Gratuita',
      type: 'boolean',
      group: 'settings',
      description: 'Permitir ver esta lección sin haber comprado el curso',
      initialValue: false,
    }),
    defineField({
      name: 'published',
      title: '✅ Publicada',
      type: 'boolean',
      group: 'settings',
      description: 'Solo las lecciones publicadas serán visibles',
      initialValue: true,
    }),

    // --- Drip Content (Liberación Programada) ---
    defineField({
      name: 'dripMode',
      title: '📅 Modo de Liberación',
      type: 'string',
      group: 'settings',
      description: 'Controla cuándo se libera esta lección para los estudiantes',
      options: {
        list: [
          { title: 'Inmediato (disponible al inscribirse)', value: 'immediate' },
          { title: 'Días desde inscripción', value: 'offset' },
          { title: 'Fecha fija', value: 'fixed' },
        ],
        layout: 'radio',
      },
      initialValue: 'immediate',
    }),
    defineField({
      name: 'dripOffsetDays',
      title: 'Días desde inscripción',
      type: 'number',
      group: 'settings',
      description: 'Días después de la inscripción para liberar esta lección',
      hidden: ({ parent }) => parent?.dripMode !== 'offset',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'availableAt',
      title: 'Fecha de liberación',
      type: 'datetime',
      group: 'settings',
      description: 'Fecha fija en la que se libera esta lección',
      hidden: ({ parent }) => parent?.dripMode !== 'fixed',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),

    // --- Quiz de la Lección ---
    defineField({
      name: 'quiz',
      title: '📝 Quiz de la Lección',
      type: 'reference',
      group: 'settings',
      to: [{ type: 'quiz' }],
      description: 'Quiz opcional que el estudiante debe aprobar para completar esta lección',
    }),
    defineField({
      name: 'requiresQuizToComplete',
      title: 'Requiere Quiz para Completar',
      type: 'boolean',
      group: 'settings',
      description: 'Si está activo, el estudiante debe aprobar el quiz para marcar la lección como completada',
      initialValue: false,
      hidden: ({ parent }) => !parent?.quiz,
    }),
  ],

  preview: {
    select: {
      title: 'title',
      order: 'order',
      lessonType: 'lessonType',
      isFreePreview: 'isFreePreview',
      published: 'published',
      videoDuration: 'videoDuration',
      liveDuration: 'liveSession.estimatedDuration',
    },
    prepare(selection) {
      const { title, order, lessonType, isFreePreview, published, videoDuration, liveDuration } = selection

      const typeIcons: Record<string, string> = {
        video: '🎥',
        live: '🔴',
        text: '📝',
      }

      const duration = videoDuration || liveDuration
      const durationText = duration ? `${duration} min` : ''

      let prefix = ''
      if (!published) prefix += '📝 '
      if (isFreePreview) prefix += '👀 '

      return {
        title: `${prefix}${order}. ${title}`,
        subtitle: `${typeIcons[lessonType] || ''} ${lessonType === 'video' ? 'Video' : lessonType === 'live' ? 'En Vivo' : 'Texto'} ${durationText ? `· ${durationText}` : ''}`,
      }
    },
  },

  orderings: [
    {
      title: 'Orden',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
})
