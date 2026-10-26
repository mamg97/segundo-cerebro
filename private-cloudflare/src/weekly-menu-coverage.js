// Presentation-only nutrition coverage indicators from the private AdherenciaManual Sheet.
// Missing dietary records are not zero calories, meals or failures.
export function weeklyMenuCoverageNotices(values, weekStart, weekEnd) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  const column = (key) => headers.indexOf(key);
  const dateCol = column("fecha");
  const statusCol = column("estado");
  const reasonCol = column("motivo");
  const updatedCol = column("updated_at");
  if (dateCol < 0 || statusCol < 0 || reasonCol < 0) return [];

  const byDate = new Map();
  for (const cells of values.slice(1)) {
    if (!Array.isArray(cells)) continue;
    const date = String(cells[dateCol] ?? "").trim();
    const status = String(cells[statusCol] ?? "").trim().toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < weekStart || date > weekEnd) continue;
    // Only insufficient-coverage days belong in the nutrition menu. A manually
    // failed objective is not evidence that a meal or caloric value is missing.
    if (status !== "SIN_DATOS") continue;
    const note = String(cells[reasonCol] ?? "").trim().slice(0, 1200);
    const updatedAt = updatedCol >= 0 ? String(cells[updatedCol] ?? "").trim() : "";
    const current = byDate.get(date);
    if (!current || updatedAt >= current.updatedAt) {
      byDate.set(date, {
        date,
        status: "SIN_DATOS",
        title: "Registro nutricional incompleto",
        note: note || "No hay información suficiente para evaluar el día completo.",
        updatedAt
      });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
