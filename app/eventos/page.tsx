import { Calendar } from 'lucide-react'
import { Metadata } from 'next'
import { Suspense } from 'react'

import EventsListContainer from '@/components/eventos/EventsListContainer'
import { features } from '@/lib/config/features'
import { getAllEvents } from '@/lib/sanity/queries/events'

export const metadata: Metadata = {
  title: 'Calendario de Eventos | Energía y Divinidad',
  description: 'Explora nuestros próximos eventos, talleres y encuentros. Filtra por categoría, fecha, ubicación y más para encontrar la experiencia perfecta para ti.',
  openGraph: {
    title: 'Calendario de Eventos | Energía y Divinidad',
    description: 'Talleres presenciales y online, ceremonias, retiros y webinars grupales de canalización, chamanismo y sanación energética.',
    type: 'website',
  },
}

// Loading skeleton
function EventsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#faf8fc]">
      <div className="container mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-12 w-80 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="h-6 w-96 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:block w-80">
            <div className="bg-white rounded-xl p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </aside>

          {/* Content skeleton */}
          <main className="flex-1 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}

export default async function EventosPage() {
  // Check feature flag
  const eventsEnabled = features.events

  // If feature is disabled, show coming soon message
  if (!eventsEnabled) {
    return (
      <div className="min-h-screen bg-[#faf8fc]">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <Calendar className="w-16 h-16 text-[#8A4BAF] mx-auto mb-6" />
            <h1 className="font-gazeta text-4xl text-[#654177] mb-4">
              Próximamente
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Estamos preparando un calendario especial de eventos y sesiones grupales.
              Pronto podrás ver todos nuestros talleres, ceremonias, retiros y webinars.
            </p>
            <p className="text-gray-500 text-sm mt-6">
              Suscríbete a nuestro newsletter para ser la primera en enterarte cuando lancemos el calendario.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch all events (filtering happens client-side)
  let events: Awaited<ReturnType<typeof getAllEvents>> = []
  try {
    events = await getAllEvents()
  } catch (error) {
    console.error('Error fetching events:', error)
  }

  return (
    <Suspense fallback={<EventsLoadingSkeleton />}>
      <EventsListContainer events={events} />
    </Suspense>
  )
}
