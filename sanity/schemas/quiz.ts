import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'quiz',
  title: 'Quizzes',
  type: 'document',
  icon: () => '📝',

  groups: [
    { name: 'basic', title: 'Información Básica', default: true },
    { name: 'questions', title: 'Preguntas' },
    { name: 'settings', title: 'Configuración' },
  ],

  fields: [
    // ============================================
    // GRUPO: Información Básica
    // ============================================
    defineField({
      name: 'title',
      title: 'Título del Quiz',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: 'slug',
      title: 'URL del Quiz',
      type: 'slug',
      group: 'basic',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      group: 'basic',
      rows: 3,
      description: 'Instrucciones o descripción breve del quiz',
    }),

    // ============================================
    // GRUPO: Preguntas
    // ============================================
    defineField({
      name: 'questions',
      title: 'Preguntas',
      type: 'array',
      group: 'questions',
      of: [
        {
          type: 'object',
          name: 'question',
          title: 'Pregunta',
          fields: [
            {
              name: 'text',
              title: 'Texto de la Pregunta',
              type: 'text',
              rows: 2,
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'type',
              title: 'Tipo de Pregunta',
              type: 'string',
              options: {
                list: [
                  { title: 'Opción Múltiple (una respuesta)', value: 'multiple_choice' },
                  { title: 'Verdadero/Falso', value: 'true_false' },
                  { title: 'Selección Múltiple (varias respuestas)', value: 'multiple_select' },
                ],
                layout: 'radio',
              },
              initialValue: 'multiple_choice',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'options',
              title: 'Opciones de Respuesta',
              type: 'array',
              of: [{ type: 'string' }],
              description: 'Para Verdadero/Falso, deja vacío (se generan automáticamente)',
              hidden: ({ parent }) => parent?.type === 'true_false',
              validation: (Rule) =>
                Rule.custom((options, context) => {
                  const parent = context.parent as { type?: string }
                  const optionsArray = Array.isArray(options) ? options : []
                  if (parent?.type !== 'true_false' && optionsArray.length < 2) {
                    return 'Debes agregar al menos 2 opciones'
                  }
                  return true
                }),
            },
            {
              name: 'correctAnswer',
              title: 'Respuesta Correcta',
              type: 'string',
              description:
                'Para opción múltiple: el texto exacto de la opción correcta. Para V/F: "true" o "false"',
              hidden: ({ parent }) => parent?.type === 'multiple_select',
              validation: (Rule) =>
                Rule.custom((value, context) => {
                  const parent = context.parent as { type?: string }
                  if (parent?.type !== 'multiple_select' && !value) {
                    return 'La respuesta correcta es requerida'
                  }
                  return true
                }),
            },
            {
              name: 'correctAnswers',
              title: 'Respuestas Correctas',
              type: 'array',
              of: [{ type: 'string' }],
              description: 'Los textos exactos de las opciones correctas',
              hidden: ({ parent }) => parent?.type !== 'multiple_select',
              validation: (Rule) =>
                Rule.custom((value, context) => {
                  const parent = context.parent as { type?: string }
                  const valueArray = Array.isArray(value) ? value : []
                  if (parent?.type === 'multiple_select' && valueArray.length < 1) {
                    return 'Debes seleccionar al menos una respuesta correcta'
                  }
                  return true
                }),
            },
            {
              name: 'points',
              title: 'Puntos',
              type: 'number',
              description: 'Puntos otorgados por responder correctamente',
              initialValue: 1,
              validation: (Rule) => Rule.required().min(1),
            },
            {
              name: 'explanation',
              title: 'Explicación',
              type: 'text',
              rows: 2,
              description: 'Explicación mostrada después de responder (opcional)',
            },
          ],
          preview: {
            select: {
              text: 'text',
              type: 'type',
              points: 'points',
            },
            prepare({ text, type, points }) {
              const typeLabels: Record<string, string> = {
                multiple_choice: '📋 Opción Múltiple',
                true_false: '✓✗ V/F',
                multiple_select: '☑️ Selección Múltiple',
              }
              return {
                title: text?.substring(0, 60) + (text?.length > 60 ? '...' : '') || 'Sin texto',
                subtitle: `${typeLabels[type] || type} · ${points || 1} pts`,
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),

    // ============================================
    // GRUPO: Configuración
    // ============================================
    defineField({
      name: 'passingScore',
      title: 'Puntaje para Aprobar (%)',
      type: 'number',
      group: 'settings',
      description: 'Porcentaje mínimo para aprobar el quiz (ej: 70)',
      initialValue: 70,
      validation: (Rule) => Rule.required().min(1).max(100),
    }),
    defineField({
      name: 'maxAttempts',
      title: 'Máximo de Intentos',
      type: 'number',
      group: 'settings',
      description: 'Dejar vacío para intentos ilimitados',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'retakeDelayHours',
      title: 'Horas entre Intentos',
      type: 'number',
      group: 'settings',
      description: 'Tiempo de espera antes de poder reintentar (0 = sin espera)',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'timeLimit',
      title: 'Límite de Tiempo (minutos)',
      type: 'number',
      group: 'settings',
      description: 'Dejar vacío para sin límite de tiempo',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'shuffleQuestions',
      title: 'Mezclar Preguntas',
      type: 'boolean',
      group: 'settings',
      description: 'Mostrar las preguntas en orden aleatorio',
      initialValue: false,
    }),
    defineField({
      name: 'shuffleOptions',
      title: 'Mezclar Opciones',
      type: 'boolean',
      group: 'settings',
      description: 'Mostrar las opciones de respuesta en orden aleatorio',
      initialValue: false,
    }),
    defineField({
      name: 'showResultsImmediately',
      title: 'Mostrar Resultados Inmediatamente',
      type: 'boolean',
      group: 'settings',
      description: 'Mostrar si la respuesta fue correcta después de cada pregunta',
      initialValue: true,
    }),
  ],

  preview: {
    select: {
      title: 'title',
      questionsCount: 'questions',
      passingScore: 'passingScore',
      timeLimit: 'timeLimit',
    },
    prepare(selection) {
      const { title, questionsCount, passingScore, timeLimit } = selection
      const count = questionsCount?.length || 0
      const timeLimitText = timeLimit ? `${timeLimit} min` : 'Sin límite'

      return {
        title: title || 'Quiz sin título',
        subtitle: `${count} pregunta${count !== 1 ? 's' : ''} · ${passingScore}% para aprobar · ${timeLimitText}`,
      }
    },
  },

  orderings: [
    {
      title: 'Título A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
