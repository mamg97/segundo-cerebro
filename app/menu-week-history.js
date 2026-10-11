// Pure calendar-week navigation, independent from browser locale and DST.
// Dates are authoritative calendar YYYY-MM-DD keys, never timestamps.
export function menuWeekMonday(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T12:00:00Z");
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return null;
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function menuShiftWeek(weekStart, deltaWeeks) {
  const monday = menuWeekMonday(weekStart);
  if (!monday || !Number.isInteger(deltaWeeks) || Math.abs(deltaWeeks) > 5200) return null;
  const date = new Date(monday + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + 7 * deltaWeeks);
  return date.toISOString().slice(0, 10);
}

export function menuWeekRangeLabel(weekStart) {
  const monday = menuWeekMonday(weekStart);
  if (!monday) return "Semana no disponible";
  const sunday = new Date(monday + "T12:00:00Z");
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const startLabel = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(monday + "T12:00:00Z"));
  const endLabel = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(sunday);
  return startLabel + " – " + endLabel;
}
