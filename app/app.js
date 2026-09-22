import { mockState } from "../core/mock-state.js";

let state = mockState;
let areaById = new Map();
let privateMode = false;
let privateModeKind = null;

const colors = {
  ink: "#52647f", blue: "#2867e8", mint: "#2e8b78", sky: "#3984a8",
  rose: "#c45d7b", amber: "#b7791f", violet: "#7057b6", cyan: "#16859b",
  coral: "#db5d49", lime: "#668f2d",
};

const symbols = {
  general: "◎", career: "↗", finance: "≋", calendar: "□", partner: "◇",
  family: "⌂", health: "✚", wealth: "◆", projects: "✦", "open-loops": "!", goals: "○",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const shortDateFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const THEME_STORAGE_KEY = "segundo-cerebro-theme";

function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyTheme(theme, persist = false) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;

  const toggle = document.querySelector("#theme-toggle");
  if (toggle) {
    const dark = next === "dark";
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
    const icon = toggle.querySelector("span");
    if (icon) icon.textContent = dark ? "☀" : "☾";
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", next === "dark" ? "#0d1420" : "#f7f9fc");

  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  }
}

function initTheme() {
  applyTheme(getPreferredTheme());
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark", true);
}


function ensureDerivedAreas() {
  if (!Array.isArray(state.areas)) state.areas = [];
  if (!state.areas.some((area) => area.id === "area-health")) {
    const wealthIndex = state.areas.findIndex((area) => area.id === "area-wealth");
    const healthArea = {
      id: "area-health",
      slug: "health",
      title: "Salud",
      shortTitle: "Salud",
      summary: "Citas médicas, gimnasio y nutrición conectados al calendario.",
      health: 70,
      tone: "mint",
      module: "Health",
      sensitivity: "confidencial",
      status: "steady"
    };
    if (wealthIndex >= 0) state.areas.splice(wealthIndex, 0, healthArea);
    else state.areas.push(healthArea);
  }
}

async function init() {
  initTheme();
  await loadLocalPrivateState();
  await loadRemotePrivateState();
  ensureDerivedAreas();
  areaById = new Map(state.areas.map((area) => [area.id, area]));
  renderMode();
  renderDate();
  renderNavigation();
  renderFocus();
  renderEvents();
  renderBudgetOverview();
  renderDebtOverview();
  renderWealthOverview();
  renderDecisionsInline();
  renderAreas();
  renderSystemMap();
  bindInteractions();
}

async function loadLocalPrivateState() {
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const requested = new URLSearchParams(window.location.search).get("private") === "1";
  if (!localHost || !requested) return;

  try {
    const module = await import("../.private/state.js");
    if (!module.privateState || module.privateState.meta?.mode !== "private-local") {
      throw new Error("Estado privado local no válido");
    }
    state = module.privateState;
    privateMode = true;
    privateModeKind = "local";
  } catch (error) {
    console.warn("No se pudo cargar el estado privado local; se mantienen los mocks.", error);
  }
}

async function loadRemotePrivateState() {
  if (privateMode || globalThis.__SECOND_BRAIN_REMOTE__ !== true) return;

  try {
    const response = await fetch("/api/state", {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`Estado remoto no disponible (${response.status})`);
    }

    const remoteState = await response.json();
    if (!remoteState || remoteState.meta?.mode !== "private-remote") {
      throw new Error("Estado privado remoto no válido");
    }

    state = remoteState;
    privateMode = true;
    privateModeKind = "remote";
  } catch (error) {
    console.warn("No se pudo cargar el estado privado remoto; se mantienen los mocks.", error);
  }
}

function renderMode() {
  const generalHealth = state.areas.find((area) => area.id === "area-general")?.health ?? 0;
  const openDecisions = state.decisions.filter((decision) => decision.status === "open").length;
  const local = privateModeKind === "local";
  const remote = privateModeKind === "remote";

  document.querySelector("#privacy-mode-title").textContent = remote ? "Modo privado remoto" : local ? "Modo local privado" : "Modo demo";
  document.querySelector("#privacy-mode-detail").textContent = remote ? "Protegido por autenticación" : local ? "No se publica en GitHub" : "Solo datos ficticios";
  document.querySelector("#data-mode-badge").textContent = remote ? "Estado personal privado" : local ? "Estado personal local" : "Entorno mock";
  document.querySelector("#profile-button").setAttribute("aria-label", privateMode ? "Perfil privado" : "Perfil ficticio");
  document.querySelector("#query-submit").setAttribute("aria-label", privateMode ? "Consultar estado privado" : "Consultar datos ficticios");
  document.querySelector("#query-help").textContent = remote
    ? "La consulta se resuelve sobre tu estado privado remoto."
    : local
      ? "La consulta se resuelve en este navegador sobre el estado local. No usa red ni IA."
      : "La consulta se resuelve localmente sobre los datos ficticios.";
  document.querySelector("#footer-mode").textContent = remote
    ? "Acceso autenticado · Estado privado remoto"
    : local
      ? "Sin APIs · Estado local no publicado"
      : "Sin conexiones externas · Datos ficticios";
  document.querySelector("#general-health").textContent = String(generalHealth);
  document.querySelector("#general-pulse").setAttribute("aria-label", `Pulso general: ${generalHealth} de 100`);
  document.querySelector("#decision-count").textContent = `${openDecisions} decisiones abiertas`;
}

