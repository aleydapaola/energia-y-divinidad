import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'sessionConfig',
  title: 'Sesiones',
  type: 'document',
  icon: () => '🔮',
  groups: [
    { name: 'session', title: 'Sesión', default: true },
    { name: 'schedule', title: 'Horarios' },
    { name: 'holidays', title: 'Festivos y Vacaciones' },
    { name: 'timezones', title: 'Husos Horarios' },
    { name: 'advanced', title: 'Avanzado' },
  ],
  fields: [
    // ==========================================
    // INFORMACIÓN DE LA SESIÓN
    // ==========================================
    defineField({
      name: 'title',
      title: 'Título de la Sesión',
      type: 'string',
      group: 'session',
      initialValue: 'Sesión de Canalización',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      group: 'session',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'array',
      group: 'session',
      description: 'Opcional - descripción detallada de la sesión',
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
    }),
    defineField({
      name: 'mainImage',
      title: 'Imagen Principal',
      type: 'image',
      group: 'session',
      description: 'Opcional - imagen para mostrar en la página de sesiones',
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
    }),
    defineField({
      name: 'duration',
      title: 'Duración (minutos)',
      type: 'number',
      group: 'session',
      options: {
        list: [
          { title: '30 minutos', value: 30 },
          { title: '45 minutos', value: 45 },
          { title: '60 minutos', value: 60 },
          { title: '90 minutos', value: 90 },
          { title: '120 minutos', value: 120 },
        ],
      },
      initialValue: 120,
      validation: (Rule) => Rule.required().min(15),
    }),
    defineField({
      name: 'deliveryMethod',
      title: 'Método de Entrega',
      type: 'string',
      group: 'session',
      options: {
        list: [
          { title: 'Presencial (Bogotá)', value: 'in_person' },
          { title: 'Videollamada (Zoom/Meet)', value: 'video_call' },
          { title: 'Llamada Telefónica', value: 'phone_call' },
          { title: 'Híbrido (Cliente Elige)', value: 'hybrid' },
        ],
        layout: 'radio',
      },
      initialValue: 'video_call',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Precio (COP)',
      type: 'number',
      group: 'session',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'priceUSD',
      title: 'Precio (USD)',
      description: 'Para pagos internacionales en dólares estadounidenses',
      type: 'number',
      group: 'session',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'priceEUR',
      title: 'Precio (EUR)',
      description: 'Para pagos internacionales en euros',
      type: 'number',
      group: 'session',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'meetingLink',
      title: 'Enlace de reunión (Zoom / Meet)',
      description: 'Link de la videollamada que se enviará en los emails de confirmación de sesión',
      type: 'url',
      group: 'session',
    }),
    defineField({
      name: 'memberDiscount',
      title: 'Descuento para Miembros (%)',
      type: 'number',
      group: 'session',
      description: 'Porcentaje de descuento para miembros activos',
      validation: (Rule) => Rule.min(0).max(100),
      initialValue: 0,
    }),
    defineField({
      name: 'preparationInstructions',
      title: 'Instrucciones de Preparación',
      type: 'array',
      group: 'session',
      of: [{ type: 'block' }],
      description: 'Qué debe hacer el cliente antes de la sesión',
    }),
    defineField({
      name: 'whatToExpect',
      title: 'Qué Esperar',
      type: 'array',
      group: 'session',
      of: [{ type: 'block' }],
      description: 'Descripción de qué sucederá durante la sesión',
    }),
    defineField({
      name: 'benefits',
      title: 'Beneficios',
      type: 'array',
      group: 'session',
      of: [{ type: 'string' }],
      description: 'Lista de beneficios de esta sesión',
    }),

    // ==========================================
    // HORARIOS SEMANALES DE DISPONIBILIDAD
    // ==========================================
    defineField({
      name: 'weeklySchedule',
      title: 'Horarios Semanales de Disponibilidad',
      description: 'Configura las franjas horarias disponibles para cada día de la semana. Puedes añadir múltiples franjas por día (ej: mañana y tarde).',
      type: 'object',
      group: 'schedule',
      fields: [
        {
          name: 'monday',
          title: '🟢 Lunes',
          type: 'array',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
        {
          name: 'tuesday',
          title: '🟢 Martes',
          type: 'array',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
        {
          name: 'wednesday',
          title: '🟢 Miércoles',
          type: 'array',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
        {
          name: 'thursday',
          title: '🟢 Jueves',
          type: 'array',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
        {
          name: 'friday',
          title: '🟢 Viernes',
          type: 'array',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
        {
          name: 'saturday',
          title: '🟡 Sábado',
          type: 'array',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
        {
          name: 'sunday',
          title: '🔴 Domingo',
          type: 'array',
          description: 'Dejar vacío si no hay disponibilidad los domingos',
          of: [
            {
              type: 'object',
              title: 'Franja horaria',
              fields: [
                {
                  name: 'start',
                  title: 'Hora de inicio',
                  type: 'string',
                  description: 'Formato 24h (ej: 08:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
                {
                  name: 'end',
                  title: 'Hora de fin',
                  type: 'string',
                  description: 'Formato 24h (ej: 12:00)',
                  validation: (Rule) => Rule.required().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'hora', invert: false }),
                },
              ],
              preview: {
                select: { start: 'start', end: 'end' },
                prepare({ start, end }) {
                  return { title: `${start || '??:??'} - ${end || '??:??'}` }
                },
              },
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'bookingLeadTime',
      title: 'Tiempo Mínimo de Reserva (horas)',
      type: 'number',
      group: 'schedule',
      description: 'Horas mínimas de anticipación para reservar',
      initialValue: 24,
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'maxAdvanceBooking',
      title: 'Máximo Tiempo de Reserva Anticipada (días)',
      type: 'number',
      group: 'schedule',
      description: 'Máximo de días en el futuro para reservar',
      initialValue: 60,
      validation: (Rule) => Rule.min(1),
    }),

    // ==========================================
    // FESTIVOS Y FECHAS BLOQUEADAS
    // ==========================================
    defineField({
      name: 'holidays',
      title: 'Días Festivos',
      description: 'Días festivos en los que no se aceptan reservas',
      type: 'array',
      group: 'holidays',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'date',
              title: 'Fecha',
              type: 'date',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'name',
              title: 'Nombre del Festivo',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'recurring',
              title: 'Se repite cada año',
              description: 'Activar si este festivo se repite el mismo día cada año (ej: Navidad)',
              type: 'boolean',
              initialValue: false,
            },
          ],
          preview: {
            select: {
              date: 'date',
              name: 'name',
              recurring: 'recurring',
            },
            prepare({ date, name, recurring }) {
              return {
                title: name || 'Sin nombre',
                subtitle: `${date || 'Sin fecha'}${recurring ? ' (recurrente)' : ''}`,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'blockedDates',
      title: 'Fechas Bloqueadas',
      description: 'Rangos de fechas en los que no se aceptan reservas (vacaciones, retiros, etc.)',
      type: 'array',
      group: 'holidays',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'startDate',
              title: 'Fecha Inicio',
              type: 'date',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'endDate',
              title: 'Fecha Fin',
              type: 'date',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'reason',
              title: 'Motivo',
              type: 'string',
              description: 'Ej: Retiro de meditación, Vacaciones',
            },
          ],
          preview: {
            select: {
              startDate: 'startDate',
              endDate: 'endDate',
              reason: 'reason',
            },
            prepare({ startDate, endDate, reason }) {
              return {
                title: reason || 'Fechas bloqueadas',
                subtitle: `${startDate || '?'} → ${endDate || '?'}`,
              }
            },
          },
        },
      ],
    }),

    // ==========================================
    // HUSOS HORARIOS
    // ==========================================
    defineField({
      name: 'availableTimezones',
      title: 'Husos Horarios Disponibles',
      description: 'Zonas horarias que se mostrarán para que el usuario vea los horarios en su zona local',
      type: 'array',
      group: 'timezones',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Etiqueta',
              type: 'string',
              description: 'Nombre visible (ej: "Colombia GMT-5")',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'value',
              title: 'Identificador IANA',
              type: 'string',
              description: 'Identificador de zona horaria IANA (ej: "America/Bogota")',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'offsetHours',
              title: 'Diferencia con Colombia (horas)',
              type: 'number',
              description: 'Horas de diferencia respecto a Colombia. Ej: España = +6, México = -1, Argentina = +2',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'isDefault',
              title: 'Es la zona por defecto',
              type: 'boolean',
              initialValue: false,
            },
          ],
          preview: {
            select: {
              label: 'label',
              offsetHours: 'offsetHours',
              isDefault: 'isDefault',
            },
            prepare({ label, offsetHours, isDefault }) {
              const sign = offsetHours >= 0 ? '+' : ''
              return {
                title: `${isDefault ? '⭐ ' : ''}${label || 'Sin nombre'}`,
                subtitle: `${sign}${offsetHours}h vs Colombia`,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'timezoneNote',
      title: 'Nota de zona horaria',
      description: 'Mensaje que aparece debajo del selector de zona horaria',
      type: 'string',
      group: 'timezones',
      initialValue: 'La sesión será en hora de Colombia (GMT-5)',
    }),

    // ==========================================
    // CONFIGURACIÓN AVANZADA
    // ==========================================
    defineField({
      name: 'requiresIntake',
      title: '¿Requiere Formulario de Ingreso?',
      type: 'boolean',
      group: 'advanced',
      description: 'Si está activado, el cliente debe completar un formulario antes de la sesión',
      initialValue: true,
    }),
    defineField({
      name: 'intakeQuestions',
      title: 'Preguntas del Formulario',
      type: 'array',
      group: 'advanced',
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
      name: 'contraindications',
      title: 'Contraindicaciones',
      type: 'array',
      group: 'advanced',
      of: [{ type: 'block' }],
      description: 'Situaciones en las que no se recomienda esta sesión',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      group: 'advanced',
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
      name: 'status',
      title: 'Estado',
      type: 'string',
      group: 'advanced',
      options: {
        list: [
          { title: 'Activa - Aceptando Reservas', value: 'active' },
          { title: 'Pausada - No Disponible', value: 'paused' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'published',
      title: 'Publicada',
      type: 'boolean',
      group: 'advanced',
      initialValue: true,
    }),
  ],

  preview: {
    select: {
      title: 'title',
      duration: 'duration',
      status: 'status',
      media: 'mainImage',
    },
    prepare({ title, duration, status, media }) {
      const statusEmoji = status === 'active' ? '✅' : '⏸️'
      return {
        title: `${statusEmoji} ${title || 'Sesión de Canalización'}`,
        subtitle: `${duration || 90} minutos`,
        media,
      }
    },
  },
})
