export interface SessionSchedule {
  title: string;
  duration: number;
  bufferTime?: number;
  bookingLeadTime: number;
  maxAdvanceBooking: number;
  status: string;
  published?: boolean;
  weeklySchedule?: Partial<
    Record<
      "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday",
      { start: string; end: string }[]
    >
  >;
  holidays?: { date: string; recurring: boolean }[];
  blockedDates?: { startDate: string; endDate: string }[];
}

export interface SessionInterval {
  scheduledAt: Date | null;
  duration: number | null;
}
export const SESSION_BLOCKING_STATUSES = ["PENDING_PAYMENT", "PENDING", "CONFIRMED"] as const;
const MINUTE = 60000;
const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function colombiaDateKey(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validSessionDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function sessionDuration(stored: number | null | undefined, config: SessionSchedule) {
  const duration =
    stored != null && Number.isInteger(stored) && stored > 0 ? stored : config.duration;
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error("Duración de sesión no configurada");
  }
  return duration;
}

export function sessionBuffer(config: SessionSchedule) {
  const buffer = config.bufferTime ?? 30;
  if (!Number.isInteger(buffer) || buffer < 0) {
    throw new Error("Margen de agenda no configurado");
  }
  return buffer;
}

export function sessionIntervalsConflict(
  start: Date,
  duration: number,
  existing: SessionInterval,
  config: SessionSchedule
) {
  if (!existing.scheduledAt) {
    return false;
  }
  const buffer = sessionBuffer(config) * MINUTE;
  return (
    start.getTime() <
      existing.scheduledAt.getTime() +
        sessionDuration(existing.duration, config) * MINUTE +
        buffer && start.getTime() + duration * MINUTE + buffer > existing.scheduledAt.getTime()
  );
}

/** The same Colombia schedule is used for display and every server-side reservation. */
export function buildSessionSlots(
  date: string,
  config: SessionSchedule,
  bookings: SessionInterval[],
  options: { now?: Date; duration?: number } = {}
) {
  if (!validSessionDate(date)) {
    throw new Error("Fecha inválida. Usa YYYY-MM-DD");
  }
  const now = options.now ?? new Date(Date.now());
  const duration = sessionDuration(options.duration, config);
  const buffer = sessionBuffer(config);
  const unavailable = (reason: string) => ({
    available: false,
    slots: [] as { time: string; available: boolean; label: string }[],
    date,
    reason,
  });
  if (config.status !== "active" || config.published === false) {
    return unavailable("La sesión no está disponible actualmente");
  }
  if (
    !Number.isInteger(config.maxAdvanceBooking) ||
    config.maxAdvanceBooking < 0 ||
    !Number.isFinite(config.bookingLeadTime) ||
    config.bookingLeadTime < 0
  ) {
    throw new Error("Antelación de agenda no configurada");
  }
  if (date < colombiaDateKey(now)) {
    return unavailable("La fecha ya ha pasado");
  }
  const max = new Date(`${colombiaDateKey(now)}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + config.maxAdvanceBooking);
  if (date > max.toISOString().slice(0, 10)) {
    return unavailable("La fecha supera la antelación máxima de reserva");
  }
  if (
    config.holidays?.some((h) =>
      h.recurring ? h.date.slice(5) === date.slice(5) : h.date === date
    )
  ) {
    return unavailable("La fecha es festiva");
  }
  if (config.blockedDates?.some((r) => date >= r.startDate && date <= r.endDate)) {
    return unavailable("La fecha está bloqueada");
  }
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const ranges = config.weeklySchedule?.[days[weekday]] ?? [];
  const toMinutes = (time: string) => {
    if (time === "24:00") {
      return 1440;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error("Franja de agenda inválida");
    }
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const timeLabel = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const slots: { time: string; available: boolean; label: string }[] = [];
  const seen = new Set<string>();
  const step = sessionDuration(config.duration, config) + buffer;
  for (const range of ranges) {
    const first = toMinutes(range.start),
      end = toMinutes(range.end);
    if (first >= end) {
      throw new Error("Franja de agenda inválida");
    }
    for (let minute = first; minute + duration <= end; minute += step) {
      const time = timeLabel(minute);
      if (seen.has(time)) {
        continue;
      }
      seen.add(time);
      const start = new Date(`${date}T${time}:00-05:00`);
      const lead = (start.getTime() - now.getTime()) / 3600000;
      slots.push({
        time,
        label: `${time} - ${timeLabel(minute + duration)}`,
        available:
          start > now &&
          lead >= config.bookingLeadTime &&
          !bookings.some((b) => sessionIntervalsConflict(start, duration, b, config)),
      });
    }
  }
  return {
    available: slots.some((s) => s.available),
    slots,
    date,
    ...(!ranges.length ? { reason: "No hay horario disponible este día" } : {}),
  };
}