function renderDate() {
  const now = new Date();
  const hour = now.getHours();
  document.querySelector("#greeting").textContent = hour < 13 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const dateElement = document.querySelector("#current-date");
  dateElement.dateTime = now.toISOString();
  dateElement.textContent = dateFormatter.format(now);
}

function renderNavigation() {
  const nav = document.querySelector("#area-nav");
  nav.innerHTML = state.areas.map((area, index) => `
    <a class="nav-link ${index === 0 ? "active" : ""}" href="${area.slug === "general" ? "#overview" : `#area-${area.slug}`}" ${area.id === "area-wealth" ? 'data-open-wealth="true"' : ""} ${area.id === "area-health" ? 'data-open-health="true"' : ""} style="--area-color:${colors[area.tone]}">
      ${escapeHtml(area.shortTitle)}
    </a>
  `).join("");
}

function renderFocus() {
  const sorted = [...state.openLoops].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
  document.querySelector("#loop-count").textContent = `${sorted.length} abiertos`;
  document.querySelector("#focus-list").innerHTML = sorted.slice(0, 4).map((item) => {
    const area = areaById.get(item.areaId);
    const due = item.dueDate ? shortDateFormatter.format(new Date(`${item.dueDate}T12:00:00`)) : "Sin fecha";
    return `
      <li class="focus-item">
        <span class="focus-dot" style="--priority:${item.priority === "high" ? colors.coral : item.priority === "medium" ? colors.amber : colors.blue}"></span>
        <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.nextAction)}</p></div>
        <div class="focus-meta"><time datetime="${item.dueDate || ""}">${due}</time><span>${escapeHtml(area.shortTitle)}</span></div>
      </li>`;
  }).join("");
}

function renderEvents() {
  const list = document.querySelector("#event-list");
  const weekLabel = document.querySelector("#calendar-week-label");
  const now = new Date();
  const weekStart = startOfCalendarWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const events = dedupeCalendarEvents(state.events)
    .filter((event) => {
      const start = new Date(event.startsAt);
      const end = new Date(event.endsAt || event.startsAt);
      return end >= weekStart && start < weekEnd;
    })
    .sort(compareCalendarEvents);

  weekLabel.textContent = formatCalendarWeekLabel(weekStart, weekEnd);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });

  list.innerHTML = days.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEvents = events.filter((event) => {
      const start = new Date(event.startsAt);
      return start >= day && start < nextDay;
    });
    const isToday = sameCalendarDay(day, now);
    const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short" })
      .format(day)
      .replace(".", "");
    const month = new Intl.DateTimeFormat("es-ES", { month: "short" })
      .format(day)
      .replace(".", "");

    return `
      <section class="week-day ${isToday ? "today" : ""}" aria-label="${escapeHtml(weekday)} ${day.getDate()} de ${escapeHtml(month)}">
        <header class="week-day-header">
          <span>${escapeHtml(weekday)}</span>
          <strong>${day.getDate()}</strong>
        </header>
        <div class="week-day-events">
          ${dayEvents.length
            ? dayEvents.map(renderWeekEvent).join("")
            : '<span class="week-day-empty">—</span>'}
        </div>
      </section>`;
  }).join("");
}

function renderWeekEvent(event) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt || event.startsAt);
  const allDay = isAllDayCalendarEvent(event);
  const sourceLabel = event.calendarName || areaById.get(event.areaId)?.shortTitle || "Agenda";
  const calendarClass = calendarClassForEvent(event);
  const time = allDay
    ? "Todo el día"
    : new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(start);
  const endTime = !allDay && end > start
    ? new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(end)
    : null;

  return `
    <article class="week-event ${calendarClass}" title="${escapeHtml(event.title)} · ${escapeHtml(sourceLabel)}">
      <span class="week-event-time">${time}${endTime ? "–" + endTime : ""}</span>
      <strong>${escapeHtml(event.title)}</strong>
      <small>${escapeHtml(sourceLabel)}</small>
    </article>`;
}

function startOfCalendarWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function sameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function isAllDayCalendarEvent(event) {
  const start = String(event.startsAt || "");
  const end = String(event.endsAt || "");
  return /T00:00:00(?:Z)?$/.test(start) && /T00:00:00(?:Z)?$/.test(end);
}

function compareCalendarEvents(a, b) {
  const aAllDay = isAllDayCalendarEvent(a);
  const bAllDay = isAllDayCalendarEvent(b);
  if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
  return new Date(a.startsAt) - new Date(b.startsAt)
    || String(a.title).localeCompare(String(b.title), "es");
}

function dedupeCalendarEvents(events) {
  const seen = new Set();
  return [...events].filter((event) => {
    const key = [
      event.calendarName || event.areaId || "",
      event.title || "",
      event.startsAt || "",
      event.endsAt || ""
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCalendarWeekLabel(start, endExclusive) {
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  const sameMonth = start.getMonth() === end.getMonth();
  const startMonth = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(start).replace(".", "");
  const endMonth = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(end).replace(".", "");
  return sameMonth
    ? `${start.getDate()}–${end.getDate()} ${startMonth}`
    : `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

function calendarClassForEvent(event) {
  const byArea = {
    "area-general": "calendar-personal",
    "area-career": "calendar-work",
    "area-partner": "calendar-partner",
    "area-family": "calendar-family"
  };
  return byArea[event.areaId] || "calendar-default";
}


