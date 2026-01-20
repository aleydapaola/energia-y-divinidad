import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'pricing',
  title: 'Precios',
  type: 'object',
  fields: [
    defineField({
      name: 'price',
      title: 'Precio en Pesos (COP)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio en Dólares (USD)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Precio Anterior COP',
      type: 'number',
      description: 'Mostrar precio tachado para indicar descuento',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPriceUSD',
      title: 'Precio Anterior USD',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      type: 'number',
      description: 'Porcentaje de descuento para miembros (0-100)',
      validation: (Rule) => Rule.min(0).max(100),
      initialValue: 0,
    }),
    defineField({
      name: 'isFree',
      title: '¿Es Gratuito?',
      type: 'boolean',
      description: 'Marcar si el contenido es gratuito',
      initialValue: false,
    }),
  ],
  options: {
    collapsible: true,
    collapsed: false,
  },
})
