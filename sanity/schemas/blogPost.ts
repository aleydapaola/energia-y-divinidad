import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'blogPost',
  title: 'Artículos del Blog',
  type: 'document',
  icon: () => '📝',
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (Rule) => Rule.required(),
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
      name: 'author',
      title: 'Autor',
      type: 'object',
      fields: [
        {
          name: 'name',
          title: 'Nombre',
          type: 'string',
          initialValue: 'Aleyda Vargas',
        },
        {
          name: 'bio',
          title: 'Biografía Corta',
          type: 'text',
        },
        {
          name: 'image',
          title: 'Foto del Autor',
          type: 'image',
        },
      ],
    }),
    defineField({
      name: 'excerpt',
      title: 'Extracto',
      type: 'text',
      rows: 3,
      description: 'Resumen breve que aparece en listados',
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'mainImage',
      title: 'Imagen Principal',
      type: 'coverImage',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categories',
      title: 'Categorías',
      type: 'array',
      of: [
        {
          type: 'string',
        },
      ],
      options: {
        list: [
          { title: 'Canalización', value: 'canalizacion' },
          { title: 'Chamanismo', value: 'chamanismo' },
          { title: 'Espiritualidad', value: 'espiritualidad' },
          { title: 'Energía', value: 'energia' },
          { title: 'Sanación', value: 'sanacion' },
          { title: 'Meditación', value: 'meditacion' },
          { title: 'Registros Akáshicos', value: 'registros-akashicos' },
          { title: 'Desarrollo Personal', value: 'desarrollo-personal' },
          { title: 'Testimonios', value: 'testimonios' },
          { title: 'Noticias', value: 'noticias' },
        ],
      },
      validation: (Rule) => Rule.min(1).max(3),
    }),
    defineField({
      name: 'tags',
      title: 'Etiquetas',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
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
            { title: 'H4', value: 'h4' },
            { title: 'Cita', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numerada', value: 'number' },
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
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Texto Alternativo',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Pie de Imagen',
            },
          ],
        },
        {
          type: 'object',
          name: 'callout',
          title: 'Llamado de Atención',
          icon: () => '💡',
          fields: [
            {
              name: 'type',
              title: 'Tipo',
              type: 'string',
              options: {
                list: [
                  { title: 'Info', value: 'info' },
                  { title: 'Advertencia', value: 'warning' },
                  { title: 'Consejo', value: 'tip' },
                  { title: 'Importante', value: 'important' },
                ],
              },
            },
            {
              name: 'text',
              title: 'Texto',
              type: 'text',
            },
          ],
          preview: {
            select: {
              type: 'type',
              text: 'text',
            },
            prepare({ type, text }) {
              const icons: Record<string, string> = {
                info: 'ℹ️',
                warning: '⚠️',
                tip: '💡',
                important: '❗',
              }
              return {
                title: `${icons[type] || '💡'} ${type?.charAt(0).toUpperCase()}${type?.slice(1) || 'Callout'}`,
                subtitle: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
              }
            },
          },
        },
        // Video embebido (YouTube, Vimeo, etc.)
        {
          type: 'object',
          name: 'videoEmbed',
          title: 'Video Embebido',
          icon: () => '🎬',
          fields: [
            {
              name: 'url',
              title: 'URL del Video',
              type: 'url',
              description: 'URL de YouTube, Vimeo u otra plataforma',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'title',
              title: 'Título del Video',
              type: 'string',
              description: 'Título descriptivo para accesibilidad',
            },
            {
              name: 'caption',
              title: 'Pie de Video',
              type: 'string',
              description: 'Texto opcional debajo del video',
            },
          ],
          preview: {
            select: {
              url: 'url',
              title: 'title',
            },
            prepare({ url, title }) {
              return {
                title: title || 'Video embebido',
                subtitle: url,
              }
            },
          },
        },
        // Audio embebido (Spotify, SoundCloud, archivo directo, etc.)
        {
          type: 'object',
          name: 'audioEmbed',
          title: 'Audio Embebido',
          icon: () => '🎧',
          fields: [
            {
              name: 'audioType',
              title: 'Tipo de Audio',
              type: 'string',
              options: {
                list: [
                  { title: 'URL Externa (Spotify, SoundCloud, etc.)', value: 'external' },
                  { title: 'Archivo Subido', value: 'file' },
                ],
                layout: 'radio',
              },
              initialValue: 'external',
            },
            {
              name: 'externalUrl',
              title: 'URL del Audio',
              type: 'url',
              description: 'URL de Spotify, SoundCloud, u otra plataforma',
              hidden: ({ parent }) => parent?.audioType !== 'external',
            },
            {
              name: 'audioFile',
              title: 'Archivo de Audio',
              type: 'file',
              options: {
                accept: 'audio/*',
              },
              hidden: ({ parent }) => parent?.audioType !== 'file',
            },
            {
              name: 'title',
              title: 'Título del Audio',
              type: 'string',
              description: 'Título descriptivo para accesibilidad',
            },
            {
              name: 'caption',
              title: 'Descripción',
              type: 'string',
              description: 'Texto opcional debajo del reproductor',
            },
            {
              name: 'duration',
              title: 'Duración',
              type: 'string',
              description: 'Ej: 5:30, 1h 20min',
            },
          ],
          preview: {
            select: {
              title: 'title',
              audioType: 'audioType',
              externalUrl: 'externalUrl',
            },
            prepare({ title, audioType, externalUrl }) {
              return {
                title: title || 'Audio embebido',
                subtitle: audioType === 'external' ? externalUrl : 'Archivo subido',
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isPremium',
      title: '¿Es Contenido Premium?',
      type: 'boolean',
      description: 'Si está activado, solo miembros pueden ver el artículo completo',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía Permitidos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: ({ parent }) => !parent?.isPremium,
    }),
    defineField({
      name: 'readingTime',
      title: 'Tiempo de Lectura (minutos)',
      type: 'number',
      description: 'Se calcula automáticamente, pero puede editarse manualmente',
    }),
    defineField({
      name: 'relatedPosts',
      title: 'Artículos Relacionados',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'blogPost' }] }],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'relatedSessions',
      title: 'Sesiones Relacionadas',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'sessionConfig' }] }],
      description: 'Sesiones mencionadas en el artículo',
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'relatedEvents',
      title: 'Eventos Relacionados',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'event' }] }],
      description: 'Eventos grupales mencionados en el artículo',
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Fecha de Publicación',
      type: 'datetime',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Última Actualización',
      type: 'datetime',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),
    defineField({
      name: 'featured',
      title: 'Destacado',
      type: 'boolean',
      description: 'Mostrar en la página principal',
      initialValue: false,
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
    defineField({
      name: 'published',
      title: 'Publicado',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
      published: 'published',
      featured: 'featured',
      isPremium: 'isPremium',
    },
    prepare(selection) {
      const { title, author, published, featured, isPremium } = selection
      let prefix = ''
      if (featured) prefix += '⭐ '
      if (isPremium) prefix += '👑 '
      if (!published) prefix += '📝 '
      return {
        title: `${prefix}${title}`,
        subtitle: `Por ${author || 'Anónimo'}`,
        media: selection.media,
      }
    },
  },
})
