// Home-only weekly gym activity: uses the already loaded private /api/gym
// session snapshot. No new endpoint, no inferred attendance, no browser storage.
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const pad = value => String(value).padStart(2, "0");
const dateKey = date => date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function groupName(session, planById) {
  const recorded = String(session.dayTitle || "").trim().replace(/\s+/g, " ");
  const fallback = String(planById.get(String(session.dayId || ""))?.focus || "").trim();
  const generic = /^(?:d[ií]a|day)\s*[\dA-Z]+(?:\s*[-:]\s*)?$/i.test(recorded);
  return ((!recorded || generic ? fallback || recorded : recorded) || "Entrenamiento")
    .replace(/^(?:d[ií]a|day)\s*\d+\s*[-:·]\s*/i, "").slice(0, 100);
}

export function gymWeekSummaryModel(payload, now = new Date()) {
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) throw new TypeError("INVALID_GYM_WEEK_DATE");
  const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const today = dateKey(current);
  const planById = new Map((Array.isArray(payload?.plan) ? payload.plan : []).map(day => [String(day.id), day]));
  const validPayload = payload?.ok === true && Array.isArray(payload?.sessions);
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(d.getDate() + index);
    const key = dateKey(d);
    return { key, label: WEEKDAYS[index], day: d.getDate(), isToday: key === today,
      isFuture: key > today, sessions: [], groups: [], exerciseCount: 0 };
  });
  const byDate = new Map(days.map(day => [day.key, day]));
  if (validPayload) {
    for (const session of payload.sessions) {
      if (!validDateKey(session?.sessionDate) || session.sessionDate > today ||
          !Array.isArray(session.entries) || session.entries.length === 0) continue;
      const day = byDate.get(session.sessionDate);
      if (!day) continue;
      const group = groupName(session, planById);
      if (!day.groups.includes(group)) day.groups.push(group);
      const exercises = session.entries.map(item => ({
        name: String(item?.exerciseName || "Ejercicio").slice(0, 180),
        sets: item?.setsDone == null ? null : String(item.setsDone).slice(0, 20),
        reps: item?.repsDone == null ? null : String(item.repsDone).slice(0, 30),
        load: item?.loadValue == null || item.loadValue === "" ? null : String(item.loadValue).slice(0, 25),
        unit: String(item?.loadUnit || "kg").slice(0, 12)
      }));
      day.sessions.push({ group, exercises });
      day.exerciseCount += exercises.length;
    }
  }
  const trainedDays = days.filter(day => day.sessions.length > 0).length;
  const sessionCount = days.reduce((total, day) => total + day.sessions.length, 0);
  const last = days[6];
  return {
    available: validPayload, weekStart: days[0].key, weekEnd: last.key,
    weekLabel: days[0].day + "–" + last.day + " " +
      new Intl.DateTimeFormat("es-ES", { month: "short" }).format(new Date(last.key + "T12:00:00")),
    days, trainedDays, sessionCount
  };
}

function detailsForDay(day) {
  return day.sessions.map(session => '<div class="home-gym-session">' +
    '<strong>' + escapeHtml(session.group) + '</strong>' +
    '<ul>' + session.exercises.map(entry => {
      const segments = [
        entry.sets === null ? null : entry.sets + " series",
        entry.reps === null || entry.reps === "" ? null : entry.reps + " reps",
        entry.load === null ? null : entry.load + " " + entry.unit
      ].filter(Boolean);
      return '<li><span>' + escapeHtml(entry.name) + '</span>' +
        (segments.length ? '<small>' + escapeHtml(segments.join(" · ")) + '</small>' : '') + '</li>';
    }).join("") + '</ul></div>').join("");
}

export function renderHomeGymWeek(payload, now = new Date(), options = {}) {
  if (!payload || payload.ok !== true || !Array.isArray(payload.sessions)) {
    return '<p class="home-gym-week-state" role="status">' +
      (options.privateMode === false ? "Disponible solo en tu espacio privado." :
        options.loading ? "Cargando entrenamientos guardados…" : "No se pudo consultar el histórico de gimnasio.") +
      '</p>';
  }
  const model = gymWeekSummaryModel(payload, now);
  return '<div class="home-gym-week-meta"><span>Semana ' + escapeHtml(model.weekLabel) +
    '</span><strong>' + model.trainedDays + (model.trainedDays === 1 ? " día" : " días") +
    ' · ' + model.sessionCount + (model.sessionCount === 1 ? " sesión" : " sesiones") +
    '</strong>' + (options.stale ? '<small>Última consulta disponible</small>' : '') + '</div>' +
    '<div class="home-gym-week-days" aria-label="Días de entrenamiento de la semana actual">' +
    model.days.map(day => {
      const trained = day.sessions.length > 0;
      const classes = ['home-gym-week-day', trained ? 'is-trained' : '', day.isToday ? 'is-today' : ''].filter(Boolean).join(" ");
      const label = day.label + " " + day.day;
      const top = '<span class="home-gym-day-heading"><span>' + day.label + '</span><b>' + day.day + '</b></span>';
      if (!trained) {
        return '<div class="' + classes + '" data-gym-week-date="' + day.key + '" aria-label="' +
          escapeHtml(label + (day.isFuture ? ": pendiente" : ": sin sesión registrada")) + '">' +
          top + '<span class="home-gym-day-empty">' + (day.isFuture ? "Próximo" : "—") + '</span></div>';
      }
      return '<details class="' + classes + '" data-gym-week-date="' + day.key + '">' +
        '<summary aria-label="' + escapeHtml(label + ": " + day.groups.join(", ") +
          "; pulsar para ver ejercicios") + '">' + top +
        '<strong class="home-gym-day-group">' + escapeHtml(day.groups.join(" · ")) + '</strong>' +
        '<span class="home-gym-day-count">' + day.exerciseCount + ' ejercicios <span aria-hidden="true">⌄</span></span>' +
        '</summary><div class="home-gym-day-details">' + detailsForDay(day) + '</div></details>';
    }).join("") + '</div>';
}
