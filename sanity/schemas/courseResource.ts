import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'courseResource',
  title: 'Recurso de Curso',
  type: 'object',
  icon: () => '📎',
  fields: [
    defineField({
      name: 'title',
      title: 'Título del Recurso',
      type: 'string',
      description: 'Ej: "Guía de Meditación PDF", "Audio de Relajación"',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'resourceType',
      title: 'Tipo de Recurso',
      type: 'string',
      options: {
        list: [
          { title: '📄 PDF', value: 'pdf' },
          { title: '🎧 Audio', value: 'audio' },
          { title: '🎥 Video', value: 'video' },
          { title: '🔗 Enlace Externo', value: 'link' },
          { title: '📊 Presentación (PowerPoint)', value: 'powerpoint' },
          { title: '🖼️ Imagen', value: 'image' },
          { title: '📁 Otro', value: 'other' },
        ],
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'file',
      title: 'Archivo',
      type: 'file',
      description: 'Sube el archivo directamente aquí',
      options: {
        accept: '.pdf,.doc,.docx,.ppt,.pptx,.mp3,.mp4,.wav,.m4a,.png,.jpg,.jpeg,.gif,.webp,.zip',
      },
      hidden: ({ parent }) => parent?.resourceType === 'link',
    }),
    defineField({
      name: 'externalUrl',
      title: 'URL Externa',
      type: 'url',
      description: 'Para enlaces a recursos externos (Google Drive, Dropbox, etc.)',
      hidden: ({ parent }) => parent?.resourceType !== 'link',
    }),
    defineField({
      name: 'description',
      title: 'Descripción (Opcional)',
      type: 'text',
      rows: 2,
      description: 'Breve descripción de qué contiene este recurso',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      resourceType: 'resourceType',
    },
    prepare(selection) {
      const { title, resourceType } = selection

      const typeIcons: Record<string, string> = {
        pdf: '📄',
        audio: '🎧',
        video: '🎥',
        link: '🔗',
        powerpoint: '📊',
        image: '🖼️',
        other: '📁',
      }

      return {
        title: `${typeIcons[resourceType] || '📁'} ${title}`,
      }
    },
  },
})
