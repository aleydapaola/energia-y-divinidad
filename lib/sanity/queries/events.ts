import { client } from '../client'

// Interface para Event (actualizada con nuevos campos)
export interface Event {
  _id: string
  _type: 'event'
  title: string
  slug: {
    current: string
  }
  eventType: 'workshop_in_person' | 'workshop_online' | 'ceremony' | 'retreat' | 'webinar'
  description: any[]
  mainImage: {
    asset: {
      _ref: string
      url: string
    }
    alt?: string
  }
  featured: boolean
  published: boolean
  status: 'upcoming' | 'sold_out' | 'cancelled' | 'completed'

  // Fechas
  eventDate: string
  endDate?: string

  // Ubicación
  locationType: 'online' | 'in_person'
  venue?: {
    name?: string
    address?: string
    city?: string
    country?: string
    instructions?: string
  }
  zoom?: {
    meetingUrl?: string
    meetingId?: string
    password?: string
  }
  recording?: {
    url?: string
    availableUntil?: string
  }

  // Precios
  price?: number
  priceUSD?: number
  earlyBirdPrice?: number
  earlyBirdDeadline?: string

  // Capacidad
  capacity?: number
  maxPerBooking: number
  availableSpots?: number

  // Detalles
  whatToBring?: string[]
  requirements?: string
  includes?: string[]
  categories?: string[]
  tags?: string[]
  timeOfDay?: 'morning' | 'afternoon' | 'evening'
  eventSeries?: string

  // Membresía
  includedInMembership: boolean
  requiresMembership: boolean
  membershipTiers?: Array<{ _ref: string }>
  memberDiscount?: number

  // SEO
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
}

// Query fields comunes
const eventFields = `
  _id,
  _type,
  title,
  slug,
  eventType,
  description,
  mainImage {
    asset-> {
      _ref,
      url
    },
    alt
  },
  featured,
  published,
  status,
  eventDate,
  endDate,
  locationType,
  venue {
    name,
    address,
    city,
    country,
    instructions
  },
  zoom {
    meetingUrl,
    meetingId,
    password
  },
  recording {
    url,
    availableUntil
  },
  price,
  priceUSD,
  earlyBirdPrice,
  earlyBirdDeadline,
  capacity,
  maxPerBooking,
  availableSpots,
  whatToBring,
  requirements,
  includes,
  categories,
  tags,
  timeOfDay,
  eventSeries,
  includedInMembership,
  requiresMembership,
  membershipTiers[]-> {
    _id,
    title
  },
  memberDiscount,
  seo {
    metaTitle,
    metaDescription
  }
`

/**
 * Get all published events, ordered by date
 */
export async function getAllEvents(): Promise<Event[]> {
  const query = `*[_type == "event" && published == true] | order(eventDate asc) {
    ${eventFields}
  }`

  return client.fetch(query)
}

/**
 * Get upcoming events (future dates, status upcoming)
 */
export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  const now = new Date().toISOString()
  const limitClause = limit ? `[0...${limit}]` : ''

  const query = `*[
    _type == "event"
    && published == true
    && status == "upcoming"
    && eventDate > "${now}"
  ] | order(eventDate asc) ${limitClause} {
    ${eventFields}
  }`

  return client.fetch(query)
}

/**
 * Get featured upcoming events for homepage
 */
export async function getFeaturedEvents(limit: number = 3): Promise<Event[]> {
  const now = new Date().toISOString()

  const query = `*[
    _type == "event"
    && published == true
    && featured == true
    && status == "upcoming"
    && eventDate > "${now}"
  ] | order(eventDate asc) [0...${limit}] {
    ${eventFields}
  }`

  const featuredEvents = await client.fetch(query)

  // Si no hay suficientes eventos destacados, completar con próximos eventos
  if (featuredEvents.length < limit) {
    const remaining = limit - featuredEvents.length
    const featuredIds = featuredEvents.map((e: Event) => e._id)

    const moreEvents = await client.fetch(`*[
      _type == "event"
      && published == true
      && status == "upcoming"
      && eventDate > "${now}"
      && !(_id in $featuredIds)
    ] | order(eventDate asc) [0...${remaining}] {
      ${eventFields}
    }`, { featuredIds })

    return [...featuredEvents, ...moreEvents]
  }

  return featuredEvents
}

/**
 * Get events by type
 */
export async function getEventsByType(
  type: Event['eventType'],
  limit?: number
): Promise<Event[]> {
  const now = new Date().toISOString()
  const limitClause = limit ? `[0...${limit}]` : ''

  const query = `*[
    _type == "event"
    && published == true
    && eventType == "${type}"
    && eventDate > "${now}"
  ] | order(eventDate asc) ${limitClause} {
    ${eventFields}
  }`

  return client.fetch(query)
}

