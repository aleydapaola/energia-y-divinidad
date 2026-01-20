import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'membershipAccess',
  title: 'Acceso por Membresía',
  type: 'object',
  description: 'Configuración de acceso para miembros',
  fields: [
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en Membresía?',
      type: 'boolean',
      description: 'Los miembros pueden acceder sin pago adicional',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía con Acceso',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'membershipTier' }],
        },
      ],
      description: 'Selecciona los niveles de membresía que tienen acceso',
      hidden: ({ parent }) => !parent?.includedInMembership,
    }),
    defineField({
      name: 'memberOnlyPurchase',
      title: '¿Solo Miembros Pueden Comprar?',
      type: 'boolean',
      description: 'Solo los miembros pueden adquirir este producto (aunque no sea gratis para ellos)',
      initialValue: false,
    }),
  ],
  options: {
    collapsible: true,
    collapsed: true,
  },
})
