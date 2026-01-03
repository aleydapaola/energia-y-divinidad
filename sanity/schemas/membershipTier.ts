import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'membershipTier',
  title: 'Niveles de Membresía',
  type: 'document',
  icon: () => '💎',
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre del Nivel',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tierLevel',
      title: 'Nivel de Jerarquía',
      type: 'number',
      description: 'Número que indica la jerarquía (1=básico, 2=intermedio, 3=premium)',
      validation: (Rule) => Rule.required().min(1).max(10),
    }),
    defineField({
      name: 'tagline',
      title: 'Frase Descriptiva',
      type: 'string',
      description: 'Frase corta que describe el nivel',
      validation: (Rule) => Rule.max(100),
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
            { title: 'H3', value: 'h3' },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'icon',
      title: 'Icono',
      type: 'image',
      description: 'Icono representativo del nivel',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'color',
      title: 'Color del Nivel',
      type: 'string',
      description: 'Código hex para el color de este nivel (#8B6F47)',
      validation: (Rule) =>
        Rule.regex(/^#[0-9A-Fa-f]{6}$/, {
          name: 'hex color',
          invert: false,
        }).error('Debe ser un color hexadecimal válido (ej: #8B6F47)'),
    }),
    defineField({
      name: 'pricing',
      title: 'Precios',
      type: 'object',
      fields: [
        {
          name: 'monthlyPrice',
          title: 'Precio Mensual (COP)',
          type: 'number',
          validation: (Rule) => Rule.min(0),
        },
        {
          name: 'monthlyPriceUSD',
          title: 'Precio Mensual (USD)',
          type: 'number',
          validation: (Rule) => Rule.min(0),
        },
        {
          name: 'yearlyPrice',
          title: 'Precio Anual (COP)',
          type: 'number',
          description: 'Precio total del año (con descuento)',
          validation: (Rule) => Rule.min(0),
        },
        {
          name: 'yearlyPriceUSD',
          title: 'Precio Anual (USD)',
          type: 'number',
          validation: (Rule) => Rule.min(0),
        },
        {
          name: 'yearlyDiscount',
          title: 'Descuento Anual (%)',
          type: 'number',
          description: 'Porcentaje de descuento al pagar anualmente',
          validation: (Rule) => Rule.min(0).max(100),
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'features',
      title: 'Características Incluidas',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'feature',
              title: 'Característica',
              type: 'string',
            },
            {
              name: 'description',
              title: 'Descripción',
              type: 'text',
              rows: 2,
            },
            {
              name: 'included',
              title: '¿Incluido?',
              type: 'boolean',
              initialValue: true,
            },
          ],
          preview: {
            select: {
              title: 'feature',
              included: 'included',
            },
            prepare({ title, included }) {
              return {
                title: `${included ? '✅' : '❌'} ${title}`,
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'benefits',
      title: 'Beneficios',
      type: 'object',
      fields: [
        {
          name: 'premiumContent',
          title: '¿Acceso a Contenido Premium?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'liveEvents',
          title: '¿Acceso a Eventos en Vivo?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'recordedEvents',
          title: '¿Acceso a Grabaciones de Eventos?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'sessionDiscount',
          title: 'Descuento en Sesiones 1:1 (%)',
          type: 'number',
          validation: (Rule) => Rule.min(0).max(100),
          initialValue: 0,
        },
        {
          name: 'productDiscount',
          title: 'Descuento en Productos (%)',
          type: 'number',
          validation: (Rule) => Rule.min(0).max(100),
          initialValue: 0,
        },
        {
          name: 'prioritySupport',
          title: '¿Soporte Prioritario?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'privateGroup',
          title: '¿Acceso a Grupo Privado?',
          type: 'boolean',
          description: 'WhatsApp, Telegram u otra comunidad',
          initialValue: false,
        },
        {
          name: 'monthlyLiveSession',
          title: '¿Sesión Grupal Mensual en Vivo?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'oneOnOneSessionsIncluded',
          title: 'Sesiones 1:1 Incluidas por Mes',
          type: 'number',
          description: 'Número de sesiones 1:1 incluidas mensualmente',
          validation: (Rule) => Rule.min(0),
          initialValue: 0,
        },
      ],
    }),
    defineField({
      name: 'limitations',
      title: 'Limitaciones',
      type: 'object',
      fields: [
        {
          name: 'maxDownloadsPerMonth',
          title: 'Máximo de Descargas por Mes',
          type: 'number',
          description: '0 = ilimitado',
          validation: (Rule) => Rule.min(0),
          initialValue: 0,
        },
        {
          name: 'maxStorageGB',
          title: 'Almacenamiento Máximo (GB)',
          type: 'number',
          description: '0 = ilimitado',
          validation: (Rule) => Rule.min(0),
          initialValue: 0,
        },
      ],
    }),
    defineField({
      name: 'trialPeriod',
      title: 'Período de Prueba',
      type: 'object',
      fields: [
        {
          name: 'enabled',
          title: '¿Ofrecer Período de Prueba?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'durationDays',
          title: 'Duración (días)',
          type: 'number',
          hidden: ({ parent }) => !parent?.enabled,
          validation: (Rule) => Rule.min(1),
        },
        {
          name: 'requiresPaymentMethod',
          title: '¿Requiere Método de Pago?',
          type: 'boolean',
          description: 'Si el usuario debe ingresar tarjeta aunque no se cobre',
          hidden: ({ parent }) => !parent?.enabled,
          initialValue: false,
        },
      ],
    }),
    defineField({
      name: 'recommendedFor',
      title: 'Recomendado Para',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Tipos de personas para quienes es ideal esta membresía',
    }),
    defineField({
      name: 'popularityBadge',
      title: 'Insignia',
      type: 'string',
      options: {
        list: [
          { title: 'Ninguna', value: 'none' },
          { title: 'Más Popular', value: 'popular' },
          { title: 'Mejor Valor', value: 'best_value' },
          { title: 'Recomendado', value: 'recommended' },
        ],
      },
      initialValue: 'none',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Orden de Visualización',
      type: 'number',
      description: 'Orden en que aparece en la página (número menor primero)',
      validation: (Rule) => Rule.required(),
      initialValue: 1,
    }),
    defineField({
      name: 'ctaButtonText',
      title: 'Texto del Botón',
      type: 'string',
      description: 'Texto del botón de suscripción',
      initialValue: 'Comenzar Ahora',
    }),
    defineField({
      name: 'active',
      title: 'Activo',
      type: 'boolean',
      description: 'Desactiva para ocultar este nivel sin eliminarlo',
      initialValue: true,
    }),
    defineField({
      name: 'featured',
      title: 'Destacado',
      type: 'boolean',
      description: 'Mostrar con diseño destacado en la página',
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
  ],
  preview: {
    select: {
      name: 'name',
      tierLevel: 'tierLevel',
      monthlyPrice: 'pricing.monthlyPrice',
      active: 'active',
      featured: 'featured',
      popularityBadge: 'popularityBadge',
    },
    prepare(selection) {
      const { name, tierLevel, monthlyPrice, active, featured, popularityBadge } = selection
      let prefix = ''
      if (featured) prefix += '⭐ '
      if (popularityBadge === 'popular') prefix += '🔥 '
      if (popularityBadge === 'best_value') prefix += '💎 '
      if (!active) prefix += '⏸️ '

      return {
        title: `${prefix}${name} (Nivel ${tierLevel})`,
        subtitle: `$${monthlyPrice?.toLocaleString('es-CO')} COP/mes`,
      }
    },
  },
})
