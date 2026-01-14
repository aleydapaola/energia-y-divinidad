/**
 * Script para añadir festivos de Colombia a Sanity
 *
 * Uso:
 * 1. Obtener un token de Sanity en: https://www.sanity.io/manage/project/sds3d4z3jm05xypoyzukhdj6/api#tokens
 * 2. Ejecutar: SANITY_TOKEN=tu_token npx ts-node scripts/add-holidays.ts
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'm0ymba77',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
  useCdn: false,
})

// Festivos de Colombia 2025
const holidays2025 = [
  { date: '2025-01-01', name: 'Año Nuevo', recurring: true },
  { date: '2025-01-06', name: 'Día de los Reyes Magos', recurring: false },
  { date: '2025-03-24', name: 'Día de San José', recurring: false },
  { date: '2025-04-17', name: 'Jueves Santo', recurring: false },
  { date: '2025-04-18', name: 'Viernes Santo', recurring: false },
  { date: '2025-05-01', name: 'Día del Trabajo', recurring: true },
  { date: '2025-06-02', name: 'Día de la Ascensión', recurring: false },
  { date: '2025-06-23', name: 'Corpus Christi', recurring: false },
  { date: '2025-06-30', name: 'Sagrado Corazón de Jesús', recurring: false },
  { date: '2025-06-30', name: 'San Pedro y San Pablo', recurring: false },
  { date: '2025-07-20', name: 'Día de la Independencia', recurring: true },
  { date: '2025-08-07', name: 'Batalla de Boyacá', recurring: true },
  { date: '2025-08-18', name: 'Asunción de la Virgen', recurring: false },
  { date: '2025-10-13', name: 'Día de la Raza', recurring: false },
  { date: '2025-11-03', name: 'Día de Todos los Santos', recurring: false },
  { date: '2025-11-17', name: 'Independencia de Cartagena', recurring: false },
  { date: '2025-12-08', name: 'Inmaculada Concepción', recurring: true },
  { date: '2025-12-25', name: 'Navidad', recurring: true },
]

// Festivos de Colombia 2026
const holidays2026 = [
  { date: '2026-01-06', name: 'Día de los Reyes Magos', recurring: false },
  { date: '2026-03-23', name: 'Día de San José', recurring: false },
  { date: '2026-04-02', name: 'Jueves Santo', recurring: false },
  { date: '2026-04-03', name: 'Viernes Santo', recurring: false },
  { date: '2026-05-18', name: 'Día de la Ascensión', recurring: false },
  { date: '2026-06-08', name: 'Corpus Christi', recurring: false },
  { date: '2026-06-15', name: 'Sagrado Corazón de Jesús', recurring: false },
  { date: '2026-06-29', name: 'San Pedro y San Pablo', recurring: false },
  { date: '2026-08-17', name: 'Asunción de la Virgen', recurring: false },
  { date: '2026-10-12', name: 'Día de la Raza', recurring: false },
  { date: '2026-11-02', name: 'Día de Todos los Santos', recurring: false },
  { date: '2026-11-16', name: 'Independencia de Cartagena', recurring: false },
]

async function addHolidays() {
  if (!process.env.SANITY_TOKEN && !process.env.SANITY_API_TOKEN) {
    console.error('Error: SANITY_TOKEN no está definido')
    console.log('\nPasos para obtener el token:')
    console.log('1. Ve a: https://www.sanity.io/manage/project/m0ymba77/api#tokens')
    console.log('2. Haz clic en "Add API token"')
    console.log('3. Nombre: "Script Holidays"')
    console.log('4. Permisos: "Editor"')
    console.log('5. Copia el token y ejecuta:')
    console.log('   SANITY_TOKEN=tu_token npx ts-node scripts/add-holidays.ts')
    process.exit(1)
  }

  try {
    // Obtener el documento sessionConfig existente
    const sessionConfig = await client.fetch('*[_type == "sessionConfig"][0]')

    if (!sessionConfig) {
      console.error('Error: No se encontró el documento sessionConfig')
      console.log('Primero crea una sesión en Sanity Studio')
      process.exit(1)
    }

    console.log(`Documento encontrado: ${sessionConfig._id}`)
    console.log(`Festivos actuales: ${sessionConfig.holidays?.length || 0}`)

    // Combinar festivos existentes con los nuevos (evitar duplicados)
    const existingDates = new Set((sessionConfig.holidays || []).map((h: any) => h.date))
    const allHolidays = [...holidays2025, ...holidays2026]
    const newHolidays = allHolidays.filter(h => !existingDates.has(h.date))

    if (newHolidays.length === 0) {
      console.log('No hay festivos nuevos para añadir')
      return
    }

    console.log(`\nAñadiendo ${newHolidays.length} festivos nuevos...`)

    // Actualizar el documento
    const updatedHolidays = [...(sessionConfig.holidays || []), ...newHolidays]

    await client
      .patch(sessionConfig._id)
      .set({ holidays: updatedHolidays })
      .commit()

    console.log(`\n✅ Festivos añadidos correctamente!`)
    console.log(`Total de festivos: ${updatedHolidays.length}`)
    console.log('\nRecuerda publicar los cambios en Sanity Studio')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addHolidays()
