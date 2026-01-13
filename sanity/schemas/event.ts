import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'event',
  title: 'Eventos Grupales',
  type: 'document',
  icon: () => '📅',

  // Organizar campos en grupos para mejor UX
  groups: [
    { name: 'basic', title: 'Información Básica', default: true },
    { name: 'datetime', title: 'Fecha y Hora' },
    { name: 'location', title: 'Ubicación' },
    { name: 'pricing', title: 'Precios y Cupos' },
    { name: 'details', title: 'Detalles del Evento' },
    { name: 'membership', title: 'Membresía' },
    { name: 'seo', title: 'SEO (Opcional)' },
  ],

  fields: [
    // ============================================
    // GRUPO: Información Básica
    // ============================================
    defineField({
      name: 'title',
      title: 'Título del Evento',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required().error('El título es obligatorio'),
    }),
    defineField({
      name: 'slug',
      title: 'URL del Evento',
      description: 'Se genera automáticamente desde el título. Puedes editarlo si lo necesitas.',
      type: 'slug',
      group: 'basic',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required().error('La URL es obligatoria'),
    }),
    defineField({
      name: 'eventType',
      title: 'Tipo de Evento',
      type: 'string',
      group: 'basic',
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
      validation: (Rule) => Rule.required().error('Selecciona el tipo de evento'),
    }),
    defineField({
      name: 'mainImage',
      title: 'Imagen Principal',
      description: `📐 TAMAÑO RECOMENDADO: 1200 x 630 píxeles (formato horizontal 16:9)
📦 FORMATO: JPG o PNG
📏 PESO MÁXIMO: 2 MB
💡 CONSEJO: Usa imágenes luminosas y de alta calidad. Evita texto pequeño en la imagen.`,
      type: 'image',
      group: 'basic',
      options: {
        hotspot: true,
        accept: 'image/jpeg,image/png,image/webp',
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Descripción de la imagen',
          description: 'Describe brevemente qué muestra la imagen (para accesibilidad). Ej: "Mujer meditando en la naturaleza"',
        },
      ],
      validation: (Rule) => Rule.required().error('La imagen es obligatoria'),
    }),
    defineField({
      name: 'description',
      title: 'Descripción del Evento',
      description: 'Describe de qué trata el evento, qué van a aprender o experimentar los participantes',
      type: 'array',
      group: 'basic',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Título', value: 'h2' },
            { title: 'Subtítulo', value: 'h3' },
            { title: 'Cita', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required().error('La descripción es obligatoria'),
    }),
    defineField({
      name: 'featured',
      title: 'Evento Destacado',
      description: 'Activa esto para mostrar el evento en la página principal',
      type: 'boolean',
      group: 'basic',
      initialValue: false,
    }),
    defineField({
      name: 'published',
      title: 'Publicado',
      description: 'Solo los eventos publicados serán visibles en la web',
      type: 'boolean',
      group: 'basic',
      initialValue: false,
    }),
    defineField({
      name: 'status',
      title: 'Estado del Evento',
      type: 'string',
      group: 'basic',
      options: {
        list: [
          { title: '✅ Próximo (abierto para reservas)', value: 'upcoming' },
          { title: '🔴 Cupos Agotados', value: 'sold_out' },
          { title: '❌ Cancelado', value: 'cancelled' },
          { title: '✔️ Finalizado', value: 'completed' },
        ],
        layout: 'radio',
      },
      initialValue: 'upcoming',
      validation: (Rule) => Rule.required(),
    }),

    // ============================================
    // GRUPO: Fecha y Hora
    // ============================================
    defineField({
      name: 'eventDate',
      title: 'Fecha y Hora de Inicio',
      type: 'datetime',
      group: 'datetime',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        timeStep: 15,
      },
      validation: (Rule) => Rule.required().error('La fecha de inicio es obligatoria'),
    }),
    defineField({
      name: 'endDate',
      title: 'Fecha y Hora de Finalización',
      description: 'Opcional - Solo necesario para eventos de varios días (retiros, formaciones)',
      type: 'datetime',
      group: 'datetime',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        timeStep: 15,
      },
    }),

    // ============================================
    // GRUPO: Ubicación
    // ============================================
    defineField({
      name: 'locationType',
      title: 'Modalidad',
      type: 'string',
      group: 'location',
      options: {
        list: [
          { title: '💻 Online (Zoom)', value: 'online' },
          { title: '📍 Presencial', value: 'in_person' },
        ],
        layout: 'radio',
      },
      initialValue: 'online',
      validation: (Rule) => Rule.required(),
    }),

    // Campos para eventos PRESENCIALES
    defineField({
      name: 'venue',
      title: 'Lugar del Evento',
      type: 'object',
      group: 'location',
      hidden: ({ parent }) => parent?.locationType === 'online',
      fields: [
        {
          name: 'name',
          title: 'Nombre del Lugar',
          type: 'string',
          description: 'Ej: "Centro Holístico Luz Interior"',
        },
        {
          name: 'address',
          title: 'Dirección',
          type: 'string',
          description: 'Ej: "Calle 85 #15-32, Piso 3"',
        },
        {
          name: 'city',
          title: 'Ciudad',
          type: 'string',
        },
        {
          name: 'country',
          title: 'País',
          type: 'string',
          initialValue: 'Colombia',
        },
        {
          name: 'instructions',
          title: 'Indicaciones para llegar',
          type: 'text',
          rows: 3,
          description: 'Opcional - Información adicional como "Timbre del apartamento 301"',
        },
      ],
    }),

    // Campos para eventos ONLINE (Zoom)
    defineField({
      name: 'zoom',
      title: 'Información de Zoom',
      type: 'object',
      group: 'location',
      hidden: ({ parent }) => parent?.locationType === 'in_person',
      fields: [
        {
          name: 'meetingUrl',
          title: 'Link de Zoom',
          type: 'url',
          description: 'El link de la reunión de Zoom. Se enviará a los participantes después de inscribirse.',
        },
        {
          name: 'meetingId',
          title: 'ID de la Reunión',
          type: 'string',
          description: 'Opcional - El número de ID de Zoom (ej: 123 456 7890)',
        },
        {
          name: 'password',
          title: 'Contraseña',
          type: 'string',
          description: 'Opcional - Contraseña de la reunión si la tiene',
        },
      ],
    }),

    // Grabación (para después del evento)
    defineField({
      name: 'recording',
      title: 'Grabación del Evento',
      description: 'Añade el link de la grabación después de que termine el evento',
      type: 'object',
      group: 'location',
      hidden: ({ parent }) => parent?.locationType === 'in_person',
      fields: [
        {
          name: 'url',
          title: 'Link de la Grabación',
          type: 'url',
          description: 'Link de YouTube, Vimeo, o donde subas la grabación',
        },
        {
          name: 'availableUntil',
          title: 'Disponible hasta',
          type: 'date',
          description: 'Opcional - Fecha límite para ver la grabación',
        },
      ],
    }),

    // ============================================
    // GRUPO: Precios y Cupos
    // ============================================
    defineField({
      name: 'price',
      title: 'Precio en Pesos (COP)',
      description: 'Precio para pagos en Colombia. Ej: 150000',
      type: 'number',
      group: 'pricing',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio en Dólares (USD)',
      description: 'Precio para pagos internacionales. Ej: 40',
      type: 'number',
      group: 'pricing',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'earlyBirdPrice',
      title: 'Precio Early Bird (COP)',
      description: 'Opcional - Precio especial para los primeros inscritos',
      type: 'number',
      group: 'pricing',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'earlyBirdDeadline',
      title: 'Early Bird hasta',
      description: 'Fecha límite para el precio Early Bird',
      type: 'date',
      group: 'pricing',
      hidden: ({ parent }) => !parent?.earlyBirdPrice,
    }),
    defineField({
      name: 'capacity',
      title: 'Capacidad Máxima',
      description: 'Número total de cupos disponibles. Déjalo vacío si no hay límite.',
      type: 'number',
      group: 'pricing',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'maxPerBooking',
      title: 'Máximo por Reserva',
      description: 'Cuántos cupos puede reservar una persona. Por defecto: 1',
      type: 'number',
      group: 'pricing',
      initialValue: 1,
      validation: (Rule) => Rule.min(1).max(10),
    }),
    defineField({
      name: 'availableSpots',
      title: 'Cupos Disponibles',
      description: 'Este campo se actualiza automáticamente con cada reserva. No lo edites manualmente.',
      type: 'number',
      group: 'pricing',
      readOnly: true,
      validation: (Rule) => Rule.min(0),
    }),

    // ============================================
    // GRUPO: Detalles del Evento
    // ============================================
    defineField({
      name: 'whatToBring',
      title: '¿Qué deben traer los participantes?',
      description: 'Lista de cosas que necesitan traer o tener preparado',
      type: 'array',
      group: 'details',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'requirements',
      title: 'Requisitos Previos',
      description: 'Opcional - Si necesitan haber hecho algo antes (ej: "Haber completado el Nivel 1")',
      type: 'text',
      group: 'details',
      rows: 2,
    }),
    defineField({
      name: 'includes',
      title: '¿Qué incluye?',
      description: 'Lista de lo que está incluido en el precio',
      type: 'array',
      group: 'details',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'categories',
      title: 'Categorías',
      description: 'Ayuda a los usuarios a encontrar eventos similares',
      type: 'array',
      group: 'details',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Canalización', value: 'canalizacion' },
          { title: 'Meditación', value: 'meditacion' },
          { title: 'Sanación', value: 'sanacion' },
          { title: 'Desarrollo Personal', value: 'desarrollo_personal' },
          { title: 'Espiritualidad', value: 'espiritualidad' },
          { title: 'Cristales', value: 'cristales' },
          { title: 'Registros Akáshicos', value: 'registros_akashicos' },
        ],
      },
    }),
    defineField({
      name: 'tags',
      title: 'Etiquetas',
      description: 'Palabras clave para filtrar (ej: principiantes, avanzado, luna llena)',
      type: 'array',
      group: 'details',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'timeOfDay',
      title: 'Momento del Día',
      description: 'Ayuda a filtrar eventos por horario',
      type: 'string',
      group: 'datetime',
      options: {
        list: [
          { title: 'Mañana (6am - 12pm)', value: 'morning' },
          { title: 'Tarde (12pm - 6pm)', value: 'afternoon' },
          { title: 'Noche (6pm - 12am)', value: 'evening' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'eventSeries',
      title: 'Serie de Eventos',
      description: 'Si este evento forma parte de una serie (ej: "Círculos de Luna Llena")',
      type: 'string',
      group: 'details',
    }),

    // ============================================
    // GRUPO: Membresía
    // ============================================
    defineField({
      name: 'includedInMembership',
      title: '¿Incluido en Membresía?',
      description: 'Si activas esto, los miembros pueden asistir sin pagar extra',
      type: 'boolean',
      group: 'membership',
      initialValue: false,
    }),
    defineField({
      name: 'requiresMembership',
      title: '¿Requiere Membresía?',
      description: 'Si activas esto, SOLO los miembros pueden inscribirse',
      type: 'boolean',
      group: 'membership',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía Permitidos',
      description: 'Selecciona qué niveles de membresía pueden acceder',
      type: 'array',
      group: 'membership',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: ({ parent }) => !parent?.requiresMembership,
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      description: 'Opcional - Porcentaje de descuento para miembros (ej: 20 = 20% de descuento)',
      type: 'number',
      group: 'membership',
      validation: (Rule) => Rule.min(0).max(100),
      hidden: ({ parent }) => parent?.includedInMembership,
    }),

    // ============================================
    // GRUPO: SEO (Opcional)
    // ============================================
    defineField({
      name: 'seo',
      title: 'SEO',
      description: 'Opcional - Para mejorar cómo aparece en Google',
      type: 'object',
      group: 'seo',
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        {
          name: 'metaTitle',
          title: 'Título para Google',
          description: 'Si lo dejas vacío, se usará el título del evento',
          type: 'string',
          validation: (Rule) => Rule.max(60).warning('Máximo 60 caracteres para mejor SEO'),
        },
        {
          name: 'metaDescription',
          title: 'Descripción para Google',
          description: 'Breve descripción que aparecerá en los resultados de búsqueda',
          type: 'text',
          rows: 2,
          validation: (Rule) => Rule.max(160).warning('Máximo 160 caracteres para mejor SEO'),
        },
      ],
    }),
  ],

  // Preview en el listado de Sanity
  preview: {
    select: {
      title: 'title',
      eventType: 'eventType',
      date: 'eventDate',
      media: 'mainImage',
      status: 'status',
      featured: 'featured',
      published: 'published',
    },
    prepare(selection) {
      const { title, eventType, date, status, featured, published } = selection

      const eventTypeLabels: Record<string, string> = {
        workshop_in_person: 'Taller Presencial',
        workshop_online: 'Taller Online',
        ceremony: 'Ceremonia',
        retreat: 'Retiro',
        webinar: 'Webinar',
      }

      const statusEmoji: Record<string, string> = {
        upcoming: '🟢',
        sold_out: '🔴',
        cancelled: '❌',
        completed: '✔️',
      }

      const featuredBadge = featured ? '⭐ ' : ''
      const draftBadge = !published ? '📝 ' : ''

      const formattedDate = date
        ? new Date(date).toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        : 'Sin fecha'

      return {
        title: `${draftBadge}${featuredBadge}${statusEmoji[status] || ''} ${title}`,
        subtitle: `${eventTypeLabels[eventType] || eventType} · ${formattedDate}`,
        media: selection.media,
      }
    },
  },

  // Ordenar por fecha por defecto
  orderings: [
    {
      title: 'Fecha (próximos primero)',
      name: 'eventDateAsc',
      by: [{ field: 'eventDate', direction: 'asc' }],
    },
    {
      title: 'Fecha (más recientes)',
      name: 'eventDateDesc',
      by: [{ field: 'eventDate', direction: 'desc' }],
    },
    {
      title: 'Título A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
