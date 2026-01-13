import { format, parse, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { isDateAvailable } from './blocked-dates';

export interface TimeSlot {
  time: string; // HH:mm format (e.g., "17:00")
  available: boolean;
  label: string; // Display label (e.g., "17:00 - 18:00")
}

/**
 * Slots disponibles para sesiones de canalización
 * Horario: Lunes a Viernes (ajustable según configuración de Sanity)
 * Estos son los slots por defecto si no hay configuración en Sanity
 */
const DEFAULT_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

/**
 * Duración por defecto de las sesiones en minutos
 */
const DEFAULT_SESSION_DURATION = 60;

/**
 * Horas mínimas de anticipación para reservar
 * 2 horas permite reservas de último momento pero con tiempo suficiente de preparación
 */
const MIN_LEAD_TIME_HOURS = 2;

/**
 * Obtiene los slots de tiempo disponibles para una fecha específica
 * @param date Fecha para consultar disponibilidad
 * @param bookedTimes Array de horarios ya reservados en formato HH:mm
 * @param sessionDuration Duración de la sesión en minutos
 * @returns Array de TimeSlots con disponibilidad
 */
export function getAvailableTimeSlots(
  date: Date,
  bookedTimes: string[] = [],
  sessionDuration: number = DEFAULT_SESSION_DURATION
): TimeSlot[] {
  // Si la fecha no está disponible (fin de semana, festivo), retornar array vacío
  if (!isDateAvailable(date)) {
    return [];
  }

  const now = new Date();
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = selectedDate.getTime() === today.getTime();

  return DEFAULT_SLOTS.map((time) => {
    let available = true;

    // Si ya está reservado, no disponible
    if (bookedTimes.includes(time)) {
      available = false;
    }

    // Si es hoy, verificar tiempo mínimo de anticipación
    if (isToday && available) {
      const slotTime = parse(time, 'HH:mm', new Date());
      const minBookingTime = addMinutes(now, MIN_LEAD_TIME_HOURS * 60);
      if (slotTime < minBookingTime) {
        available = false;
      }
    }

    // Calcular hora de fin
    const [hours, minutes] = time.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + sessionDuration;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const label = `${time} - ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    return {
      time,
      available,
      label,
    };
  });
}

/**
 * Formatea una fecha y hora para mostrar al usuario
 * @param date Fecha
 * @param time Hora en formato HH:mm
 * @returns String formateado (e.g., "Lunes, 15 de enero de 2026 a las 17:00")
 */
export function formatDateTime(date: Date, time: string): string {
  const dateStr = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  return `${dateStr} a las ${time}`;
}

/**
 * Combina una fecha y hora en un objeto Date
 * @param date Fecha
 * @param time Hora en formato HH:mm
 * @returns Date con fecha y hora combinadas
 */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}
