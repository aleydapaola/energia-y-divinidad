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
