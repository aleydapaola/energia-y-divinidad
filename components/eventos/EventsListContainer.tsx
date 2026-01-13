'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Filter, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Event } from '@/lib/sanity/queries/events'
import { isEventPast } from '@/lib/sanity/queries/events'
import EventFilters, { type FilterState } from './EventFilters'
import ViewSwitcher, { type ViewType } from './ViewSwitcher'
import ListView from './views/ListView'
import MonthView from './views/MonthView'
import WeekView from './views/WeekView'
import DayView from './views/DayView'
import PhotoView from './views/PhotoView'

interface EventsListContainerProps {
  events: Event[]
}

export default function EventsListContainer({ events }: EventsListContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Vista actual desde URL
  const viewParam = searchParams.get('view') as ViewType | null
  const [currentView, setCurrentView] = useState<ViewType>(viewParam || 'list')

  // Estado de filtros
  const initialFilters: FilterState = {
    keyword: '',
    location: '',
    categories: [],
    tags: [],
    venues: [],
    daysOfWeek: [],
    timeOfDay: [],
    dateRange: { from: '', to: '' },
    priceRange: { min: 0, max: 500000 },
    featuredOnly: false,
    eventSeries: [],
    showPastEvents: false,
    hideCancelled: true,
    virtualFilter: 'all',
  }

  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Extraer opciones dinámicas de los eventos
  const filterOptions = useMemo(() => {
    const categories = new Set<string>()
    const tags = new Set<string>()
    const venues = new Set<string>()
    const series = new Set<string>()
    let maxPrice = 0

    events.forEach((event) => {
      event.categories?.forEach((c) => categories.add(c))
      event.tags?.forEach((t) => tags.add(t))
      if (event.venue?.name) venues.add(event.venue.name)
      if (event.venue?.city) venues.add(event.venue.city)
      if (event.eventSeries) series.add(event.eventSeries)
      if (event.price && event.price > maxPrice) maxPrice = event.price
    })

    return {
      categories: Array.from(categories).sort(),
      tags: Array.from(tags).sort(),
      venues: Array.from(venues).sort(),
      series: Array.from(series).sort(),
      maxPrice: maxPrice || 500000,
    }
  }, [events])

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Eventos pasados
      if (!filters.showPastEvents && isEventPast(event)) {
        return false
      }

      // Cancelados
      if (filters.hideCancelled && event.status === 'cancelled') {
        return false
      }

      // Palabra clave
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase()
        const matchesKeyword =
          event.title.toLowerCase().includes(keyword) ||
          event.categories?.some((c) => c.toLowerCase().includes(keyword)) ||
          event.tags?.some((t) => t.toLowerCase().includes(keyword)) ||
          event.venue?.name?.toLowerCase().includes(keyword)
        if (!matchesKeyword) return false
      }

      // Ubicación
      if (filters.location) {
        const location = filters.location.toLowerCase()
        const matchesLocation =
          event.venue?.city?.toLowerCase().includes(location) ||
          event.venue?.name?.toLowerCase().includes(location) ||
          event.venue?.country?.toLowerCase().includes(location)
        if (!matchesLocation) return false
      }

      // Categorías
      if (filters.categories.length > 0) {
        if (!event.categories?.some((c) => filters.categories.includes(c))) {
          return false
        }
      }

      // Tags
      if (filters.tags.length > 0) {
        if (!event.tags?.some((t) => filters.tags.includes(t))) {
          return false
        }
      }

      // Venues
      if (filters.venues.length > 0) {
        const eventVenues = [event.venue?.name, event.venue?.city].filter(Boolean)
        if (!eventVenues.some((v) => filters.venues.includes(v!))) {
          return false
        }
      }

      // Día de la semana
      if (filters.daysOfWeek.length > 0) {
        const eventDay = new Date(event.eventDate).getDay()
        if (!filters.daysOfWeek.includes(eventDay)) {
          return false
        }
      }

      // Hora del día
      if (filters.timeOfDay.length > 0) {
        if (event.timeOfDay && !filters.timeOfDay.includes(event.timeOfDay)) {
          return false
        }
      }

      // Rango de fechas
      if (filters.dateRange.from) {
        if (new Date(event.eventDate) < new Date(filters.dateRange.from)) {
          return false
        }
      }
      if (filters.dateRange.to) {
        if (new Date(event.eventDate) > new Date(filters.dateRange.to)) {
          return false
        }
      }

      // Precio
      if (event.price) {
        if (event.price < filters.priceRange.min || event.price > filters.priceRange.max) {
          return false
        }
      }

      // Solo destacados
      if (filters.featuredOnly && !event.featured) {
        return false
      }

      // Series
      if (filters.eventSeries.length > 0) {
        if (!event.eventSeries || !filters.eventSeries.includes(event.eventSeries)) {
          return false
        }
      }

      // Filtro virtual
      if (filters.virtualFilter === 'only' && event.locationType !== 'online') {
        return false
      }
      if (filters.virtualFilter === 'hide' && event.locationType === 'online') {
        return false
      }

      return true
    })
  }, [events, filters])

  // Cambiar vista y actualizar URL
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Renderizar la vista actual
  const renderView = () => {
    switch (currentView) {
      case 'month':
        return <MonthView events={filteredEvents} />
      case 'week':
        return <WeekView events={filteredEvents} />
      case 'day':
        return <DayView events={filteredEvents} />
      case 'photo':
        return <PhotoView events={filteredEvents} />
      default:
        return <ListView events={filteredEvents} showPastEvents={filters.showPastEvents} />
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8fc]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-gazeta text-4xl sm:text-5xl text-[#654177] mb-4">
            Calendario de Eventos
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Explora nuestros próximos eventos, talleres y encuentros. Filtra por categoría, fecha,
            ubicación y más para encontrar la experiencia perfecta para ti.
          </p>
        </div>

        {/* CTA Sesiones */}
        <div className="mb-8 bg-[#eef1fa] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[#4944a4]">
            ¿Buscas una sesión individual 1:1?{' '}
            <Link href="/sesiones" className="font-semibold hover:underline">
              Reserva tu canalización aquí →
            </Link>
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} encontrado{filteredEvents.length !== 1 ? 's' : ''}
            </span>

            {/* Botón filtros móvil */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filtros - Desktop */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24">
              <EventFilters
                filters={filters}
                onFilterChange={setFilters}
                availableCategories={filterOptions.categories}
                availableTags={filterOptions.tags}
                availableVenues={filterOptions.venues}
                availableSeries={filterOptions.series}
                maxPrice={filterOptions.maxPrice}
              />
            </div>
          </aside>

          {/* Sidebar Filtros - Móvil */}
          {showMobileFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileFilters(false)}>
              <div
                className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Filtros</h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4">
                  <EventFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    availableCategories={filterOptions.categories}
                    availableTags={filterOptions.tags}
                    availableVenues={filterOptions.venues}
                    availableSeries={filterOptions.series}
                    maxPrice={filterOptions.maxPrice}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contenido principal */}
          <main className="flex-1 min-w-0">
            {renderView()}
          </main>
        </div>
      </div>
    </div>
  )
}
