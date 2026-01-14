"use client"

import { useState } from 'react'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import type { Session } from '@/lib/sanity/queries/sessions'
import type { Holiday, BlockedDateRange, Timezone, WeeklySchedule } from '@/lib/sanity/queries/bookingSettings'
import { Calendar, Clock } from 'lucide-react'

interface SessionBookingSectionProps {
  session: Session
  holidays?: Holiday[]
  blockedDates?: BlockedDateRange[]
  timezones?: Timezone[]
  timezoneNote?: string
  weeklySchedule?: WeeklySchedule
}

export function SessionBookingSection({
  session,
  holidays = [],
  blockedDates = [],
  timezones = [],
  timezoneNote,
  weeklySchedule,
}: SessionBookingSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date)
  }

  const handleTimeChange = (time: string | null) => {
    setSelectedTime(time)
  }

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) return

    // Format date as YYYY-MM-DD
    const dateString = selectedDate.toISOString().split('T')[0]

    // Redirect to checkout (placeholder - will be implemented in payment phase)
    window.location.href = `/sesiones/${session.slug.current}/reservar?date=${dateString}&time=${selectedTime}`
  }

  const canContinue = selectedDate !== null && selectedTime !== null

  return (
    <div className="space-y-8">
      {/* Instructions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-brand" />
            </div>
          </div>
          <div>
            <h3 className="font-serif text-lg text-brand mb-2">
              Selecciona Fecha y Hora
            </h3>
            <p className="text-primary/70 leading-relaxed">
              Elige el día y horario que mejor se adapte a tu disponibilidad.
              Todos los horarios están en zona horaria de Colombia (GMT-5).
            </p>
            {session.bookingLeadTime > 1 && (
              <p className="text-sm text-primary/60 mt-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Se requieren al menos {session.bookingLeadTime} horas de anticipación
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <BookingCalendar
        session={session}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onDateChange={handleDateChange}
        onTimeChange={handleTimeChange}
        holidays={holidays}
        blockedDates={blockedDates}
        timezones={timezones}
        timezoneNote={timezoneNote}
        showTimezoneSelector={true}
        weeklySchedule={weeklySchedule}
      />

      {/* Summary and CTA */}
      {selectedDate && selectedTime && (
        <div className="bg-brand/5 rounded-lg p-6">
          <h3 className="font-serif text-xl text-brand mb-4">
            Resumen de tu Reserva
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-primary/70">Sesión:</span>
              <span className="font-medium text-primary">{session.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-primary/70">Fecha:</span>
              <span className="font-medium text-primary">
                {selectedDate.toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-primary/70">Hora:</span>
              <span className="font-medium text-primary">{selectedTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-primary/70">Duración:</span>
              <span className="font-medium text-primary">{session.duration} minutos</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-primary/10">
              <span className="text-primary/70">Total:</span>
              <span className="font-bold text-brand text-xl">
                ${session.price.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full py-4 rounded-lg text-lg font-medium transition-colors ${
              canContinue
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            Continuar con la Reserva
          </button>

          <p className="text-sm text-primary/60 text-center mt-4">
            Serás redirigido a la página de pago para completar tu reserva
          </p>
        </div>
      )}

      {/* Help Text */}
      {!selectedDate && (
        <div className="text-center py-8">
          <p className="text-primary/60">
            Selecciona una fecha en el calendario para ver los horarios disponibles
          </p>
        </div>
      )}
    </div>
  )
}
