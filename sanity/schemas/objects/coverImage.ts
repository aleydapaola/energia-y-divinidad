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
          // @ts-expect-error - context.parent type is not fully typed
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
