import { client } from '../client'
import { sanityFetch } from '@/sanity/lib/fetch'
import { mainImageProjection, seoProjection } from '@/sanity/lib/projections'

// ==========================================
// INTERFACES
// ==========================================

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

export interface SessionConfig {
  _id: string
  _type: 'sessionConfig'
  // Información de la sesión
  title: string
  slug: {
    current: string
  }
  description: any[]
  mainImage: {
    asset: {
      _ref: string
      url: string
    }
    alt?: string
  }
  duration: number
  deliveryMethod: 'in_person' | 'video_call' | 'phone_call' | 'hybrid'
  price: number
  priceUSD?: number
  memberDiscount?: number
  preparationInstructions?: any[]
  whatToExpect?: any[]
  benefits?: string[]
  contraindications?: any[]
  // Horarios
  weeklySchedule?: WeeklySchedule
  bookingLeadTime: number
  maxAdvanceBooking: number
  // Festivos y bloqueos
  holidays?: Holiday[]
  blockedDates?: BlockedDateRange[]
  // Husos horarios
  availableTimezones?: Timezone[]
  timezoneNote?: string
  // Formulario
  requiresIntake: boolean
  intakeQuestions?: Array<{
    question: string
    type: 'short_text' | 'long_text' | 'multiple_choice' | 'yes_no'
    required: boolean
  }>
  // Meta
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
  status: 'active' | 'paused'
  published: boolean
}

// Query fields
// Usa proyecciones reutilizables para mainImage y seo
const sessionConfigFields = `
  _id,
  _type,
  title,
  slug,
  description,
  ${mainImageProjection},
  duration,
  deliveryMethod,
  price,
  priceUSD,
  memberDiscount,
  preparationInstructions,
  whatToExpect,
  benefits,
  contraindications,
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
  timezoneNote,
  requiresIntake,
  intakeQuestions[] {
    question,
    type,
    required
  },
  ${seoProjection},
  status,
  published
`

// ==========================================
// QUERIES
// ==========================================

/**
 * Obtiene la configuración de sesión (singleton)
 */
export async function getSessionConfig(): Promise<SessionConfig | null> {
  const query = `*[_type == "sessionConfig"][0] {
    ${sessionConfigFields}
  }`
  return sanityFetch({ query, tags: ['session'] })
}

/**
 * Obtiene la sesión activa y publicada
 */
export async function getActiveSession(): Promise<SessionConfig | null> {
  const query = `*[_type == "sessionConfig" && published == true && status == "active"][0] {
    ${sessionConfigFields}
  }`
  return sanityFetch({ query, tags: ['session'] })
}

/**
 * Obtiene solo los días festivos
 */
export async function getHolidays(): Promise<Holiday[]> {
  const query = `*[_type == "sessionConfig"][0].holidays[] {
    date,
    name,
    recurring
  }`
  const result = await sanityFetch<Holiday[] | null>({ query, tags: ['session'] })
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
  const result = await sanityFetch<BlockedDateRange[] | null>({ query, tags: ['session'] })
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
  const result = await sanityFetch<Timezone[] | null>({ query, tags: ['session'] })
  return result || []
}

/**
 * Obtiene los horarios semanales
 */
export async function getWeeklySchedule(): Promise<WeeklySchedule | null> {
  const query = `*[_type == "sessionConfig"][0].weeklySchedule {
    monday[] { start, end },
    tuesday[] { start, end },
    wednesday[] { start, end },
    thursday[] { start, end },
    friday[] { start, end },
    saturday[] { start, end },
    sunday[] { start, end }
  }`
  return sanityFetch({ query, tags: ['session'] })
}

// ==========================================
// HELPERS - FESTIVOS Y BLOQUEOS
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
      // Para festivos recurrentes, solo comparamos mes y día
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
 * Verifica si una fecha está en un rango bloqueado
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
 * Verifica si una fecha es válida para reservar
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

  // Verificar si está en un rango bloqueado
  if (isInBlockedRange(date, blockedDates)) {
    return false
  }

  return true
}

// ==========================================
// HELPERS - HUSOS HORARIOS
// ==========================================

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

  // Manejar cambio de día
  if (newHours >= 24) {
    newHours = newHours - 24
  } else if (newHours < 0) {
    newHours = newHours + 24
  }

  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Indica si el horario convertido es del día siguiente
 * @param timeColombia - Hora en formato HH:mm (hora Colombia)
 * @param offsetHours - Diferencia en horas respecto a Colombia
 */
export function isNextDay(timeColombia: string, offsetHours: number): boolean {
  const [hours] = timeColombia.split(':').map(Number)
  return hours + offsetHours >= 24
}

/**
 * Indica si el horario convertido es del día anterior
 * @param timeColombia - Hora en formato HH:mm (hora Colombia)
 * @param offsetHours - Diferencia en horas respecto a Colombia
 */
export function isPreviousDay(timeColombia: string, offsetHours: number): boolean {
  const [hours] = timeColombia.split(':').map(Number)
  return hours + offsetHours < 0
}

// ==========================================
// HELPERS - HORARIOS SEMANALES
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
  if (!weeklySchedule) return []

  const dayName = dayOfWeekMap[dayOfWeek]
  if (!dayName) return []

  return weeklySchedule[dayName] || []
}

/**
 * Obtiene los días de la semana que tienen horarios configurados
 * @param weeklySchedule - Configuración semanal de horarios
 * @returns Array de números de días (0 = domingo, 1 = lunes, ..., 6 = sábado)
 */
export function getAvailableDaysOfWeek(weeklySchedule: WeeklySchedule | undefined): number[] {
  if (!weeklySchedule) return []

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

// ==========================================
// HELPERS - SESIÓN
// ==========================================

/**
 * Get delivery method label in Spanish
 */
export function getDeliveryMethodLabel(method: SessionConfig['deliveryMethod']): string {
  const labels: Record<SessionConfig['deliveryMethod'], string> = {
    in_person: 'Presencial',
    video_call: 'Videollamada',
    phone_call: 'Llamada Telefónica',
    hybrid: 'Híbrido (Tú Eliges)',
  }
  return labels[method] || method
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutos`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }

  return `${hours}h ${remainingMinutes}min`
}

/**
 * Calculate member discounted price
 */
export function getMemberPrice(session: SessionConfig, currency: 'COP' | 'USD' = 'COP'): number {
  const basePrice = currency === 'USD' ? (session.priceUSD || session.price) : session.price
  const discount = session.memberDiscount || 0

  if (discount === 0) return basePrice

  return Math.round(basePrice * (1 - discount / 100))
}

/**
 * Check if a date is available for booking (ignores time)
 */
export function isDateAvailable(
  session: SessionConfig,
  date: Date
): boolean {
  const dayOfWeek = date.getDay()

  // Check if day has available slots
  if (!isDayAvailable(session.weeklySchedule, dayOfWeek)) {
    return false
  }

  // Check max advance booking
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + session.maxAdvanceBooking)

  if (date > maxDate) {
    return false
  }

  // Check if not in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  if (checkDate < today) {
    return false
  }

  // Check holidays and blocked dates
  const dateStr = date.toISOString().split('T')[0]
  if (!isDateAvailableForBooking(dateStr, session.holidays || [], session.blockedDates || [])) {
    return false
  }

  return true
}
