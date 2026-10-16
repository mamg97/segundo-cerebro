// Gym attendance is derived exclusively from completed private D1 sessions.
// No predicted days, planned workouts, or persistent browser caches.
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const pad = (value) => String(value).padStart(2, "0");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function validGymDateKey(value) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const year = Number(text.slice(0, 4));
  const monthIndex = Number(text.slice(5, 7)) - 1;
  const day = Number(text.slice(8, 10));
  const parsed = new Date(year, monthIndex, day);
  return parsed.getFullYear() === year && parsed.getMonth() === monthIndex &&
    parsed.getDate() === day ? text : null;
}

function actualGymSession(session) {
  // Saving requires at least one explicitly performed exercise; a plan does not.
  return Array.isArray(session?.entries) && session.entries.length > 0 && validGymDateKey(session.sessionDate);
}

function gymMuscleLabel(session, planById) {
  const recorded = String(session.dayTitle || "").trim().replace(/\s+/g, " ");
  const planFocus = String(planById.get(String(session.dayId || ""))?.focus || "").trim();
  const generic = /^(?:d[ií]a|day)\s*[\dA-Z]+(?:\s*[-:]\s*)?$/i.test(recorded);
  const label = (!recorded || generic ? planFocus || recorded : recorded) || "Entreno";
  // Prefer the group registered for that particular session over a newer plan.
  return label.replace(/^(?:d[ií]a|day)\s*\d+\s*[-:·]\s*/i, "").slice(0, 100) || "Entreno";
}

export function gymMonthCalendarModel(sessions = [], plan = [], today = new Date()) {
  const current = new Date(today);
  if (!Number.isFinite(current.getTime())) throw new TypeError("Invalid current date");
  const year = current.getFullYear();
  const monthIndex = current.getMonth();
  const prefix = year + "-" + pad(monthIndex + 1);
  const monthDays = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Monday first.
  const planById = new Map((Array.isArray(plan) ? plan : []).map((day) => [String(day.id), day]));
  const byDate = new Map();
  const todayKey = year + "-" + pad(monthIndex + 1) + "-" + pad(current.getDate());

  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (!actualGymSession(session) || !session.sessionDate.startsWith(prefix + "-") ||
        session.sessionDate > todayKey) continue;
    const labels = byDate.get(session.sessionDate) || [];
    const label = gymMuscleLabel(session, planById);
    if (!labels.includes(label)) labels.push(label);
    byDate.set(session.sessionDate, labels);
  }

  const days = Array.from({ length: monthDays }, (_, index) => {
    const day = index + 1;
    const key = prefix + "-" + pad(day);
    return { day, key, labels: byDate.get(key) || [], isToday: key === todayKey };
  });
  return {
    monthLabel: new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(current),
    offset,
    days,
    trainedDays: byDate.size,
    sessionCount: (Array.isArray(sessions) ? sessions : []).filter((session) =>
      actualGymSession(session) && session.sessionDate.startsWith(prefix + "-") &&
      session.sessionDate <= todayKey).length
  };
}

export function renderGymMonthCalendar(sessions = [], plan = [], today = new Date()) {
  const model = gymMonthCalendarModel(sessions, plan, today);
  const weekdays = WEEKDAYS.map((day) => '<span class="gym-month-weekday" aria-hidden="true">' + day + '</span>').join("");
  const leading = Array.from({ length: model.offset }, () =>
    '<span class="gym-month-cell gym-month-outside" aria-hidden="true"></span>').join("");
  const days = model.days.map(({ day, key, labels, isToday }) => {
    const trained = labels.length > 0;
    const fullLabel = labels.join(" · ");
    return '<div class="gym-month-cell' + (trained ? ' is-trained' : '') + (isToday ? ' is-today' : '') +
      '" role="gridcell" aria-label="' + escapeHtml(day + ': ' + (trained ? fullLabel : 'sin entrenamiento registrado')) +
      '" title="' + escapeHtml(trained ? fullLabel : '') + '" data-gym-month-date="' + key + '">' +
      '<span class="gym-month-day">' + day + '</span>' +
      (trained ? '<span class="gym-month-groups">' + labels.map((label) =>
        '<small>' + escapeHtml(label) + '</small>').join("") + '</span>' : '') +
      '</div>';
  }).join("");
  return '<section class="gym-month-calendar" aria-label="Calendario mensual de entrenamientos">' +
    '<header class="gym-month-header"><div><strong>Calendario de entrenamientos</strong>' +
    '<span>' + escapeHtml(model.monthLabel) + '</span></div>' +
    '<small>' + model.trainedDays + (model.trainedDays === 1 ? ' día entrenado' : ' días entrenados') + '</small></header>' +
    '<div class="gym-month-grid" role="grid" aria-label="Entrenamientos registrados en ' + escapeHtml(model.monthLabel) + '">' +
    weekdays + leading + days + '</div>' +
    '<p class="gym-month-note">Solo sesiones guardadas · grupo muscular registrado</p>' +
    '</section>';
}
