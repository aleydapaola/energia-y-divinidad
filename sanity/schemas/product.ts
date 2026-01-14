import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'product',
  title: 'Productos',
  type: 'document',
  icon: () => '🛍️',
  fields: [
    defineField({
      name: 'title',
      title: 'Nombre del Producto',
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
      name: 'productType',
      title: 'Tipo de Producto',
      type: 'string',
      options: {
        list: [
          { title: 'Producto Digital (PDF, Audio, Video)', value: 'digital' },
          { title: 'Producto Físico', value: 'physical' },
          { title: 'Curso Online', value: 'course' },
          { title: 'Paquete de Sesiones', value: 'session_bundle' },
          { title: 'Guía o eBook', value: 'ebook' },
          { title: 'Audio/Meditación Guiada', value: 'audio' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Descripción Corta',
      type: 'text',
      rows: 2,
      description: 'Aparece en listados de productos',
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: 'description',
      title: 'Descripción Completa',
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
      name: 'images',
      title: 'Imágenes del Producto',
      type: 'array',
      of: [
        {
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
        },
      ],
      validation: (Rule) => Rule.required().min(1),
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
      name: 'compareAtPrice',
      title: 'Precio de Comparación (COP)',
      description: 'Precio original (para mostrar descuento)',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'compareAtPriceUSD',
      title: 'Precio de Comparación (USD)',
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
      name: 'inventory',
      title: 'Inventario',
      type: 'object',
      fields: [
        {
          name: 'trackInventory',
          title: '¿Controlar Inventario?',
          type: 'boolean',
          description: 'Activar solo para productos físicos',
          initialValue: false,
        },
        {
          name: 'quantity',
          title: 'Cantidad Disponible',
          type: 'number',
          hidden: ({ parent }) => !parent?.trackInventory,
          validation: (Rule) => Rule.min(0),
        },
        {
          name: 'allowBackorder',
          title: '¿Permitir Pedidos sin Stock?',
          type: 'boolean',
          hidden: ({ parent }) => !parent?.trackInventory,
          initialValue: false,
        },
      ],
    }),
    defineField({
      name: 'digitalFiles',
      title: 'Archivos Digitales',
      type: 'array',
      of: [
        {
          type: 'file',
          fields: [
            {
              name: 'title',
              type: 'string',
              title: 'Título del Archivo',
            },
            {
              name: 'description',
              type: 'text',
              title: 'Descripción',
            },
          ],
        },
      ],
      hidden: ({ parent }) =>
        parent?.productType !== 'digital' &&
        parent?.productType !== 'course' &&
        parent?.productType !== 'ebook' &&
        parent?.productType !== 'audio',
      description: 'Archivos que recibirá el comprador',
    }),
    defineField({
      name: 'courseContent',
      title: 'Contenido del Curso',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'module',
          title: 'Módulo',
          fields: [
            {
              name: 'moduleName',
              title: 'Nombre del Módulo',
              type: 'string',
            },
            {
              name: 'lessons',
              title: 'Lecciones',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'title', title: 'Título', type: 'string' },
                    { name: 'duration', title: 'Duración (min)', type: 'number' },
                    { name: 'description', title: 'Descripción', type: 'text' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      hidden: ({ parent }) => parent?.productType !== 'course',
    }),
    defineField({
      name: 'sessionBundleDetails',
      title: 'Detalles del Paquete de Sesiones',
      type: 'object',
      fields: [
        {
          name: 'numberOfSessions',
          title: 'Número de Sesiones',
          type: 'number',
          validation: (Rule) => Rule.min(1),
        },
        {
          name: 'sessionType',
          title: 'Tipo de Sesión',
          type: 'reference',
          to: [{ type: 'sessionConfig' }],
        },
        {
          name: 'validityPeriod',
          title: 'Período de Validez (días)',
          type: 'number',
          description: 'Días para usar las sesiones desde la compra',
          validation: (Rule) => Rule.min(1),
        },
      ],
      hidden: ({ parent }) => parent?.productType !== 'session_bundle',
    }),
    defineField({
      name: 'whatYouGet',
      title: 'Qué Incluye',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Lista de lo que recibe el comprador',
    }),
    defineField({
      name: 'requirements',
      title: 'Requisitos',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Qué necesita el usuario antes de comprar',
    }),
    defineField({
      name: 'targetAudience',
      title: 'Para Quién Es',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Público objetivo del producto',
    }),
    defineField({
      name: 'categories',
      title: 'Categorías',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Cursos', value: 'courses' },
          { title: 'Meditaciones', value: 'meditations' },
          { title: 'Guías y eBooks', value: 'guides' },
          { title: 'Paquetes', value: 'bundles' },
          { title: 'Productos Físicos', value: 'physical' },
          { title: 'Herramientas Espirituales', value: 'spiritual-tools' },
        ],
      },
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'tags',
      title: 'Etiquetas',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'isPremium',
      title: '¿Es Exclusivo para Miembros?',
      type: 'boolean',
      description: 'Solo miembros pueden comprarlo',
      initialValue: false,
    }),
    defineField({
      name: 'membershipTiers',
      title: 'Niveles de Membresía Permitidos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
      hidden: ({ parent }) => !parent?.isPremium,
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Productos Relacionados',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      validation: (Rule) => Rule.max(4),
    }),
    defineField({
      name: 'featured',
      title: 'Destacado',
      type: 'boolean',
      description: 'Mostrar en página principal',
      initialValue: false,
    }),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {
        list: [
          { title: 'Activo - A la Venta', value: 'active' },
          { title: 'Agotado', value: 'sold_out' },
          { title: 'Descatalogado', value: 'discontinued' },
          { title: 'Próximamente', value: 'coming_soon' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
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
      price: 'price',
      productType: 'productType',
      media: 'images.0',
      status: 'status',
      featured: 'featured',
    },
    prepare(selection) {
      const { title, price, productType, status, featured } = selection
      const productTypeLabels: Record<string, string> = {
        digital: 'Digital',
        physical: 'Físico',
        course: 'Curso',
        session_bundle: 'Paquete',
        ebook: 'eBook',
        audio: 'Audio',
      }
      const statusEmoji: Record<string, string> = {
        active: '✅',
        sold_out: '🔴',
        discontinued: '❌',
        coming_soon: '🔜',
      }
      return {
        title: `${featured ? '⭐ ' : ''}${statusEmoji[status] || ''} ${title}`,
        subtitle: `${productTypeLabels[productType]} - $${price?.toLocaleString('es-CO')} COP`,
        media: selection.media,
      }
    },
  },
})
