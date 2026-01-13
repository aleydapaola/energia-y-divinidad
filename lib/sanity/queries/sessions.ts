import { client } from '../client'

// Interface para Session
export interface Session {
  _id: string
  _type: 'session'
  title: string
  slug: {
    current: string
  }
  sessionType: 'channeling' | 'akashic_records' | 'energy_healing' | 'holistic_therapy' | 'shamanic_consultation' | 'custom'
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
  availabilitySchedule?: {
    monday?: Array<{ start: string; end: string }>
    tuesday?: Array<{ start: string; end: string }>
    wednesday?: Array<{ start: string; end: string }>
    thursday?: Array<{ start: string; end: string }>
    friday?: Array<{ start: string; end: string }>
    saturday?: Array<{ start: string; end: string }>
    sunday?: Array<{ start: string; end: string }>
  }
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
  status: 'active' | 'paused' | 'archived'
  featured: boolean
  displayOrder: number
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
  published: boolean
}

// Query fields comunes
const sessionFields = `
  _id,
  _type,
  title,
  slug,
  sessionType,
  description,
  mainImage {
    asset-> {
      _ref,
      url
    },
    alt
  },
  duration,
  deliveryMethod,
  price,
  priceUSD,
  memberDiscount,
  availabilitySchedule,
  bookingLeadTime,
  maxAdvanceBooking,
  requiresIntake,
  intakeQuestions,
  preparationInstructions,
  whatToExpect,
  benefits,
  contraindications,
  status,
  featured,
  displayOrder,
  seo {
    metaTitle,
    metaDescription
  },
  published
`

/**
 * Get all published active sessions, ordered by displayOrder
 */
export async function getAllSessions(): Promise<Session[]> {
  const query = `*[_type == "session" && published == true && status == "active"] | order(displayOrder asc, title asc) {
    ${sessionFields}
  }`

  return client.fetch(query)
}

/**
 * Get featured sessions for homepage
 */
export async function getFeaturedSessions(limit: number = 3): Promise<Session[]> {
  const query = `*[
    _type == "session"
    && published == true
    && status == "active"
    && featured == true
  ] | order(displayOrder asc) [0...${limit}] {
    ${sessionFields}
  }`

  return client.fetch(query)
}

/**
 * Get session by slug
 */
export async function getSessionBySlug(slug: string): Promise<Session | null> {
  const query = `*[_type == "session" && slug.current == $slug && published == true][0] {
    ${sessionFields}
  }`

  return client.fetch(query, { slug })
}

/**
 * Get sessions by type
 */
export async function getSessionsByType(
  type: Session['sessionType']
): Promise<Session[]> {
  const query = `*[
    _type == "session"
    && published == true
    && status == "active"
    && sessionType == "${type}"
  ] | order(displayOrder asc, title asc) {
    ${sessionFields}
  }`

  return client.fetch(query)
}

/**
 * Get session type label in Spanish
 */
export function getSessionTypeLabel(type: Session['sessionType']): string {
  const labels: Record<Session['sessionType'], string> = {
    channeling: 'Canalización Individual',
    akashic_records: 'Lectura de Registros Akáshicos',
    energy_healing: 'Sanación Energética',
    holistic_therapy: 'Terapia Holística',
    shamanic_consultation: 'Consulta Chamánica',
    custom: 'Sesión Personalizada',
  }
  return labels[type] || type
}

/**
 * Get delivery method label in Spanish
 */
export function getDeliveryMethodLabel(method: Session['deliveryMethod']): string {
  const labels: Record<Session['deliveryMethod'], string> = {
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
 * Get available days of week from availabilitySchedule
 */
export function getAvailableDaysOfWeek(session: Session): number[] {
  if (!session.availabilitySchedule) return []

  const daysMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const availableDays: number[] = []

  Object.entries(session.availabilitySchedule).forEach(([day, slots]) => {
    if (slots && slots.length > 0) {
      availableDays.push(daysMap[day])
    }
  })

  return availableDays.sort((a, b) => a - b)
}

/**
 * Get all time slots for a specific day of week
 */
export function getTimeSlotsForDay(
  session: Session,
  dayOfWeek: number
): Array<{ start: string; end: string }> {
  if (!session.availabilitySchedule) return []

  const daysMap: Record<number, keyof typeof session.availabilitySchedule> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }

  const dayName = daysMap[dayOfWeek]
  return session.availabilitySchedule[dayName] || []
}

/**
 * Check if a date is available for booking (ignores time)
 */
export function isDateAvailable(
  session: Session,
  date: Date
): boolean {
  const dayOfWeek = date.getDay()
  const availableDays = getAvailableDaysOfWeek(session)

  if (!availableDays.includes(dayOfWeek)) {
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

  return true
}

/**
 * Calculate member discounted price
 */
export function getMemberPrice(session: Session, currency: 'COP' | 'USD' = 'COP'): number {
  const basePrice = currency === 'USD' ? (session.priceUSD || session.price) : session.price
  const discount = session.memberDiscount || 0

  if (discount === 0) return basePrice

  return Math.round(basePrice * (1 - discount / 100))
}
