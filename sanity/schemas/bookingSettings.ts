import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'bookingSettings',
  title: 'Configuracion de Reservas',
  type: 'document',
  icon: () => '📅',
  fields: [
    // ==========================================
    // FESTIVOS
    // ==========================================
    defineField({
      name: 'holidays',
      title: 'Dias Festivos',
      description: 'Dias festivos en los que no se aceptan reservas',
      type: 'array',
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
              title: 'Se repite cada ano',
              description: 'Activar si este festivo se repite el mismo dia cada ano (ej: Navidad)',
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

    // ==========================================
    // FECHAS BLOQUEADAS (vacaciones, retiros, etc.)
    // ==========================================
    defineField({
      name: 'blockedDates',
      title: 'Fechas Bloqueadas',
      description: 'Rangos de fechas en los que no se aceptan reservas (vacaciones, retiros, etc.)',
      type: 'array',
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
              description: 'Ej: Retiro de meditacion, Vacaciones',
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
    // HUSOS HORARIOS DISPONIBLES
    // ==========================================
    defineField({
      name: 'availableTimezones',
      title: 'Husos Horarios Disponibles',
      description: 'Zonas horarias que se mostraran para que el usuario vea los horarios en su zona local',
      type: 'array',
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
              description: 'Horas de diferencia respecto a Colombia. Ej: Espana = +6, Mexico = -1, Argentina = +2',
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
              value: 'value',
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

    // ==========================================
    // CONFIGURACION POR DEFECTO
    // ==========================================
    defineField({
      name: 'defaultLeadTime',
      title: 'Horas minimas de anticipacion (por defecto)',
      description: 'Se usa si la sesion no tiene configuracion propia',
      type: 'number',
      initialValue: 24,
      validation: (Rule) => Rule.min(1),
    }),

    defineField({
      name: 'defaultMaxAdvance',
      title: 'Dias maximos de anticipacion (por defecto)',
      description: 'Maximo de dias en el futuro para reservar. Se usa si la sesion no tiene configuracion propia',
      type: 'number',
      initialValue: 60,
      validation: (Rule) => Rule.min(1),
    }),

    // ==========================================
    // MENSAJE DE TIMEZONE
    // ==========================================
    defineField({
      name: 'timezoneNote',
      title: 'Nota de zona horaria',
      description: 'Mensaje que aparece debajo del selector de zona horaria',
      type: 'string',
      initialValue: 'La sesion sera en hora de Colombia (GMT-5)',
    }),
  ],

  preview: {
    prepare() {
      return {
        title: 'Configuracion de Reservas',
        subtitle: 'Festivos, fechas bloqueadas y zonas horarias',
      }
    },
  },
})
