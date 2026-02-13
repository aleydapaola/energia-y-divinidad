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

export interface TimeSlotRange {
  start: string // "08:00"
  end: string // "12:00"
}

export interface WeeklySchedule {
  monday?: TimeSlotRange[]
  tuesday?: TimeSlotRange[]
  wednesday?: TimeSlotRange[]
  thursday?: TimeSlotRange[]
  friday?: TimeSlotRange[]
  saturday?: TimeSlotRange[]
  sunday?: TimeSlotRange[]
}

export interface BookingSettings {
  _id: string
  _type: 'bookingSettings' | 'sessionConfig'
  holidays?: Holiday[]
  blockedDates?: BlockedDateRange[]
  availableTimezones?: Timezone[]
  weeklySchedule?: WeeklySchedule
  defaultLeadTime?: number
  defaultMaxAdvance?: number
  timezoneNote?: string
}

// Query fields - now queries from sessionConfig
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
  weeklySchedule {
    monday[] { start, end },
    tuesday[] { start, end },
    wednesday[] { start, end },
    thursday[] { start, end },
    friday[] { start, end },
    saturday[] { start, end },
    sunday[] { start, end }
  },
  bookingLeadTime,
  maxAdvanceBooking,
  timezoneNote
`

/**
 * Obtiene la configuracion de reservas desde sessionConfig (schema unificado)
 */
export async function getBookingSettings(): Promise<BookingSettings | null> {
  // Query from the new unified sessionConfig schema
  const query = `*[_type == "sessionConfig"][0] {
    ${bookingSettingsFields}
  }`
  const result = await client.fetch(query)

  if (!result) {return null}

  // Map to BookingSettings interface for compatibility
  return {
    ...result,
    defaultLeadTime: result.bookingLeadTime,
    defaultMaxAdvance: result.maxAdvanceBooking,
  }
}

/**
 * Obtiene solo los dias festivos
 */
export async function getHolidays(): Promise<Holiday[]> {
  const query = `*[_type == "sessionConfig"][0].holidays[] {
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
  const query = `*[_type == "sessionConfig"][0].blockedDates[] {
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
  const query = `*[_type == "sessionConfig"][0].availableTimezones[] {
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
  const [, month, day] = date.split('-')

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
 * @param timeColombia - Hora en formato HH:mm (hora Colombia)
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

// ==========================================
// HORARIOS SEMANALES
// ==========================================

type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

const dayOfWeekMap: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/**
 * Obtiene las franjas horarias para un día específico de la semana
 * @param weeklySchedule - Configuración semanal de horarios
 * @param dayOfWeek - Número del día (0 = domingo, 1 = lunes, ..., 6 = sábado)
 * @returns Array de franjas horarias para ese día
 */
export function getTimeSlotsForDayOfWeek(
  weeklySchedule: WeeklySchedule | undefined,
  dayOfWeek: number
): TimeSlotRange[] {
  if (!weeklySchedule) {return []}

  const dayName = dayOfWeekMap[dayOfWeek]
  if (!dayName) {return []}

  return weeklySchedule[dayName] || []
}

/**
 * Obtiene los días de la semana que tienen horarios configurados
 * @param weeklySchedule - Configuración semanal de horarios
 * @returns Array de números de días (0 = domingo, 1 = lunes, ..., 6 = sábado)
 */
export function getAvailableDaysOfWeek(weeklySchedule: WeeklySchedule | undefined): number[] {
  if (!weeklySchedule) {return []}

  const availableDays: number[] = []

  Object.entries(dayOfWeekMap).forEach(([dayNum, dayName]) => {
    const slots = weeklySchedule[dayName]
    if (slots && slots.length > 0) {
      availableDays.push(Number(dayNum))
    }
  })

  return availableDays.sort((a, b) => a - b)
}

/**
 * Verifica si un día de la semana tiene disponibilidad
 * @param weeklySchedule - Configuración semanal de horarios
 * @param dayOfWeek - Número del día (0 = domingo, 1 = lunes, ..., 6 = sábado)
 */
export function isDayAvailable(weeklySchedule: WeeklySchedule | undefined, dayOfWeek: number): boolean {
  const slots = getTimeSlotsForDayOfWeek(weeklySchedule, dayOfWeek)
  return slots.length > 0
}
