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

// Nutrition is sourced from the already loaded private Health overview (30 days).
// Missing intake and incomplete Apple Health coverage must remain unknown, not zero.
function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function nutritionForGymDay(row) {
  if (!row || typeof row !== "object") return {
    consumed: null, burned: null, protein: null, balance: null, isComparable: false
  };
  const hasConsumption = (numberOrNull(row.consumedEntryCount) ?? 0) > 0;
  const consumed = hasConsumption ? numberOrNull(row.consumedKcal) : null;
  const protein = hasConsumption ? numberOrNull(row.consumedProtein) : null;
  const comparable = ["full", "live"].includes(String(row.coverageQuality || "").toLowerCase());
  const burned = comparable ? numberOrNull(row.burnedKcal) : null;
  return {
    consumed, burned, protein,
    balance: consumed === null || burned === null ? null : consumed - burned,
    isComparable: comparable
  };
}

function dayNutritionMarkup(day) {
  const metrics = day.nutrition;
  const amount = (value, unit) => value === null ? "—" :
    Math.round(value).toLocaleString("es-ES") + " " + unit;
  const balance = metrics.balance;
  const balanceLabel = balance === null ? "—" :
    (balance > 0 ? "+" : "") + amount(balance, "kcal");
  const tone = balance === null ? "is-unknown" : balance < 0 ? "is-deficit" :
    balance > 0 ? "is-surplus" : "is-neutral";
  const provisional = day.isToday && balance !== null ? " · provisional" : "";
  return '<dl class="home-gym-day-nutrition" aria-label="Nutrición y gasto del día">' +
    '<div class="' + tone + '"><dt>Balance</dt><dd>' + balanceLabel + '</dd></div>' +
    '<div><dt>Gasto total</dt><dd>' + amount(metrics.burned, "kcal") + '</dd></div>' +
    '<div><dt>Ingeridas</dt><dd>' + amount(metrics.consumed, "kcal") + '</dd></div>' +
    '<div><dt>Proteína</dt><dd>' + amount(metrics.protein, "g") + '</dd></div>' +
    (provisional ? '<small class="home-gym-nutrition-note">' + provisional.slice(3) + '</small>' : '') +
    '</dl>';
}

export function gymWeekSummaryModel(payload, now = new Date(), nutritionHistory = []) {
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) throw new TypeError("INVALID_GYM_WEEK_DATE");
  const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const today = dateKey(current);
  const nutritionByDate = new Map();
  for (const entry of Array.isArray(nutritionHistory) ? nutritionHistory : []) {
    if (validDateKey(entry?.date) && entry.date <= today && !nutritionByDate.has(entry.date)) {
      nutritionByDate.set(entry.date, nutritionForGymDay(entry));
    }
  }
  const planById = new Map((Array.isArray(payload?.plan) ? payload.plan : []).map(day => [String(day.id), day]));
  const validPayload = payload?.ok === true && Array.isArray(payload?.sessions);
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(d.getDate() + index);
    const key = dateKey(d);
    return { key, label: WEEKDAYS[index], day: d.getDate(), isToday: key === today,
      isFuture: key > today, sessions: [], groups: [], exerciseCount: 0,
      nutrition: nutritionByDate.get(key) || nutritionForGymDay(null) };
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
  const gymAvailable = payload?.ok === true && Array.isArray(payload.sessions);
  const hasNutrition = Array.isArray(options.nutritionHistory);
  if (!gymAvailable && !hasNutrition) {
    return '<p class="home-gym-week-state" role="status">' +
      (options.privateMode === false ? "Disponible solo en tu espacio privado." :
        options.loading ? "Cargando entrenamientos guardados…" : "No se pudo consultar el histórico de gimnasio.") +
      '</p>';
  }
  const model = gymWeekSummaryModel(payload, now, options.nutritionHistory);
  const gymMessage = !gymAvailable ? '<p class="home-gym-week-state" role="status">Entrenamientos no disponibles; se muestra la nutrición registrada.</p>' : '';
  return gymMessage + '<div class="home-gym-week-meta"><span>Semana ' + escapeHtml(model.weekLabel) +
    '</span><strong>' + (gymAvailable
      ? model.trainedDays + (model.trainedDays === 1 ? " día" : " días") +
        ' · ' + model.sessionCount + (model.sessionCount === 1 ? " sesión" : " sesiones")
      : "Entrenos sin consultar") +
    '</strong>' + (options.stale ? '<small>Última consulta disponible</small>' : '') + '</div>' +
    '<div class="home-gym-week-days" aria-label="Días de entrenamiento de la semana actual">' +
    model.days.map(day => {
      const trained = day.sessions.length > 0;
      const classes = ['home-gym-week-day', trained ? 'is-trained' : '', day.isToday ? 'is-today' : ''].filter(Boolean).join(" ");
      const label = day.label + " " + day.day;
      const top = '<span class="home-gym-day-heading"><span>' + day.label + '</span><b>' + day.day + '</b></span>';
      if (!trained) {
        const status = day.isFuture ? "Próximo" : gymAvailable ? "—" : "Gym sin datos";
        return '<div class="' + classes + '" data-gym-week-date="' + day.key + '" aria-label="' +
          escapeHtml(label + (day.isFuture ? ": pendiente" : gymAvailable ? ": sin sesión registrada" : ": entrenamiento sin consultar")) + '">' +
          top + '<span class="home-gym-day-empty">' + status + '</span>' +
          dayNutritionMarkup(day) + '</div>';
      }
      return '<details class="' + classes + '" data-gym-week-date="' + day.key + '">' +
        '<summary aria-label="' + escapeHtml(label + ": " + day.groups.join(", ") +
          "; pulsar para ver ejercicios") + '">' + top +
        '<strong class="home-gym-day-group">' + escapeHtml(day.groups.join(" · ")) + '</strong>' +
        '<span class="home-gym-day-count">' + day.exerciseCount + ' ejercicios <span aria-hidden="true">⌄</span></span>' +
        '</summary>' + dayNutritionMarkup(day) +
        '<div class="home-gym-day-details">' + detailsForDay(day) + '</div></details>';
    }).join("") + '</div>';
}
