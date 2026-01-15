/**
 * Script para crear cursos de prueba en Sanity
 *
 * Ejecutar con: npx ts-node scripts/create-test-courses.ts
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const token = process.env.SANITY_API_TOKEN

console.log('📌 Proyecto Sanity:', projectId)
console.log('🔑 Token presente:', token ? 'Sí (' + token.substring(0, 10) + '...)' : 'No')

if (!projectId || !token) {
  console.error('❌ Falta NEXT_PUBLIC_SANITY_PROJECT_ID o SANITY_API_TOKEN en .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: token,
  useCdn: false,
})

// URLs de YouTube válidas (videos públicos de meditación/espiritualidad)
const youtubeUrls = {
  meditacion1: 'https://www.youtube.com/watch?v=inpok4MKVLM', // 5 min meditation
  meditacion2: 'https://www.youtube.com/watch?v=z6X5oEIg6Ak', // Guided meditation
  naturaleza: 'https://www.youtube.com/watch?v=lFcSrYw-ARY', // Nature meditation
  chakras: 'https://www.youtube.com/watch?v=_4OuAApoeLU', // Chakra meditation
  respiracion: 'https://www.youtube.com/watch?v=tybOi4hjZFQ', // Breathing exercise
  yoga: 'https://www.youtube.com/watch?v=v7AYKMP6rOE', // Yoga flow
  preview: 'https://www.youtube.com/watch?v=O-6f5wQXSu8', // Short preview
}

// Helper para crear bloques de texto
function createBlock(text: string, key: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: `${key}-span`,
        text: text,
        marks: [],
      },
    ],
    markDefs: [],
  }
}

// =================== LECCIONES ===================

const lessons: any[] = [
  // Lecciones para curso simple (meditación)
  {
    _type: 'courseLesson',
    _id: 'lesson-meditacion-manana',
    title: 'Meditación de la Mañana',
    slug: { _type: 'slug', current: 'meditacion-manana' },
    description: 'Una meditación guiada de 15 minutos perfecta para comenzar tu día con energía positiva y claridad mental.',
    lessonType: 'video',
    videoUrl: youtubeUrls.meditacion1,
    videoDuration: '15 min',
    order: 1,
    isFreePreview: true,
    published: true,
  },
  // Lecciones para curso modular - Módulo 1: Fundamentos
  {
    _type: 'courseLesson',
    _id: 'lesson-intro-chakras',
    title: 'Introducción al Sistema de Chakras',
    slug: { _type: 'slug', current: 'introduccion-chakras' },
    description: 'Aprende qué son los chakras, su origen histórico y cómo influyen en nuestra vida diaria.',
    lessonType: 'video',
    videoUrl: youtubeUrls.chakras,
    videoDuration: '20 min',
    order: 1,
    isFreePreview: true,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-anatomia-energetica',
    title: 'Anatomía Energética del Ser Humano',
    slug: { _type: 'slug', current: 'anatomia-energetica' },
    description: 'Descubre cómo fluye la energía en tu cuerpo y la conexión entre los chakras y tu bienestar.',
    lessonType: 'video',
    videoUrl: youtubeUrls.naturaleza,
    videoDuration: '25 min',
    order: 2,
    isFreePreview: false,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-detectar-bloqueos',
    title: 'Cómo Detectar Bloqueos Energéticos',
    slug: { _type: 'slug', current: 'detectar-bloqueos' },
    description: 'Técnicas prácticas para identificar en qué chakras tienes bloqueos o desequilibrios.',
    lessonType: 'video',
    videoUrl: youtubeUrls.respiracion,
    videoDuration: '18 min',
    order: 3,
    isFreePreview: false,
    published: true,
  },
  // Lecciones para curso modular - Módulo 2: Chakras Inferiores
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-raiz',
    title: 'Chakra Raíz: Tu Conexión con la Tierra',
    slug: { _type: 'slug', current: 'chakra-raiz' },
    description: 'Todo sobre el primer chakra: ubicación, color, elemento y cómo equilibrarlo.',
    lessonType: 'video',
    videoUrl: youtubeUrls.meditacion2,
    videoDuration: '22 min',
    order: 1,
    isFreePreview: false,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-sacro',
    title: 'Chakra Sacro: Creatividad y Emociones',
    slug: { _type: 'slug', current: 'chakra-sacro' },
    description: 'El segundo chakra y su influencia en tu creatividad, sensualidad y emociones.',
    lessonType: 'video',
    videoUrl: youtubeUrls.yoga,
    videoDuration: '24 min',
    order: 2,
    isFreePreview: false,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-plexo',
    title: 'Chakra Plexo Solar: Tu Poder Personal',
    slug: { _type: 'slug', current: 'chakra-plexo-solar' },
    description: 'Activa tu tercer chakra para fortalecer tu autoestima y voluntad.',
    lessonType: 'video',
    videoUrl: youtubeUrls.respiracion,
    videoDuration: '20 min',
    order: 3,
    isFreePreview: false,
    published: true,
  },
  // Lecciones para curso modular - Módulo 3: Chakras Superiores
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-corazon',
    title: 'Chakra Corazón: Amor Incondicional',
    slug: { _type: 'slug', current: 'chakra-corazon' },
    description: 'Abre tu corazón al amor propio y hacia los demás.',
    lessonType: 'video',
    videoUrl: youtubeUrls.meditacion1,
    videoDuration: '26 min',
    order: 1,
    isFreePreview: false,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-garganta',
    title: 'Chakra Garganta: Expresión Auténtica',
    slug: { _type: 'slug', current: 'chakra-garganta' },
    description: 'Libera tu voz interior y comunica tu verdad.',
    lessonType: 'video',
    videoUrl: youtubeUrls.naturaleza,
    videoDuration: '19 min',
    order: 2,
    isFreePreview: false,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-tercer-ojo',
    title: 'Chakra Tercer Ojo: Intuición y Visión',
    slug: { _type: 'slug', current: 'chakra-tercer-ojo' },
    description: 'Desarrolla tu intuición y clarividencia.',
    lessonType: 'video',
    videoUrl: youtubeUrls.chakras,
    videoDuration: '28 min',
    order: 3,
    isFreePreview: false,
    published: true,
  },
  {
    _type: 'courseLesson',
    _id: 'lesson-chakra-corona',
    title: 'Chakra Corona: Conexión Divina',
    slug: { _type: 'slug', current: 'chakra-corona' },
    description: 'Tu puerta hacia la espiritualidad y la conexión con el universo.',
    lessonType: 'video',
    videoUrl: youtubeUrls.meditacion2,
    videoDuration: '30 min',
    order: 4,
    isFreePreview: false,
    published: true,
  },
  // Lección de texto (material complementario)
  {
    _type: 'courseLesson',
    _id: 'lesson-guia-practica',
    title: 'Guía Práctica: Rutina Diaria de Chakras',
    slug: { _type: 'slug', current: 'guia-practica-chakras' },
    description: 'Material de lectura con ejercicios diarios para mantener tus chakras equilibrados.',
    lessonType: 'text',
    content: [
      createBlock('En esta guía encontrarás una rutina completa para equilibrar tus 7 chakras principales.', 'p1'),
      createBlock('RUTINA MATUTINA (15 minutos)', 'p2'),
      createBlock('1. Comienza con 3 respiraciones profundas, visualizando luz dorada entrando por tu corona.', 'p3'),
      createBlock('2. Escanea tu cuerpo desde la coronilla hasta los pies, detectando cualquier tensión.', 'p4'),
      createBlock('3. Visualiza cada chakra como una esfera de luz de su color correspondiente.', 'p5'),
      createBlock('PRÁCTICA SEMANAL', 'p6'),
      createBlock('Dedica un día de la semana a cada chakra. Por ejemplo: Lunes - Raíz, Martes - Sacro, etc.', 'p7'),
      createBlock('Recuerda: la constancia es más importante que la duración. 10 minutos diarios son mejor que una hora esporádica.', 'p8'),
    ],
    order: 5,
    isFreePreview: false,
    published: true,
  },
]

// =================== MÓDULOS ===================

const modules: any[] = [
  {
    _type: 'courseModule',
    _id: 'module-fundamentos-chakras',
    title: 'Módulo 1: Fundamentos del Sistema de Chakras',
    description: 'Aprende las bases teóricas y prácticas para comprender cómo funcionan los chakras.',
    order: 1,
    lessons: [
      { _type: 'reference', _ref: 'lesson-intro-chakras', _key: 'ref-1' },
      { _type: 'reference', _ref: 'lesson-anatomia-energetica', _key: 'ref-2' },
      { _type: 'reference', _ref: 'lesson-detectar-bloqueos', _key: 'ref-3' },
    ],
  },
  {
    _type: 'courseModule',
    _id: 'module-chakras-inferiores',
    title: 'Módulo 2: Chakras Inferiores',
    description: 'Trabaja con los tres primeros chakras: raíz, sacro y plexo solar.',
    order: 2,
    lessons: [
      { _type: 'reference', _ref: 'lesson-chakra-raiz', _key: 'ref-4' },
      { _type: 'reference', _ref: 'lesson-chakra-sacro', _key: 'ref-5' },
      { _type: 'reference', _ref: 'lesson-chakra-plexo', _key: 'ref-6' },
    ],
  },
  {
    _type: 'courseModule',
    _id: 'module-chakras-superiores',
    title: 'Módulo 3: Chakras Superiores',
    description: 'Explora los cuatro chakras superiores y tu conexión espiritual.',
    order: 3,
    lessons: [
      { _type: 'reference', _ref: 'lesson-chakra-corazon', _key: 'ref-7' },
      { _type: 'reference', _ref: 'lesson-chakra-garganta', _key: 'ref-8' },
      { _type: 'reference', _ref: 'lesson-chakra-tercer-ojo', _key: 'ref-9' },
      { _type: 'reference', _ref: 'lesson-chakra-corona', _key: 'ref-10' },
    ],
  },
  {
    _type: 'courseModule',
    _id: 'module-integracion',
    title: 'Módulo 4: Integración y Práctica',
    description: 'Material complementario y guías prácticas para tu día a día.',
    order: 4,
    lessons: [
      { _type: 'reference', _ref: 'lesson-guia-practica', _key: 'ref-11' },
    ],
  },
]

// =================== CURSOS ===================

const courses: any[] = [
  // Curso Simple (una meditación)
  {
    _type: 'course',
    _id: 'course-meditacion-manana',
    title: 'Meditación de la Mañana',
    slug: { _type: 'slug', current: 'meditacion-manana' },
    shortDescription: 'Comienza cada día con esta meditación guiada de 15 minutos que te llenará de energía y claridad.',
    description: [
      createBlock('Esta meditación ha sido especialmente diseñada para ser tu compañera cada mañana.', 'd1'),
      createBlock('En solo 15 minutos, conectarás con tu respiración, establecerás tu intención para el día y activarás tu energía vital.', 'd2'),
      createBlock('Perfecta tanto para principiantes como para practicantes experimentados que buscan una rutina matutina efectiva.', 'd3'),
    ],
    courseType: 'simple',
    simpleLesson: { _type: 'reference', _ref: 'lesson-meditacion-manana' },
    previewVideoUrl: youtubeUrls.preview,
    price: 0,
    priceUSD: 0,
    instructor: 'Aleyda',
    totalDuration: '15 min',
    difficulty: 'beginner',
    topics: ['Meditación', 'Mindfulness', 'Energía'],
    whatYouWillLearn: [
      'Técnicas de respiración consciente',
      'Cómo establecer intenciones diarias',
      'Visualización energética básica',
    ],
    status: 'active',
    featured: true,
    displayOrder: 1,
    published: true,
    includedInMembership: true,
    memberDiscount: 0,
  },
  // Curso Modular Completo
  {
    _type: 'course',
    _id: 'course-chakras-completo',
    title: 'Equilibrio de Chakras: Guía Completa',
    slug: { _type: 'slug', current: 'equilibrio-chakras-guia-completa' },
    shortDescription: 'Domina el sistema de chakras con este curso completo que incluye teoría, práctica y meditaciones guiadas.',
    description: [
      createBlock('¿Sientes que algo no fluye en tu vida? ¿Te falta energía, creatividad o claridad mental?', 'd1'),
      createBlock('La respuesta puede estar en tus chakras. Este curso te llevará en un viaje transformador a través de los 7 centros energéticos principales de tu cuerpo.', 'd2'),
      createBlock('Aprenderás a identificar bloqueos, equilibrar tu energía y mantener un bienestar integral que impactará todas las áreas de tu vida.', 'd3'),
      createBlock('Incluye más de 3 horas de contenido en video, meditaciones guiadas para cada chakra y material descargable.', 'd4'),
    ],
    courseType: 'modular',
    modules: [
      { _type: 'reference', _ref: 'module-fundamentos-chakras', _key: 'mod-1' },
      { _type: 'reference', _ref: 'module-chakras-inferiores', _key: 'mod-2' },
      { _type: 'reference', _ref: 'module-chakras-superiores', _key: 'mod-3' },
      { _type: 'reference', _ref: 'module-integracion', _key: 'mod-4' },
    ],
    previewVideoUrl: youtubeUrls.preview,
    price: 197000,
    priceUSD: 49,
    compareAtPrice: 297000,
    compareAtPriceUSD: 75,
    instructor: 'Aleyda',
    totalDuration: '3h 30min',
    difficulty: 'beginner',
    topics: ['Chakras', 'Energía', 'Meditación', 'Sanación'],
    whatYouWillLearn: [
      'Comprender el sistema completo de los 7 chakras',
      'Identificar bloqueos energéticos en tu cuerpo',
      'Técnicas específicas para equilibrar cada chakra',
      'Meditaciones guiadas para activación energética',
      'Crear una rutina diaria de mantenimiento energético',
    ],
    requirements: [
      'No se requiere experiencia previa',
      'Un espacio tranquilo para meditar',
      'Cuaderno para tomar notas',
    ],
    status: 'active',
    featured: true,
    displayOrder: 2,
    published: true,
    includedInMembership: false,
    membershipTiers: ['premium'],
    memberDiscount: 30,
  },
  // Curso de precio medio
  {
    _type: 'course',
    _id: 'course-registros-akashicos-intro',
    title: 'Introducción a los Registros Akáshicos',
    slug: { _type: 'slug', current: 'introduccion-registros-akashicos' },
    shortDescription: 'Descubre qué son los Registros Akáshicos y aprende a realizar tu primera apertura guiada.',
    description: [
      createBlock('Los Registros Akáshicos son el archivo energético de todas las experiencias del alma.', 'd1'),
      createBlock('En este curso introductorio aprenderás los fundamentos para acceder a esta sabiduría ancestral.', 'd2'),
      createBlock('Incluye una meditación guiada para tu primera apertura de registros.', 'd3'),
    ],
    courseType: 'simple',
    simpleLesson: { _type: 'reference', _ref: 'lesson-meditacion-manana' }, // Usamos la misma lección como placeholder
    previewVideoUrl: youtubeUrls.preview,
    price: 97000,
    priceUSD: 25,
    instructor: 'Aleyda',
    totalDuration: '45 min',
    difficulty: 'beginner',
    topics: ['Registros Akáshicos', 'Espiritualidad', 'Desarrollo Personal'],
    whatYouWillLearn: [
      'Qué son los Registros Akáshicos',
      'Cómo prepararte para una apertura',
      'Realizar tu primera apertura guiada',
    ],
    status: 'active',
    featured: false,
    displayOrder: 3,
    published: true,
    includedInMembership: false,
    memberDiscount: 20,
  },
  // Curso próximamente
  {
    _type: 'course',
    _id: 'course-abundancia-manifestacion',
    title: 'Manifestación y Abundancia',
    slug: { _type: 'slug', current: 'manifestacion-abundancia' },
    shortDescription: 'Aprende a manifestar abundancia en todas las áreas de tu vida con técnicas energéticas comprobadas.',
    description: [
      createBlock('La abundancia es tu estado natural. Este curso te ayudará a remover los bloqueos que te impiden recibirla.', 'd1'),
      createBlock('Próximamente disponible - ¡Inscríbete para ser notificado!', 'd2'),
    ],
    courseType: 'modular',
    modules: [],
    price: 147000,
    priceUSD: 37,
    instructor: 'Aleyda',
    totalDuration: '2h',
    difficulty: 'intermediate',
    topics: ['Abundancia', 'Manifestación', 'Ley de Atracción'],
    whatYouWillLearn: [
      'Identificar creencias limitantes sobre el dinero',
      'Técnicas de limpieza energética financiera',
      'Rituales de abundancia',
    ],
    status: 'coming_soon',
    featured: false,
    displayOrder: 4,
    published: true,
    includedInMembership: false,
    memberDiscount: 15,
  },
]

async function createTestCourses() {
  console.log('📚 Creando cursos de prueba en Sanity...\n')

  try {
    // 1. Crear lecciones primero
    console.log('📝 Creando lecciones...')
    for (const lesson of lessons) {
      console.log(`   - ${lesson.title}`)
      await client.createOrReplace(lesson)
    }
    console.log(`   ✅ ${lessons.length} lecciones creadas\n`)

    // 2. Crear módulos
    console.log('📦 Creando módulos...')
    for (const module of modules) {
      console.log(`   - ${module.title}`)
      await client.createOrReplace(module)
    }
    console.log(`   ✅ ${modules.length} módulos creados\n`)

    // 3. Crear cursos
    console.log('🎓 Creando cursos...')
    for (const course of courses) {
      console.log(`   - ${course.title}`)
      console.log(`     Tipo: ${course.courseType}`)
      console.log(`     Precio: $${course.price?.toLocaleString('es-CO')} COP / $${course.priceUSD} USD`)
      console.log(`     Estado: ${course.status}`)
      await client.createOrReplace(course)
      console.log('')
    }
    console.log(`   ✅ ${courses.length} cursos creados\n`)

    console.log('🎉 ¡Todos los cursos de prueba han sido creados!')
    console.log('\n📋 Resumen:')
    console.log(`   - ${lessons.length} lecciones`)
    console.log(`   - ${modules.length} módulos`)
    console.log(`   - ${courses.length} cursos:`)
    console.log('     • 1 meditación gratuita (curso simple)')
    console.log('     • 1 curso completo de chakras (modular, $197.000 COP)')
    console.log('     • 1 curso de registros akáshicos (simple, $97.000 COP)')
    console.log('     • 1 curso "próximamente" (manifestación)')
    console.log('\n✨ Puedes ver y editar los cursos en Sanity Studio')

  } catch (error) {
    console.error('❌ Error al crear cursos:', error)
    process.exit(1)
  }
}

createTestCourses()
