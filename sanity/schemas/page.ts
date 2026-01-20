import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'page',
  title: 'Páginas',
  type: 'document',
  icon: () => '📄',
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
      name: 'pageType',
      title: 'Tipo de Página',
      type: 'string',
      options: {
        list: [
          { title: 'Sobre Mí / About', value: 'about' },
          { title: 'Servicios', value: 'services' },
          { title: 'Contacto', value: 'contact' },
          { title: 'Testimonios', value: 'testimonials' },
          { title: 'Preguntas Frecuentes', value: 'faq' },
          { title: 'Términos y Condiciones', value: 'terms' },
          { title: 'Política de Privacidad', value: 'privacy' },
          { title: 'Política de Cookies', value: 'cookies' },
          { title: 'Aviso Legal', value: 'legal' },
          { title: 'Página Personalizada', value: 'custom' },
        ],
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'version',
      title: 'Versión del Documento',
      type: 'string',
      description: 'Versión del documento legal (ej: 1.0, 2.0). Usado para tracking de aceptación.',
      hidden: ({ parent }) => !['terms', 'privacy', 'cookies', 'legal'].includes(parent?.pageType),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Última Actualización',
      type: 'datetime',
      description: 'Fecha de la última actualización del contenido legal.',
      hidden: ({ parent }) => !['terms', 'privacy', 'cookies', 'legal'].includes(parent?.pageType),
    }),
    defineField({
      name: 'hero',
      title: 'Sección Hero (Banner)',
      type: 'object',
      fields: [
        {
          name: 'showHero',
          title: '¿Mostrar Hero?',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'heading',
          title: 'Título Principal',
          type: 'string',
          hidden: ({ parent }) => !parent?.showHero,
        },
        {
          name: 'subheading',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          hidden: ({ parent }) => !parent?.showHero,
        },
        {
          name: 'backgroundImage',
          title: 'Imagen de Fondo',
          type: 'image',
          options: {
            hotspot: true,
          },
          hidden: ({ parent }) => !parent?.showHero,
        },
        {
          name: 'ctaButton',
          title: 'Botón de Acción',
          type: 'object',
          fields: [
            {
              name: 'text',
              title: 'Texto',
              type: 'string',
            },
            {
              name: 'link',
              title: 'Enlace',
              type: 'string',
            },
          ],
          hidden: ({ parent }) => !parent?.showHero,
        },
      ],
    }),
    defineField({
      name: 'content',
      title: 'Contenido',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
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
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
        },
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
            {
              name: 'caption',
              type: 'string',
              title: 'Pie de Imagen',
            },
          ],
        },
        {
          type: 'object',
          name: 'gallery',
          title: 'Galería de Imágenes',
          fields: [
            {
              name: 'images',
              title: 'Imágenes',
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
                    {
                      name: 'caption',
                      type: 'string',
                      title: 'Pie de Imagen',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'object',
          name: 'testimonial',
          title: 'Testimonio',
          fields: [
            {
              name: 'quote',
              title: 'Cita',
              type: 'text',
            },
            {
              name: 'author',
              title: 'Autor',
              type: 'string',
            },
            {
              name: 'role',
              title: 'Rol/Descripción',
              type: 'string',
            },
            {
              name: 'image',
              title: 'Foto',
              type: 'image',
            },
          ],
        },
        {
          type: 'object',
          name: 'callToAction',
          title: 'Llamado a la Acción',
          fields: [
            {
              name: 'heading',
              title: 'Título',
              type: 'string',
            },
            {
              name: 'text',
              title: 'Texto',
              type: 'text',
            },
            {
              name: 'buttonText',
              title: 'Texto del Botón',
              type: 'string',
            },
            {
              name: 'buttonLink',
              title: 'Enlace del Botón',
              type: 'string',
            },
            {
              name: 'style',
              title: 'Estilo',
              type: 'string',
              options: {
                list: [
                  { title: 'Primario', value: 'primary' },
                  { title: 'Secundario', value: 'secondary' },
                  { title: 'Acento', value: 'accent' },
                ],
              },
            },
          ],
        },
        {
          type: 'object',
          name: 'faqSection',
          title: 'Sección de FAQ',
          fields: [
            {
              name: 'questions',
              title: 'Preguntas',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    {
                      name: 'question',
                      title: 'Pregunta',
                      type: 'string',
                    },
                    {
                      name: 'answer',
                      title: 'Respuesta',
                      type: 'array',
                      of: [{ type: 'block' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'object',
          name: 'video',
          title: 'Video',
          fields: [
            {
              name: 'url',
              title: 'URL del Video',
              type: 'url',
              description: 'YouTube, Vimeo, etc.',
            },
            {
              name: 'caption',
              title: 'Pie de Video',
              type: 'string',
            },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sidebar',
      title: 'Barra Lateral',
      type: 'object',
      fields: [
        {
          name: 'showSidebar',
          title: '¿Mostrar Barra Lateral?',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'content',
          title: 'Contenido',
          type: 'array',
          of: [{ type: 'block' }],
          hidden: ({ parent }) => !parent?.showSidebar,
        },
        {
          name: 'widgets',
          title: 'Widgets',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                {
                  name: 'type',
                  title: 'Tipo',
                  type: 'string',
                  options: {
                    list: [
                      { title: 'Próximos Eventos', value: 'upcoming_events' },
                      { title: 'Últimos Artículos', value: 'recent_posts' },
                      { title: 'Sesiones Destacadas', value: 'featured_sessions' },
                      { title: 'Contacto Rápido', value: 'contact_widget' },
                    ],
                  },
                },
              ],
            },
          ],
          hidden: ({ parent }) => !parent?.showSidebar,
        },
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Diseño',
      type: 'string',
      options: {
        list: [
          { title: 'Ancho Completo', value: 'full_width' },
          { title: 'Contenedor Centrado', value: 'centered' },
          { title: 'Con Barra Lateral', value: 'with_sidebar' },
        ],
      },
      initialValue: 'centered',
    }),
    defineField({
      name: 'showInMenu',
      title: 'Mostrar en Menú Principal',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'menuOrder',
      title: 'Orden en Menú',
      type: 'number',
      description: 'Orden de aparición en el menú (número menor primero)',
      hidden: ({ parent }) => !parent?.showInMenu,
      initialValue: 0,
    }),
    defineField({
      name: 'showInFooter',
      title: 'Mostrar en Footer',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'footerColumn',
      title: 'Columna del Footer',
      type: 'string',
      options: {
        list: [
          { title: 'Columna 1', value: 'column_1' },
          { title: 'Columna 2', value: 'column_2' },
          { title: 'Columna 3', value: 'column_3' },
        ],
      },
      hidden: ({ parent }) => !parent?.showInFooter,
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
    defineField({
      name: 'keywords',
      title: 'Palabras Clave (SEO)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Palabras clave adicionales para SEO',
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
      pageType: 'pageType',
      published: 'published',
      showInMenu: 'showInMenu',
    },
    prepare(selection) {
      const { title, pageType, published, showInMenu } = selection
      const pageTypeLabels: Record<string, string> = {
        about: 'Sobre Mí',
        services: 'Servicios',
        contact: 'Contacto',
        testimonials: 'Testimonios',
        faq: 'FAQ',
        terms: 'Términos',
        privacy: 'Privacidad',
        cookies: 'Cookies',
        legal: 'Aviso Legal',
        custom: 'Personalizada',
      }
      let prefix = ''
      if (showInMenu) prefix += '📌 '
      if (!published) prefix += '📝 '

      return {
        title: `${prefix}${title}`,
        subtitle: pageTypeLabels[pageType] || pageType,
      }
    },
  },
})
