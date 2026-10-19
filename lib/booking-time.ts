/** Calendar selections are civil dates; booking slots are always in Colombia. */
export const BOOKING_TIME_ZONE = "America/Bogota";

export function calendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function colombiaBookingInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const calendar = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date) {
    return null;
  }
  return new Date(`${date}T${time}:00-05:00`);
}

export function bookingTimeInZone(date: string, time: string, timeZone: string) {
  // End labels may use 24:00 for midnight at the end of the selected day.
  const instant = colombiaBookingInstant(date, time === "24:00" ? "00:00" : time);
  if (!instant) {
    throw new Error("Invalid booking date or time");
  }
  if (time === "24:00") {
    instant.setUTCDate(instant.getUTCDate() + 1);
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  return {
    time: `${part("hour")}:${part("minute")}`,
    dayOffset: Math.round(
      (Date.parse(`${localDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000
    ),
    offsetLabel: part("timeZoneName"),
  };
}

export function bookingTimeLabel(date: string, time: string, timeZone: string): string {
  const result = bookingTimeInZone(date, time, timeZone);
  const suffix =
    result.dayOffset > 0 ? " (día siguiente)" : result.dayOffset < 0 ? " (día anterior)" : "";
  return result.time + suffix;
}

/** Preserve date rollover notes when switching slot labels to the 12-hour clock. */
export function bookingLabel12Hour(label: string): string {
  return label.replace(/\b(\d{2}):(\d{2})\b/g, (_match, hours: string, minutes: string) => {
    const hour = Number(hours);
    return `${hour % 12 || 12}:${minutes}${hour >= 12 ? "pm" : "am"}`;
  });
}

/** Earliest date offered by rescheduling, using Colombia's day rather than the browser's. */
export function nextBookingDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  const today = new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00Z`);
  today.setUTCDate(today.getUTCDate() + 1);
  return today.toISOString().slice(0, 10);
}
