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
      of: [{ type: 'reference', to: [{ type: 'session' }] }],
      description: 'Sesiones 1:1 mencionadas en el artículo',
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
      type: 'object',
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Título',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Meta Descripción',
          type: 'text',
          validation: (Rule) => Rule.max(160),
        },
        {
          name: 'keywords',
          title: 'Palabras Clave',
          type: 'array',
          of: [{ type: 'string' }],
        },
      ],
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
