'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

import type { Event } from '@/lib/sanity/queries/events'

interface MonthViewProps {
  events: Event[]
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAYS_ES_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function MonthView({ events }: MonthViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Calcular días del calendario
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Ajustar para que la semana empiece en lunes
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) {startOffset = 6}

    const days: { date: Date; isCurrentMonth: boolean; events: Event[] }[] = []

    // Días del mes anterior
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false, events: [] })
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.eventDate)
        return (
          eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        )
      })
      days.push({ date, isCurrentMonth: true, events: dayEvents })
    }

    // Completar hasta 42 días (6 semanas)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, events: [] })
    }

    return days
  }, [year, month, events])

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="font-gazeta text-xl text-[#654177]">
            {MONTHS_ES[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-[#4944a4] hover:bg-[#eef1fa] rounded-lg transition-colors"
          >
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_ES.map((day, index) => (
          <div
            key={day}
            className="py-2 text-center text-xs sm:text-sm font-medium text-gray-500"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{DAYS_ES_SHORT[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-2 border-b border-r border-gray-100
              ${!day.isCurrentMonth ? 'bg-gray-50' : ''}
              ${index % 7 === 6 ? 'border-r-0' : ''}
            `}
          >
            <div
              className={`
                text-xs sm:text-sm font-medium mb-0.5 sm:mb-1
                ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                ${isToday(day.date) ? 'w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center bg-[#4944a4] text-white rounded-full text-[10px] sm:text-sm' : ''}
              `}
            >
              {day.date.getDate()}
            </div>

            {/* Eventos del día */}
            <div className="space-y-0.5 sm:space-y-1">
              {day.events.slice(0, 2).map((event) => (
                <Link
                  key={event._id}
                  href={`/eventos/${event.slug.current}`}
                  className={`
                    block text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate
                    ${event.locationType === 'online'
                      ? 'bg-[#eef1fa] text-[#4944a4]'
                      : 'bg-[#f8f0f5] text-[#8A4BAF]'
                    }
                    hover:opacity-80 transition-opacity
                  `}
                  title={event.title}
                >
                  <span className="hidden sm:inline">{event.title}</span>
                  <span className="sm:hidden">•</span>
                </Link>
              ))}
              {day.events.length > 2 && (
                <span className="block text-[10px] sm:text-xs text-gray-500 pl-0.5 sm:pl-1">
                  +{day.events.length - 2}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
