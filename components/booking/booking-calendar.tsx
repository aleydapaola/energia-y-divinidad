'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { es as esRdp } from 'react-day-picker/locale';

import { Calendar } from '@/components/ui/calendar';
import { isPastDate } from '@/lib/availability/blocked-dates';
import { TimeSlot } from '@/lib/availability/time-slots';
import {
  type Holiday,
  type BlockedDateRange,
  type Timezone,
  type WeeklySchedule,
  isHoliday,
  isInBlockedRange,
  convertTimeFromColombia,
  isDayAvailable,
} from '@/lib/sanity/queries/bookingSettings';

import TimeSlotPicker from './time-slot-picker';
import { TimezoneSelector } from './timezone-selector';

interface Session {
  _id: string;
  title: string;
  slug: { current: string };
  duration: number;
  price: number;
  priceUSD?: number;
  maxAdvanceBooking: number;
  availableDays?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  availabilitySchedule?: {
    monday?: Array<{ start: string; end: string }>;
    tuesday?: Array<{ start: string; end: string }>;
    wednesday?: Array<{ start: string; end: string }>;
    thursday?: Array<{ start: string; end: string }>;
    friday?: Array<{ start: string; end: string }>;
    saturday?: Array<{ start: string; end: string }>;
    sunday?: Array<{ start: string; end: string }>;
  };
}

interface BookingCalendarProps {
  session: Session;
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: string | null) => void;
  // Nuevas props para configuracion desde Sanity
  holidays?: Holiday[];
  blockedDates?: BlockedDateRange[];
  timezones?: Timezone[];
  timezoneNote?: string;
  showTimezoneSelector?: boolean;
  // Horarios semanales globales (desde Configuración de Reservas)
  weeklySchedule?: WeeklySchedule;
}

// Zonas horarias por defecto
const DEFAULT_TIMEZONES: Timezone[] = [
  { label: 'Colombia', value: 'America/Bogota', offsetHours: 0, isDefault: true },
  { label: 'Mexico', value: 'America/Mexico_City', offsetHours: -1, isDefault: false },
  { label: 'Argentina', value: 'America/Argentina/Buenos_Aires', offsetHours: 2, isDefault: false },
  { label: 'Espana', value: 'Europe/Madrid', offsetHours: 6, isDefault: false },
];

