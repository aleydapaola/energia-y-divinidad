import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SesionesPageClient } from './SesionesPageClient'
import { getFeaturedSessions, getSessionBySlug, getDeliveryMethodLabel } from '@/lib/sanity/queries/sessions'
import { getBookingSettings } from '@/lib/sanity/queries/bookingSettings'

// Datos por defecto si no hay sesion configurada en Sanity
const DEFAULT_SESSION = {
  _id: 'session-default',
  _type: 'session' as const,
  title: 'Sesion de Canalizacion',
  slug: { current: 'canalizacion' },
  sessionType: 'channeling' as const,
  description: [],
  mainImage: { asset: { _ref: '', url: '' } },
  duration: 60,
  deliveryMethod: 'video_call' as const,
  price: 150000,
  priceUSD: 40,
  memberDiscount: 0,
  availabilitySchedule: {
    monday: [{ start: '09:00', end: '19:00' }],
    tuesday: [{ start: '09:00', end: '19:00' }],
    wednesday: [{ start: '09:00', end: '19:00' }],
    thursday: [{ start: '09:00', end: '19:00' }],
    friday: [{ start: '09:00', end: '19:00' }],
  },
  bookingLeadTime: 24,
  maxAdvanceBooking: 30,
  requiresIntake: false,
  status: 'active' as const,
  featured: true,
  displayOrder: 0,
  published: true,
}

// Helper para obtener texto de dias disponibles
function getAvailableDaysText(session: typeof DEFAULT_SESSION): string {
  if (!session.availabilitySchedule) {
    return 'Lunes a Viernes'
  }

  const dayNames: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miercoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sabado',
    sunday: 'Domingo',
  }

  const availableDays = Object.entries(session.availabilitySchedule)
    .filter(([_, slots]) => Array.isArray(slots) && slots.length > 0)
    .map(([day]) => dayNames[day])

  if (availableDays.length === 0) {
    return 'Consultar disponibilidad'
  }

  // Detectar rangos consecutivos
  const allDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
  const indices = availableDays.map(d => allDays.indexOf(d)).sort((a, b) => a - b)

  // Si son consecutivos de lunes a viernes
  if (indices.length === 5 && indices[0] === 0 && indices[4] === 4) {
    return 'Lunes a Viernes'
  }

  // Si son consecutivos
  let isConsecutive = true
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      isConsecutive = false
      break
    }
  }

  if (isConsecutive && availableDays.length > 2) {
    return `${availableDays[0]} a ${availableDays[availableDays.length - 1]}`
  }

  return availableDays.join(', ')
}

// Formatear precio
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function SesionesPage() {
  // Cargar datos desde Sanity
  const [sessions, bookingSettings] = await Promise.all([
    getFeaturedSessions(1), // Obtener la sesion destacada principal
    getBookingSettings(),
  ])

  // Usar la primera sesion destacada, o intentar por slug, o usar default
  let session: Awaited<ReturnType<typeof getSessionBySlug>> = sessions[0] || null
  if (!session) {
    session = await getSessionBySlug('canalizacion')
    if (!session) {
      session = await getSessionBySlug('sesion-acompanamiento')
    }
  }

  // Preparar datos para el cliente
  const sessionData = session || DEFAULT_SESSION
  const sessionForCalendar = {
    _id: sessionData._id,
    title: sessionData.title,
    slug: sessionData.slug,
    duration: sessionData.duration,
    price: sessionData.price,
    priceUSD: sessionData.priceUSD || 40,
    maxAdvanceBooking: sessionData.maxAdvanceBooking || 30,
    availabilitySchedule: sessionData.availabilitySchedule,
  }

  // Datos de la sesion para mostrar en la UI
  const sessionDetails = {
    duration: sessionData.duration,
    deliveryMethod: getDeliveryMethodLabel(sessionData.deliveryMethod),
    availableDays: getAvailableDaysText(sessionData as typeof DEFAULT_SESSION),
    price: sessionData.price,
    priceUSD: sessionData.priceUSD || 40,
    formattedPrice: formatPrice(sessionData.price),
  }

  // Datos de bookingSettings
  const holidays = bookingSettings?.holidays || []
  const blockedDates = bookingSettings?.blockedDates || []
  const timezones = bookingSettings?.availableTimezones || []
  const timezoneNote = bookingSettings?.timezoneNote || 'La sesion sera en hora de Colombia (GMT-5)'

  return (
    <>
      <Header session={null} />
      <Suspense fallback={<SesionesPageSkeleton />}>
        <SesionesPageClient
          session={sessionForCalendar}
          sessionDetails={sessionDetails}
          holidays={holidays}
          blockedDates={blockedDates}
          timezones={timezones}
          timezoneNote={timezoneNote}
        />
      </Suspense>
      <Footer />
    </>
  )
}

// Skeleton de carga
function SesionesPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white">
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse mb-6 w-3/4 mx-auto" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-full mb-2" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3 mx-auto" />
          </div>
        </div>
      </section>
    </div>
  )
}
