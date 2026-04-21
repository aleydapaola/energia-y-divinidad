import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'testimonial',
  title: 'Testimonios',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Testimonio',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required().min(20).max(600),
    }),
    defineField({
      name: 'authorName',
      title: 'Nombre del autor',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Servicio recibido',
      type: 'string',
      description: 'Ej: Sesión de Canalización, Proceso de Sanación',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'countryEmoji',
      title: 'Emoji de bandera del país',
      type: 'string',
      description: 'Opcional. Ej: 🇨🇴 🇺🇸 🇪🇨 🇲🇽',
    }),
    defineField({
      name: 'initials',
      title: 'Iniciales (avatar)',
      type: 'string',
      description: 'Máximo 2 caracteres. Ej: AC, ML, AR',
      validation: (Rule) => Rule.required().max(2),
    }),
    defineField({
      name: 'accentColor',
      title: 'Color de acento',
      type: 'string',
      options: {
        list: [
          { title: 'Violeta', value: 'violet' },
          { title: 'Azul', value: 'blue' },
        ],
        layout: 'radio',
      },
      initialValue: 'violet',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'published',
      title: 'Publicado',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Orden de visualización',
      type: 'number',
      description: 'Número menor = aparece primero',
      initialValue: 99,
    }),
  ],
  orderings: [
    {
      title: 'Orden de visualización',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'authorName',
      subtitle: 'role',
      description: 'quote',
    },
    prepare({ title, subtitle, description }) {
      return {
        title,
        subtitle,
        description: description?.slice(0, 80) + '...',
      }
    },
  },
})
