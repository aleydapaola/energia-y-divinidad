import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'freeContent',
  title: 'Contenido Gratuito',
  type: 'document',
  icon: () => '🎁',
  fields: [
    // Información Básica
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      description: 'Título de la meditación, video o audio',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      description: 'Se genera automáticamente desde el título. Ejemplo: meditacion-abundancia',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),

    // Tipo de Contenido
    defineField({
      name: 'contentType',
      title: 'Tipo de Contenido',
      type: 'string',
      description: 'Selecciona qué tipo de contenido gratuito vas a publicar',
      options: {
        list: [
          { title: '🧘 Meditación Gratuita', value: 'meditation' },
          { title: '🎥 Video Gratuito', value: 'video' },
          { title: '🎧 Audio/Podcast Gratuito', value: 'audio' },
        ],
        layout: 'radio',
      },
      initialValue: 'meditation',
      validation: (Rule) => Rule.required(),
    }),

    // Descripción
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      description: 'Descripción breve del contenido (2-3 párrafos)',
      rows: 4,
      validation: (Rule) => Rule.required().min(50).max(500),
    }),

    // Descripción Extendida (opcional)
    defineField({
      name: 'extendedDescription',
      title: 'Descripción Extendida (Opcional)',
      type: 'array',
      description: 'Contenido adicional, beneficios, instrucciones, etc.',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Cita', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numerada', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
            ],
          },
        },
      ],
    }),

    // Imagen de Portada
    defineField({
      name: 'coverImage',
      title: 'Imagen de Portada',
      type: 'coverImage',
      description: 'Imagen principal que aparecerá en las tarjetas y página de detalle',
      validation: (Rule) => Rule.required(),
    }),

    // URL de Video (YouTube/Vimeo)
    defineField({
      name: 'videoUrl',
      title: 'URL del Video (YouTube/Vimeo)',
      type: 'url',
      description: 'Pega aquí la URL completa del video de YouTube o Vimeo. Ejemplo: https://youtube.com/watch?v=ABC123',
      hidden: ({ parent }) => parent?.contentType === 'audio',
      validation: (Rule) =>
        Rule.custom((url, context) => {
          const parent = context.parent as { contentType?: string; audioFile?: any }

          // Si es video o meditación, debe tener videoUrl O audioFile
          if (parent?.contentType === 'video' || parent?.contentType === 'meditation') {
            if (!url && !parent?.audioFile) {
              return 'Debes proporcionar una URL de video O un archivo de audio'
            }
          }

          return true
        }),
    }),

    // Archivo de Audio
    defineField({
      name: 'audioFile',
      title: 'Archivo de Audio (MP3)',
      type: 'file',
      description: 'Sube un archivo de audio MP3 si prefieres audio directo en lugar de YouTube',
      options: {
        accept: 'audio/mpeg,audio/mp3',
      },
      hidden: ({ parent }) => parent?.contentType === 'video',
    }),

    // Duración
    defineField({
      name: 'duration',
      title: 'Duración (minutos)',
      type: 'number',
      description: 'Duración aproximada del contenido en minutos. Ejemplo: 15',
      validation: (Rule) => Rule.required().min(1).max(180),
    }),

    // Temas
    defineField({
      name: 'topics',
      title: 'Temas',
      type: 'array',
      description: 'Selecciona los temas relacionados con este contenido',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Abundancia', value: 'abundancia' },
          { title: 'Amor Propio', value: 'amor-propio' },
          { title: 'Chakras', value: 'chakras' },
          { title: 'Conexión Espiritual', value: 'conexion-espiritual' },
          { title: 'Energía Femenina', value: 'energia-femenina' },
          { title: 'Energía Masculina', value: 'energia-masculina' },
          { title: 'Gratitud', value: 'gratitud' },
          { title: 'Liberación Emocional', value: 'liberacion-emocional' },
          { title: 'Manifestación', value: 'manifestacion' },
          { title: 'Meditación Guiada', value: 'meditacion-guiada' },
          { title: 'Protección Energética', value: 'proteccion-energetica' },
          { title: 'Relajación', value: 'relajacion' },
          { title: 'Sanación Interior', value: 'sanacion-interior' },
          { title: 'Sueño y Descanso', value: 'sueno-descanso' },
          { title: 'Transformación Personal', value: 'transformacion-personal' },
        ],
      },
      validation: (Rule) => Rule.max(4),
    }),

    // Transcripción (opcional)
    defineField({
      name: 'transcript',
      title: 'Transcripción (Opcional)',
      type: 'text',
      description: 'Texto completo del audio/video. Mejora SEO y accesibilidad.',
      rows: 10,
    }),

    // Puntos Clave
    defineField({
      name: 'keyTakeaways',
      title: 'Puntos Clave (Opcional)',
      type: 'array',
      description: 'Lista de beneficios o puntos principales de este contenido',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.max(5),
    }),

    // Destacado
    defineField({
      name: 'featured',
      title: '⭐ Destacar',
      type: 'boolean',
      description: 'Marca como destacado para mostrarlo en la homepage',
      initialValue: false,
    }),

    // Publicado
    defineField({
      name: 'published',
      title: '✅ Publicado',
      type: 'boolean',
      description: 'Solo el contenido publicado será visible en la web',
      initialValue: false,
    }),

    // Fecha de Publicación
    defineField({
      name: 'publishDate',
      title: 'Fecha de Publicación',
      type: 'date',
      description: 'Fecha en que se publicó o publicará este contenido',
      options: {
        dateFormat: 'DD/MM/YYYY',
      },
      validation: (Rule) => Rule.required(),
    }),

    // Permitir Descarga
    defineField({
      name: 'downloadable',
      title: '💾 Permitir Descarga',
      type: 'boolean',
      description: 'Permitir a los usuarios descargar el archivo de audio',
      initialValue: false,
      hidden: ({ parent }) => !parent?.audioFile,
    }),

    // Orden de Visualización
    defineField({
      name: 'displayOrder',
      title: 'Orden de Visualización',
      type: 'number',
      description: 'Número menor aparece primero (0 = primero, 1 = segundo, etc.)',
      initialValue: 0,
      validation: (Rule) => Rule.min(0).max(999),
    }),

    // Contador de Vistas (solo lectura)
    defineField({
      name: 'viewCount',
      title: 'Número de Visualizaciones',
      type: 'number',
      description: 'Contador automático de vistas',
      readOnly: true,
      initialValue: 0,
    }),

    // SEO
    defineField({
      name: 'seo',
      title: 'SEO (Opcional)',
      type: 'seo',
      description: 'Optimización para motores de búsqueda',
    }),
  ],

  // Preview en Sanity Studio
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
        meditation: '🧘 Meditación',
        video: '🎥 Video',
        audio: '🎧 Audio',
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

  // Ordenar por displayOrder y publishDate
  orderings: [
    {
      title: 'Orden de Visualización',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
    {
      title: 'Fecha de Publicación (Reciente primero)',
      name: 'publishDateDesc',
      by: [{ field: 'publishDate', direction: 'desc' }],
    },
    {
      title: 'Fecha de Publicación (Antigua primero)',
      name: 'publishDateAsc',
      by: [{ field: 'publishDate', direction: 'asc' }],
    },
  ],
})
