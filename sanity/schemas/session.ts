import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'session',
  title: 'Sesiones 1:1',
  type: 'document',
  icon: () => '🔮',
  fields: [
    defineField({
      name: 'title',
      title: 'Título de la Sesión',
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
      name: 'sessionType',
      title: 'Tipo de Sesión',
      type: 'string',
      options: {
        list: [
          { title: 'Canalización Individual', value: 'channeling' },
          { title: 'Lectura de Registros Akáshicos', value: 'akashic_records' },
          { title: 'Sanación Energética', value: 'energy_healing' },
          { title: 'Terapia Holística', value: 'holistic_therapy' },
          { title: 'Consulta Chamánica', value: 'shamanic_consultation' },
          { title: 'Sesión Personalizada', value: 'custom' },
        ],
        layout: 'dropdown',
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
      name: 'duration',
      title: 'Duración (minutos)',
      type: 'number',
      options: {
        list: [
          { title: '30 minutos', value: 30 },
          { title: '45 minutos', value: 45 },
          { title: '60 minutos', value: 60 },
          { title: '90 minutos', value: 90 },
          { title: '120 minutos', value: 120 },
        ],
      },
      validation: (Rule) => Rule.required().min(15),
    }),
    defineField({
      name: 'deliveryMethod',
      title: 'Método de Entrega',
      type: 'string',
      options: {
        list: [
          { title: 'Presencial (Bogotá)', value: 'in_person' },
          { title: 'Videollamada (Zoom/Meet)', value: 'video_call' },
          { title: 'Llamada Telefónica', value: 'phone_call' },
          { title: 'Híbrido (Cliente Elige)', value: 'hybrid' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Precio (COP)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio (USD)',
      description: 'Para pagos internacionales',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      type: 'number',
      description: 'Porcentaje de descuento para miembros activos',
      validation: (Rule) => Rule.min(0).max(100),
      initialValue: 0,
    }),
    defineField({
      name: 'availabilitySchedule',
      title: 'Horarios Disponibles',
      type: 'object',
      description: 'Configuración de disponibilidad semanal',
      fields: [
        {
          name: 'monday',
          title: 'Lunes',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
        {
          name: 'tuesday',
          title: 'Martes',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
        {
          name: 'wednesday',
          title: 'Miércoles',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
        {
          name: 'thursday',
          title: 'Jueves',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
        {
          name: 'friday',
          title: 'Viernes',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
        {
          name: 'saturday',
          title: 'Sábado',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
        {
          name: 'sunday',
          title: 'Domingo',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'start', title: 'Inicio', type: 'string', placeholder: '09:00' },
                { name: 'end', title: 'Fin', type: 'string', placeholder: '17:00' },
              ],
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'bookingLeadTime',
      title: 'Tiempo Mínimo de Reserva (horas)',
      type: 'number',
      description: 'Horas mínimas de anticipación para reservar',
      initialValue: 24,
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'maxAdvanceBooking',
      title: 'Máximo Tiempo de Reserva Anticipada (días)',
      type: 'number',
      description: 'Máximo de días en el futuro para reservar',
      initialValue: 60,
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'requiresIntake',
      title: '¿Requiere Formulario de Ingreso?',
      type: 'boolean',
      description: 'Si está activado, el cliente debe completar un formulario antes de la sesión',
      initialValue: true,
    }),
    defineField({
      name: 'intakeQuestions',
      title: 'Preguntas del Formulario',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'question', title: 'Pregunta', type: 'string' },
            {
              name: 'type',
              title: 'Tipo',
              type: 'string',
              options: {
                list: [
                  { title: 'Texto Corto', value: 'short_text' },
                  { title: 'Texto Largo', value: 'long_text' },
                  { title: 'Opción Múltiple', value: 'multiple_choice' },
                  { title: 'Sí/No', value: 'yes_no' },
                ],
              },
            },
            { name: 'required', title: 'Obligatoria', type: 'boolean' },
          ],
        },
      ],
      hidden: ({ parent }) => !parent?.requiresIntake,
    }),
    defineField({
      name: 'preparationInstructions',
      title: 'Instrucciones de Preparación',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Qué debe hacer el cliente antes de la sesión',
    }),
    defineField({
      name: 'whatToExpect',
      title: 'Qué Esperar',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Descripción de qué sucederá durante la sesión',
    }),
    defineField({
      name: 'benefits',
      title: 'Beneficios',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Lista de beneficios de esta sesión',
    }),
    defineField({
      name: 'contraindications',
      title: 'Contraindicaciones',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Situaciones en las que no se recomienda esta sesión',
    }),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {
        list: [
          { title: 'Activa - Aceptando Reservas', value: 'active' },
          { title: 'Pausada - No Disponible', value: 'paused' },
          { title: 'Archivada', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Destacada',
      type: 'boolean',
      description: 'Mostrar en página principal',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Orden de Visualización',
      type: 'number',
      description: 'Número menor aparece primero',
      initialValue: 0,
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
      title: 'Publicada',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      sessionType: 'sessionType',
      duration: 'duration',
      media: 'mainImage',
      status: 'status',
      featured: 'featured',
    },
    prepare(selection) {
      const { title, sessionType, duration, status, featured } = selection
      const sessionTypeLabels: Record<string, string> = {
        channeling: 'Canalización',
        akashic_records: 'Registros Akáshicos',
        energy_healing: 'Sanación Energética',
        holistic_therapy: 'Terapia Holística',
        shamanic_consultation: 'Consulta Chamánica',
        custom: 'Personalizada',
      }
      const statusEmoji: Record<string, string> = {
        active: '✅',
        paused: '⏸️',
        archived: '📦',
      }
      return {
        title: `${featured ? '⭐ ' : ''}${statusEmoji[status] || ''} ${title}`,
        subtitle: `${sessionTypeLabels[sessionType]} - ${duration} min`,
        media: selection.media,
      }
    },
  },
})
