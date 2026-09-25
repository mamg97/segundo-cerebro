import { progressRingMarkup } from "./progress-ring.js?v=0.32.1";
let activeMonth = null;
let currentPayload = null;
let selectedDate = null;

const STATUS = {
  CUMPLIDO: { label: "Cumplido", short: "Cumplido" },
  PARCIAL: { label: "Parcial", short: "Parcial" },
  NO_CUMPLIDO: { label: "No cumplido", short: "No cumplido" },
  SIN_DATOS: { label: "Sin datos", short: "Sin datos" },
  FUTURO: { label: "Futuro", short: "Futuro" }
};

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c];
  });
}

function fmt(value, suffix) {
  suffix = suffix || "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const text = Number.isInteger(n) ? n.toLocaleString("es-ES") : n.toFixed(1).replace(".", ",");
  return text + suffix;
}

function monthName(month) {
  const parts = String(month).split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], Math.max(0, parts[1] - 1), 1));
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shiftMonth(month, amount) {
  const parts = String(month).split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1 + amount, 1));
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
}

function todayMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find(function (p) { return p.type === "year"; }).value;
  const month = parts.find(function (p) { return p.type === "month"; }).value;
  return year + "-" + month;
}

function dimClass(state) {
  if (state === "pass") return "pass";
  if (state === "partial") return "partial";
  if (state === "fail") return "fail";
  return "unknown";
}

function dimension(day, key) {
  return (day.dimensions || []).find(function (item) { return item.key === key; }) || null;
}

function miniIndicators(day) {
  const keys = ["kcal", "protein", "steps"];
  return '<span class="adherence-mini">' + keys.map(function (key) {
    const item = dimension(day, key);
    return '<i class="' + dimClass(item && item.state) + '" title="' + esc(item ? item.label : key) + '"></i>';
  }).join("") + '</span>';
}

function statusLabel(status) {
  return STATUS[status] ? STATUS[status].label : String(status || "");
}

function summaryCard(label, value, cls, note) {
  return '<article class="adherence-summary-card ' + cls + '"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong>' +
    (note ? '<small>' + esc(note) + '</small>' : '') + '</article>';
}

function renderSummary(summary) {
  const adherenceValue = summary.adherencePct == null ? null : Number(summary.adherencePct);
  const coverage = summary.coveragePct == null ? "—" : summary.coveragePct + "% datos";
  const adherenceCard = '<article class="adherence-summary-card primary ring-card">' +
    progressRingMarkup(adherenceValue, { tone: "blue", size: "md", label: "mes", ariaLabel: "Adherencia mensual" }) +
    '<span><span>Adherencia</span><small>' + esc(coverage) + '</small></span></article>';
  return '<div class="adherence-summary-grid">' +
    adherenceCard +
    summaryCard("Cumplidos", summary.fulfilled, "fulfilled", "días") +
    summaryCard("Parciales", summary.partial, "partial", "días") +
    summaryCard("No cumplidos", summary.failed, "failed", "días") +
    summaryCard("Sin datos", summary.noData, "nodata", "días") +
    summaryCard("Racha actual", summary.currentStreak, "streak", "días cumplidos") +
    '</div>' +
    '<div class="adherence-secondary-stats">' +
      '<span><small>Mejor racha</small><strong>' + esc(summary.bestStreak) + ' días</strong></span>' +
      '<span><small>Laborables</small><strong>' + (summary.weekdayAdherencePct == null ? "—" : summary.weekdayAdherencePct + "%") + '</strong></span>' +
      '<span><small>Fin de semana</small><strong>' + (summary.weekendAdherencePct == null ? "—" : summary.weekendAdherencePct + "%") + '</strong></span>' +
      '<span><small>Días evaluados</small><strong>' + esc(summary.evaluatedDays) + ' / ' + esc(summary.elapsedDays) + '</strong></span>' +
    '</div>';
}

function buildWeeks(payload) {
  const days = payload.days || [];
  if (!days.length) return [];
  const first = new Date(days[0].date + "T12:00:00Z");
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const slots = Array(mondayOffset).fill(null).concat(days);
  while (slots.length % 7) slots.push(null);
  const weeks = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return weeks;
}

