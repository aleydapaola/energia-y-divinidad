/**
 * Script para crear el documento de configuración de sesión en Sanity
 *
 * Ejecutar con: npx ts-node scripts/create-session-config.ts
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

const sessionConfigData = {
  _type: 'sessionConfig',
  _id: 'sessionConfig', // ID fijo para que solo exista uno

  // Información de la sesión
  title: 'Sesión de Canalización',
  slug: { _type: 'slug', current: 'sesion-de-canalizacion' },
  duration: 90,
  deliveryMethod: 'video_call',
  price: 303198,
  priceUSD: 70,
  memberDiscount: 0,

  // Horarios semanales de Aleyda (hora Colombia GMT-5)
  weeklySchedule: {
    monday: [
      { _key: 'mon1', start: '08:00', end: '12:00' },
      { _key: 'mon2', start: '14:00', end: '17:00' },
    ],
    tuesday: [
      { _key: 'tue1', start: '10:00', end: '12:00' },
    ],
    wednesday: [
      { _key: 'wed1', start: '08:00', end: '12:00' },
      { _key: 'wed2', start: '15:00', end: '17:00' },
    ],
    thursday: [
      { _key: 'thu1', start: '08:00', end: '12:00' },
      { _key: 'thu2', start: '14:00', end: '17:00' },
    ],
    friday: [
      { _key: 'fri1', start: '08:00', end: '12:00' },
      { _key: 'fri2', start: '14:00', end: '17:00' },
    ],
    saturday: [
      { _key: 'sat1', start: '08:00', end: '12:00' },
    ],
    sunday: [], // No disponible los domingos
  },

  // Configuración de reservas
  bookingLeadTime: 24, // 24 horas mínimo de anticipación
  maxAdvanceBooking: 60, // Máximo 60 días en el futuro

  // Festivos colombianos 2025
  holidays: [
    { _key: 'h1', date: '2025-01-01', name: 'Año Nuevo', recurring: true },
    { _key: 'h2', date: '2025-01-06', name: 'Día de los Reyes Magos', recurring: false },
    { _key: 'h3', date: '2025-03-24', name: 'Día de San José', recurring: false },
    { _key: 'h4', date: '2025-04-17', name: 'Jueves Santo', recurring: false },
    { _key: 'h5', date: '2025-04-18', name: 'Viernes Santo', recurring: false },
    { _key: 'h6', date: '2025-05-01', name: 'Día del Trabajo', recurring: true },
    { _key: 'h7', date: '2025-06-02', name: 'Día de la Ascensión', recurring: false },
    { _key: 'h8', date: '2025-06-23', name: 'Corpus Christi', recurring: false },
    { _key: 'h9', date: '2025-06-30', name: 'Sagrado Corazón de Jesús', recurring: false },
    { _key: 'h10', date: '2025-06-30', name: 'San Pedro y San Pablo', recurring: false },
    { _key: 'h11', date: '2025-07-20', name: 'Día de la Independencia', recurring: true },
    { _key: 'h12', date: '2025-08-07', name: 'Batalla de Boyacá', recurring: true },
    { _key: 'h13', date: '2025-08-18', name: 'Asunción de la Virgen', recurring: false },
    { _key: 'h14', date: '2025-10-13', name: 'Día de la Raza', recurring: false },
    { _key: 'h15', date: '2025-11-03', name: 'Día de Todos los Santos', recurring: false },
    { _key: 'h16', date: '2025-11-17', name: 'Independencia de Cartagena', recurring: false },
    { _key: 'h17', date: '2025-12-08', name: 'Inmaculada Concepción', recurring: true },
    { _key: 'h18', date: '2025-12-25', name: 'Navidad', recurring: true },
  ],

  blockedDates: [],

  // Husos horarios disponibles
  availableTimezones: [
    { _key: 'tz1', label: 'Colombia (GMT-5)', value: 'America/Bogota', offsetHours: 0, isDefault: true },
    { _key: 'tz2', label: 'España (GMT+1/+2)', value: 'Europe/Madrid', offsetHours: 6, isDefault: false },
    { _key: 'tz3', label: 'México (GMT-6)', value: 'America/Mexico_City', offsetHours: -1, isDefault: false },
    { _key: 'tz4', label: 'Argentina (GMT-3)', value: 'America/Argentina/Buenos_Aires', offsetHours: 2, isDefault: false },
    { _key: 'tz5', label: 'Chile (GMT-3/-4)', value: 'America/Santiago', offsetHours: 2, isDefault: false },
    { _key: 'tz6', label: 'Estados Unidos Este (GMT-5/-4)', value: 'America/New_York', offsetHours: 0, isDefault: false },
    { _key: 'tz7', label: 'Estados Unidos Oeste (GMT-8/-7)', value: 'America/Los_Angeles', offsetHours: -3, isDefault: false },
  ],
  timezoneNote: 'La sesión será en hora de Colombia (GMT-5). Selecciona tu zona horaria para ver los horarios en tu hora local.',

  // Configuración avanzada
  requiresIntake: true,
  intakeQuestions: [
    { _key: 'q1', question: '¿Es tu primera sesión de canalización?', type: 'yes_no', required: true },
    { _key: 'q2', question: '¿Qué te gustaría trabajar o qué preguntas tienes para esta sesión?', type: 'long_text', required: true },
    { _key: 'q3', question: '¿Tienes alguna condición de salud física o emocional que debamos saber?', type: 'long_text', required: false },
  ],

  benefits: [
    'Claridad sobre tu camino de vida',
    'Conexión con tu guía espiritual',
    'Sanación emocional profunda',
    'Respuestas a preguntas importantes',
    'Paz interior y bienestar',
  ],

  status: 'active',
  published: true,
}

async function createSessionConfig() {
  console.log('🔮 Creando configuración de sesión en Sanity...\n')

  try {
    // Verificar si ya existe
    const existing = await client.fetch(`*[_type == "sessionConfig"][0]`)

    if (existing) {
      console.log('⚠️  Ya existe un documento de configuración de sesión.')
      console.log('   ID:', existing._id)
      console.log('   Título:', existing.title)
      console.log('\n¿Quieres sobrescribirlo? Ejecuta con --force para sobrescribir.')

      if (!process.argv.includes('--force')) {
        return
      }

      console.log('\n🔄 Sobrescribiendo documento existente...')
    }

    // Crear o actualizar el documento
    const result = await client.createOrReplace(sessionConfigData)

    console.log('✅ Configuración de sesión creada exitosamente!')
    console.log('\n📋 Detalles:')
    console.log('   ID:', result._id)
    console.log('   Título:', result.title)
    console.log('   Duración:', result.duration, 'minutos')
    console.log('   Precio COP:', result.price?.toLocaleString('es-CO'))
    console.log('   Precio USD:', result.priceUSD)
    console.log('\n📅 Horarios configurados:')
    console.log('   Lunes:', result.weeklySchedule?.monday?.map((s: any) => `${s.start}-${s.end}`).join(', ') || 'No disponible')
    console.log('   Martes:', result.weeklySchedule?.tuesday?.map((s: any) => `${s.start}-${s.end}`).join(', ') || 'No disponible')
    console.log('   Miércoles:', result.weeklySchedule?.wednesday?.map((s: any) => `${s.start}-${s.end}`).join(', ') || 'No disponible')
    console.log('   Jueves:', result.weeklySchedule?.thursday?.map((s: any) => `${s.start}-${s.end}`).join(', ') || 'No disponible')
    console.log('   Viernes:', result.weeklySchedule?.friday?.map((s: any) => `${s.start}-${s.end}`).join(', ') || 'No disponible')
    console.log('   Sábado:', result.weeklySchedule?.saturday?.map((s: any) => `${s.start}-${s.end}`).join(', ') || 'No disponible')
    console.log('   Domingo:', result.weeklySchedule?.sunday?.length ? result.weeklySchedule.sunday.map((s: any) => `${s.start}-${s.end}`).join(', ') : 'No disponible')
    console.log('\n🎉 Festivos colombianos:', result.holidays?.length || 0, 'días')
    console.log('🌍 Zonas horarias:', result.availableTimezones?.length || 0)
    console.log('\n✨ Ahora puedes editar la configuración en:')
    console.log('   https://energiaydivinidad.sanity.studio/structure/sessionConfig')

  } catch (error) {
    console.error('❌ Error al crear la configuración:', error)
    process.exit(1)
  }
}

createSessionConfig()
