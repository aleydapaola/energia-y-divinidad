'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MapPin, Video } from 'lucide-react'
import type { Event } from '@/lib/sanity/queries/events'

interface DayViewProps {
  events: Event[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

export default function DayView({ events }: DayViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Eventos del día seleccionado
  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.eventDate)
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      )
    })
  }, [events, selectedDate])

  // Eventos agrupados por hora
  const eventsByHour = useMemo(() => {
    const map = new Map<number, Event[]>()

    dayEvents.forEach((event) => {
      const hour = new Date(event.eventDate).getHours()
      if (!map.has(hour)) {
        map.set(hour, [])
      }
      map.get(hour)!.push(event)
    })

    return map
  }, [dayEvents])

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = () => {
    const today = new Date()
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    )
  }

  const formatDate = () => {
    return selectedDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="font-gazeta text-xl text-[#654177] capitalize">
            {formatDate()}
          </h2>
          {!isToday() && (
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-[#4944a4] hover:bg-[#eef1fa] rounded-lg transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Día siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Contador de eventos */}
      <div className="px-4 py-2 bg-[#faf8fc] border-b border-gray-200">
        <span className="text-sm text-gray-600">
          {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''} este día
        </span>
      </div>

      {/* Grid de horas */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => {
          const hourEvents = eventsByHour.get(hour) || []

          return (
            <div
              key={hour}
              className="flex border-b border-gray-100 min-h-[60px]"
            >
              {/* Hora */}
              <div className="w-20 p-2 text-sm text-gray-500 text-right pr-4 flex-shrink-0 border-r border-gray-100">
                {formatHour(hour)}
              </div>

              {/* Eventos */}
              <div className="flex-1 p-2">
                {hourEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={`/eventos/${event.slug.current}`}
                    className={`
                      block p-3 rounded-lg mb-2 last:mb-0
                      ${event.locationType === 'online'
                        ? 'bg-[#eef1fa] border-l-4 border-[#4944a4]'
                        : 'bg-[#f8f0f5] border-l-4 border-[#8A4BAF]'
                      }
                      hover:shadow-md transition-shadow
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#654177] truncate">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          {event.locationType === 'online' ? (
                            <>
                              <Video className="w-4 h-4 text-[#4944a4]" />
                              <span>Online</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4 text-[#8A4BAF]" />
                              <span>{event.venue?.city || 'Presencial'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {event.price && (
                        <span className="text-sm font-semibold text-[#654177]">
                          ${event.price.toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sin eventos */}
      {dayEvents.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">No hay eventos programados para este día</p>
        </div>
      )}
    </div>
  )
}