/**
 * Get event by slug
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const query = `*[_type == "event" && slug.current == $slug && published == true][0] {
    ${eventFields}
  }`

  return client.fetch(query, { slug })
}

/**
 * Get event by ID (for internal use, e.g., bookings)
 */
export async function getEventById(id: string): Promise<Event | null> {
  const query = `*[_type == "event" && _id == $id][0] {
    ${eventFields}
  }`

  return client.fetch(query, { id })
}

/**
 * Get events by location type
 */
export async function getEventsByLocation(
  locationType: 'in_person' | 'online'
): Promise<Event[]> {
  const now = new Date().toISOString()

  const query = `*[
    _type == "event"
    && published == true
    && locationType == "${locationType}"
    && eventDate > "${now}"
  ] | order(eventDate asc) {
    ${eventFields}
  }`

  return client.fetch(query)
}

/**
 * Get calendar month events
 */
export async function getEventsByMonth(year: number, month: number): Promise<Event[]> {
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  const query = `*[
    _type == "event"
    && published == true
    && eventDate >= "${startDate}"
    && eventDate <= "${endDate}"
  ] | order(eventDate asc) {
    ${eventFields}
  }`

  return client.fetch(query)
}

/**
 * Get past events with recordings available
 */
export async function getEventsWithRecordings(limit?: number): Promise<Event[]> {
  const now = new Date().toISOString()
  const limitClause = limit ? `[0...${limit}]` : ''

  const query = `*[
    _type == "event"
    && published == true
    && eventDate < "${now}"
    && defined(recording.url)
    && (
      !defined(recording.availableUntil)
      || recording.availableUntil > "${now.split('T')[0]}"
    )
  ] | order(eventDate desc) ${limitClause} {
    ${eventFields}
  }`

  return client.fetch(query)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if event has available spots
 */
export function hasAvailableSpots(event: Event): boolean {
  if (!event.capacity) return true // Sin límite de capacidad
  if (event.availableSpots === undefined || event.availableSpots === null) {
    return true // Si no está definido, asumimos que hay cupos
  }
  return event.availableSpots > 0
}

/**
 * Check if early bird pricing is active
 */
export function isEarlyBirdActive(event: Event): boolean {
  if (!event.earlyBirdPrice || !event.earlyBirdDeadline) return false
  const deadline = new Date(event.earlyBirdDeadline)
  return new Date() <= deadline
}

/**
 * Get current price (considering early bird)
 */
export function getCurrentPrice(event: Event, currency: 'COP' | 'USD' = 'COP'): number | null {
  if (currency === 'USD') {
    return event.priceUSD || null
  }

  if (isEarlyBirdActive(event) && event.earlyBirdPrice) {
    return event.earlyBirdPrice
  }

  return event.price || null
}

/**
 * Get event type label in Spanish
 */
export function getEventTypeLabel(type: Event['eventType']): string {
  const labels: Record<Event['eventType'], string> = {
    workshop_in_person: 'Taller Presencial',
    workshop_online: 'Taller Online',
    ceremony: 'Ceremonia',
    retreat: 'Retiro',
    webinar: 'Webinar Grupal',
  }
  return labels[type] || type
}

/**
 * Get event status label in Spanish
 */
export function getEventStatusLabel(status: Event['status']): string {
  const labels: Record<Event['status'], string> = {
    upcoming: 'Próximo',
    sold_out: 'Cupos Agotados',
    cancelled: 'Cancelado',
    completed: 'Finalizado',
  }
  return labels[status] || status
}

/**
 * Get location type label in Spanish
 */
export function getLocationTypeLabel(locationType: Event['locationType']): string {
  return locationType === 'online' ? 'Online (Zoom)' : 'Presencial'
}

/**
 * Format event date
 */
export function formatEventDate(dateString: string, includeTime: boolean = true): string {
  const date = new Date(dateString)

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return date.toLocaleDateString('es-CO', options)
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: 'COP' | 'USD' = 'COP'): string {
  if (currency === 'USD') {
    return `USD $${amount.toLocaleString('en-US')}`
  }
  return `$${amount.toLocaleString('es-CO')} COP`
}

/**
 * Check if event is in the past
 */
export function isEventPast(event: Event): boolean {
  return new Date(event.eventDate) < new Date()
}

/**
 * Check if event can be booked
 */
export function canBookEvent(event: Event): boolean {
  if (event.status !== 'upcoming') return false
  if (isEventPast(event)) return false
  if (!hasAvailableSpots(event)) return false
  return true
}

/**
 * Get time until event starts
 */
export function getTimeUntilEvent(event: Event): string {
  const now = new Date()
  const eventDate = new Date(event.eventDate)
  const diff = eventDate.getTime() - now.getTime()

  if (diff < 0) return 'Evento pasado'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `En ${days} día${days > 1 ? 's' : ''}`
  }
  if (hours > 0) {
    return `En ${hours} hora${hours > 1 ? 's' : ''}`
  }
  return 'Comienza pronto'
}
