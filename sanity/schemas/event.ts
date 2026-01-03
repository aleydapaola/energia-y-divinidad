import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'event',
  title: 'Eventos Grupales',
  type: 'document',
  icon: () => '📅',
  fields: [
    defineField({
      name: 'title',
      title: 'Título del Evento',
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
      name: 'eventType',
      title: 'Tipo de Evento',
      type: 'string',
      options: {
        list: [
          { title: 'Taller Presencial', value: 'workshop_in_person' },
          { title: 'Taller Online', value: 'workshop_online' },
          { title: 'Ceremonia', value: 'ceremony' },
          { title: 'Retiro', value: 'retreat' },
          { title: 'Webinar Grupal', value: 'webinar' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
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
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'eventDate',
      title: 'Fecha y Hora del Evento',
      type: 'datetime',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'Fecha y Hora de Finalización',
      description: 'Opcional - para eventos de varios días',
      type: 'datetime',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),
    defineField({
      name: 'location',
      title: 'Ubicación',
      type: 'object',
      fields: [
        {
          name: 'type',
          title: 'Tipo',
          type: 'string',
          options: {
            list: [
              { title: 'Presencial', value: 'in_person' },
              { title: 'Online (Zoom/Meet)', value: 'online' },
              { title: 'Híbrido', value: 'hybrid' },
            ],
          },
        },
        {
          name: 'address',
          title: 'Dirección',
          type: 'string',
          hidden: ({ parent }) => parent?.type === 'online',
        },
        {
          name: 'city',
          title: 'Ciudad',
          type: 'string',
        },
        {
          name: 'onlineLink',
          title: 'Link Online',
          type: 'url',
          hidden: ({ parent }) => parent?.type === 'in_person',
        },
      ],
    }),
    defineField({
      name: 'price',
      title: 'Precio (COP)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio (USD)',
      description: 'Para pagos internacionales',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'capacity',
      title: 'Capacidad Máxima',
      type: 'number',
      description: 'Número máximo de participantes',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'availableSpots',
      title: 'Cupos Disponibles',
      type: 'number',
      description: 'Se actualiza automáticamente con las reservas',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {
        list: [
          { title: 'Próximo', value: 'upcoming' },
          { title: 'Cupos Agotados', value: 'sold_out' },
          { title: 'Cancelado', value: 'cancelled' },
          { title: 'Finalizado', value: 'completed' },
        ],
        layout: 'radio',
      },
      initialValue: 'upcoming',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'requiresMembership',
      title: '¿Requiere Membresía?',
      type: 'boolean',
      description: 'Si está activado, solo miembros pueden registrarse',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía Permitidos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: ({ parent }) => !parent?.requiresMembership,
    }),
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en Membresía?',
      type: 'boolean',
      description: 'Si está activado, los miembros no pagan extra',
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
      eventType: 'eventType',
      date: 'eventDate',
      media: 'mainImage',
      status: 'status',
    },
    prepare(selection) {
      const { title, eventType, date, status } = selection
      const eventTypeLabels: Record<string, string> = {
        workshop_in_person: 'Taller Presencial',
        workshop_online: 'Taller Online',
        ceremony: 'Ceremonia',
        retreat: 'Retiro',
        webinar: 'Webinar',
      }
      const statusEmoji: Record<string, string> = {
        upcoming: '✅',
        sold_out: '🔴',
        cancelled: '❌',
        completed: '✔️',
      }
      return {
        title: `${statusEmoji[status] || ''} ${title}`,
        subtitle: `${eventTypeLabels[eventType]} - ${new Date(date).toLocaleDateString('es-CO')}`,
        media: selection.media,
      }
    },
  },
})
