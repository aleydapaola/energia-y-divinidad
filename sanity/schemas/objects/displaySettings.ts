import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'displaySettings',
  title: 'Configuración de Visualización',
  type: 'object',
  fields: [
    defineField({
      name: 'published',
      title: '¿Publicado?',
      type: 'boolean',
      description: 'El contenido es visible públicamente',
      initialValue: false,
    }),
    defineField({
      name: 'featured',
      title: '⭐ Destacado',
      type: 'boolean',
      description: 'Mostrar en secciones destacadas',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Orden de Visualización',
      type: 'number',
      description: 'Número menor = aparece primero',
      initialValue: 0,
    }),
    defineField({
      name: 'publishedAt',
      title: 'Fecha de Publicación',
      type: 'datetime',
      description: 'Fecha en que se publicó o se publicará',
    }),
  ],
  options: {
    collapsible: true,
    collapsed: true,
  },
})
