import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'membershipPost',
  title: 'Publicaciones de Membresía',
  type: 'document',
  icon: () => '📝',
  description: 'Publicaciones exclusivas del hilo de membresía tipo Patreon',
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'postType',
      title: 'Tipo de Publicación',
      type: 'string',
      options: {
        list: [
          { title: '📝 Editorial / Artículo', value: 'editorial' },
          { title: '🎧 Audio', value: 'audio' },
          { title: '🎬 Video', value: 'video' },
          { title: '📚 Recurso Descargable', value: 'resource' },
          { title: '🎭 Behind the Scenes', value: 'bts' },
          { title: '📊 Encuesta', value: 'poll' },
          { title: '❓ Preguntas y Respuestas', value: 'qna' },
          { title: '📢 Anuncio', value: 'announcement' },
          { title: '🗓️ Evento Exclusivo', value: 'event' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Extracto',
      type: 'text',
      description: 'Resumen breve de la publicación (aparece en las tarjetas)',
      rows: 3,
      validation: (Rule) => Rule.max(300),
    }),
    defineField({
      name: 'content',
      title: 'Contenido',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
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
              title: 'Texto Alternativo',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Pie de Foto',
            },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Imagen Destacada',
      type: 'image',
      description: 'Imagen que aparece en la tarjeta de la publicación',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Texto Alternativo',
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
    // Campos específicos para contenido multimedia
    defineField({
      name: 'videoUrl',
      title: 'URL del Video',
      type: 'url',
      description: 'YouTube, Vimeo, u otro servicio de video',
      hidden: ({ document }) => document?.postType !== 'video',
    }),
    defineField({
      name: 'audioFile',
      title: 'Archivo de Audio',
      type: 'file',
      description: 'Archivo MP3 o similar',
      options: {
        accept: 'audio/*',
      },
      hidden: ({ document }) => document?.postType !== 'audio',
    }),
    defineField({
      name: 'duration',
      title: 'Duración',
      type: 'number',
      description: 'Duración en minutos (para videos y audios)',
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) => !['video', 'audio'].includes(String(document?.postType || '')),
    }),
    defineField({
      name: 'downloadableFiles',
      title: 'Archivos Descargables',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'title',
              title: 'Título del Archivo',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'file',
              title: 'Archivo',
              type: 'file',
            },
            {
              name: 'description',
              title: 'Descripción',
              type: 'text',
              rows: 2,
            },
          ],
        },
      ],
      hidden: ({ document }) => document?.postType !== 'resource',
    }),
    // Campos para encuestas
    defineField({
      name: 'pollOptions',
      title: 'Opciones de Encuesta',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'option',
              title: 'Opción',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
          ],
        },
      ],
      hidden: ({ document }) => document?.postType !== 'poll',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.postType === 'poll' && (!value || value.length < 2)) {
            return 'Una encuesta debe tener al menos 2 opciones'
          }
          return true
        }),
    }),
    defineField({
      name: 'pollEndsAt',
      title: 'Fecha de Finalización de Encuesta',
      type: 'datetime',
      description: 'Fecha y hora en que cierra la votación',
      hidden: ({ document }) => document?.postType !== 'poll',
    }),
    // Control de acceso
    defineField({
      name: 'requiredTier',
      title: 'Nivel de Membresía Requerido',
      type: 'reference',
      to: [{ type: 'membershipTier' }],
      validation: (Rule) => Rule.required(),
      description: 'Nivel mínimo de membresía para acceder a esta publicación',
    }),
    // Fechas
    defineField({
      name: 'publishedAt',
      title: 'Fecha de Publicación',
      type: 'datetime',
      description: 'Fecha en que se publicó o programó la publicación',
      validation: (Rule) => Rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'expirationDate',
      title: 'Fecha de Expiración',
      type: 'datetime',
      description: 'Fecha en que esta publicación dejará de estar visible (opcional)',
    }),
    // Contenido relacionado
    defineField({
      name: 'relatedPosts',
      title: 'Publicaciones Relacionadas',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'membershipPost' }] }],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'relatedPremiumContent',
      title: 'Contenido Premium Relacionado',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'premiumContent' }] }],
      validation: (Rule) => Rule.max(3),
    }),
    // Configuración
    defineField({
      name: 'pinned',
      title: 'Publicación Destacada',
      type: 'boolean',
      description: 'Mantener esta publicación al inicio del feed',
      initialValue: false,
    }),
    defineField({
      name: 'allowComments',
      title: 'Permitir Comentarios',
      type: 'boolean',
      description: 'Habilitar comentarios en esta publicación',
      initialValue: true,
    }),
    defineField({
      name: 'allowLikes',
      title: 'Permitir Likes',
      type: 'boolean',
      description: 'Habilitar likes en esta publicación',
      initialValue: true,
    }),
    // SEO
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      description: 'Optimización para motores de búsqueda',
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'text',
          rows: 3,
          validation: (Rule) => Rule.max(160),
        },
      ],
      options: {
        collapsible: true,
        collapsed: true,
      },
    }),
    // Estado
    defineField({
      name: 'published',
      title: 'Publicado',
      type: 'boolean',
      description: 'Si está desactivado, la publicación no será visible',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      postType: 'postType',
      media: 'thumbnail',
      publishedAt: 'publishedAt',
      published: 'published',
      pinned: 'pinned',
    },
    prepare(selection) {
      const { title, postType, media, publishedAt, published, pinned } = selection
      const typeLabels: Record<string, string> = {
        editorial: '📝 Artículo',
        audio: '🎧 Audio',
        video: '🎬 Video',
        resource: '📚 Recurso',
        bts: '🎭 BTS',
        poll: '📊 Encuesta',
        qna: '❓ Q&A',
        announcement: '📢 Anuncio',
        event: '🗓️ Evento',
      }
      const typeLabel = typeLabels[postType] || postType
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString('es-ES') : 'Sin fecha'
      const pinnedIcon = pinned ? '📌 ' : ''
      const status = published ? '' : '🔒 '

      return {
        title: `${pinnedIcon}${status}${title}`,
        subtitle: `${typeLabel} • ${date}`,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Destacadas primero',
      name: 'pinnedFirst',
      by: [
        { field: 'pinned', direction: 'desc' },
        { field: 'publishedAt', direction: 'desc' },
      ],
    },
    {
      title: 'Fecha de Publicación (más reciente)',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'Fecha de Publicación (más antigua)',
      name: 'publishedAtAsc',
      by: [{ field: 'publishedAt', direction: 'asc' }],
    },
    {
      title: 'Título (A-Z)',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