function renderBudgetOverview() {
  const finance = state.financeSummary || {};
  const monthly = finance.monthlyBudget || null;
  const period = document.querySelector("#budget-period");
  const summary = document.querySelector("#budget-summary");
  const commitments = document.querySelector("#event-budget-list");

  if (!monthly) {
    period.textContent = "Sin datos";
    summary.innerHTML = `
      <div class="budget-empty">
        <strong>Presupuesto pendiente de conectar</strong>
        <p>Cuando el estado privado incluya el ciclo mensual verás aquí el resumen.</p>
      </div>`;
  } else {
    const currency = monthly.currency || "EUR";
    const plannedOutflows = firstFinite(monthly.plannedOutflows, monthly.budgetedExpenses, monthly.budgeted);
    const income = firstFinite(monthly.income);
    const personalNet = firstFinite(monthly.personalNet, monthly.remaining);
    const savingsTarget = firstFinite(monthly.savingsTarget);
    const categories = Array.isArray(monthly.categories) ? monthly.categories : [];
    const actualSpent = firstFinite(
      monthly.spent,
      categories.reduce((sum, item) => sum + numberOrZero(item.spent), 0)
    );
    const progressRaw = plannedOutflows && actualSpent !== null
      ? (actualSpent / plannedOutflows) * 100
      : null;
    const progressValue = progressRaw === null ? 0 : Math.max(0, Math.min(100, progressRaw));
    const progressLabel = progressRaw === null ? null : Math.round(progressRaw);

    period.textContent = monthly.periodLabel || monthly.period || "Periodo actual";
    summary.innerHTML = `
      <div class="budget-compact-top">
        <div class="budget-primary">
          <span>Gasto + ahorro previsto</span>
          <strong>${plannedOutflows === null ? "—" : formatMoney(plannedOutflows, currency)}</strong>
        </div>
        <div class="budget-compact-spent">
          <span>Ejecutado</span>
          <strong>${actualSpent === null ? "—" : formatMoney(actualSpent, currency)}</strong>
        </div>
      </div>
      ${progressLabel === null ? "" : `
        <div class="budget-compact-progress-row">
          <progress class="budget-overall-progress" max="100" value="${progressValue}" aria-label="${progressLabel}% del gasto previsto ejecutado">${progressValue}</progress>
          <strong>${progressLabel}%</strong>
        </div>`}
      <div class="budget-metrics compact">
        ${income === null ? "" : `<div><span>Ingresos</span><strong>${formatMoney(income, currency)}</strong></div>`}
        ${personalNet === null ? "" : `<div><span>Neto personal</span><strong>${formatMoney(personalNet, currency)}</strong></div>`}
        ${savingsTarget === null ? "" : `<div><span>Ahorro objetivo</span><strong>${formatMoney(savingsTarget, currency)}</strong></div>`}
      </div>
    `;
  }

  renderImportantEvents(finance);

}

function renderImportantEvents(finance = state.financeSummary || {}) {
  const container = document.querySelector("#event-budget-list");
  const count = document.querySelector("#important-event-count");
  if (!container) return;

  const importantEvents = collectImportantEvents(finance);
  if (count) count.textContent = importantEvents.length ? `${importantEvents.length} próximos` : "";

  if (!importantEvents.length) {
    container.innerHTML = `
      <div class="event-budget-empty">
        <strong>Sin eventos importantes detectados</strong>
        <p>Se mostrarán aquí viajes, celebraciones y citas médicas encontradas en iCloud.</p>
      </div>`;
    return;
  }

  container.innerHTML = importantEvents.slice(0, 12).map((item) => {
    const date = new Date(item.startsAt || `${item.date}T12:00:00`);
    const currency = item.currency || "EUR";
    const total = firstFinite(item.totalBudget);
    const reserved = firstFinite(item.reserved);
    const source = item.source === "calendar" ? "iCloud" : "Finanzas";
    const tag = item.kind === "medical" ? "Cita médica"
      : item.kind === "travel" ? "Viaje"
      : item.kind === "birthday" ? "Cumpleaños"
      : item.kind === "social" ? "Evento"
      : "Importante";
    return `
      <article class="event-budget-item important-event-item">
        <div class="event-budget-date">
          <strong>${Number.isNaN(date.getTime()) ? "—" : date.getDate()}</strong>
          <span>${Number.isNaN(date.getTime()) ? "sin fecha" : shortMonth(date)}</span>
        </div>
        <div class="event-budget-copy">
          <span class="important-event-tag">${escapeHtml(tag)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.location || item.note || source)}</p>
        </div>
        <div class="event-budget-amount">
          <span>${escapeHtml(source)}</span>
          ${total !== null ? `<strong>${formatMoney(total, currency)}</strong>` : ""}
          ${reserved !== null && total !== null ? `<small>${formatMoney(reserved, currency)} reservado</small>` : ""}
        </div>
      </article>`;
  }).join("");
}

