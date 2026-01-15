import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'discountCode',
  title: 'Códigos de Descuento',
  type: 'document',
  icon: () => '🏷️',

  groups: [
    { name: 'basic', title: 'Información Básica', default: true },
    { name: 'discount', title: 'Configuración del Descuento' },
    { name: 'usage', title: 'Límites de Uso' },
    { name: 'restrictions', title: 'Restricciones' },
  ],

  fields: [
    // ============================================
    // GRUPO: Información Básica
    // ============================================
    defineField({
      name: 'code',
      title: 'Código',
      type: 'string',
      group: 'basic',
      description: 'El código que los usuarios escribirán (se convertirá a mayúsculas automáticamente)',
      validation: (Rule) =>
        Rule.required()
          .min(3)
          .max(30)
          .regex(/^[A-Z0-9_-]+$/i, {
            name: 'alfanumérico',
            invert: false,
          })
          .error('Solo letras, números, guiones y guiones bajos'),
    }),
    defineField({
      name: 'description',
      title: 'Descripción Interna',
      type: 'text',
      group: 'basic',
      rows: 2,
      description: 'Nota interna sobre este código (no visible para usuarios)',
    }),
    defineField({
      name: 'active',
      title: '✅ Activo',
      type: 'boolean',
      group: 'basic',
      description: 'Desactívalo para deshabilitar el código sin eliminarlo',
      initialValue: true,
    }),

    // ============================================
    // GRUPO: Configuración del Descuento
    // ============================================
    defineField({
      name: 'discountType',
      title: 'Tipo de Descuento',
      type: 'string',
      group: 'discount',
      options: {
        list: [
          { title: '📊 Porcentaje (%)', value: 'percentage' },
          { title: '💰 Monto Fijo', value: 'fixed_amount' },
        ],
        layout: 'radio',
      },
      initialValue: 'percentage',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'discountValue',
      title: 'Valor del Descuento',
      type: 'number',
      group: 'discount',
      description: 'Para porcentaje: 1-100. Para monto fijo: cantidad en la moneda seleccionada',
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .custom((value, context) => {
            const parent = context.parent as { discountType?: string }
            if (parent?.discountType === 'percentage' && value && value > 100) {
              return 'El porcentaje no puede ser mayor a 100'
            }
            return true
          }),
    }),
    defineField({
      name: 'currency',
      title: 'Moneda (para monto fijo)',
      type: 'string',
      group: 'discount',
      options: {
        list: [
          { title: 'Pesos Colombianos (COP)', value: 'COP' },
          { title: 'Dólares (USD)', value: 'USD' },
        ],
        layout: 'radio',
      },
      hidden: ({ parent }) => parent?.discountType !== 'fixed_amount',
      description: 'Moneda del monto fijo de descuento',
    }),

    // ============================================
    // GRUPO: Límites de Uso
    // ============================================
    defineField({
      name: 'usageType',
      title: 'Tipo de Uso',
      type: 'string',
      group: 'usage',
      options: {
        list: [
          { title: '♾️ Multi-uso (cualquier usuario puede usarlo)', value: 'multi_use' },
          { title: '1️⃣ Un solo uso (solo funciona una vez)', value: 'single_use' },
        ],
        layout: 'radio',
      },
      initialValue: 'multi_use',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'maxUses',
      title: 'Número Máximo de Usos',
      type: 'number',
      group: 'usage',
      description: 'Déjalo vacío para uso ilimitado',
      hidden: ({ parent }) => parent?.usageType === 'single_use',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'validFrom',
      title: 'Válido Desde',
      type: 'datetime',
      group: 'usage',
      description: 'Opcional - Fecha desde la que el código es válido',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),
    defineField({
      name: 'validUntil',
      title: 'Válido Hasta (Fecha de Expiración)',
      type: 'datetime',
      group: 'usage',
      description: 'Opcional - El código dejará de funcionar después de esta fecha',
      options: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
    }),

    // ============================================
    // GRUPO: Restricciones
    // ============================================
    defineField({
      name: 'appliesToCourses',
      title: 'Aplica a Cursos Específicos',
      type: 'array',
      group: 'restrictions',
      description: 'Deja vacío para que aplique a TODOS los cursos',
      of: [
        {
          type: 'reference',
          to: [{ type: 'course' }],
        },
      ],
    }),
    defineField({
      name: 'minPurchaseAmount',
      title: 'Monto Mínimo de Compra (COP)',
      type: 'number',
      group: 'restrictions',
      description: 'Opcional - El carrito debe tener al menos este monto para aplicar el código',
      validation: (Rule) => Rule.min(0),
    }),
  ],

  preview: {
    select: {
      code: 'code',
      discountType: 'discountType',
      discountValue: 'discountValue',
      active: 'active',
      usageType: 'usageType',
      validUntil: 'validUntil',
    },
    prepare(selection) {
      const { code, discountType, discountValue, active, usageType, validUntil } = selection

      const discountText =
        discountType === 'percentage'
          ? `${discountValue}%`
          : `$${discountValue?.toLocaleString('es-CO')}`

      const usageIcon = usageType === 'single_use' ? '1️⃣' : '♾️'

      const isExpired = validUntil && new Date(validUntil) < new Date()
      const expiryText = isExpired ? '⏰ Expirado' : ''

      const statusIcon = !active ? '🔒' : isExpired ? '⏰' : '✅'

      return {
        title: `${statusIcon} ${code.toUpperCase()}`,
        subtitle: `${usageIcon} ${discountText} de descuento ${expiryText}`,
      }
    },
  },

  orderings: [
    {
      title: 'Código A-Z',
      name: 'codeAsc',
      by: [{ field: 'code', direction: 'asc' }],
    },
    {
      title: 'Más recientes primero',
      name: 'createdDesc',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
    {
      title: 'Por expiración',
      name: 'validUntilAsc',
      by: [{ field: 'validUntil', direction: 'asc' }],
    },
  ],
})
