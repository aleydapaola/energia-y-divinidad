import { client } from '../client'

// Interfaces
export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  recurring: boolean
}

export interface BlockedDateRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  reason?: string
}

export interface Timezone {
  label: string // "Colombia (GMT-5)"
  value: string // "America/Bogota"
  offsetHours: number // Diferencia con Colombia en horas
  isDefault: boolean
}

export interface BookingSettings {
  _id: string
  _type: 'bookingSettings'
  holidays?: Holiday[]
  blockedDates?: BlockedDateRange[]
  availableTimezones?: Timezone[]
  defaultLeadTime: number
  defaultMaxAdvance: number
  timezoneNote?: string
}

// Query fields
const bookingSettingsFields = `
  _id,
  _type,
  holidays[] {
    date,
    name,
    recurring
  },
  blockedDates[] {
    startDate,
    endDate,
    reason
  },
  availableTimezones[] {
    label,
    value,
    offsetHours,
    isDefault
  },
  defaultLeadTime,
  defaultMaxAdvance,
  timezoneNote
`

/**
 * Obtiene la configuracion de reservas (singleton)
 */
export async function getBookingSettings(): Promise<BookingSettings | null> {
  const query = `*[_type == "bookingSettings"][0] {
    ${bookingSettingsFields}
  }`
  return client.fetch(query)
}

/**
 * Obtiene solo los dias festivos
 */
export async function getHolidays(): Promise<Holiday[]> {
  const query = `*[_type == "bookingSettings"][0].holidays[] {
    date,
    name,
    recurring
  }`
  const result = await client.fetch(query)
  return result || []
}

/**
 * Obtiene solo las fechas bloqueadas
 */
export async function getBlockedDates(): Promise<BlockedDateRange[]> {
  const query = `*[_type == "bookingSettings"][0].blockedDates[] {
    startDate,
    endDate,
    reason
  }`
  const result = await client.fetch(query)
  return result || []
}

/**
 * Obtiene solo los husos horarios disponibles
 */
export async function getAvailableTimezones(): Promise<Timezone[]> {
  const query = `*[_type == "bookingSettings"][0].availableTimezones[] {
    label,
    value,
    offsetHours,
    isDefault
  }`
  const result = await client.fetch(query)
  return result || []
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Verifica si una fecha es festivo
 * @param date - Fecha a verificar (YYYY-MM-DD)
 * @param holidays - Lista de festivos
 */
export function isHoliday(date: string, holidays: Holiday[]): boolean {
  const [year, month, day] = date.split('-')

  for (const holiday of holidays) {
    if (holiday.recurring) {
      // Para festivos recurrentes, solo comparamos mes y dia
      const [, hMonth, hDay] = holiday.date.split('-')
      if (month === hMonth && day === hDay) {
        return true
      }
    } else {
      // Para festivos no recurrentes, comparamos la fecha completa
      if (date === holiday.date) {
        return true
      }
    }
  }

  return false
}

/**
 * Verifica si una fecha esta en un rango bloqueado
 * @param date - Fecha a verificar (YYYY-MM-DD)
 * @param blockedDates - Lista de rangos bloqueados
 */
export function isInBlockedRange(date: string, blockedDates: BlockedDateRange[]): boolean {
  for (const blocked of blockedDates) {
    if (date >= blocked.startDate && date <= blocked.endDate) {
      return true
    }
  }
  return false
}

/**
 * Verifica si una fecha es valida para reservar
 * @param date - Fecha a verificar (YYYY-MM-DD)
 * @param holidays - Lista de festivos
 * @param blockedDates - Lista de rangos bloqueados
 */
export function isDateAvailableForBooking(
  date: string,
  holidays: Holiday[],
  blockedDates: BlockedDateRange[]
): boolean {
  // Verificar si es festivo
  if (isHoliday(date, holidays)) {
    return false
  }

  // Verificar si esta en un rango bloqueado
  if (isInBlockedRange(date, blockedDates)) {
    return false
  }

  return true
}

/**
 * Obtiene el timezone por defecto
 * @param timezones - Lista de zonas horarias disponibles
 */
export function getDefaultTimezone(timezones: Timezone[]): Timezone | null {
  return timezones.find(tz => tz.isDefault) || timezones[0] || null
}

/**
 * Convierte una hora de Colombia a otra zona horaria
 * @param timeCololombia - Hora en formato HH:mm (hora Colombia)
 * @param offsetHours - Diferencia en horas respecto a Colombia
 * @returns Hora convertida en formato HH:mm
 */
export function convertTimeFromColombia(timeColombia: string, offsetHours: number): string {
  const [hours, minutes] = timeColombia.split(':').map(Number)

  let newHours = hours + offsetHours

  // Manejar cambio de dia
  if (newHours >= 24) {
    newHours = newHours - 24
  } else if (newHours < 0) {
    newHours = newHours + 24
  }

  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Indica si el horario convertido es del dia siguiente
 * @param timeColombia - Hora en formato HH:mm (hora Colombia)
 * @param offsetHours - Diferencia en horas respecto a Colombia
 */
export function isNextDay(timeColombia: string, offsetHours: number): boolean {
  const [hours] = timeColombia.split(':').map(Number)
  return hours + offsetHours >= 24
}

/**
 * Indica si el horario convertido es del dia anterior
 * @param timeColombia - Hora en formato HH:mm (hora Colombia)
 * @param offsetHours - Diferencia en horas respecto a Colombia
 */
export function isPreviousDay(timeColombia: string, offsetHours: number): boolean {
  const [hours] = timeColombia.split(':').map(Number)
  return hours + offsetHours < 0
}
