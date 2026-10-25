/** Event instants are displayed in Colombia, independently of server/browser timezone. */
export function formatEventDate(dateString: string | Date, includeTime = true): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Bogota",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  const formatted = date.toLocaleDateString("es-CO", options);
  return includeTime ? `${formatted} (hora de Colombia, UTC−5)` : formatted;
}