// Helper para verificar si un dia tiene disponibilidad configurada
function hasDayAvailability(date: Date, session: Session, weeklySchedule?: WeeklySchedule): boolean {
  const dayOfWeek = date.getDay();

  // PRIORIDAD 1: Usar horarios globales de Configuración de Reservas
  if (weeklySchedule) {
    return isDayAvailable(weeklySchedule, dayOfWeek);
  }

  // FALLBACK: Si no hay horarios globales, usar horarios de la sesión (compatibilidad)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = dayNames[dayOfWeek];

  if (session.availabilitySchedule) {
    const daySlots = session.availabilitySchedule[dayName];
    return Array.isArray(daySlots) && daySlots.length > 0;
  }

  if (session.availableDays) {
    return session.availableDays.some(d => d.dayOfWeek === dayOfWeek);
  }

  // Por defecto, solo lunes a viernes
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

export function BookingCalendar({
  session,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  holidays = [],
  blockedDates = [],
  timezones = [],
  timezoneNote = 'La sesion sera en hora de Colombia (GMT-5)',
  showTimezoneSelector = true,
  weeklySchedule,
}: BookingCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate || undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Estado para timezone
  const availableTimezones = timezones.length > 0 ? timezones : DEFAULT_TIMEZONES;
  const defaultTz = availableTimezones.find(tz => tz.isDefault) || availableTimezones[0];
  const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(defaultTz);

  // Cargar timezone de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem('energia-divinidad-timezone');
    if (saved) {
      const savedTz = availableTimezones.find(tz => tz.value === saved);
      if (savedTz) {
        setSelectedTimezone(savedTz);
      }
    }
  }, [availableTimezones]);

  // Cargar slots cuando cambia la fecha o al inicio
  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        // Si no hay fecha seleccionada, usar la fecha de hoy para mostrar slots
        const targetDate = date || new Date();
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const response = await fetch(
          `/api/bookings/availability?date=${dateStr}&slug=${session.slug.current}`
        );
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (error) {
        console.error('Error fetching slots:', error);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [date, session.slug.current]);

  const handleDateSelect = (newDate: Date | undefined) => {
    // Debug log para móvil
    console.log('[BookingCalendar] handleDateSelect:', {
      newDate: newDate?.toISOString(),
      currentDate: date?.toISOString(),
    });

    // Actualizar el estado inmediatamente
    setDate(newDate);
    onDateChange(newDate || null);
    // Reset time when date changes
    onTimeChange(null);
  };

  const handleTimeSelect = (time: string) => {
    // Solo permitir seleccionar hora si hay una fecha seleccionada
    if (!date) {
      return;
    }
    if (selectedTime === time) {
      onTimeChange(null);
    } else {
      onTimeChange(time);
    }
  };

  const handleTimezoneChange = (timezone: Timezone) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('energia-divinidad-timezone', timezone.value);
  };

  // Funcion para verificar disponibilidad de una fecha
  const isDateAvailableLocal = (checkDate: Date): boolean => {
    const dateStr = format(checkDate, 'yyyy-MM-dd');

    // Verificar si es festivo
    if (isHoliday(dateStr, holidays)) {
      return false;
    }

    // Verificar si esta en rango bloqueado
    if (isInBlockedRange(dateStr, blockedDates)) {
      return false;
    }

    // Verificar si el dia tiene horarios configurados (usa horarios globales si están disponibles)
    if (!hasDayAvailability(checkDate, session, weeklySchedule)) {
      return false;
    }

    return true;
  };

  // Deshabilitar días no disponibles
  const disabledDays = (checkDate: Date) => {
    // Check if in the past
    if (isPastDate(checkDate)) {return true;}

    // Check max advance booking
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + session.maxAdvanceBooking);
    maxDate.setHours(23, 59, 59, 999);
    const dateToCheck = new Date(checkDate);
    dateToCheck.setHours(0, 0, 0, 0);
    if (dateToCheck > maxDate) {return true;}

    // Check if date is available (weekdays, no holidays, no blocked)
    if (!isDateAvailableLocal(checkDate)) {return true;}

    return false;
  };

  // Slots por defecto si no hay datos de la API
  const DEFAULT_SLOTS: TimeSlot[] = [
    { time: '17:00', available: true, label: '17:00 - 18:00' },
    { time: '18:00', available: true, label: '18:00 - 19:00' },
    { time: '19:00', available: true, label: '19:00 - 20:00' },
  ];

  // Usar slots de la API o los por defecto
  const slotsToConvert = availableSlots.length > 0 ? availableSlots : DEFAULT_SLOTS;

  // Convertir slots a la zona horaria seleccionada
  const convertedSlots: TimeSlot[] = slotsToConvert.map(slot => {
    if (selectedTimezone.offsetHours === 0) {
      return slot; // No conversion needed for Colombia
    }

    const [startTime] = slot.label.split(' - ');
    const endTime = slot.label.split(' - ')[1];
    const convertedStart = convertTimeFromColombia(startTime, selectedTimezone.offsetHours);
    const convertedEnd = convertTimeFromColombia(endTime, selectedTimezone.offsetHours);

    return {
      ...slot,
      label: `${convertedStart} - ${convertedEnd}`,
      // Mantenemos el time original para enviar al backend
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Layout vertical: Calendario arriba, horarios abajo */}
      <div className="space-y-0">
        {/* Calendario - Ocupa todo el ancho */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 min-h-[320px] sm:min-h-[380px] md:min-h-[500px]">
          <style dangerouslySetInnerHTML={{__html: `
            .booking-calendar {
              width: 100%;
              height: 100%;
              min-height: 280px;
            }

            @media (min-width: 640px) {
              .booking-calendar {
                min-height: 340px;
              }
            }

            @media (min-width: 768px) {
              .booking-calendar {
                min-height: 450px;
              }
            }

            .booking-calendar .rdp-month {
              width: 100%;
            }

            .booking-calendar .rdp-weekdays {
              margin-bottom: 0.25rem;
              border-top: 1px solid #E5E7EB;
              border-bottom: 1px solid #E5E7EB;
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .booking-calendar .rdp-weekday {
              color: #8A4BAF;
              font-weight: 600;
              font-size: 0.875rem;
              text-transform: uppercase;
            }

            .booking-calendar .rdp-caption_label {
              font-size: 1.25rem;
              font-weight: 600;
              color: #654177;
              text-transform: capitalize;
            }

            /* Botones de navegación (mes anterior/siguiente) */
            .booking-calendar .rdp-button_previous,
            .booking-calendar .rdp-button_next {
              background-color: transparent;
              border: 1px solid #8A4BAF;
              color: #8A4BAF;
              border-radius: 0.5rem;
              transition: all 0.2s;
            }

            .booking-calendar .rdp-button_previous:hover:not(:disabled),
            .booking-calendar .rdp-button_next:hover:not(:disabled) {
              background-color: #8A4BAF;
              color: white;
              border-color: #8A4BAF;
            }

            .booking-calendar .rdp-button_previous:disabled,
            .booking-calendar .rdp-button_next:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }

            .booking-calendar .rdp-week {
              margin-top: 0.125rem;
            }

            .booking-calendar .rdp-day {
              padding: 0.1rem;
            }

            /* Estilos base para botones de día (react-day-picker v9) */
            .booking-calendar .rdp-day button {
              width: 100%;
              height: 100%;
              min-height: 2.75rem;
              min-width: 2.75rem;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.9375rem;
              font-weight: 500;
              border-radius: 0.375rem;
              transition: all 0.15s ease-out;
              background-color: #f7f7f7;
              color: #8A4BAF;
              border: 1px solid #8A4BAF;
              /* Mejoras para móvil - touch events */
              -webkit-tap-highlight-color: rgba(138, 75, 175, 0.3);
              touch-action: manipulation;
              cursor: pointer;
              -webkit-user-select: none;
              user-select: none;
            }

            /* Active state para feedback táctil inmediato */
            .booking-calendar .rdp-day button:active:not(:disabled) {
              transform: scale(0.95);
              background-color: #efe3ed;
            }

            @media (min-width: 640px) {
              .booking-calendar .rdp-day button {
                min-height: 3rem;
                min-width: 3rem;
                font-size: 1rem;
              }
            }

            @media (min-width: 768px) {
              .booking-calendar .rdp-day button {
                min-height: 3.5rem;
                min-width: 3.5rem;
                font-size: 1.0625rem;
              }
            }

            /* Días disponibles - estado normal */
            .booking-calendar .rdp-day.available button {
              background-color: #f8f0f5;
              color: #654177;
              border: 1px solid #8A4BAF;
              cursor: pointer;
            }

            /* Días disponibles - estado hover */
            .booking-calendar .rdp-day.available button:hover:not(:disabled) {
              background-color: #efe3ed;
              color: #654177;
              border-color: #8A4BAF;
            }

            /* Día seleccionado - fondo violeta (react-day-picker v9 usa data-selected-single) */
            .booking-calendar .rdp-day button[data-selected-single="true"],
            .booking-calendar .rdp-day.rdp-selected button,
            .booking-calendar .rdp-selected button,
            .booking-calendar button[data-selected="true"],
            .booking-calendar .rdp-day button[aria-selected="true"] {
              background-color: #8A4BAF !important;
              color: white !important;
              border: 1px solid #8A4BAF !important;
              outline: none !important;
              box-shadow: 0 0 0 2px rgba(138, 75, 175, 0.3) !important;
              transform: scale(1.02);
            }

            .booking-calendar .rdp-day button[data-selected-single="true"]:hover,
            .booking-calendar .rdp-day.rdp-selected button:hover,
            .booking-calendar .rdp-selected button:hover,
            .booking-calendar button[data-selected="true"]:hover,
            .booking-calendar .rdp-day button[aria-selected="true"]:hover {
              background-color: #7a3d9f !important;
              border: 1px solid #7a3d9f !important;
            }

            /* Días no disponibles (fines de semana, festivos) - sin recuadro, solo texto gris */
            .booking-calendar .rdp-day.rdp-disabled button,
            .booking-calendar .rdp-disabled button {
              background: transparent !important;
              color: #9CA3AF !important;
              border: none !important;
              cursor: not-allowed;
            }

            /* Día de hoy cuando está deshabilitado (ej: domingo) - sin fondo especial */
            .booking-calendar .rdp-day.rdp-today.rdp-disabled button {
              background: transparent !important;
              color: #9CA3AF !important;
              border: none !important;
            }

            /* Día de hoy - remover fondo por defecto */
            .booking-calendar .rdp-day.rdp-today button:not([data-selected-single="true"]) {
              background: transparent;
            }

            /* Días fuera del mes (outside) - sin recuadro */
            .booking-calendar .rdp-day.rdp-outside button,
            .booking-calendar .rdp-outside button {
              background: transparent;
              color: #D1D5DB;
              border: none;
            }

            /* Días disponibles del siguiente mes - deben verse como disponibles */
            .booking-calendar .rdp-day.available.rdp-outside button {
              background-color: #f8f0f5;
              color: #654177;
              border: 1px solid #8A4BAF;
            }

            .booking-calendar .rdp-day.available.rdp-outside button:hover:not(:disabled) {
              background-color: #efe3ed;
              color: #654177;
              border-color: #8A4BAF;
            }
          `}} />

          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            locale={esRdp}
            className="booking-calendar"
            modifiers={{
              available: (checkDate) => isDateAvailableLocal(checkDate) && !isPastDate(checkDate),
            }}
            modifiersClassNames={{
              available: 'available',
            }}
          />
        </div>

        {/* Selector de zona horaria */}
        {showTimezoneSelector && (
          <div className="p-4 border-b border-gray-200">
            <TimezoneSelector
              timezones={availableTimezones}
              selectedTimezone={selectedTimezone}
              onTimezoneChange={handleTimezoneChange}
              timezoneNote={timezoneNote}
              selectedTimeColombia={selectedTime}
            />
          </div>
        )}

        {/* Horarios debajo del calendario */}
        <div className="p-4 pb-10">
          {/* Título de la sección de horarios - siempre visible */}
          <p className="text-sm font-semibold text-gray-700 mb-4 font-dm-sans">
            {date
              ? format(date, "EEEE, d 'de' MMMM", { locale: es })
              : "Selecciona una fecha en el calendario"}
          </p>

          {/* TimeSlotPicker siempre visible */}
          <TimeSlotPicker
            slots={convertedSlots}
            selectedTime={selectedTime}
            onSelectTime={handleTimeSelect}
            isLoading={isLoadingSlots}
            hasDateSelected={!!date}
            timezoneLabel={selectedTimezone.label}
          />
        </div>
      </div>
    </div>
  );
}