function dayCell(day) {
  if (!day) return '<span class="adherence-day empty" aria-hidden="true"></span>';
  const isSelected = day.date === selectedDate ? " selected" : "";
  const manual = day.manual ? '<b class="adherence-manual-badge" title="Clasificación manual">M</b>' : "";
  return '<button type="button" class="adherence-day state-' + String(day.status).toLowerCase().replaceAll("_", "-") + isSelected + '" data-adherence-day="' + esc(day.date) + '">' +
    '<span class="adherence-day-top"><strong>' + esc(day.day) + '</strong>' + manual + '</span>' +
    '<span class="adherence-day-state">' + esc(statusLabel(day.status)) + '</span>' +
    miniIndicators(day) +
    '</button>';
}

function renderCalendar(payload) {
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];
  const weeks = buildWeeks(payload);
  return '<section class="adherence-calendar-card">' +
    '<div class="adherence-weekday-head">' + weekDays.map(function (label) { return '<span>' + label + '</span>'; }).join("") + '</div>' +
    '<div class="adherence-weeks">' +
      weeks.map(function (week, index) {
        const dates = week.filter(Boolean);
        const label = dates.length ? "Semana " + dates[0].day + "–" + dates[dates.length - 1].day : "Semana " + (index + 1);
        return '<section class="adherence-week"><small class="adherence-week-label">' + esc(label) + '</small><div class="adherence-week-grid">' +
          week.map(dayCell).join("") + '</div></section>';
      }).join("") +
    '</div>' +
    '<div class="adherence-legend">' +
      '<span><i class="fulfilled"></i>Cumplido</span>' +
      '<span><i class="partial"></i>Parcial</span>' +
      '<span><i class="failed"></i>No cumplido</span>' +
      '<span><i class="nodata"></i>Sin datos</span>' +
    '</div>' +
  '</section>';
}

function dimValue(item) {
  if (!item) return "—";
  if (item.key === "kcal") return fmt(item.actual, " kcal") + (item.target == null ? "" : " / " + fmt(item.target, " kcal"));
  if (item.key === "protein") return fmt(item.actual, " g") + (item.target == null ? "" : " / " + fmt(item.target, " g"));
  if (item.key === "steps") return fmt(item.actual) + (item.target == null ? "" : " / " + fmt(item.target));
  if (item.key === "gym") return item.actual > 0 ? "Sí" : "No";
  if (item.key === "habits") return fmt(item.actual) + (item.target == null ? "" : " / " + fmt(item.target));
  return fmt(item.actual);
}

function detailMetric(item) {
  if (!item) return "";
  return '<article class="adherence-detail-metric metric-' + dimClass(item.state) + '">' +
    '<span>' + esc(item.label) + '</span><strong>' + esc(dimValue(item)) + '</strong>' +
    (item.note ? '<small>' + esc(item.note) + '</small>' : '') +
  '</article>';
}

function renderDetail(day) {
  const target = document.querySelector("#adherence-day-detail");
  if (!target) return;
  if (!day) {
    target.innerHTML = '<div class="adherence-detail-empty"><strong>Selecciona un día</strong><p>Toca una fecha para ver por qué ha recibido ese estado.</p></div>';
    return;
  }
  const date = new Date(day.date + "T12:00:00Z");
  const dateText = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  const dims = ["kcal", "protein", "steps", "gym", "habits"].map(function (key) { return dimension(day, key); }).filter(Boolean);
  const reasons = day.reasons || [];
  const workoutNames = [];
  const energyWorkouts = day.details && day.details.energy && Array.isArray(day.details.energy.workouts) ? day.details.energy.workouts : [];
  energyWorkouts.forEach(function (item) {
    const name = item.name || item.workoutActivityType || item.type;
    if (name && !workoutNames.includes(name)) workoutNames.push(name);
  });
  (day.details && day.details.gymSessions || []).forEach(function (item) {
    const name = item.dayTitle || item.dayId;
    if (name && !workoutNames.includes(name)) workoutNames.push(name);
  });

  target.innerHTML = '<div class="adherence-detail-head">' +
    '<div><small>' + esc(dateText) + '</small><strong>' + esc(statusLabel(day.status)) + '</strong></div>' +
    '<span class="state-' + String(day.status).toLowerCase().replaceAll("_", "-") + '">' + (day.manual ? "Manual" : "Automático") + '</span>' +
    '</div>' +
    '<div class="adherence-detail-grid">' + dims.map(detailMetric).join("") + '</div>' +
    (workoutNames.length ? '<div class="adherence-workout-note"><small>Entreno detectado</small><strong>' + esc(workoutNames.join(" · ")) + '</strong></div>' : '') +
    '<div class="adherence-reasons"><small>Motivo de clasificación</small>' +
      (reasons.length ? '<ul>' + reasons.map(function (reason) { return '<li>' + esc(reason) + '</li>'; }).join("") + '</ul>' : '<p>Sin incidencias relevantes.</p>') +
    '</div>';
}

