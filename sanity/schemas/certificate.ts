import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'certificate',
  title: 'Certificados',
  type: 'document',
  icon: () => '🏆',

  groups: [
    { name: 'basic', title: 'Información Básica', default: true },
    { name: 'design', title: 'Diseño' },
    { name: 'settings', title: 'Configuración' },
  ],

  fields: [
    // ============================================
    // GRUPO: Información Básica
    // ============================================
    defineField({
      name: 'title',
      title: 'Nombre de la Plantilla',
      type: 'string',
      group: 'basic',
      description: 'Nombre interno para identificar esta plantilla de certificado',
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: 'course',
      title: 'Curso Asociado',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'course' }],
      description: 'El curso para el cual se emite este certificado',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'certificateTitle',
      title: 'Título del Certificado',
      type: 'string',
      group: 'basic',
      description: 'Título que aparece en el certificado (ej: "Certificado de Completación")',
      initialValue: 'Certificado de Completación',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'issuerName',
      title: 'Nombre del Emisor',
      type: 'string',
      group: 'basic',
      description: 'Quién firma/otorga el certificado',
      initialValue: 'Aleyda - Energía y Divinidad',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'issuerTitle',
      title: 'Título del Emisor',
      type: 'string',
      group: 'basic',
      description: 'Cargo o título de quien firma',
      initialValue: 'Instructora y Canalizadora',
    }),

    // ============================================
    // GRUPO: Diseño
    // ============================================
    defineField({
      name: 'templateImage',
      title: 'Imagen de Fondo',
      type: 'image',
      group: 'design',
      description: `📐 TAMAÑO RECOMENDADO: 842 x 595 píxeles (A4 horizontal)
📦 FORMATO: PNG o JPG
📏 Se usará como fondo del certificado PDF`,
      options: {
        hotspot: true,
        accept: 'image/jpeg,image/png',
      },
    }),
    defineField({
      name: 'logoImage',
      title: 'Logo',
      type: 'image',
      group: 'design',
      description: 'Logo que aparece en el certificado (opcional si ya está en la imagen de fondo)',
      options: {
        hotspot: true,
        accept: 'image/jpeg,image/png,image/svg+xml',
      },
    }),
    defineField({
      name: 'signatureImage',
      title: 'Firma Digital',
      type: 'image',
      group: 'design',
      description: 'Imagen de la firma del emisor (fondo transparente recomendado)',
      options: {
        accept: 'image/png',
      },
    }),
    defineField({
      name: 'primaryColor',
      title: 'Color Principal',
      type: 'string',
      group: 'design',
      description: 'Color hexadecimal para títulos (ej: #8A4BAF)',
      initialValue: '#8A4BAF',
      validation: (Rule) =>
        Rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: 'color hexadecimal' }),
    }),
    defineField({
      name: 'secondaryColor',
      title: 'Color Secundario',
      type: 'string',
      group: 'design',
      description: 'Color hexadecimal para textos secundarios (ej: #654177)',
      initialValue: '#654177',
      validation: (Rule) =>
        Rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: 'color hexadecimal' }),
    }),

    // ============================================
    // GRUPO: Configuración
    // ============================================
    defineField({
      name: 'customText',
      title: 'Texto Personalizado',
      type: 'array',
      group: 'settings',
      description: 'Texto adicional que aparece en el certificado',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
            ],
          },
        },
      ],
    }),
    defineField({
      name: 'showCourseHours',
      title: 'Mostrar Horas del Curso',
      type: 'boolean',
      group: 'settings',
      description: 'Incluir la duración total del curso en el certificado',
      initialValue: true,
    }),
    defineField({
      name: 'showCompletionDate',
      title: 'Mostrar Fecha de Completación',
      type: 'boolean',
      group: 'settings',
      description: 'Incluir la fecha en que se completó el curso',
      initialValue: true,
    }),
    defineField({
      name: 'showQRCode',
      title: 'Incluir Código QR',
      type: 'boolean',
      group: 'settings',
      description: 'Incluir código QR para verificación del certificado',
      initialValue: true,
    }),
    defineField({
      name: 'validityDuration',
      title: 'Duración de Validez (meses)',
      type: 'number',
      group: 'settings',
      description: 'Dejar vacío para certificados perpetuos (sin vencimiento)',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'published',
      title: '✅ Publicado',
      type: 'boolean',
      group: 'settings',
      description: 'Solo las plantillas publicadas pueden usarse para emitir certificados',
      initialValue: true,
    }),
  ],

  preview: {
    select: {
      title: 'title',
      courseTitle: 'course.title',
      published: 'published',
      media: 'templateImage',
    },
    prepare(selection) {
      const { title, courseTitle, published, media } = selection

      return {
        title: `${published ? '' : '🔒 '}${title}`,
        subtitle: courseTitle ? `Para: ${courseTitle}` : 'Sin curso asignado',
        media,
      }
    },
  },

  orderings: [
    {
      title: 'Título A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
    {
      title: 'Curso',
      name: 'courseAsc',
      by: [{ field: 'course.title', direction: 'asc' }],
    },
  ],
})
