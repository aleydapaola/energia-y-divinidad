import { format } from 'date-fns';

// Festivos oficiales de Colombia 2026
export const FESTIVOS_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-01-12', // Día de los Reyes Magos
  '2026-03-23', // Día de San José
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-18', // Ascensión del Señor
  '2026-06-08', // Corpus Christi
  '2026-06-15', // Sagrado Corazón de Jesús
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-20', // Día de la Independencia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción de la Virgen
  '2026-10-12', // Día de la Raza
  '2026-11-02', // Todos los Santos
  '2026-11-16', // Independencia de Cartagena
  '2026-12-08', // Día de la Inmaculada Concepción
  '2026-12-25', // Navidad
];

// Fechas bloqueadas adicionales (cursos, retiros, etc.)
export const FECHAS_BLOQUEADAS: { start: string; end: string; name: string }[] = [
  // Agregar fechas específicas cuando Aleyda no esté disponible
];

/**
 * Verifica si una fecha está disponible para sesiones
 * Por defecto, las sesiones están disponibles de lunes a viernes
 * @param date Fecha a verificar
 * @returns true si la fecha está disponible
 */
export function isDateAvailable(date: Date): boolean {
  // 1. No sábados ni domingos (0 = domingo, 6 = sábado)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 2. No festivos
  const dateStr = format(date, 'yyyy-MM-dd');
  if (FESTIVOS_2026.includes(dateStr)) {
    return false;
  }

  // 3. No fechas bloqueadas
  for (const blocked of FECHAS_BLOQUEADAS) {
    if (dateStr >= blocked.start && dateStr <= blocked.end) {
      return false;
    }
  }

  return true;
}

/**
 * Verifica si una fecha está en el pasado
 * @param date Fecha a verificar
 * @returns true si la fecha es anterior a hoy
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}
