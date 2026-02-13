// Re-export everything from the unified sessionConfig
// This file is kept for backward compatibility
import { client } from '../client'
import {
  SessionConfig,
  getSessionConfig,
  getActiveSession,
  getDeliveryMethodLabel,
  formatDuration,
  getMemberPrice,
  isDateAvailable,
  getAvailableDaysOfWeek,
  getTimeSlotsForDayOfWeek,
  WeeklySchedule,
  TimeSlotRange,
} from './sessionConfig'

// Re-export types with legacy names for compatibility
export interface Session {
  _id: string
  _type: 'session' | 'sessionConfig'
  title: string
  slug: { current: string }
  sessionType?: 'channeling' | 'akashic_records' | 'energy_healing' | 'holistic_therapy' | 'shamanic_consultation' | 'custom'
  description: any[]
  mainImage: {
    asset: { _ref: string; url: string }
    alt?: string
  }
  duration: number
  deliveryMethod: 'in_person' | 'video_call' | 'phone_call' | 'hybrid'
  price: number
  priceUSD?: number
  memberDiscount?: number
  availabilitySchedule?: WeeklySchedule
  weeklySchedule?: WeeklySchedule
  bookingLeadTime: number
  maxAdvanceBooking: number
  requiresIntake: boolean
  intakeQuestions?: Array<{
    question: string
    type: 'short_text' | 'long_text' | 'multiple_choice' | 'yes_no'
    required: boolean
  }>
  preparationInstructions?: any[]
  whatToExpect?: any[]
  benefits?: string[]
  contraindications?: any[]
  holidays?: Array<{ date: string; name: string; recurring: boolean }>
  blockedDates?: Array<{ startDate: string; endDate: string; reason?: string }>
  availableTimezones?: Array<{ label: string; value: string; offsetHours: number; isDefault: boolean }>
  timezoneNote?: string
  seo?: { metaTitle?: string; metaDescription?: string }
  status: 'active' | 'paused'
  featured?: boolean
  displayOrder?: number
  published: boolean
}

// Re-export helper functions
export { getDeliveryMethodLabel, formatDuration, getMemberPrice, isDateAvailable }

// Legacy query functions that now use the unified schema
export async function getAllSessions(): Promise<Session[]> {
  const session = await getActiveSession()
  if (!session) {return []}

  // Map to legacy format
  return [{
    ...session,
    _type: 'session' as const,
    sessionType: 'channeling' as const,
    availabilitySchedule: session.weeklySchedule,
    featured: true,
    displayOrder: 0,
  }]
}

export async function getFeaturedSessions(limit: number = 3): Promise<Session[]> {
  return getAllSessions()
}

export async function getSessionBySlug(slug: string): Promise<Session | null> {
  // Since there's only one session now, just return it
  const session = await getActiveSession()
  if (!session) {return null}

  // Map to legacy format
  return {
    ...session,
    _type: 'session' as const,
    sessionType: 'channeling' as const,
    availabilitySchedule: session.weeklySchedule,
    featured: true,
    displayOrder: 0,
  }
}

export async function getSessionsByType(
  type: Session['sessionType']
): Promise<Session[]> {
  return getAllSessions()
}

// Legacy helper function
export function getSessionTypeLabel(type: Session['sessionType']): string {
  const labels: Record<string, string> = {
    channeling: 'Canalización Individual',
    akashic_records: 'Lectura de Registros Akáshicos',
    energy_healing: 'Sanación Energética',
    holistic_therapy: 'Terapia Holística',
    shamanic_consultation: 'Consulta Chamánica',
    custom: 'Sesión Personalizada',
  }
  return labels[type || 'channeling'] || type || 'Canalización'
}

// Legacy helpers from old sessions.ts
export function getAvailableDaysOfWeekLegacy(session: Session): number[] {
  return getAvailableDaysOfWeek(session.availabilitySchedule || session.weeklySchedule)
}

export function getTimeSlotsForDay(
  session: Session,
  dayOfWeek: number
): Array<{ start: string; end: string }> {
  return getTimeSlotsForDayOfWeek(session.availabilitySchedule || session.weeklySchedule, dayOfWeek)
}
