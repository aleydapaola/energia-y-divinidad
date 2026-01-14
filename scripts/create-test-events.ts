/**
 * Script para crear eventos de prueba en Sanity
 *
 * Ejecutar con: npx ts-node scripts/create-test-events.ts
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

// Función para generar fechas futuras
function getFutureDate(daysFromNow: number, hour: number = 10): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const testEvents: any[] = [
  {
    _type: 'event',
    _id: 'event-test-1',
    title: 'Círculo de Meditación Luna Llena',
    slug: { _type: 'slug', current: 'circulo-meditacion-luna-llena-febrero' },
    eventType: 'ceremony',
    description: [
      {
        _type: 'block',
        _key: 'desc1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'span1',
            text: 'Únete a nuestro círculo sagrado de meditación bajo la energía de la luna llena. Una experiencia transformadora donde conectaremos con nuestra esencia y liberaremos lo que ya no nos sirve.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    eventDate: getFutureDate(7, 19), // En 7 días a las 7pm
    locationType: 'online',
    zoom: {
      meetingUrl: 'https://zoom.us/j/123456789',
      meetingId: '123 456 789',
    },
    price: 80000,
    priceUSD: 20,
    capacity: 30,
    availableSpots: 30,
    maxPerBooking: 1,
    featured: true,
    published: true,
    status: 'upcoming',
    categories: ['meditacion', 'espiritualidad'],
    tags: ['luna llena', 'círculo', 'principiantes'],
    timeOfDay: 'evening',
    whatToBring: ['Vela blanca', 'Cuaderno para notas', 'Agua'],
    includes: ['Meditación guiada', 'Ritual de liberación', 'Grabación disponible 7 días'],
    includedInMembership: true,
    memberDiscount: 0,
  },
  {
    _type: 'event',
    _id: 'event-test-2',
    title: 'Taller: Introducción a los Registros Akáshicos',
    slug: { _type: 'slug', current: 'taller-introduccion-registros-akashicos' },
    eventType: 'workshop_online',
    description: [
      {
        _type: 'block',
        _key: 'desc1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'span1',
            text: 'Aprende los fundamentos para acceder a tus Registros Akáshicos. En este taller teórico-práctico descubrirás qué son, cómo funcionan y realizarás tu primera apertura guiada.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    eventDate: getFutureDate(14, 10), // En 14 días a las 10am
    locationType: 'online',
    zoom: {
      meetingUrl: 'https://zoom.us/j/987654321',
      meetingId: '987 654 321',
    },
    price: 180000,
    priceUSD: 45,
    earlyBirdPrice: 150000,
    earlyBirdDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    capacity: 15,
    availableSpots: 15,
    maxPerBooking: 1,
    featured: true,
    published: true,
    status: 'upcoming',
    categories: ['registros_akashicos', 'desarrollo_personal'],
    tags: ['registros akáshicos', 'principiantes', 'formación'],
    timeOfDay: 'morning',
    whatToBring: ['Cuaderno', 'Espacio tranquilo', 'Auriculares'],
    includes: ['Material didáctico PDF', 'Meditación de apertura', 'Certificado de participación', 'Grabación del taller'],
    includedInMembership: false,
    memberDiscount: 20,
  },
  {
    _type: 'event',
    _id: 'event-test-3',
    title: 'Sesión Grupal de Sanación con Cristales',
    slug: { _type: 'slug', current: 'sesion-grupal-sanacion-cristales' },
    eventType: 'webinar',
    description: [
      {
        _type: 'block',
        _key: 'desc1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'span1',
            text: 'Experimenta el poder sanador de los cristales en esta sesión grupal. Trabajaremos con cuarzo rosa para abrir el corazón y amatista para la conexión espiritual.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    eventDate: getFutureDate(21, 18), // En 21 días a las 6pm
    locationType: 'online',
    zoom: {
      meetingUrl: 'https://zoom.us/j/456789123',
      meetingId: '456 789 123',
    },
    price: 60000,
    priceUSD: 15,
    capacity: 50,
    availableSpots: 50,
    maxPerBooking: 1,
    featured: false,
    published: true,
    status: 'upcoming',
    categories: ['cristales', 'sanacion'],
    tags: ['cristales', 'sanación', 'cuarzo rosa', 'amatista'],
    timeOfDay: 'evening',
    whatToBring: ['Cristal de cuarzo (si tienes)', 'Vaso de agua', 'Manta cómoda'],
    includes: ['Guía de cristales PDF', 'Meditación guiada', 'Técnicas de limpieza energética'],
    includedInMembership: true,
    memberDiscount: 0,
  },
  {
    _type: 'event',
    _id: 'event-test-4',
    title: 'Retiro de Fin de Semana: Reconexión Interior',
    slug: { _type: 'slug', current: 'retiro-reconexion-interior-marzo' },
    eventType: 'retreat',
    description: [
      {
        _type: 'block',
        _key: 'desc1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'span1',
            text: 'Un fin de semana completo dedicado a tu transformación personal. Incluye sesiones de meditación, canalización grupal, trabajo con cristales y conexión con la naturaleza.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    eventDate: getFutureDate(45, 9), // En 45 días a las 9am
    endDate: getFutureDate(47, 17), // Termina 2 días después a las 5pm
    locationType: 'in_person',
    venue: {
      name: 'Finca El Despertar',
      address: 'Vereda La Esperanza, Km 15',
      city: 'Guasca',
      country: 'Colombia',
      instructions: 'Punto de encuentro en el parque principal de Guasca a las 8:30am. Transporte incluido desde allí.',
    },
    price: 850000,
    priceUSD: 200,
    earlyBirdPrice: 750000,
    earlyBirdDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    capacity: 12,
    availableSpots: 12,
    maxPerBooking: 1,
    featured: true,
    published: true,
    status: 'upcoming',
    categories: ['espiritualidad', 'sanacion', 'meditacion'],
    tags: ['retiro', 'naturaleza', 'transformación', 'inmersivo'],
    timeOfDay: 'morning',
    whatToBring: ['Ropa cómoda', 'Bloqueador solar', 'Linterna', 'Artículos de aseo personal'],
    includes: ['Alojamiento 2 noches', 'Alimentación vegetariana completa', 'Todas las actividades', 'Material de trabajo', 'Transporte desde Guasca'],
    requirements: 'Traer sleeping bag o sábanas propias. No recomendado para personas con movilidad reducida.',
    includedInMembership: false,
    memberDiscount: 15,
  },
]

async function createTestEvents() {
  console.log('📅 Creando eventos de prueba en Sanity...\n')

  try {
    for (const event of testEvents) {
      console.log(`  📝 Creando: ${event.title}...`)

      const result = await client.createOrReplace(event)

      const eventDate = new Date(event.eventDate).toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      console.log(`     ✅ Creado - ${eventDate}`)
      console.log(`        Precio: $${event.price?.toLocaleString('es-CO')} COP / $${event.priceUSD} USD`)
      console.log(`        Cupos: ${event.capacity}`)
      console.log('')
    }

    console.log('🎉 ¡Todos los eventos de prueba han sido creados!')
    console.log('\n📋 Resumen:')
    console.log(`   - ${testEvents.length} eventos creados`)
    console.log('   - 1 ceremonia (Círculo Luna Llena)')
    console.log('   - 1 taller online (Registros Akáshicos)')
    console.log('   - 1 webinar grupal (Sanación con Cristales)')
    console.log('   - 1 retiro presencial (Reconexión Interior)')
    console.log('\n✨ Puedes ver y editar los eventos en Sanity Studio')

  } catch (error) {
    console.error('❌ Error al crear eventos:', error)
    process.exit(1)
  }
}

createTestEvents()