function chooseInitialDay(payload) {
  const today = payload.today;
  const exact = (payload.days || []).find(function (day) { return day.date === today; });
  if (exact) return exact.date;
  const past = (payload.days || []).filter(function (day) { return day.date <= today; });
  return past.length ? past[past.length - 1].date : (payload.days[0] && payload.days[0].date) || null;
}

function bind(payload) {
  document.querySelectorAll("[data-adherence-shift]").forEach(function (button) {
    button.addEventListener("click", function () {
      void loadHealthAdherence(shiftMonth(payload.month, Number(button.dataset.adherenceShift || 0)));
    });
  });
  document.querySelector("[data-adherence-current]")?.addEventListener("click", function () {
    void loadHealthAdherence(todayMonth());
  });
  document.querySelectorAll("[data-adherence-day]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedDate = button.dataset.adherenceDay;
      document.querySelectorAll("[data-adherence-day]").forEach(function (node) {
        node.classList.toggle("selected", node === button);
      });
      const day = (payload.days || []).find(function (item) { return item.date === selectedDate; });
      renderDetail(day);
      if (window.matchMedia("(max-width: 760px)").matches) {
        document.querySelector("#adherence-day-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function render(payload) {
  currentPayload = payload;
  const panel = document.querySelector("#adherence-panel");
  if (!panel) return;
  if (!selectedDate || !(payload.days || []).some(function (day) { return day.date === selectedDate; })) {
    selectedDate = chooseInitialDay(payload);
  }
  panel.innerHTML = '<div class="adherence-shell">' +
    '<header class="adherence-header">' +
      '<div><small>Seguimiento mensual</small><strong>Adherencia</strong><p>Nutrición, proteína, actividad, gimnasio y hábitos en una sola vista.</p></div>' +
      '<div class="adherence-month-nav"><button type="button" data-adherence-shift="-1" aria-label="Mes anterior">‹</button><strong>' + esc(monthName(payload.month)) + '</strong><button type="button" data-adherence-shift="1" aria-label="Mes siguiente">›</button><button type="button" data-adherence-current>Este mes</button></div>' +
    '</header>' +
    renderSummary(payload.summary || {}) +
    '<div class="adherence-main">' +
      renderCalendar(payload) +
      '<aside id="adherence-day-detail" class="adherence-day-detail"></aside>' +
    '</div>' +
    '<p class="adherence-policy-note">Adherencia: cumplido = 1 · parcial = 0,5 · no cumplido = 0. Los días sin datos y futuros no penalizan. Una clasificación manual prevalece sobre la automática.</p>' +
  '</div>';
  renderDetail((payload.days || []).find(function (day) { return day.date === selectedDate; }));
  bind(payload);
}

export async function loadHealthAdherence(month) {
  const panel = document.querySelector("#adherence-panel");
  if (!panel) return;
  activeMonth = /^\d{4}-\d{2}$/.test(String(month || "")) ? String(month) : activeMonth || todayMonth();
  panel.innerHTML = '<p class="health-empty">Calculando adherencia mensual…</p>';
  try {
    const response = await fetch("/api/health/adherence?month=" + encodeURIComponent(activeMonth), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("ADHERENCE_" + response.status);
    render(await response.json());
  } catch (error) {
    console.warn("Health adherence load failed", error);
    panel.innerHTML = '<div class="health-empty health-empty-card"><strong>Adherencia no disponible</strong><p>No se ha podido combinar el histórico de Salud, actividad, gimnasio y hábitos.</p><button id="adherence-retry" type="button">Reintentar</button></div>';
    document.querySelector("#adherence-retry")?.addEventListener("click", function () { void loadHealthAdherence(activeMonth); });
  }
}
