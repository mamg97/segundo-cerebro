// Presentation-only projection from the private Health AdherenciaManual sheet.
// A day with incomplete logging is not a zero-calorie day or a failed target.
export function menuDayNoticesFromSheet(values, startDate, endDate) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return [];
  const headers = values[0].map((value) => String(value ?? "").trim().toLowerCase());
  const dateCol = headers.indexOf("fecha");
  const statusCol = headers.indexOf("estado");
  const reasonCol = headers.indexOf("motivo");
  if (dateCol < 0 || statusCol < 0 || reasonCol < 0) return [];

  const latestByDate = new Map();
  for (const cells of values.slice(1)) {
    if (!Array.isArray(cells)) continue;
    const date = String(cells[dateCol] ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < startDate || date > endDate) continue;
    const status = String(cells[statusCol] ?? "").trim().toUpperCase();
    const reason = String(cells[reasonCol] ?? "").trim().slice(0, 1100);
    latestByDate.set(date, status === "SIN_DATOS"
      ? { date, status: "SIN_DATOS", reason }
      : null);
  }
  return [...latestByDate.values()].filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}
