import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'premiumContent',
  title: 'Contenido Premium',
  type: 'document',
  icon: () => '👑',
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
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
      name: 'contentType',
      title: 'Tipo de Contenido',
      type: 'string',
      options: {
        list: [
          { title: 'Video Exclusivo', value: 'video' },
          { title: 'Audio/Podcast', value: 'audio' },
          { title: 'Masterclass', value: 'masterclass' },
          { title: 'Canalización Grabada', value: 'channeling_recording' },
          { title: 'Ritual Guiado', value: 'guided_ritual' },
          { title: 'Meditación Exclusiva', value: 'meditation' },
          { title: 'Documento/Guía PDF', value: 'document' },
          { title: 'Serie de Videos', value: 'video_series' },
          { title: 'Workshop Grabado', value: 'workshop_recording' },
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
      name: 'coverImage',
      title: 'Imagen de Portada',
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
      name: 'videoUrl',
      title: 'URL del Video',
      type: 'url',
      description: 'URL de YouTube, Vimeo u otro servicio',
      hidden: ({ parent }) =>
        parent?.contentType !== 'video' &&
        parent?.contentType !== 'masterclass' &&
        parent?.contentType !== 'video_series' &&
        parent?.contentType !== 'workshop_recording',
    }),
    defineField({
      name: 'audioFile',
      title: 'Archivo de Audio',
      type: 'file',
      options: {
        accept: 'audio/*',
      },
      hidden: ({ parent }) =>
        parent?.contentType !== 'audio' &&
        parent?.contentType !== 'meditation' &&
        parent?.contentType !== 'channeling_recording',
    }),
    defineField({
      name: 'documentFile',
      title: 'Archivo PDF',
      type: 'file',
      options: {
        accept: '.pdf',
      },
      hidden: ({ parent }) => parent?.contentType !== 'document',
    }),
    defineField({
      name: 'duration',
      title: 'Duración (minutos)',
      type: 'number',
      description: 'Duración del contenido en minutos',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'transcript',
      title: 'Transcripción',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Texto completo del audio/video (opcional)',
    }),
    defineField({
      name: 'keyTakeaways',
      title: 'Puntos Clave',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Principales aprendizajes del contenido',
    }),
    defineField({
      name: 'topics',
      title: 'Temas Tratados',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Abundancia', value: 'abundancia' },
          { title: 'Amor Propio', value: 'amor-propio' },
          { title: 'Chakras', value: 'chakras' },
          { title: 'Energía Femenina', value: 'energia-femenina' },
          { title: 'Energía Masculina', value: 'energia-masculina' },
          { title: 'Ley de Atracción', value: 'ley-atraccion' },
          { title: 'Manifestación', value: 'manifestacion' },
          { title: 'Protección Energética', value: 'proteccion' },
          { title: 'Registros Akáshicos', value: 'registros-akashicos' },
          { title: 'Sanación Interior', value: 'sanacion-interior' },
          { title: 'Vidas Pasadas', value: 'vidas-pasadas' },
        ],
      },
    }),
    defineField({
      name: 'series',
      title: 'Serie',
      type: 'object',
      description: 'Si forma parte de una serie de contenidos',
      fields: [
        {
          name: 'seriesName',
          title: 'Nombre de la Serie',
          type: 'string',
        },
        {
          name: 'episodeNumber',
          title: 'Número de Episodio',
          type: 'number',
        },
        {
          name: 'season',
          title: 'Temporada',
          type: 'number',
        },
      ],
    }),
    defineField({
      name: 'accessLevel',
      title: 'Nivel de Acceso Requerido',
      type: 'object',
      fields: [
        {
          name: 'requiresMembership',
          title: '¿Requiere Membresía?',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'membershipTiers',
          title: 'Niveles de Membresía Permitidos',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'membershipTier' }] }],
          hidden: ({ parent }) => !parent?.requiresMembership,
          validation: (Rule) =>
            Rule.custom((tiers, context) => {
              const parent = context.parent as { requiresMembership?: boolean }
              if (parent?.requiresMembership && (!tiers || (Array.isArray(tiers) && tiers.length === 0))) {
                return 'Debes seleccionar al menos un nivel de membresía'
              }
              return true
            }),
        },
        {
          name: 'availableForPurchase',
          title: '¿Disponible para Compra Individual?',
          type: 'boolean',
          description: 'Permitir comprar sin membresía',
          initialValue: false,
        },
        {
          name: 'price',
          title: 'Precio de Compra Individual (COP)',
          type: 'number',
          hidden: ({ parent }) => !parent?.availableForPurchase,
          validation: (Rule) => Rule.min(0),
        },
        {
          name: 'priceUSD',
          title: 'Precio Individual (USD)',
          type: 'number',
          hidden: ({ parent }) => !parent?.availableForPurchase,
          validation: (Rule) => Rule.min(0),
        },
      ],
    }),
    defineField({
      name: 'releaseDate',
      title: 'Fecha de Lanzamiento',
      type: 'datetime',
      description: 'Cuándo estará disponible para los miembros',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'expirationDate',
      title: 'Fecha de Caducidad',
      type: 'datetime',
      description: 'Opcional - cuándo deja de estar disponible',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),
    defineField({
      name: 'downloadable',
      title: '¿Descargable?',
      type: 'boolean',
      description: 'Permitir a los miembros descargar el archivo',
      initialValue: false,
    }),
    defineField({
      name: 'relatedContent',
      title: 'Contenido Relacionado',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'premiumContent' }, { type: 'blogPost' }] }],
      validation: (Rule) => Rule.max(4),
    }),
    defineField({
      name: 'relatedSessions',
      title: 'Sesiones Relacionadas',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'session' }] }],
      description: 'Sesiones 1:1 que complementan este contenido',
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
      name: 'featured',
      title: 'Destacado',
      type: 'boolean',
      description: 'Mostrar en destacados para miembros',
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
      name: 'viewCount',
      title: 'Número de Visualizaciones',
      type: 'number',
      description: 'Se actualiza automáticamente',
      readOnly: true,
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
      title: 'Publicado',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      contentType: 'contentType',
      duration: 'duration',
      media: 'coverImage',
      featured: 'featured',
      published: 'published',
    },
    prepare(selection) {
      const { title, contentType, duration, featured, published } = selection
      const contentTypeLabels: Record<string, string> = {
        video: '🎥 Video',
        audio: '🎧 Audio',
        masterclass: '🎓 Masterclass',
        channeling_recording: '🔮 Canalización',
        guided_ritual: '✨ Ritual',
        meditation: '🧘 Meditación',
        document: '📄 Documento',
        video_series: '📺 Serie',
        workshop_recording: '🎬 Workshop',
      }
      let prefix = ''
      if (featured) prefix += '⭐ '
      if (!published) prefix += '📝 '
      return {
        title: `${prefix}${title}`,
        subtitle: `${contentTypeLabels[contentType] || contentType} - ${duration} min`,
        media: selection.media,
      }
    },
  },
})
