import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'courseModule',
  title: 'Módulos de Curso',
  type: 'document',
  icon: () => '📂',

  fields: [
    defineField({
      name: 'title',
      title: 'Título del Módulo',
      type: 'string',
      description: 'Ej: "Módulo 1: Fundamentos de la Meditación"',
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: 'description',
      title: 'Descripción del Módulo',
      type: 'text',
      rows: 3,
      description: 'Breve descripción de lo que se aprenderá en este módulo',
    }),
    defineField({
      name: 'order',
      title: 'Orden',
      type: 'number',
      description: 'Posición dentro del curso (1 = primer módulo)',
      initialValue: 1,
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'lessons',
      title: 'Lecciones',
      type: 'array',
      description: 'Arrastra para reordenar las lecciones',
      of: [
        {
          type: 'reference',
          to: [{ type: 'courseLesson' }],
        },
      ],
      validation: (Rule) => Rule.required().min(1).error('El módulo debe tener al menos una lección'),
    }),
    defineField({
      name: 'unlockDate',
      title: 'Fecha de Desbloqueo (Opcional)',
      type: 'datetime',
      description: 'Si lo configuras, este módulo no será visible hasta esta fecha (contenido por goteo)',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),
  ],

  preview: {
    select: {
      title: 'title',
      order: 'order',
      lessons: 'lessons',
      unlockDate: 'unlockDate',
    },
    prepare(selection) {
      const { title, order, lessons, unlockDate } = selection

      const lessonCount = lessons?.length || 0
      const lockIcon = unlockDate && new Date(unlockDate) > new Date() ? '🔒 ' : ''

      return {
        title: `${lockIcon}${order}. ${title}`,
        subtitle: `${lessonCount} ${lessonCount === 1 ? 'lección' : 'lecciones'}`,
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
