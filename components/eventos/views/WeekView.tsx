'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

import type { Event } from '@/lib/sanity/queries/events'

interface WeekViewProps {
  events: Event[]
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para empezar en lunes
  return new Date(d.setDate(diff))
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

export default function WeekView({ events }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))

  // Calcular días de la semana
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      return date
    })
  }, [weekStart])

  // Agrupar eventos por día y hora
  const eventsByDayHour = useMemo(() => {
    const map = new Map<string, Event[]>()

    events.forEach((event) => {
      const eventDate = new Date(event.eventDate)
      const dayKey = eventDate.toISOString().split('T')[0]
      const hour = eventDate.getHours()
      const key = `${dayKey}-${hour}`

      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(event)
    })

    return map
  }, [events])

  const goToPrevWeek = () => {
    const newDate = new Date(weekStart)
    newDate.setDate(weekStart.getDate() - 7)
    setWeekStart(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(weekStart)
    newDate.setDate(weekStart.getDate() + 7)
    setWeekStart(newDate)
  }

  const goToThisWeek = () => {
    setWeekStart(getWeekStart(new Date()))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const formatWeekRange = () => {
    const endDate = new Date(weekStart)
    endDate.setDate(weekStart.getDate() + 6)

    const startStr = weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    const endStr = endDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

    return `${startStr} - ${endStr}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="font-gazeta text-xl text-[#654177]">
            {formatWeekRange()}
          </h2>
          <button
            onClick={goToThisWeek}
            className="px-3 py-1 text-sm text-[#4944a4] hover:bg-[#eef1fa] rounded-lg transition-colors"
          >
            Esta semana
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-2 text-center text-sm text-gray-500" /> {/* Espacio para horas */}
        {weekDays.map((date, i) => (
          <div
            key={i}
            className={`p-2 text-center border-l border-gray-100 ${
              isToday(date) ? 'bg-[#eef1fa]' : ''
            }`}
          >
            <div className="text-xs text-gray-500">{DAYS_ES[i]}</div>
            <div
              className={`text-lg font-medium ${
                isToday(date) ? 'text-[#4944a4]' : 'text-gray-700'
              }`}
            >
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Grid de horas */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
            {/* Hora */}
            <div className="p-2 text-xs text-gray-500 text-right pr-4">
              {formatHour(hour)}
            </div>

            {/* Celdas por día */}
            {weekDays.map((date, dayIndex) => {
              const dayKey = date.toISOString().split('T')[0]
              const key = `${dayKey}-${hour}`
              const dayEvents = eventsByDayHour.get(key) || []

              return (
                <div
                  key={dayIndex}
                  className={`min-h-[50px] p-1 border-l border-gray-100 ${
                    isToday(date) ? 'bg-[#faf8fc]' : ''
                  }`}
                >
                  {dayEvents.map((event) => (
                    <Link
                      key={event._id}
                      href={`/eventos/${event.slug.current}`}
                      className={`
                        block text-xs p-1 rounded mb-1 truncate
                        ${event.locationType === 'online'
                          ? 'bg-[#4944a4] text-white'
                          : 'bg-[#8A4BAF] text-white'
                        }
                        hover:opacity-80 transition-opacity
                      `}
                      title={event.title}
                    >
                      {event.title}
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
