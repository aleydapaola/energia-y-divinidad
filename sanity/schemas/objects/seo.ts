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