function collectImportantEvents(finance = state.financeSummary || {}) {
  const now = Date.now() - 24 * 60 * 60 * 1000;
  const rules = Array.isArray(state.importantEventRules)
    ? state.importantEventRules
    : Array.isArray(finance.importantEventRules)
      ? finance.importantEventRules
      : [];

  const calendarItems = (Array.isArray(state.events) ? state.events : [])
    .filter((event) => new Date(event.endsAt || event.startsAt).getTime() >= now)
    .map((event) => {
      const normalized = normalizeForMatch(event.title);
      const rule = rules.find((candidate) =>
        Array.isArray(candidate.matchTerms)
        && candidate.matchTerms.length
        && candidate.matchTerms.every((term) => normalized.includes(normalizeForMatch(term)))
      );
      const medical = classifyHealthEvent(event) === "medical";
      if (!rule && !medical) return null;
      return {
        id: event.id || [event.calendarName, event.title, event.startsAt].join("|"),
        title: rule?.displayTitle || safeDisplayEventTitle(event.title),
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location || null,
        kind: rule?.kind || "medical",
        source: "calendar"
      };
    })
    .filter(Boolean);

  const commitments = (Array.isArray(finance.upcomingCommitments) ? finance.upcomingCommitments : [])
    .filter((item) => !item.date || new Date(`${item.date}T23:59:59`).getTime() >= now)
    .map((item) => ({
      ...item,
      title: safeDisplayEventTitle(item.title),
      startsAt: item.date ? `${item.date}T12:00:00` : null,
      kind: inferImportantKind(item.title),
      source: "finance"
    }));

  const merged = [...calendarItems, ...commitments]
    .sort((a, b) => new Date(a.startsAt || "9999-12-31").getTime() - new Date(b.startsAt || "9999-12-31").getTime());

  const seen = new Set();
  return merged.filter((item) => {
    const dateKey = String(item.startsAt || "").slice(0, 10);
    const key = `${normalizeForMatch(item.title)}|${dateKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeForMatch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function safeDisplayEventTitle(value) {
  const title = String(value || "");
  return /varsovia/i.test(title) ? "Viaje nov" : title;
}

function inferImportantKind(title) {
  const text = normalizeForMatch(title);
  if (/viaje|vuelo|escapada|marbella|valencia/.test(text)) return "travel";
  if (/cumple/.test(text)) return "birthday";
  if (/boda|celebracion/.test(text)) return "social";
  return "important";
}

function classifyHealthEvent(event) {
  const text = normalizeForMatch([event.title, event.location].filter(Boolean).join(" "));
  if (/gimnasio|\bgym\b|entreno|entrenamiento/.test(text)) return "gym";
  if (/nutricion|nutricionista|dietista|dieta/.test(text)) return "nutrition";
  if (/medic|doctor|doctora|hospital|clinica|cardiolog|urolog|alergolog|dentista|dental|dermatolog|traumatolog|fisioterap|oftalmolog|revision medica|analitica|consulta/.test(text)) return "medical";
  return null;
}

function collectHealthEvents() {
  const now = Date.now() - 24 * 60 * 60 * 1000;
  return (Array.isArray(state.events) ? state.events : [])
    .map((event) => ({ ...event, healthKind: classifyHealthEvent(event) }))
    .filter((event) => event.healthKind && new Date(event.endsAt || event.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function openHealthDetail() {
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog");
  dialog.classList.add("health-dialog");
  document.querySelector("#dialog-context").textContent = "Salud · iCloud";
  document.querySelector("#dialog-title").textContent = "Salud";

  const healthEvents = collectHealthEvents();
  const groups = [
    ["medical", "Médicos"],
    ["gym", "Gimnasio"],
    ["nutrition", "Nutrición"]
  ];

  document.querySelector("#dialog-body").innerHTML = `
    <div class="health-sections">
      ${groups.map(([kind, label]) => {
        const items = healthEvents.filter((event) => event.healthKind === kind);
        return `
          <section class="health-section">
            <div class="health-section-heading"><strong>${label}</strong><span>${items.length}</span></div>
            ${items.length
              ? `<div class="health-event-list">${items.slice(0, 20).map(renderHealthEvent).join("")}</div>`
              : '<p class="health-empty">No hay próximos eventos detectados en iCloud.</p>'}
          </section>`;
      }).join("")}
    </div>`;
  dialog.showModal();
}

function renderHealthEvent(event) {
  const start = new Date(event.startsAt);
  const dateLabel = Number.isNaN(start.getTime())
    ? "Sin fecha"
    : new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        .format(start)
        .replace(".", "");
  return `
    <article class="health-event-item">
      <time>${escapeHtml(dateLabel)}</time>
      <strong>${escapeHtml(safeDisplayEventTitle(event.title))}</strong>
      ${event.location ? `<span>${escapeHtml(event.location)}</span>` : ""}
    </article>`;
}

function renderDebtOverview() {
  const finance = state.financeSummary || {};
  const debt = finance.debts || null;
  const container = document.querySelector("#debt-summary");
  if (!container) return;

  if (!debt || !Array.isArray(debt.debts)) {
    container.innerHTML = `
      <div class="debt-empty">
        <strong>Deudas pendientes de conectar</strong>
        <p>El resumen aparecerá aquí cuando la fuente financiera incluya saldos y cuotas.</p>
      </div>`;
    return;
  }

  const currency = debt.currency || "EUR";
  const count = Number.isFinite(Number(debt.count)) ? Number(debt.count) : debt.debts.length;
  const totalBalance = firstFinite(debt.totalBalance);
  const monthlyPayment = firstFinite(debt.monthlyPayment);

  container.innerHTML = `
    <div class="debt-summary-grid">
      <div class="debt-summary-primary">
        <span>Saldo pendiente</span>
        <strong>${totalBalance === null ? "Por completar" : formatMoney(totalBalance, currency)}</strong>
      </div>
      <div>
        <span>Cuota mensual</span>
        <strong>${monthlyPayment === null ? "—" : formatMoney(monthlyPayment, currency)}</strong>
      </div>
      <div>
        <span>Deudas activas</span>
        <strong>${count}</strong>
      </div>
    </div>
    ${totalBalance === null
      ? '<p class="debt-source-note">Las cuotas están registradas; faltan saldos pendientes para calcular la deuda total real.</p>'
      : ""}`;
}

function renderWealthOverview() {
  const wealth = state.financeSummary?.wealth || null;
  const container = document.querySelector("#wealth-summary");
  if (!container) return;

  if (!wealth || firstFinite(wealth.currentPatrimony) === null) {
    container.innerHTML = `
      <div class="wealth-empty">
        <strong>Patrimonio pendiente de conectar</strong>
        <p>El valor del día 1 aparecerá aquí cuando exista histórico financiero.</p>
      </div>`;
    return;
  }

  const currency = wealth.currency || "EUR";
  const current = firstFinite(wealth.currentPatrimony);
  const asOf = formatWealthDate(wealth.currentDate);

  container.innerHTML = `
    <div class="wealth-summary-value">
      <span>Patrimonio total</span>
      <strong>${formatMoney(current, currency)}</strong>
      <small>Actualizado a ${escapeHtml(asOf)}</small>
    </div>`;
}

function openWealthDetail() {
  const wealth = state.financeSummary?.wealth || null;
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.add("wealth-dialog");
  document.querySelector("#dialog-context").textContent = "Patrimonio · Evolución";
  document.querySelector("#dialog-title").textContent = "Patrimonio y salarios";

  const history = Array.isArray(wealth?.history)
    ? wealth.history.filter((item) => item.date)
    : [];

  if (!history.length) {
    document.querySelector("#dialog-body").innerHTML = "<p>No hay histórico patrimonial conectado.</p>";
    dialog.showModal();
    return;
  }

  const currency = wealth.currency || "EUR";
  const current = firstFinite(wealth.currentPatrimony);
  const asOf = formatWealthDate(wealth.currentDate);

  document.querySelector("#dialog-body").innerHTML = `
    <div class="wealth-detail">
      <div class="wealth-detail-kpi">
        <span>Patrimonio total · ${escapeHtml(asOf)}</span>
        <strong>${current === null ? "—" : formatMoney(current, currency)}</strong>
      </div>

      <section class="wealth-chart-block">
        <div class="wealth-chart-heading">
          <div><strong>Evolución de salarios</strong><span>Nómina mensual</span></div>
          <div class="wealth-chart-legend">
            <span><i class="miguel"></i>Miguel</span>
            <span><i class="andrea"></i>Andrea</span>
          </div>
        </div>
        ${renderWealthLineChart(history, [
          { key: "salaryMiguel", className: "salary-miguel" },
          { key: "salaryAndrea", className: "salary-andrea" }
        ], currency, "Evolución de salarios")}
      </section>

      <section class="wealth-chart-block">
        <div class="wealth-chart-heading">
          <div><strong>Evolución del patrimonio</strong><span>Valor registrado el día 1 de cada mes</span></div>
        </div>
        ${renderWealthLineChart(history, [
          { key: "patrimony", className: "patrimony-line" }
        ], currency, "Evolución del patrimonio")}
      </section>
    </div>`;
  dialog.showModal();
}

function renderWealthLineChart(history, seriesDefs, currency, ariaLabel) {
  const width = 760;
  const height = 250;
  const left = 58;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const rows = history
    .map((item) => ({ ...item, dateValue: new Date(`${item.date}T12:00:00`).getTime() }))
    .filter((item) => Number.isFinite(item.dateValue));

  const values = [];
  for (const row of rows) {
    for (const def of seriesDefs) {
      const value = firstFinite(row[def.key]);
      if (value !== null) values.push(value);
    }
  }
  if (!rows.length || !values.length) return '<p class="wealth-chart-empty">Sin datos suficientes.</p>';

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min = min * 0.95;
    max = max * 1.05 || 1;
  } else {
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;
  }

  const x = (index) => left + (rows.length === 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const y = (value) => top + ((max - value) / (max - min)) * plotHeight;

  const grid = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = max - (max - min) * ratio;
    const yy = top + plotHeight * ratio;
    return `
      <line class="wealth-grid-line" x1="${left}" y1="${yy.toFixed(1)}" x2="${width - right}" y2="${yy.toFixed(1)}"></line>
      <text class="wealth-axis-label" x="${left - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${escapeHtml(compactMoney(value, currency))}</text>`;
  }).join("");

  const series = seriesDefs.map((def) => {
    const points = rows.map((row, index) => {
      const value = firstFinite(row[def.key]);
      return value === null ? null : `${x(index).toFixed(1)},${y(value).toFixed(1)}`;
    }).filter(Boolean);
    if (!points.length) return "";
    const lastIndex = [...rows].map((row) => firstFinite(row[def.key])).findLastIndex((value) => value !== null);
    const lastValue = lastIndex >= 0 ? firstFinite(rows[lastIndex][def.key]) : null;
    return `
      <polyline class="wealth-chart-line ${def.className}" points="${points.join(" ")}"></polyline>
      ${lastValue === null ? "" : `<circle class="wealth-chart-point ${def.className}" cx="${x(lastIndex).toFixed(1)}" cy="${y(lastValue).toFixed(1)}" r="3.5"></circle>`}`;
  }).join("");

  const tickIndexes = [...new Set([0, Math.floor((rows.length - 1) / 3), Math.floor((rows.length - 1) * 2 / 3), rows.length - 1])];
  const xLabels = tickIndexes.map((index) => {
    const d = new Date(`${rows[index].date}T12:00:00`);
    const label = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(d).replace(".", "");
    return `<text class="wealth-axis-label" x="${x(index).toFixed(1)}" y="${height - 14}" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join("");

  return `
    <div class="wealth-chart-scroll">
      <svg class="wealth-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(ariaLabel)}">
        ${grid}
        ${series}
        ${xLabels}
      </svg>
    </div>`;
}

function compactMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatWealthDate(value) {
  if (!value) return "fecha desconocida";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date).replace(".", "");
}

function openDebtDetail() {
  const debt = state.financeSummary?.debts || null;
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog");

  document.querySelector("#dialog-context").textContent = "Finanzas · Deudas";
  document.querySelector("#dialog-title").textContent = "Detalle de deudas";

  if (!debt || !Array.isArray(debt.debts) || !debt.debts.length) {
    document.querySelector("#dialog-body").innerHTML = "<p>No hay deudas registradas en la fuente financiera.</p>";
    dialog.showModal();
    return;
  }

  const currency = debt.currency || "EUR";
  document.querySelector("#dialog-body").innerHTML = `
    <div class="debt-detail-summary">
      <div><span>Saldo total</span><strong>${debt.totalBalance === null ? "Por completar" : formatMoney(debt.totalBalance, currency)}</strong></div>
      <div><span>Cuota mensual</span><strong>${debt.monthlyPayment === null ? "—" : formatMoney(debt.monthlyPayment, currency)}</strong></div>
    </div>
    <div class="debt-detail-list">
      ${debt.debts.map((item) => renderDebtDetailItem(item, currency)).join("")}
    </div>`;
  dialog.showModal();
}

function renderDebtDetailItem(item, currency) {
  const balance = firstFinite(item.balance);
  const monthlyPayment = firstFinite(item.monthlyPayment);
  const rawRate = Number.isFinite(Number(item.interestRate)) ? Number(item.interestRate) : null;
  const rate = rawRate !== null && Math.abs(rawRate) > 0 && Math.abs(rawRate) <= 1 ? rawRate * 100 : rawRate;
  const paymentDay = Number.isFinite(Number(item.paymentDay)) ? Number(item.paymentDay) : null;
  const sourceStatus = String(item.sourceStatus || "").toUpperCase();
  const sourceLabel = sourceStatus === "RECONCILIADO_SHEET"
    ? "Conciliado"
    : sourceStatus === "DERIVADO"
      ? "Derivado"
      : sourceStatus === "PROVISIONAL_CHAT"
        ? "Pendiente de conciliar"
        : "";

  return `
    <article class="debt-detail-item">
      <div class="debt-detail-head">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          ${sourceLabel ? `<span class="debt-source-status">${escapeHtml(sourceLabel)}</span>` : ""}
        </div>
        <strong class="debt-detail-balance">${balance === null ? "Saldo por completar" : formatMoney(balance, currency)}</strong>
      </div>
      <div class="debt-detail-meta">
        <span>Cuota: <strong>${monthlyPayment === null ? "—" : formatMoney(monthlyPayment, currency)}</strong></span>
        <span>Pago: <strong>${paymentDay === null ? "Sin día fijado" : "día " + paymentDay}</strong></span>
        <span>Tipo: <strong>${rate === null ? "Por completar" : rate.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "%"}</strong></span>
      </div>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
    </article>`;
}

function openBudgetDetail() {
  const finance = state.financeSummary || {};
  const monthly = finance.monthlyBudget || null;
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog");

  document.querySelector("#dialog-context").textContent = "Finanzas · Presupuesto mensual";
  document.querySelector("#dialog-title").textContent = monthly?.periodLabel || monthly?.period || "Presupuesto actual";

  if (!monthly) {
    document.querySelector("#dialog-body").innerHTML = "<p>No hay presupuesto mensual conectado.</p>";
    dialog.showModal();
    return;
  }

  const currency = monthly.currency || "EUR";
  const categories = Array.isArray(monthly.categories) ? monthly.categories : [];
  document.querySelector("#dialog-body").innerHTML = categories.length
    ? `<div class="budget-detail-list">${categories.map((item) => renderBudgetCategoryDetail(item, currency)).join("")}</div>`
    : "<p>No hay partidas presupuestadas.</p>";
  dialog.showModal();
}

function renderBudgetCategoryDetail(item, currency) {
  const itemBudget = numberOrZero(item.budgeted);
  const itemSpent = numberOrZero(item.spent);
  const itemCommitted = numberOrZero(item.committed);
  const itemRemaining = Number.isFinite(Number(item.remaining))
    ? Number(item.remaining)
    : itemBudget - itemSpent - itemCommitted;
  const itemProgressRaw = itemBudget > 0 ? (itemSpent / itemBudget) * 100 : null;
  const itemProgress = itemProgressRaw === null ? null : Math.round(itemProgressRaw);
  const itemProgressValue = itemProgressRaw === null ? 0 : Math.max(0, Math.min(100, itemProgressRaw));
  const overBudget = itemProgressRaw !== null && itemProgressRaw > 100;
  const sourceStatus = String(item.sourceStatus || item.source_status || "").toUpperCase();
  const sourceLabel = sourceStatus === "PROVISIONAL_CHAT"
    ? "Pendiente de conciliar"
    : sourceStatus === "RECONCILIADO_SHEET"
      ? "Conciliado"
      : sourceStatus === "DERIVADO"
        ? "Derivado"
        : "";

  return `
    <div class="budget-category-item ${overBudget ? "over-budget" : ""}">
      <div class="budget-category-head">
        <span class="budget-category-title">${escapeHtml(item.title)}</span>
        <span class="budget-category-head-right">
          ${sourceLabel ? `<em class="budget-source ${sourceStatus === "PROVISIONAL_CHAT" ? "provisional" : ""}">${sourceLabel}</em>` : ""}
          <strong>${itemProgress === null ? "—" : itemProgress + "%"}</strong>
        </span>
      </div>
      <progress class="budget-category-progress"
                max="100"
                value="${itemProgressValue}"
                aria-label="${escapeHtml(item.title)}: ${itemProgress === null ? "sin porcentaje" : itemProgress + "% gastado"}">${itemProgressValue}</progress>
      <div class="budget-category-meta">
        <span>${formatMoney(itemSpent, currency)} gastado${itemCommitted > 0 ? " · " + formatMoney(itemCommitted, currency) + " comprometido" : ""}</span>
        <strong>${formatMoney(itemRemaining, currency)} libres</strong>
      </div>
    </div>`;
}

function renderDecisionsInline() {
  const container = document.querySelector("#decision-list");
  const open = state.decisions.filter((item) => item.status === "open");

  if (!open.length) {
    container.innerHTML = '<p class="decision-inline-empty">No hay decisiones abiertas.</p>';
    return;
  }

  container.innerHTML = open.map((item) => `
    <article class="decision-inline-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.question)}</p>
      </div>
      ${Array.isArray(item.options) && item.options.length
        ? `<div class="decision-options">${item.options.map((option) => `<span>${escapeHtml(option)}</span>`).join("")}</div>`
        : ""}
    </article>`).join("");
}

function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(numberOrZero(value));
}

function firstFinite(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function numberOrZero(value) {
  return firstFinite(value) ?? 0;
}

function shortMonth(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", "");
}

function renderAreas() {
  document.querySelector("#areas-grid").innerHTML = state.areas.slice(1).map((area) => `
    <button id="area-${area.slug}" class="area-card" type="button" data-area-id="${area.id}" style="--area-color:${colors[area.tone]};--health:${area.health}%">
      <span class="area-top"><span class="area-symbol">${symbols[area.slug]}</span><span class="area-health">${area.health}</span></span>
      <h3>${escapeHtml(area.title)}</h3>
      <p>${escapeHtml(area.summary)}</p>
      <span class="area-bar" aria-hidden="true"><span></span></span>
    </button>
  `).join("");
}

function renderSystemMap() {
  const modules = state.areas
    .filter((area) => area.module !== "Coordinator")
    .map((area) => ({
      id: area.id,
      title: area.title,
      description: area.summary,
      status: area.status === "steady" ? "active" : "attention",
      tone: area.tone,
    }));
  const { coordinator, capabilities, sources } = state.system;

  document.querySelector("#system-graph").innerHTML = `
    <section class="graph-tier coordinator-tier" aria-label="Coordinación">
      <article class="system-node coordinator-node">
        <div class="node-heading">
          <span class="node-mark coordinator-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <div><span class="node-kind">Orquestación</span><h3>${escapeHtml(coordinator.title)}</h3></div>
        </div>
        <p>${escapeHtml(coordinator.description)}</p>
        <span class="node-state"><i class="status-dot active"></i>Preparado · IA local futura</span>
      </article>
    </section>

    <div class="graph-flow" aria-hidden="true"><span></span></div>

    <section class="shared-state-node" aria-label="Estado global común">
      <div><span class="node-kind">Fuente de verdad</span><h3>Estado global común</h3></div>
      <p>Entidades, relaciones, contexto y decisiones en una sola capa.</p>
      <span class="shared-lock">${privateModeKind === "remote" ? "Privado · Remoto" : privateMode ? "Privado · Local" : "Privado · Mock"}</span>
    </section>

    <div class="graph-flow branch-flow" aria-hidden="true"><span></span></div>

    <section class="graph-tier" aria-labelledby="modules-title">
      <div class="tier-heading"><h3 id="modules-title">Módulos especializados</h3><span>${modules.length} áreas</span></div>
      <div class="module-grid">
        ${modules.map((module) => `
          <button class="system-node module-node" type="button" data-system-area-id="${module.id}" style="--node-color:${colors[module.tone]}">
            <span class="node-heading">
              <span class="module-mark" aria-hidden="true"><i></i></span>
              <span><span class="node-kind">Módulo</span><strong>${escapeHtml(module.title)}</strong></span>
            </span>
            <span class="module-summary">${escapeHtml(module.description)}</span>
            <span class="node-state"><i class="status-dot ${module.status === "active" ? "active" : "attention"}"></i>${module.status === "active" ? "Estable" : "Requiere atención"}</span>
          </button>
        `).join("")}
      </div>
    </section>

    <section class="lower-tiers">
      <div class="graph-tier capability-tier" aria-labelledby="capabilities-title">
        <div class="tier-heading"><h3 id="capabilities-title">Capacidades transversales</h3><span>Sin memoria propia</span></div>
        <div class="capability-list">
          ${capabilities.map((capability) => `
            <article class="capability-row">
              <span class="capability-mark" aria-hidden="true"><i></i><i></i></span>
              <div><strong>${escapeHtml(capability.title)}</strong><p>${escapeHtml(capability.description)}</p></div>
              <span class="node-state"><i class="status-dot ${capability.status}"></i>${capability.status === "active" ? "Activo" : "Simulado"}</span>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="graph-tier source-tier" aria-labelledby="sources-title">
        <div class="tier-heading"><h3 id="sources-title">Fuentes</h3><span>Propietarias del dato</span></div>
        <div class="source-list">
          ${sources.map((source) => `
            <article class="source-row">
              <span class="source-mark" aria-hidden="true"><i></i></span>
              <div><strong>${escapeHtml(source.title)}</strong><p>${escapeHtml(source.access)}</p></div>
              <span class="node-state"><i class="status-dot ${source.status}"></i>${source.status === "active" ? "Activo" : "Bloqueado"}</span>
            </article>
          `).join("")}
        </div>
        <p class="source-note">Gmail, Outlook, Calendar, Drive y Sheets permanecen desconectados.</p>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-system-area-id]").forEach((node) => {
    node.addEventListener("click", () => openArea(node.dataset.systemAreaId));
  });
}

function bindInteractions() {
  const dialog = document.querySelector("#detail-dialog");
  document.querySelectorAll(".area-card").forEach((card) => card.addEventListener("click", () => openArea(card.dataset.areaId)));
  document.querySelector("#show-budget-detail")?.addEventListener("click", openBudgetDetail);
  document.querySelector("#show-debt-detail")?.addEventListener("click", openDebtDetail);
  document.querySelector("#show-wealth-detail")?.addEventListener("click", openWealthDetail);
  document.querySelector("#theme-toggle")?.addEventListener("click", toggleTheme);
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.querySelector("#ask-form").addEventListener("submit", handleQuery);

  const menuButton = document.querySelector("#menu-button");
  menuButton.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    menuButton.setAttribute("aria-expanded", "false");
  }));
  document.querySelector('[data-open-wealth="true"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    openWealthDetail();
  });
  document.querySelector('[data-open-health="true"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    openHealthDetail();
  });
}

function setView(view) {
  const list = document.querySelector("#areas-grid");
  const map = document.querySelector("#system-map");
  const showMap = view === "map";
  list.hidden = showMap;
  map.hidden = !showMap;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function openArea(areaId) {
  if (areaId === "area-wealth") {
    openWealthDetail();
    return;
  }
  if (areaId === "area-health") {
    openHealthDetail();
    return;
  }
  const area = areaById.get(areaId);
  const relatedLoops = state.openLoops.filter((item) => item.areaId === areaId);
  const relatedProjects = state.projects.filter((item) => item.areaId === areaId);
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "health-dialog");
  document.querySelector("#dialog-context").textContent = `${area.module} · ${sensitivityLabel(area.sensitivity)}`;
  document.querySelector("#dialog-title").textContent = area.title;
  const entries = [
    ...relatedLoops.map((item) => ({
      title: item.title,
      detail: [item.context, item.nextAction && `Siguiente: ${item.nextAction}`].filter(Boolean).join(" · "),
    })),
    ...relatedProjects.map((item) => ({
      title: item.title,
      detail: [item.summary, Number.isFinite(item.progress) && `${item.progress}%`, item.nextAction && `Siguiente: ${item.nextAction}`].filter(Boolean).join(" · "),
    })),
  ];
  document.querySelector("#dialog-body").innerHTML = entries.length
    ? `<ul class="dialog-list">${entries.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></li>`).join("")}</ul>`
    : `<p>No hay asuntos asociados a esta área.</p>`;
  dialog.showModal();
}

function openDecisions() {
  const dialog = document.querySelector("#detail-dialog");
  document.querySelector("#dialog-context").textContent = privateModeKind === "remote" ? "Coordinador · Estado privado remoto" : privateMode ? "Coordinador · Estado local privado" : "Coordinador · Datos ficticios";
  document.querySelector("#dialog-title").textContent = "Decisiones abiertas";
  document.querySelector("#dialog-body").innerHTML = `<ul class="dialog-list">${state.decisions.map((item) => `
    <li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.question)} · ${item.options.map(escapeHtml).join(" / ")}</p></li>
  `).join("")}</ul>`;
  dialog.showModal();
}

function handleQuery(event) {
  event.preventDefault();
  const input = document.querySelector("#ask-input");
  const result = document.querySelector("#query-result");
  const query = input.value.trim().toLocaleLowerCase("es");
  if (!query) {
    result.hidden = false;
    result.innerHTML = privateMode
      ? "Escribe una pregunta o el nombre de un área para buscar en el estado privado."
      : "Escribe una pregunta o el nombre de un área para buscar en el estado ficticio.";
    return;
  }
  const entities = [...state.areas, ...state.projects, ...state.openLoops, ...state.goals, ...state.decisions, ...state.events];
  const terms = query.split(/\s+/).filter((term) => term.length > 2);
  const matches = entities.filter((entity) => {
    const haystack = JSON.stringify(entity).toLocaleLowerCase("es");
    return terms.some((term) => haystack.includes(term));
  }).slice(0, 3);
  result.hidden = false;
  result.innerHTML = matches.length
    ? `<strong>He encontrado ${matches.length} coincidencia${matches.length === 1 ? "" : "s"} en el estado ${privateMode ? "privado" : "mock"}:</strong> ${matches.map((item) => escapeHtml(item.title)).join(" · ")}`
    : privateMode
      ? "No hay coincidencias en el estado privado."
      : "No hay coincidencias en los datos ficticios. La conexión con fuentes reales y el asistente de lenguaje natural quedan para una fase futura.";
}

function priorityRank(priority) { return { low: 1, medium: 2, high: 3 }[priority] || 0; }
function sensitivityLabel(value) { return value.replace("_", " "); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

init();
