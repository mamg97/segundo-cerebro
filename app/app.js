import "./vendor/thinking-orbs/register.js";
import { mockState } from "../core/mock-state.js";
import { initDemoMode, toggleDemoMode } from "./demo-mode.js?v=0.25.0";
import { openPantryDetail, pantryAreaFromState, renderHomePantryCard } from "./pantry.js?v=0.29.0";
import { openObjectsDetail, objectsAreaFromState, renderHomeObjectsCard } from "./objects.js?v=0.29.0";
import { openProjectsDetail } from "./projects.js?v=0.33.0";
import { loadHealthAdherence } from "./adherence.js?v=0.32.1";
import { progressRingMarkup, updateProgressRing } from "./progress-ring.js?v=0.33.2";

let state = mockState;
let areaById = new Map();
let privateMode = false;
let privateModeKind = null;

const colors = {
  ink: "#52647f", blue: "#2867e8", mint: "#2e8b78", sky: "#3984a8",
  rose: "#c45d7b", amber: "#b7791f", violet: "#7057b6", cyan: "#16859b",
  coral: "#db5d49", lime: "#668f2d",
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

let orbMediaQuery = null;

function syncSystemOrbResponsiveSize() {
  const orb = document.querySelector("#system-orb");
  if (!orb) return;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const nextSize = mobile ? "64" : "96";
  if (orb.getAttribute("size") !== nextSize) orb.setAttribute("size", nextSize);
}

function initSystemOrbResponsiveSize() {
  syncSystemOrbResponsiveSize();
  if (orbMediaQuery) return;
  orbMediaQuery = window.matchMedia("(max-width: 760px)");
  const onChange = () => syncSystemOrbResponsiveSize();
  if (typeof orbMediaQuery.addEventListener === "function") {
    orbMediaQuery.addEventListener("change", onChange);
  } else if (typeof orbMediaQuery.addListener === "function") {
    orbMediaQuery.addListener(onChange);
  }
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
  if (!state.areas.some((area) => area.id === "area-habits")) {
    const healthIndex = state.areas.findIndex((area) => area.id === "area-health");
    const habitSummary = state.habitsSummary?.summary || {};
    const total = Number(habitSummary.total || 0);
    const done = Number(habitSummary.done || 0);
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    const habitsArea = {
      id: "area-habits",
      slug: "habits",
      title: "Hábitos",
      shortTitle: "Hábitos",
      summary: total > 0
        ? `${done}/${total} completados hoy · racha ${Number(habitSummary.streak || 0)} días.`
        : "Rutinas diarias, rachas, XP e histórico de HabitQuest.",
      health: total > 0 ? completion : 70,
      tone: "violet",
      module: "Habits",
      sensitivity: "privado",
      status: "steady"
    };
    if (healthIndex >= 0) state.areas.splice(healthIndex + 1, 0, habitsArea);
    else state.areas.push(habitsArea);
  }

  if (!state.areas.some((area) => area.id === "area-pantry")) {
    const pantryArea = pantryAreaFromState(state, privateModeKind);
    if (pantryArea) {
      const healthIndex = state.areas.findIndex((area) => area.id === "area-health");
      if (healthIndex >= 0) state.areas.splice(healthIndex + 1, 0, pantryArea);
      else state.areas.push(pantryArea);
    }
  }

  if (!state.areas.some((area) => area.id === "area-objects")) {
    const objectsArea = objectsAreaFromState(state, privateModeKind);
    if (objectsArea) {
      const pantryIndex = state.areas.findIndex((area) => area.id === "area-pantry");
      const habitsIndex = state.areas.findIndex((area) => area.id === "area-habits");
      const insertAt = pantryIndex >= 0 ? pantryIndex + 1 : habitsIndex >= 0 ? habitsIndex : state.areas.length;
      state.areas.splice(insertAt, 0, objectsArea);
    }
  }

  if (privateModeKind === "remote" && !state.areas.some((area) => area.id === "area-parents")) {
    const familySummary = state.familySummary || {};
    const openCount = Number(familySummary.openCount || 0);
    const attentionCount = Number(familySummary.attentionCount || 0);
    const familyIndex = state.areas.findIndex((area) => area.slug === "family");
    const parentsArea = {
      id: "area-parents",
      slug: "parents",
      title: "Padres",
      shortTitle: "Padres",
      summary: openCount
        ? `${openCount} asuntos activos${attentionCount ? ` · ${attentionCount} requieren atención` : ""}.`
        : "Casos, próximas acciones y referencias familiares en estado privado.",
      health: attentionCount ? 65 : 85,
      tone: "blue",
      module: "Parents",
      sensitivity: "muy_confidencial",
      status: attentionCount ? "attention" : "steady"
    };
    if (familyIndex >= 0) state.areas.splice(familyIndex + 1, 0, parentsArea);
    else state.areas.push(parentsArea);
  }
}

async function init() {
  initTheme();
  initSystemOrbResponsiveSize();
  await loadLocalPrivateState();
  await loadRemotePrivateState();
  ensureDerivedAreas();
  areaById = new Map(state.areas.map((area) => [area.id, area]));
  renderMode();
  renderDate();
  renderNavigation();
  renderDailyOverview();
  renderFocus();
  renderEvents();
  renderBudgetOverview();
  renderDebtOverview();
  renderWealthOverview();
  bindInteractions();
  initDemoMode();
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
  const openDecisions = (Array.isArray(state.decisions) ? state.decisions : []).filter((decision) => decision.status === "open").length;
  const local = privateModeKind === "local";
  const remote = privateModeKind === "remote";

  document.querySelector("#privacy-mode-title").textContent = remote ? "Modo privado remoto" : local ? "Modo local privado" : "Modo demo";
  document.querySelector("#privacy-mode-detail").textContent = remote ? "Protegido por autenticación" : local ? "No se publica en GitHub" : "Solo datos ficticios";
  document.querySelector("#data-mode-badge")?.replaceChildren(remote ? "Estado personal privado" : local ? "Estado personal local" : "Entorno mock");
  document.querySelector("#profile-button")?.setAttribute("aria-label", privateMode ? "Perfil privado" : "Perfil ficticio");
  document.querySelector("#query-submit").setAttribute("aria-label", privateMode ? "Consultar estado privado" : "Consultar datos ficticios");
  document.querySelector("#query-help").textContent = remote
    ? "Consulta datos conectados o usa órdenes como «abre despensa», «ver presupuesto» o «qué tengo hoy»."
    : local
      ? "Consulta el estado local o abre módulos con órdenes cortas."
      : "Prueba consultas y accesos rápidos sobre los datos de demostración.";
  document.querySelector("#footer-mode").textContent = remote
    ? "Acceso autenticado · Estado privado remoto"
    : local
      ? "Sin APIs · Estado local no publicado"
      : "Sin conexiones externas · Datos ficticios";

  const orb = document.querySelector("#system-orb");
  if (orb) {
    const habitSummary = state.habitsSummary?.summary || {};
    const habitTotal = Number(habitSummary.total || 0);
    const habitDone = Number(habitSummary.done || 0);
    orb.setAttribute("state", "idle");
    orb.setAttribute(
      "aria-label",
      `Pulso del sistema: ${generalHealth} de 100. ${openDecisions} decisiones abiertas${habitTotal ? `, ${habitDone} de ${habitTotal} hábitos completados hoy` : ""}.`
    );
  }
}

function renderDate() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = document.querySelector("#greeting");
  if (greeting) greeting.textContent = hour < 13 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const dateElement = document.querySelector("#current-date");
  if (dateElement) {
    dateElement.dateTime = now.toISOString();
    dateElement.textContent = dateFormatter.format(now);
  }
}

function renderNavigation() {
  const nav = document.querySelector("#area-nav");
  const metaAreas = new Set(["area-loops", "area-goals"]);
  const areas = state.areas.filter((area) => !metaAreas.has(area.id));
  nav.innerHTML = areas.map((area, index) => `
    <a class="nav-link ${index === 0 ? "active" : ""}" href="#overview" data-nav-area-id="${area.id}" style="--area-color:${colors[area.tone]}">
      ${escapeHtml(area.shortTitle)}
    </a>
  `).join("");
}

function renderFocus() {
  const familySummary = privateModeKind === "remote" ? state.familySummary || {} : {};
  const familyOpenCount = Number(familySummary.openCount || 0);
  const familyAttentionCount = Number(familySummary.attentionCount || 0);
  const familyDue = familySummary.nextDueAt ? String(familySummary.nextDueAt).slice(0, 10) : null;
  const familyAttention = familyAttentionCount > 0 ? [{
    id: "family-attention-summary",
    areaId: "area-parents",
    title: `Familia · ${familyAttentionCount} asunto${familyAttentionCount === 1 ? "" : "s"} requiere${familyAttentionCount === 1 ? "" : "n"} atención`,
    nextAction: "Revisar próximas acciones en Gestor Padres",
    priority: "high",
    dueDate: familyDue
  }] : [];

  const actionableDecisions = (Array.isArray(state.decisions) ? state.decisions : [])
    .filter((item) => item.status === "open" && (item.nextAction || item.dueDate || item.dueAt))
    .map((item) => {
      const dueDate = item.dueDate || item.dueAt || null;
      let priority = item.priority || "medium";
      if (!item.priority && dueDate) {
        const dueTime = new Date(String(dueDate).slice(0, 10) + "T12:00:00").getTime();
        const days = Number.isFinite(dueTime) ? Math.ceil((dueTime - Date.now()) / 86400000) : null;
        if (days !== null && days <= 7) priority = "high";
      }
      return {
        id: "decision-focus-" + item.id,
        areaId: item.areaId || "area-general",
        title: "Decisión · " + item.title,
        nextAction: item.nextAction || (item.question ? "Resolver: " + item.question : "Tomar una decisión"),
        priority,
        dueDate: dueDate ? String(dueDate).slice(0, 10) : null
      };
    });

  const openLoops = Array.isArray(state.openLoops) ? state.openLoops : [];
  const sorted = [...openLoops, ...familyAttention, ...actionableDecisions]
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));

  document.querySelector("#loop-count").textContent = `${openLoops.length + familyOpenCount + actionableDecisions.length} accionables`;
  document.querySelector("#focus-list").innerHTML = sorted.slice(0, 4).map((item) => {
    const area = areaById.get(item.areaId);
    const due = item.dueDate ? shortDateFormatter.format(new Date(`${item.dueDate}T12:00:00`)) : "Sin fecha";
    return `
      <li class="focus-item">
        <span class="focus-dot" style="--priority:${item.priority === "high" ? colors.coral : item.priority === "medium" ? colors.amber : colors.blue}"></span>
        <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.nextAction)}</p></div>
        <div class="focus-meta"><time datetime="${item.dueDate || ""}">${due}</time><span>${escapeHtml(area?.shortTitle || "General")}</span></div>
      </li>`;
  }).join("");

  const transversalGoals = (Array.isArray(state.goals) ? state.goals : [])
    .filter((goal) => goal.status === "active" && ["area-general", "area-loops", "area-goals"].includes(goal.areaId))
    .slice(0, 3);
  const goalsNode = document.querySelector("#focus-goals");
  if (goalsNode) {
    goalsNode.hidden = transversalGoals.length === 0;
    goalsNode.innerHTML = transversalGoals.length
      ? `<span>Objetivos transversales</span><div>${transversalGoals.map((goal) => `<strong>${escapeHtml(goal.title)}</strong>`).join("")}</div>`
      : "";
  }
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
    <article class="week-event ${calendarClass}" title="${escapeHtml(safeDisplayEventTitle(event.title))} · ${escapeHtml(sourceLabel)}">
      <span class="week-event-time">${time}${endTime ? "–" + endTime : ""}</span>
      <strong>${escapeHtml(safeDisplayEventTitle(event.title))}</strong>
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


function renderDailyOverview() {
  renderHomeHabitsCard();
  void renderHomeNutritionCard();
  renderHomePantryCard(state, privateModeKind);
  renderHomeObjectsCard(state, privateModeKind);
}

function renderHomeHabitsCard() {
  const summary = state.habitsSummary?.summary || {};
  const total = Math.max(0, Number(summary.total || 0));
  const done = Math.max(0, Number(summary.done || 0));
  const percentage = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : null;
  const value = document.querySelector("#home-habits-value");
  const label = document.querySelector("#home-habits-label");
  const ring = document.querySelector("#home-habits-ring");
  if (value) value.textContent = total > 0 ? done + " / " + total : "—";
  if (label) label.textContent = total > 0
    ? percentage + "% completado · racha " + Number(summary.streak || 0) + " días"
    : "Sin hábitos programados";
  updateProgressRing(ring, percentage, {
    tone: "violet",
    label: "hoy",
    ariaLabel: total > 0 ? done + " de " + total + " hábitos completados hoy" : "Sin hábitos programados"
  });
}

async function renderHomeNutritionCard() {
  const consumedNode = document.querySelector("#home-kcal-consumed");
  const burnedNode = document.querySelector("#home-kcal-burned");
  const targetNode = document.querySelector("#home-kcal-target");
  const statusNode = document.querySelector("#home-kcal-status");
  const ring = document.querySelector("#home-kcal-ring");
  if (!consumedNode || !burnedNode || !targetNode || !statusNode || !ring) return;
  if (privateModeKind !== "remote") {
    consumedNode.textContent = "—";
    burnedNode.textContent = "—";
    targetNode.textContent = "—";
    statusNode.textContent = "Disponible en la aplicación privada";
    updateProgressRing(ring, null, { tone: "amber", label: "kcal", ariaLabel: "Nutrición disponible en la aplicación privada" });
    return;
  }
  try {
    const response = await fetch("/api/nutrition?date=" + encodeURIComponent(localDateKey()), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("HOME_NUTRITION_" + response.status);
    const data = await response.json();
    const consumed = Number(data.summary?.consumed?.kcal);
    const burned = Number(data.summary?.totalBurn);
    const target = data.objective?.kcal == null ? null : Number(data.objective.kcal);
    consumedNode.textContent = Number.isFinite(consumed) ? formatKcal(consumed) : "—";
    burnedNode.textContent = Number.isFinite(burned) ? formatKcal(burned) : "—";
    targetNode.textContent = Number.isFinite(target) ? formatKcal(target) : "Pendiente";
    if (Number.isFinite(target) && target > 0 && Number.isFinite(consumed)) {
      const rawPct = Math.max(0, Math.round((consumed / target) * 100));
      const fillPct = Math.min(100, rawPct);
      const remaining = target - consumed;
      const tone = rawPct <= 100 ? "mint" : rawPct <= 110 ? "amber" : "coral";
      updateProgressRing(ring, fillPct, {
        tone,
        label: "máx",
        displayPercent: rawPct,
        ariaLabel: rawPct + "% del máximo diario de calorías consumido"
      });
      statusNode.textContent = remaining >= 0
        ? "Dentro del máximo · margen " + formatKcal(remaining)
        : "Exceso · " + formatKcal(Math.abs(remaining)) + " por encima";
    } else {
      updateProgressRing(ring, null, {
        tone: "amber",
        label: "kcal",
        ariaLabel: "Objetivo diario de calorías pendiente de definir"
      });
      statusNode.textContent = "Objetivo diario pendiente de definir en Nutrición";
    }
  } catch (error) {
    consumedNode.textContent = "—";
    burnedNode.textContent = "—";
    targetNode.textContent = "—";
    statusNode.textContent = "No se ha podido cargar Nutrición";
    updateProgressRing(ring, null, { tone: "amber", label: "kcal", ariaLabel: "Nutrición no disponible" });
    console.warn("Home nutrition load failed", error);
  }
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
        ${personalNet === null ? "" : `<div><span>Libre Miguel</span><strong>${formatMoney(personalNet, currency)}</strong></div>`}
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
        <p>Se mostrarán aquí viajes y celebraciones relevantes encontradas en iCloud.</p>
      </div>`;
    return;
  }

  container.innerHTML = importantEvents.map((item) => renderImportantEventCard(item, true)).join("");
}

function openImportantEventsDetail() {
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "health-dialog", "habits-dialog", "important-events-dialog", "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog", "objects-dialog", "projects-dialog");
  dialog.classList.add("important-events-dialog");

  const importantEvents = collectImportantEvents(state.financeSummary || {});
  document.querySelector("#dialog-context").textContent = "Agenda · iCloud";
  document.querySelector("#dialog-title").textContent = "Eventos importantes";
  document.querySelector("#dialog-body").innerHTML = importantEvents.length
    ? `<div class="important-events-detail-list">${importantEvents.map((item) => renderImportantEventCard(item, false)).join("")}</div>`
    : "<p>No hay próximos eventos importantes detectados.</p>";
  dialog.showModal();
}

function renderImportantEventCard(item, compact = false) {
  const date = new Date(item.startsAt || (item.date ? `${item.date}T12:00:00` : ""));
  const currency = item.currency || "EUR";
  const total = firstFinite(item.totalBudget);
  const reserved = firstFinite(item.reserved);
  const source = item.source === "calendar" ? "iCloud" : "Finanzas";
  const tag = item.kind === "travel" ? "Viaje"
    : item.kind === "birthday" ? "Cumpleaños"
    : item.kind === "social" ? "Evento"
    : "Importante";
  const validDate = !Number.isNaN(date.getTime());
  const dateLong = validDate
    ? new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date).replace(".", "")
    : "Sin fecha";

  return `
    <article class="event-budget-item important-event-item ${compact ? "compact" : "detail"}">
      <div class="event-budget-date">
        <strong>${validDate ? date.getDate() : "—"}</strong>
        <span>${validDate ? shortMonth(date) : "sin fecha"}</span>
      </div>
      <div class="event-budget-copy">
        <span class="important-event-tag">${escapeHtml(tag)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.location || item.note || source)}</p>
        ${compact ? "" : `<small class="important-event-full-date">${escapeHtml(dateLong)}</small>`}
      </div>
      <div class="event-budget-amount">
        <span>${escapeHtml(source)}</span>
        ${total !== null ? `<strong>${formatMoney(total, currency)}</strong>` : ""}
        ${reserved !== null && total !== null ? `<small>${formatMoney(reserved, currency)} reservado</small>` : ""}
      </div>
    </article>`;
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
      const rule = rules.find((candidate) => {
        const includeMatches = Array.isArray(candidate.matchTerms)
          && candidate.matchTerms.length
          && candidate.matchTerms.every((term) => normalized.includes(normalizeForMatch(term)));
        const excluded = Array.isArray(candidate.excludeTerms)
          && candidate.excludeTerms.some((term) => normalized.includes(normalizeForMatch(term)));
        return includeMatches && !excluded;
      });
      if (!rule) return null;
      return {
        id: rule.id || event.id || [event.calendarName, event.title, event.startsAt].join("|"),
        title: rule.displayTitle || safeDisplayEventTitle(event.title),
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location || null,
        kind: rule.kind || "important",
        source: "calendar"
      };
    })
    .filter(Boolean);

  const calendarByTitle = new Map(
    calendarItems.map((item) => [normalizeForMatch(item.title), item])
  );

  const commitments = (Array.isArray(finance.upcomingCommitments) ? finance.upcomingCommitments : [])
    .filter((item) => !item.date || new Date(`${item.date}T23:59:59`).getTime() >= now)
    .map((item) => {
      const title = safeDisplayEventTitle(item.title);
      const key = normalizeForMatch(title);
      const calendarMatch = calendarByTitle.get(key);
      if (calendarMatch) {
        Object.assign(calendarMatch, {
          currency: item.currency,
          totalBudget: item.totalBudget,
          reserved: item.reserved,
          needed: item.needed,
          note: item.note || calendarMatch.note || null,
          financeLinked: true
        });
        return null;
      }
      return {
        ...item,
        title,
        startsAt: item.date ? `${item.date}T12:00:00` : null,
        kind: inferImportantKind(item.title),
        source: "finance"
      };
    })
    .filter(Boolean);

  const merged = [...calendarItems, ...commitments]
    .sort((a, b) => new Date(a.startsAt || "9999-12-31").getTime() - new Date(b.startsAt || "9999-12-31").getTime());

  const seen = new Set();
  return merged.filter((item) => {
    const semanticKey = normalizeForMatch(item.title);
    if (seen.has(semanticKey)) return false;
    seen.add(semanticKey);
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
  if (/\bmedico\b|\bmedica\b|cita medica|doctor|doctora|hospital|clinica|cardiolog|urolog|alergolog|dentista|dental|dermatolog|traumatolog|fisioterap|oftalmolog|revision medica|analitica|consulta/.test(text)) return "medical";
  return null;
}

function collectHealthEvents() {
  const now = Date.now() - 24 * 60 * 60 * 1000;
  return (Array.isArray(state.events) ? state.events : [])
    .map((event) => ({ ...event, healthKind: classifyHealthEvent(event) }))
    .filter((event) => event.healthKind && new Date(event.endsAt || event.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

const FAMILY_SCOPE_LABELS = {
  mother: "Madre",
  father: "Padre",
  shared: "Familiar / patrimonial común"
};

const FAMILY_STATUS_LABELS = {
  ACTIVE: "Activo",
  WAITING_EXTERNAL: "Esperando a tercero",
  WAITING_DOCUMENT: "Esperando documento",
  DECISION_OPEN: "Decisión abierta",
  SCHEDULED: "Programado",
  BLOCKED: "Bloqueado",
  DONE: "Finalizado",
  ARCHIVED: "Archivado"
};

const FAMILY_DOMAIN_LABELS = {
  health: "Salud",
  disability: "Incapacidad",
  retirement: "Jubilación",
  property: "Inmueble",
  mortgage: "Hipoteca",
  investment: "Inversión",
  business: "Negocio",
  tax: "Fiscalidad",
  admin: "Administración",
  legal: "Legal",
  other: "Otro"
};

function openParentsDetail(initialScope = "mother") {
  if (privateModeKind !== "remote") return;
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "health-dialog", "habits-dialog", "important-events-dialog", "budget-dialog");
  dialog.classList.add("parents-dialog");
  document.querySelector("#dialog-context").textContent = "Gestor Padres · muy confidencial";
  document.querySelector("#dialog-title").textContent = "Padres";
  document.querySelector("#dialog-body").innerHTML = `
    <div class="parents-privacy-note">
      Estado operativo privado. Las fuentes originales siguen en Finanzas, Calendario, LITOS y repositorios documentales autorizados.
    </div>
    <div class="parents-tabs" role="tablist" aria-label="Ámbito familiar">
      ${Object.entries(FAMILY_SCOPE_LABELS).map(([scope, label]) => `
        <button type="button" data-family-scope="${scope}" class="${scope === initialScope ? "active" : ""}">${escapeHtml(label)}</button>
      `).join("")}
    </div>
    <div id="parents-panel"><p class="parents-empty">Cargando casos privados…</p></div>
  `;

  document.querySelectorAll("[data-family-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-family-scope]").forEach((item) => item.classList.toggle("active", item === button));
      void loadParentsPanel(button.dataset.familyScope);
    });
  });

  dialog.showModal();
  void loadParentsPanel(initialScope);
}

async function loadParentsPanel(scope) {
  const panel = document.querySelector("#parents-panel");
  if (!panel) return;
  panel.innerHTML = '<p class="parents-empty">Cargando casos privados…</p>';

  try {
    const response = await fetch("/api/family/cases?scope=" + encodeURIComponent(scope), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("FAMILY_CASES_" + response.status);
    const payload = await response.json();
    renderParentsPanel(scope, payload.cases || [], payload.summary || {});
  } catch (error) {
    console.warn("Family cases load failed", error);
    panel.innerHTML = '<div class="parents-empty parents-empty-card"><strong>No se han podido cargar los casos</strong><p>La estructura privada sigue separada del resto de Salud y Finanzas.</p></div>';
  }
}

function renderParentsPanel(scope, cases, summary) {
  const panel = document.querySelector("#parents-panel");
  if (!panel) return;

  const openCases = cases.filter((item) => !["DONE", "ARCHIVED"].includes(item.status));
  const waiting = openCases.filter((item) => String(item.status).startsWith("WAITING_")).length;
  const decisions = openCases.filter((item) => item.status === "DECISION_OPEN").length;
  const urgent = openCases.filter((item) => ["high", "critical"].includes(item.priority)).length;

  panel.innerHTML = `
    <div class="parents-summary-grid">
      <article><span>Ámbito</span><strong>${escapeHtml(FAMILY_SCOPE_LABELS[scope] || scope)}</strong></article>
      <article><span>Abiertos</span><strong>${openCases.length}</strong></article>
      <article><span>Prioridad alta</span><strong>${urgent}</strong></article>
      <article><span>En espera</span><strong>${waiting}</strong></article>
      <article><span>Decisiones</span><strong>${decisions}</strong></article>
    </div>

    <div class="parents-list-heading">
      <div>
        <strong>Casos</strong>
        <p>Estado, próxima acción, responsable, vencimiento y bloqueo.</p>
      </div>
      <span>${cases.length} total</span>
    </div>

    <div class="parents-case-list">
      ${cases.length ? cases.map(renderFamilyCaseCard).join("") : `
        <div class="parents-empty parents-empty-card">
          <strong>Sin casos en este ámbito</strong>
          <p>GESTOR PADRES podrá crear y mantener casos mediante la API privada sin modificar el código.</p>
        </div>`}
    </div>
  `;

  panel.querySelectorAll("[data-family-case-id]").forEach((button) => {
    button.addEventListener("click", () => void openFamilyCaseDetail(button.dataset.familyCaseId, scope));
  });
}

function renderFamilyCaseCard(item) {
  const due = formatFamilyDate(item.dueAt);
  const updated = formatFamilyDate(item.updatedAt);
  return `
    <button class="parents-case-card priority-${escapeHtml(item.priority || "medium")}" type="button" data-family-case-id="${escapeHtml(item.id)}">
      <div class="parents-case-head">
        <div>
          <span class="parents-domain">${escapeHtml(FAMILY_DOMAIN_LABELS[item.domain] || item.domain)}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </div>
        <span class="parents-status status-${escapeHtml(String(item.status || "").toLowerCase())}">${escapeHtml(FAMILY_STATUS_LABELS[item.status] || item.status)}</span>
      </div>
      ${item.summary ? `<p class="parents-case-summary">${escapeHtml(item.summary)}</p>` : ""}
      <dl class="parents-case-meta">
        <div><dt>Próxima acción</dt><dd>${escapeHtml(item.nextAction || "Pendiente de definir")}</dd></div>
        <div><dt>Responsable</dt><dd>${escapeHtml(item.nextActionOwner || "Sin asignar")}</dd></div>
        <div><dt>Fecha límite</dt><dd>${escapeHtml(due || "Sin fecha")}</dd></div>
        <div><dt>Espera / bloqueo</dt><dd>${escapeHtml(item.waitingOn || "—")}</dd></div>
        <div><dt>Actualizado</dt><dd>${escapeHtml(updated || "—")}</dd></div>
      </dl>
    </button>
  `;
}

async function openFamilyCaseDetail(caseId, scope) {
  const panel = document.querySelector("#parents-panel");
  if (!panel) return;
  panel.innerHTML = '<p class="parents-empty">Cargando detalle…</p>';

  try {
    const response = await fetch("/api/family/cases/" + encodeURIComponent(caseId), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("FAMILY_CASE_" + response.status);
    const payload = await response.json();
    renderFamilyCaseDetail(payload.case, payload.actions || [], payload.references || [], scope);
  } catch (error) {
    console.warn("Family case detail load failed", error);
    panel.innerHTML = '<div class="parents-empty parents-empty-card"><strong>No se ha podido cargar el detalle</strong></div>';
  }
}

function renderFamilyCaseDetail(item, actions, references, scope) {
  const panel = document.querySelector("#parents-panel");
  if (!panel || !item) return;

  panel.innerHTML = `
    <button class="parents-back" type="button" data-family-back="true">← Volver a ${escapeHtml(FAMILY_SCOPE_LABELS[scope] || "casos")}</button>

    <section class="parents-case-detail">
      <header class="parents-detail-head">
        <div>
          <span class="parents-domain">${escapeHtml(FAMILY_DOMAIN_LABELS[item.domain] || item.domain)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || "Sin resumen operativo.")}</p>
        </div>
        <span class="parents-status status-${escapeHtml(String(item.status || "").toLowerCase())}">${escapeHtml(FAMILY_STATUS_LABELS[item.status] || item.status)}</span>
      </header>

      <div class="parents-detail-grid">
        <article><span>Prioridad</span><strong>${escapeHtml(item.priority || "medium")}</strong></article>
        <article><span>Próxima acción</span><strong>${escapeHtml(item.nextAction || "Pendiente de definir")}</strong></article>
        <article><span>Responsable</span><strong>${escapeHtml(item.nextActionOwner || "Sin asignar")}</strong></article>
        <article><span>Fecha límite</span><strong>${escapeHtml(formatFamilyDate(item.dueAt) || "Sin fecha")}</strong></article>
        <article><span>Espera / bloqueo</span><strong>${escapeHtml(item.waitingOn || "—")}</strong></article>
        <article><span>Última actualización</span><strong>${escapeHtml(formatFamilyDate(item.updatedAt) || "—")}</strong></article>
      </div>

      <div class="parents-detail-columns">
        <section>
          <div class="parents-section-title"><strong>Cronología</strong><span>${actions.length}</span></div>
          <div class="parents-timeline">
            ${actions.length ? actions.map((action) => `
              <article>
                <time>${escapeHtml(formatFamilyDate(action.happenedAt) || "—")}</time>
                <div><strong>${escapeHtml(action.actionType)}</strong><p>${escapeHtml(action.summary)}</p>${action.owner ? `<small>Responsable: ${escapeHtml(action.owner)}</small>` : ""}</div>
              </article>
            `).join("") : '<p class="parents-empty">Todavía no hay acciones registradas.</p>'}
          </div>
        </section>

        <section>
          <div class="parents-section-title"><strong>Fuentes y documentos</strong><span>${references.length}</span></div>
          <div class="parents-reference-list">
            ${references.length ? references.map((ref) => `
              <article>
                <div><strong>${escapeHtml(ref.documentType || ref.sourceProvider)}</strong><span>${escapeHtml(ref.sourceProvider)}</span></div>
                ${ref.summary ? `<p>${escapeHtml(ref.summary)}</p>` : ""}
                <small>Referencia: ${escapeHtml(ref.sourceRef)}${ref.reviewStatus ? ` · ${escapeHtml(ref.reviewStatus)}` : ""}</small>
              </article>
            `).join("") : '<p class="parents-empty">Sin referencias. Los documentos completos permanecen en su fuente original.</p>'}
          </div>
        </section>
      </div>
    </section>
  `;

  panel.querySelector("[data-family-back]")?.addEventListener("click", () => void loadParentsPanel(scope));
}

function formatFamilyDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function openHealthDetail() {
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "important-events-dialog", "budget-dialog", "parents-dialog", "electricity-dialog");
  dialog.classList.add("health-dialog");
  document.querySelector("#dialog-context").textContent = "Salud · estado privado";
  document.querySelector("#dialog-title").textContent = "Salud";

  const medicalEvents = collectHealthEvents().filter((event) => event.healthKind === "medical");

  document.querySelector("#dialog-body").innerHTML = `
    <div class="health-tabs" role="tablist" aria-label="Apartados de salud">
      <button class="active" type="button" data-health-tab="overview">Resumen</button>
      <button type="button" data-health-tab="medical">Médicos</button>
      <button type="button" data-health-tab="gym">Gimnasio</button>
      <button type="button" data-health-tab="nutrition">Nutrición</button>
      <button type="button" data-health-tab="adherence">Adherencia</button>
      <button type="button" data-health-tab="menu">Menú</button>
    </div>
    <div class="health-tab-panels">
      <section class="health-tab-panel active" data-health-panel="overview">
        <div id="health-overview-panel"><p class="health-empty">Cargando Apple Health…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="medical">
        ${renderMedicalSection(medicalEvents)}
      </section>
      <section class="health-tab-panel" data-health-panel="gym">
        <div id="gym-panel"><p class="health-empty">Cargando plan e histórico…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="nutrition">
        <div id="nutrition-panel"><p class="health-empty">Cargando nutrición…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="adherence">
        <div id="adherence-panel"><p class="health-empty">Abre la vista para calcular la adherencia mensual.</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="menu">
        <div id="menu-panel"><p class="health-empty">Cargando menú semanal…</p></div>
      </section>
    </div>`;

  bindHealthTabs();
  dialog.showModal();
  void loadHealthOverview(localDateKey());
  void loadGymPanel();
  void loadNutritionPanel(localDateKey());
}

async function loadHealthOverview(dateKey = localDateKey()) {
  const panel = document.querySelector("#health-overview-panel");
  if (panel) panel.innerHTML = '<p class="health-empty">Cargando Apple Health…</p>';
  try {
    const response = await fetch("/api/health/overview?date=" + encodeURIComponent(dateKey), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("HEALTH_OVERVIEW_" + response.status);
    const payload = await response.json();
    renderHealthOverview(payload);
    loadHealthHistory("365", payload.date || dateKey);
  } catch (error) {
    if (panel) panel.innerHTML = '<div class="health-empty health-empty-card"><strong>Apple Health no disponible</strong><p>No se ha podido cargar el resumen de actividad y composición corporal.</p></div>';
    console.warn("Health overview load failed", error);
  }
}

function renderHealthOverview(data) {
  const panel = document.querySelector("#health-overview-panel");
  if (!panel) return;

  const body = data.body || {};
  const activity = data.activity || {};
  const activityGoal = data.activityObjective || {};
  const nutritionGoal = data.nutritionObjective || {};
  const nutrition = data.nutritionSummary || {};
  const consumed = nutrition.consumed || {};
  const gym = data.gym || {};
  const progressObjectives = Array.isArray(data.progressObjectives) ? data.progressObjectives : [];

  const metricNumber = (value) => value === null || value === undefined || value === ""
    ? null
    : (Number.isFinite(Number(value)) ? Number(value) : null);
  const pct = (value, target) => Number.isFinite(value) && Number.isFinite(target) && target > 0
    ? Math.max(0, Math.min(100, Math.round((value / target) * 100)))
    : 0;
  const fmt1 = (value, suffix = "") => Number.isFinite(value) ? value.toFixed(1).replace(".", ",") + suffix : "—";
  const fmt0 = (value, suffix = "") => Number.isFinite(value) ? Math.round(value).toLocaleString("es-ES") + suffix : "—";

  const weightToday = metricNumber(body.weightToday?.value);
  const weightAvg = metricNumber(body.weight7dAverage);
  const weeklyChange = metricNumber(body.weightWeeklyChange);
  const bodyFat = metricNumber(body.bodyFat?.value);
  const bmi = metricNumber(body.bodyMassIndex?.value);
  const lean = metricNumber(body.leanBodyMass?.value);
  const waist = metricNumber(body.waist?.value);
  const waistHistory = Array.isArray(body.waistHistory) ? body.waistHistory : [];
  const waistStart = waistHistory.length > 1 ? metricNumber(waistHistory[0]?.value) : null;
  const waistDelta = Number.isFinite(waist) && Number.isFinite(waistStart) ? waist - waistStart : null;

  const active = metricNumber(activity.activeKcal);
  const resting = metricNumber(activity.restingKcal);
  const total = metricNumber(activity.totalKcal);
  const steps = metricNumber(activity.steps);
  const exerciseWeek = metricNumber(activity.exerciseMinutesWeek);
  const sessionsThisWeek = metricNumber(gym.sessionsThisWeek) ?? 0;
  const stepsFloor = metricNumber(activityGoal.stepsFloor);
  const stepsTarget = metricNumber(activityGoal.stepsTarget);
  const exerciseTarget = metricNumber(activityGoal.moderateActivityMinWeek);
  const strengthTarget = metricNumber(activityGoal.strengthSessionsWeek);

  const kcalConsumed = metricNumber(consumed.kcal) ?? 0;
  const proteinConsumed = metricNumber(consumed.protein) ?? 0;
  const carbsConsumed = metricNumber(consumed.carbs) ?? 0;
  const fatConsumed = metricNumber(consumed.fat) ?? 0;
  const kcalTarget = metricNumber(nutritionGoal.kcal);
  const proteinTarget = metricNumber(nutritionGoal.protein);
  const carbsTarget = metricNumber(nutritionGoal.carbs);
  const fatTarget = metricNumber(nutritionGoal.fat);

  const nutritionChecks = [
    Number.isFinite(kcalTarget) ? kcalConsumed >= kcalTarget * 0.9 && kcalConsumed <= kcalTarget * 1.05 : null,
    Number.isFinite(proteinTarget) ? proteinConsumed >= proteinTarget * 0.95 : null,
    Number.isFinite(carbsTarget) ? carbsConsumed >= carbsTarget * 0.9 && carbsConsumed <= carbsTarget * 1.1 : null,
    Number.isFinite(fatTarget) ? fatConsumed >= fatTarget * 0.9 && fatConsumed <= fatTarget * 1.1 : null
  ].filter((value) => value !== null);
  const nutritionDone = nutritionChecks.filter(Boolean).length;

  const activityChecks = [
    Number.isFinite(stepsFloor) ? Number.isFinite(steps) && steps >= stepsFloor : null,
    Number.isFinite(exerciseTarget) ? Number.isFinite(exerciseWeek) && exerciseWeek >= exerciseTarget : null,
    Number.isFinite(strengthTarget) ? sessionsThisWeek >= strengthTarget : null
  ].filter((value) => value !== null);
  const activityDone = activityChecks.filter(Boolean).length;
  const nutritionProgress = nutritionChecks.length ? Math.round((nutritionDone / nutritionChecks.length) * 100) : null;
  const activityProgress = activityChecks.length ? Math.round((activityDone / activityChecks.length) * 100) : null;
  const strengthProgress = Number.isFinite(strengthTarget) && strengthTarget > 0
    ? Math.round((sessionsThisWeek / strengthTarget) * 100)
    : null;

  let recompositionStatus = "Baseline en construcción";
  if (Number.isFinite(weeklyChange)) {
    recompositionStatus = weeklyChange <= -0.15 && weeklyChange >= -0.45
      ? "En rumbo"
      : "Seguir tendencia";
  } else if (Number.isFinite(waistDelta) && waistDelta < 0) {
    recompositionStatus = "En rumbo";
  }

  const performanceObjectives = progressObjectives.filter((item) => {
    const category = normalizeHealthLabel(item.category);
    return category === "rendimiento" || category === "skill";
  });

  const compositionGoal = (metric) => progressObjectives.find((item) =>
    normalizeHealthLabel(item.category) === "composicion" &&
    normalizeHealthLabel(item.metric).includes(normalizeHealthLabel(metric))
  );

  const weightGoal = compositionGoal("peso medio");
  const waistGoal = compositionGoal("cintura");
  const fatGoal = compositionGoal("grasa");

  const changeText = Number.isFinite(weeklyChange)
    ? (weeklyChange > 0 ? "+" : "") + weeklyChange.toFixed(1).replace(".", ",") + " kg"
    : "—";
  const changeClass = Number.isFinite(weeklyChange)
    ? (weeklyChange > 0 ? "up" : weeklyChange < 0 ? "down" : "flat")
    : "";

  panel.innerHTML = `
    <div class="health-dashboard-status progress-ring-status">
      <span>
        ${progressRingMarkup(nutritionProgress, { tone: "amber", size: "sm", label: "nutri", ariaLabel: "Progreso de nutrición" })}
        <span><small>Nutrición</small><strong>${nutritionChecks.length ? `${nutritionDone}/${nutritionChecks.length}` : "Sin objetivo"}</strong></span>
      </span>
      <span>
        ${progressRingMarkup(activityProgress, { tone: "blue", size: "sm", label: "actividad", ariaLabel: "Progreso de actividad" })}
        <span><small>Actividad</small><strong>${activityChecks.length ? `${activityDone}/${activityChecks.length}` : "Sin objetivo"}</strong></span>
      </span>
      <span>
        ${progressRingMarkup(strengthProgress, { tone: "mint", size: "sm", label: "fuerza", ariaLabel: "Progreso semanal de fuerza" })}
        <span><small>Fuerza</small><strong>${Number.isFinite(strengthTarget) ? `${sessionsThisWeek}/${fmt0(strengthTarget)} sesiones` : `${sessionsThisWeek} sesiones`}</strong></span>
      </span>
      <span class="health-status-text-only"><small>Recomposición</small><strong>${escapeHtml(recompositionStatus)}</strong></span>
    </div>

    <div class="health-recomp-grid">
      <section class="health-recomp-card">
        <header><span>Composición corporal</span><strong>Tendencia</strong></header>
        <div class="health-recomp-kpis">
          <div><small>Peso hoy</small><strong>${fmt1(weightToday, " kg")}</strong></div>
          <div><small>Media 7 días</small><strong>${fmt1(weightAvg, " kg")}</strong></div>
          <div><small>Cambio semanal</small><strong class="${changeClass}">${changeText}</strong></div>
          <div><small>Cintura</small><strong>${fmt1(waist, " cm")}</strong></div>
          <div><small>Grasa</small><strong>${fmt1(bodyFat, "%")}</strong></div>
          <div><small>Masa magra</small><strong>${fmt1(lean, " kg")}</strong></div>
        </div>
        <div class="health-objective-notes">
          ${weightGoal?.target ? `<p><b>Peso:</b> ${escapeHtml(weightGoal.target)}</p>` : ""}
          ${waistGoal?.target ? `<p><b>Cintura:</b> ${escapeHtml(waistGoal.target)}${waist === null ? " · pendiente de primera medición" : Number.isFinite(waistDelta) ? ` · ${waistDelta > 0 ? "+" : ""}${waistDelta.toFixed(1).replace(".", ",")} cm desde baseline disponible` : ""}</p>` : ""}
          ${fatGoal?.target ? `<p><b>% grasa:</b> ${escapeHtml(fatGoal.target)}</p>` : ""}
          ${Number.isFinite(bmi) ? `<p><b>IMC:</b> ${fmt1(bmi)} · dato descriptivo, no objetivo.</p>` : ""}
        </div>
      </section>

      <section class="health-recomp-card">
        <header><span>Nutrición</span><strong>Hoy</strong></header>
        <div class="health-target-list">
          ${renderHealthTargetRow("Calorías", kcalConsumed, kcalTarget, " kcal", pct(kcalConsumed, kcalTarget))}
          ${renderHealthTargetRow("Proteína", proteinConsumed, proteinTarget, " g", pct(proteinConsumed, proteinTarget))}
          ${renderHealthTargetRow("Carbohidratos", carbsConsumed, carbsTarget, " g", pct(carbsConsumed, carbsTarget))}
          ${renderHealthTargetRow("Grasas", fatConsumed, fatTarget, " g", pct(fatConsumed, fatTarget))}
        </div>
        <p class="health-card-footnote">El gasto del reloj es informativo; no se compensa 1:1 con comida.</p>
      </section>

      <section class="health-recomp-card">
        <header><span>Actividad</span><strong>Semana</strong></header>
        <div class="health-target-list">
          ${renderHealthTargetRow("Pasos hoy", steps, stepsTarget, "", pct(steps, stepsTarget), Number.isFinite(stepsFloor) ? `suelo ${fmt0(stepsFloor)}` : "")}
          ${renderHealthTargetRow("Actividad", exerciseWeek, exerciseTarget, " min", pct(exerciseWeek, exerciseTarget))}
          ${renderHealthTargetRow("Fuerza", sessionsThisWeek, strengthTarget, " sesiones", pct(sessionsThisWeek, strengthTarget))}
        </div>
        <div class="health-energy-strip">
          <span><small>Activas</small><strong>${fmt0(active, " kcal")}</strong></span>
          <span><small>Reposo</small><strong>${fmt0(resting, " kcal")}</strong></span>
          <span><small>Total acumulado</small><strong>${fmt0(total, " kcal")}</strong></span>
        </div>
      </section>

      <section class="health-recomp-card">
        <header><span>Rendimiento</span><strong>Benchmarks</strong></header>
        ${performanceObjectives.length
          ? `<div class="health-benchmark-list">${performanceObjectives.map((goal) => renderHealthBenchmark(goal, gym.sessions || [])).join("")}</div>`
          : '<p class="health-empty">Todavía no hay benchmarks de rendimiento definidos.</p>'}
      </section>
    </div>

    ${activityGoal.appleWatchEnergyRule ? `<p class="health-trend-note">⌁ ${escapeHtml(activityGoal.appleWatchEnergyRule)}</p>` : ""}

    <section class="health-history-section">
      <div class="health-history-heading">
        <div>
          <strong>Progreso histórico</strong>
          <p>Las tendencias de actividad excluyen de los promedios los días con cobertura incompleta del Apple Watch.</p>
        </div>
        <div class="health-history-ranges" role="group" aria-label="Rango histórico">
          <button type="button" data-health-history-range="30">30 d</button>
          <button type="button" data-health-history-range="90">90 d</button>
          <button type="button" data-health-history-range="365" class="active">1 año</button>
          <button type="button" data-health-history-range="all">Todo</button>
        </div>
      </div>
      <div id="health-history-content" data-health-date="${escapeHtml(data.date || localDateKey())}">
        <p class="health-empty">Cargando histórico…</p>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-health-history-range]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-health-history-range]").forEach((item) => item.classList.toggle("active", item === button));
      loadHealthHistory(button.dataset.healthHistoryRange, data.date || localDateKey());
    });
  });
}

async function loadHealthHistory(range = "365", dateKey = localDateKey()) {
  const panel = document.querySelector("#health-history-content");
  if (!panel) return;
  panel.innerHTML = '<p class="health-empty">Cargando histórico…</p>';
  try {
    const response = await fetch(
      "/api/health/history?range=" + encodeURIComponent(range) + "&date=" + encodeURIComponent(dateKey),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!response.ok) throw new Error("HEALTH_HISTORY_" + response.status);
    renderHealthHistory(await response.json());
  } catch (error) {
    panel.innerHTML = '<div class="health-empty health-empty-card"><strong>Histórico no disponible</strong><p>Cuando termine el backfill de Apple Health aparecerá aquí.</p></div>';
    console.warn("Health history load failed", error);
  }
}

function renderHealthHistory(data) {
  const panel = document.querySelector("#health-history-content");
  if (!panel) return;

  const activity = Array.isArray(data.activity) ? data.activity : [];
  const bodySamples = Array.isArray(data.bodySamples) ? data.bodySamples : [];
  const waistHistory = Array.isArray(data.waistHistory) ? data.waistHistory : [];
  const comparable = activity.filter((row) => ["full", "live"].includes(row.coverageQuality));

  const dailyLatest = (type) => {
    const byDate = new Map();
    bodySamples.filter((item) => item.type === type).forEach((item) => {
      const current = byDate.get(item.date);
      if (!current || String(item.measuredAt || "") >= String(current.measuredAt || "")) byDate.set(item.date, item);
    });
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  };

  const weights = dailyLatest("bodyMass");
  const fat = dailyLatest("bodyFatPercentage");
  const lean = dailyLatest("leanBodyMass");
  const totals = comparable.filter((row) => Number.isFinite(Number(row.totalKcal))).map((row) => ({ date: row.date, value: Number(row.totalKcal) }));
  const steps = comparable.filter((row) => Number.isFinite(Number(row.steps))).map((row) => ({ date: row.date, value: Number(row.steps) }));

  const metricSummary = (rows, suffix, digits = 1) => {
    if (!rows.length) return { first: "—", latest: "—", change: "—" };
    const first = Number(rows[0].value);
    const latest = Number(rows[rows.length - 1].value);
    const delta = latest - first;
    const fmt = (value) => Number.isFinite(value) ? value.toFixed(digits).replace(".", ",") + suffix : "—";
    return { first: fmt(first), latest: fmt(latest), change: (delta > 0 ? "+" : "") + fmt(delta) };
  };

  const weightRows = weights.map((item) => ({ date: item.date, value: Number(item.value) }));
  const fatRows = fat.map((item) => ({ date: item.date, value: Number(item.value) }));
  const leanRows = lean.map((item) => ({ date: item.date, value: Number(item.value) }));
  const waistRows = waistHistory.map((item) => ({ date: item.date, value: Number(item.value) })).filter((item) => Number.isFinite(item.value));

  const q = data.quality || {};
  const averages = data.comparableAverages || {};
  const incomplete = Number(q.partial || 0) + Number(q.low || 0) + Number(q.noWatch || 0);

  panel.innerHTML = `
    <div class="health-history-quality">
      <span><strong>${Number(q.full || 0) + Number(q.live || 0)}</strong><small>días comparables</small></span>
      <span><strong>${incomplete}</strong><small>días Watch parcial/ausente</small></span>
      <span><strong>${Number(q.phoneOnly || 0)}</strong><small>días previos al Watch</small></span>
      <p>Los días parciales siguen guardados y visibles, pero no se usan para calcular medias de gasto o actividad.</p>
    </div>

    <div class="health-history-grid">
      ${renderHealthHistoryMetric("Peso", weightRows, " kg", 1)}
      ${renderHealthHistoryMetric("Grasa corporal", fatRows, "%", 1)}
      ${renderHealthHistoryMetric("Masa magra", leanRows, " kg", 1)}
      ${renderHealthHistoryMetric("Cintura", waistRows, " cm", 1)}
      ${renderHealthHistoryMetric("Gasto total · días comparables", totals, " kcal", 0, averages.totalKcal)}
      ${renderHealthHistoryMetric("Pasos · días comparables", steps, "", 0, averages.steps)}
    </div>
  `;
}

function renderHealthHistoryMetric(label, rows, suffix = "", digits = 1, average = null) {
  const clean = (rows || []).filter((item) => Number.isFinite(Number(item.value))).map((item) => ({
    date: item.date,
    value: Number(item.value)
  }));
  if (!clean.length) {
    return `<article class="health-history-card"><header><strong>${escapeHtml(label)}</strong><span>Sin datos</span></header><p class="health-empty">Todavía no hay histórico suficiente.</p></article>`;
  }

  const first = clean[0];
  const latest = clean[clean.length - 1];
  const delta = latest.value - first.value;
  const format = (value) => Number(value).toFixed(digits).replace(".", ",") + suffix;
  return `
    <article class="health-history-card">
      <header>
        <div><strong>${escapeHtml(label)}</strong><small>${clean.length} puntos</small></div>
        <span>${format(latest.value)}</span>
      </header>
      ${healthSparkline(clean)}
      <footer>
        <span>Inicio <b>${format(first.value)}</b></span>
        <span>Cambio <b>${delta > 0 ? "+" : ""}${format(delta)}</b></span>
        ${Number.isFinite(Number(average)) ? `<span>Media <b>${format(Number(average))}</b></span>` : ""}
      </footer>
    </article>`;
}

function healthSparkline(rows) {
  if (!rows.length) return "";
  const width = 420;
  const height = 110;
  const pad = 8;
  const values = rows.map((item) => Number(item.value));
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const points = rows.map((item, index) => {
    const x = rows.length === 1 ? width / 2 : pad + (index / (rows.length - 1)) * (width - pad * 2);
    const y = height - pad - ((Number(item.value) - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="health-history-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de ${rows.length} registros"><polyline points="${points}"></polyline></svg>`;
}

function normalizeHealthLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderHealthTargetRow(label, value, target, suffix = "", progress = 0, note = "") {
  const validValue = Number.isFinite(Number(value));
  const validTarget = Number.isFinite(Number(target));
  const current = validValue ? Number(value) : null;
  const goal = validTarget ? Number(target) : null;
  const format = (n) => Number.isInteger(n) ? n.toLocaleString("es-ES") : n.toFixed(1).replace(".", ",");
  return `
    <div class="health-target-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <small>${current === null ? "Sin dato" : format(current) + suffix}${goal === null ? "" : " / " + format(goal) + suffix}${note ? " · " + escapeHtml(note) : ""}</small>
      </div>
      <progress max="100" value="${Math.max(0, Math.min(100, Number(progress) || 0))}"></progress>
    </div>`;
}

function renderHealthBenchmark(goal, sessions) {
  const metric = String(goal.metric || "");
  const normalized = normalizeHealthLabel(metric);
  const matcher =
    normalized.includes("press banca") ? /press.*banca|banca.*press|bench/i :
    normalized.includes("dominadas") ? /dominadas/i :
    normalized.includes("remo") ? /remo/i :
    normalized.includes("fondos") ? /fondos/i :
    normalized.includes("prensa") ? /prensa/i :
    null;

  let latest = null;
  if (matcher) {
    for (const session of sessions || []) {
      latest = (session.entries || []).find((entry) => matcher.test(String(entry.exerciseName || ""))) || null;
      if (latest) break;
    }
  }

  const latestText = latest
    ? [
        latest.loadValue == null ? null : `${String(latest.loadValue).replace(".", ",")} ${latest.loadUnit || "kg"}`,
        latest.setsDone == null ? null : `${latest.setsDone} series`,
        latest.repsDone ? `${latest.repsDone} reps` : null
      ].filter(Boolean).join(" · ")
    : null;

  return `
    <article>
      <div>
        <strong>${escapeHtml(metric)}</strong>
        <small>${latestText ? "Último: " + escapeHtml(latestText) : "Baseline: " + escapeHtml(goal.baseline || "pendiente")}</small>
      </div>
      <p>${escapeHtml(goal.target || "Objetivo pendiente")}</p>
    </article>`;
}

async function loadGymPanel() {
  try {
    const response = await fetch("/api/gym", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`GYM_${response.status}`);
    renderGymPanel(await response.json());
  } catch (error) {
    const panel = document.querySelector("#gym-panel");
    if (panel) panel.innerHTML = '<p class="health-empty">No se ha podido cargar el plan de gimnasio.</p>';
    console.warn("Gym load failed", error);
  }
}

async function loadNutritionPanel(dateKey) {
  const panel = document.querySelector("#nutrition-panel");
  if (panel) panel.innerHTML = '<p class="health-empty">Cargando nutrición…</p>';
  try {
    const response = await fetch(`/api/nutrition?date=${encodeURIComponent(dateKey)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`NUTRITION_${response.status}`);
    const payload = await response.json();
    renderNutritionPanel(payload);
    renderMenuPanel(payload);
  } catch (error) {
    if (panel) {
      panel.innerHTML = `
        <div class="health-empty health-empty-card">
          <strong>Nutrición todavía no está conectada</strong>
          <p>La base privada ya está preparada. Falta activar la conexión del Sheet de Salud en el Worker.</p>
        </div>`;
    }
    const menuPanel = document.querySelector("#menu-panel");
    if (menuPanel) {
      menuPanel.innerHTML = '<div class="health-empty health-empty-card"><strong>Menú no disponible</strong><p>No se ha podido cargar MenuSemanal.</p></div>';
    }
    console.warn("Nutrition load failed", error);
  }
}

let selectedHabitDate = null;
let habitQuestData = null;
let habitActiveTab = "today";
let habitViewPreference = null;
let habitSortPreference = null;
try {
  habitViewPreference = localStorage.getItem("second-brain.habit-view");
  habitSortPreference = localStorage.getItem("second-brain.habit-sort");
} catch {}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDateKey(key, amount) {
  const [year, month, day] = String(key).split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

async function openHabitsDetail(dateKey = null) {
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "health-dialog", "habits-dialog", "important-events-dialog", "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog", "objects-dialog", "projects-dialog");
  dialog.classList.add("habits-dialog");
  document.querySelector("#dialog-context").textContent = "Hábitos · HabitQuest";
  document.querySelector("#dialog-title").textContent = "Hábitos";
  selectedHabitDate = dateKey || selectedHabitDate || localDateKey();

  document.querySelector("#dialog-body").innerHTML = '<p class="health-empty">Cargando HabitQuest…</p>';
  dialog.showModal();

  try {
    const response = await fetch(`/api/habits?date=${encodeURIComponent(selectedHabitDate)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HABITS_${response.status}`);
    const data = await response.json();
    renderHabitsPanel(data);
  } catch (error) {
    document.querySelector("#dialog-body").innerHTML = `
      <div class="health-empty health-empty-card">
        <strong>HabitQuest todavía no está conectado aquí</strong>
        <p>La integración usa la misma hoja de Google Sheets como fuente de verdad. Falta configurar el identificador privado del Sheet en el Worker.</p>
      </div>`;
    console.warn("HabitQuest load failed", error);
  }
}

function habitViewMode(data = habitQuestData) {
  const candidate = habitViewPreference || data?.user?.habitView || "list";
  return candidate === "compact" ? "compact" : "list";
}

function habitSortMode(data = habitQuestData) {
  const allowed = new Set(["manual", "alpha", "created", "category", "streak"]);
  const candidate = habitSortPreference || data?.user?.habitSort || "manual";
  return allowed.has(candidate) ? candidate : "manual";
}

function persistHabitUiPreference(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function sortHabitMaster(habits, sort, progressById) {
  const list = [...habits];
  if (sort === "alpha") list.sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  else if (sort === "created") list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  else if (sort === "category") list.sort((a, b) => String(a.category).localeCompare(String(b.category), "es") || String(a.name).localeCompare(String(b.name), "es"));
  else if (sort === "streak") list.sort((a, b) => Number(progressById.get(b.id)?.totalCompletions || 0) - Number(progressById.get(a.id)?.totalCompletions || 0));
  return list;
}

function renderHabitsPanel(data) {
  const body = document.querySelector("#dialog-body");
  if (!body) return;
  habitQuestData = data;

  const todayHabits = Array.isArray(data.todayHabits) ? data.todayHabits : [];
  const habits = Array.isArray(data.habits) ? data.habits : [];
  const progress = Array.isArray(data.progress) ? data.progress : [];
  const insights = data.insights || {};
  const summary = data.summary || {};
  const level = summary.level || {};
  const selected = data.date || selectedHabitDate || localDateKey();
  selectedHabitDate = selected;
  const isToday = selected === localDateKey();
  const completion = summary.total ? Math.round((Number(summary.done || 0) / Number(summary.total)) * 100) : 0;
  const labelDate = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date(`${selected}T12:00:00`));
  const view = habitViewMode(data);
  const sort = habitSortMode(data);
  const progressById = new Map(progress.map((item) => [item.id, item]));
  const orderedHabits = sortHabitMaster(habits, sort, progressById);
  const activeHabits = orderedHabits.filter((habit) => habit.active);
  const archivedHabits = orderedHabits.filter((habit) => !habit.active);
  const pendingHabits = todayHabits.filter((habit) => !habit.done);
  const completedHabits = todayHabits.filter((habit) => habit.done);
  const completionRate90 = Math.round(Math.max(0, Math.min(1, Number(insights.completionRate || 0))) * 100);
  const bestHabit = insights.bestHabit || null;
  const activeClass = (tab) => habitActiveTab === tab ? "active" : "";

  body.innerHTML = `
    <div class="habits-kpis">
      <div><span>${isToday ? "Hoy" : "Día"}</span><strong>${Number(summary.done || 0)}/${Number(summary.total || 0)}</strong><small>${completion}% completado</small></div>
      <div><span>Racha</span><strong>${Number(summary.streak || 0)} días</strong><small>Máxima ${Number(summary.longestStreak || 0)}</small></div>
      <div><span>Nivel</span><strong>${Number(level.level || 1)}</strong><small>${Number(summary.xp || 0).toLocaleString("es-ES")} XP</small></div>
    </div>

    <div class="habits-level-progress">
      <progress max="1" value="${Math.max(0, Math.min(1, Number(level.progress || 0)))}"></progress>
      <span>${Number(level.currentLevelXp || 0)} / ${Number(level.levelSpan || 0)} XP para el siguiente nivel</span>
    </div>

    <div class="health-tabs habits-tabs" role="tablist" aria-label="HabitQuest">
      <button class="${activeClass("today")}" type="button" data-habit-tab="today">Hoy</button>
      <button class="${activeClass("list")}" type="button" data-habit-tab="list">Hábitos</button>
      <button class="${activeClass("progress")}" type="button" data-habit-tab="progress">Progreso</button>
    </div>

    <div class="health-tab-panels">
      <section class="health-tab-panel ${activeClass("today")}" data-habit-panel="today">
        <div class="habit-date-nav">
          <button type="button" data-habit-date-shift="-1" aria-label="Día anterior">‹</button>
          <button type="button" data-habit-today ${isToday ? "disabled" : ""}>
            <strong>${escapeHtml(labelDate)}</strong>
            <small>${isToday ? "Hoy" : "Volver a hoy"}</small>
          </button>
          <button type="button" data-habit-date-shift="1" aria-label="Día siguiente" ${isToday ? "disabled" : ""}>›</button>
        </div>

        <div class="habit-daily-progress">
          ${progressRingMarkup(Number(summary.total || 0) > 0 ? completion : null, { tone: "violet", size: "lg", label: `${Number(summary.done || 0)}/${Number(summary.total || 0)}`, ariaLabel: Number(summary.total || 0) > 0 ? `${completion}% de hábitos completados` : "Sin hábitos programados" })}
          <div>
            <strong>${completion === 100 && Number(summary.total || 0) > 0 ? "🎉 Misión diaria completada" : `${Math.max(0, Number(summary.total || 0) - Number(summary.done || 0))} por completar`}</strong>
            <p>${completion === 100 && Number(summary.total || 0) > 0 ? "Todo lo programado para este día está hecho." : `Sigue avanzando para mantener tu racha de ${Number(summary.streak || 0)} días.`}</p>
          </div>
          <button type="button" class="habit-view-toggle" data-habit-view-toggle aria-label="Cambiar vista">${view === "list" ? "▦" : "☰"}</button>
        </div>

        ${pendingHabits.length ? `
          <div class="habit-list-section">
            <div class="habit-list-heading"><strong>Pendientes</strong><span>${pendingHabits.length}</span></div>
            <div class="habit-today-list ${view === "compact" ? "compact" : ""}">
              ${pendingHabits.map((habit) => renderHabitTodayItem(habit, view === "compact")).join("")}
            </div>
          </div>` : ""}

        ${completedHabits.length ? `
          <div class="habit-list-section completed">
            <div class="habit-list-heading"><strong>Completados</strong><span>${completedHabits.length}</span></div>
            <div class="habit-today-list ${view === "compact" ? "compact" : ""}">
              ${completedHabits.map((habit) => renderHabitTodayItem(habit, view === "compact")).join("")}
            </div>
          </div>` : ""}

        ${todayHabits.length ? "" : `<p class="health-empty">No hay hábitos programados para este día.</p>`}
      </section>

      <section class="health-tab-panel ${activeClass("list")}" data-habit-panel="list">
        <div class="habit-management-toolbar">
          <div class="health-section-heading">
            <div><strong>Todos los hábitos</strong><p>Misma fuente de verdad que HabitQuest. Gestiona sin salir de Segundo Cerebro.</p></div>
            <span>${activeHabits.length} activos</span>
          </div>
          <div class="habit-toolbar-actions">
            <select data-habit-sort aria-label="Ordenar hábitos">
              <option value="manual" ${sort === "manual" ? "selected" : ""}>Orden manual</option>
              <option value="alpha" ${sort === "alpha" ? "selected" : ""}>A–Z</option>
              <option value="created" ${sort === "created" ? "selected" : ""}>Más recientes</option>
              <option value="category" ${sort === "category" ? "selected" : ""}>Categoría</option>
              <option value="streak" ${sort === "streak" ? "selected" : ""}>Más completados</option>
            </select>
            <button type="button" class="habit-view-toggle" data-habit-view-toggle aria-label="Cambiar vista">${view === "list" ? "▦" : "☰"}</button>
            <button type="button" class="habit-new-button" data-habit-new>+ Nuevo hábito</button>
          </div>
        </div>

        <div class="habit-list-section">
          <div class="habit-list-heading"><strong>Activos</strong><span>${activeHabits.length}</span></div>
          <div class="habit-master-list ${view === "compact" ? "compact" : ""}">
            ${activeHabits.map((habit) => renderHabitMasterItem(habit, habits.findIndex((item) => item.id === habit.id), habits, progressById, sort === "manual")).join("")}
          </div>
        </div>

        ${archivedHabits.length ? `
          <div class="habit-list-section archived-section">
            <div class="habit-list-heading"><strong>Archivados</strong><span>${archivedHabits.length}</span></div>
            <p class="habit-section-note">No aparecen en el día a día, pero conservan su histórico.</p>
            <div class="habit-master-list ${view === "compact" ? "compact" : ""}">
              ${archivedHabits.map((habit) => renderHabitMasterItem(habit, habits.findIndex((item) => item.id === habit.id), habits, progressById, sort === "manual")).join("")}
            </div>
          </div>` : ""}
      </section>

      <section class="health-tab-panel ${activeClass("progress")}" data-habit-panel="progress">
        <div class="habit-insight-kpis">
          <div><span>Consistencia · 90 días</span><strong>${completionRate90}%</strong></div>
          <div><span>Completados totales</span><strong>${Number(insights.totalCompletions || 0).toLocaleString("es-ES")}</strong></div>
          <div><span>Hábito más fuerte</span><strong>${bestHabit ? escapeHtml(bestHabit.name) : "—"}</strong><small>${bestHabit ? `${Math.round(Number(bestHabit.rate || 0) * 100)}% · 60 días` : "Sin histórico"}</small></div>
        </div>

        <div class="habit-progress-section">
          <div class="health-section-heading"><div><strong>Esta semana</strong><p>Porcentaje de hábitos programados completados cada día.</p></div></div>
          ${renderHabitWeekly(insights.weekly)}
        </div>

        <div class="habit-progress-section">
          <div class="health-section-heading"><div><strong>Mapa de consistencia</strong><p>Últimas cinco semanas; los días futuros aparecen atenuados.</p></div></div>
          ${renderHabitHeatmap(insights.heat)}
        </div>

        <div class="habit-progress-section">
          <div class="health-section-heading"><div><strong>Logros</strong><p>Los mismos hitos de gamificación de HabitQuest.</p></div><span>${Number(insights.achievementsUnlocked || 0)}/${Array.isArray(insights.achievements) ? insights.achievements.length : 0}</span></div>
          ${renderHabitAchievements(insights.achievements)}
        </div>

        <div class="habit-progress-section">
          <div class="health-section-heading">
            <div><strong>Últimos 60 días</strong><p>Rendimiento por hábito, racha individual y completados acumulados.</p></div>
          </div>
          <div class="habit-progress-list">
            ${[...progress].sort((a, b) => b.rate - a.rate).map(renderHabitProgressItem).join("")}
          </div>
        </div>
      </section>
    </div>`;

  bindHabitInteractions();
}

function renderHabitTodayItem(habit, compact = false) {
  const target = Math.max(1, Number(habit.target || habit.timesPerDay || 1));
  const count = Math.max(0, Number(habit.count || 0));
  const done = Boolean(habit.done);
  return `
    <button class="habit-today-item ${done ? "done" : ""} ${compact ? "compact" : ""}" type="button" data-habit-toggle="${escapeHtml(habit.id)}">
      <span class="habit-check">${done ? "✓" : escapeHtml(habit.icon)}</span>
      <span class="habit-today-copy">
        <strong>${escapeHtml(habit.name)}</strong>
        <small>${escapeHtml(habit.category)} · ${habit.xpReward} XP${habit.reminder ? " · " + escapeHtml(habit.reminder) : ""}</small>
      </span>
      <span class="habit-count">${count}/${target}</span>
    </button>`;
}

function renderHabitProgressItem(item) {
  const rate = Math.max(0, Math.min(1, Number(item.rate || 0)));
  const percent = Math.round(rate * 100);
  return `
    <article class="habit-progress-item">
      <div>
        <span>${escapeHtml(item.icon || "✓")}</span>
        <span class="habit-progress-copy"><strong>${escapeHtml(item.name)}</strong><small>🔥 ${Number(item.currentStreak || 0)} días · ${Number(item.totalCompletions || 0)} completados</small></span>
      </div>
      <progress max="100" value="${percent}"></progress>
      <span><strong>${percent}%</strong><small>${Number(item.completedDays || 0)}/${Number(item.scheduledDays || 0)} días</small></span>
    </article>`;
}

function renderHabitMasterItem(habit, index, habits, progressById, manualOrder) {
  const frequencyLabel = habit.frequency === "daily"
    ? "Diario"
    : habit.frequency === "weekdays"
      ? "Laborables"
      : `Días ${(habit.days || []).join(",") || "personalizados"}`;
  const stat = progressById.get(habit.id) || {};
  const difficultyLabel = habit.difficulty === "hard" ? "Difícil" : habit.difficulty === "easy" ? "Fácil" : "Media";
  return `
    <article class="habit-master-card ${habit.active ? "" : "archived"}">
      <div class="habit-master-main">
        <span class="habit-master-icon">${escapeHtml(habit.icon)}</span>
        <div class="habit-master-copy">
          <div class="habit-master-title-row">
            <strong>${escapeHtml(habit.name)}</strong>
            <span class="habit-xp-chip">+${Number(habit.xpReward || 0)} XP</span>
          </div>
          <div class="habit-master-chips">
            <span>${escapeHtml(habit.category)}</span>
            <span>${escapeHtml(frequencyLabel)}</span>
            <span>${Number(habit.timesPerDay || 1)}×/día</span>
            ${habit.reminder ? `<span>◷ ${escapeHtml(habit.reminder)}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="habit-master-stats">
        <span><strong>🔥 ${Number(stat.currentStreak || 0)}d</strong><small>racha</small></span>
        <span><strong>✓ ${Number(stat.totalCompletions || 0)}</strong><small>completados</small></span>
        <span><strong>${escapeHtml(difficultyLabel)}</strong><small>dificultad</small></span>
      </div>
      <div class="habit-master-actions">
        <div class="habit-reorder-actions">
          <button type="button" data-habit-move="-1" data-habit-id="${escapeHtml(habit.id)}" ${!manualOrder || index === 0 ? "disabled" : ""} aria-label="Subir hábito" title="Subir">↑</button>
          <button type="button" data-habit-move="1" data-habit-id="${escapeHtml(habit.id)}" ${!manualOrder || index === habits.length - 1 ? "disabled" : ""} aria-label="Bajar hábito" title="Bajar">↓</button>
        </div>
        <div class="habit-card-actions">
          <button type="button" data-habit-edit="${escapeHtml(habit.id)}">Editar</button>
          <button type="button" data-habit-archive="${escapeHtml(habit.id)}" data-archived="${habit.active ? "false" : "true"}">${habit.active ? "Archivar" : "Restaurar"}</button>
          <button type="button" class="danger" data-habit-delete="${escapeHtml(habit.id)}" aria-label="Eliminar hábito" title="Eliminar">×</button>
        </div>
      </div>
    </article>`;
}

function renderHabitWeekly(items) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return `<p class="health-empty">Aún no hay histórico suficiente.</p>`;
  return `
    <div class="habit-weekly-chart">
      ${rows.map((item) => {
        const pct = Math.round(Math.max(0, Math.min(1, Number(item.rate || 0))) * 100);
        return `<div class="habit-week-day ${item.future ? "future" : ""}">
          <div class="habit-week-track"><span style="height:${Math.max(4, pct)}%"></span></div>
          <strong>${escapeHtml(item.label || "")}</strong>
          <small>${pct}%</small>
        </div>`;
      }).join("")}
    </div>`;
}

function renderHabitHeatmap(items) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return `<p class="health-empty">Aún no hay histórico suficiente.</p>`;
  return `
    <div class="habit-heat-card">
      <div class="habit-heat-weekdays">${["L","M","X","J","V","S","D"].map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="habit-heat-grid">
        ${rows.map((item) => {
          const level = Math.max(0, Math.min(1, Number(item.level || 0)));
          const bucket = level === 0 ? 0 : Math.max(1, Math.ceil(level * 4));
          return `<div class="habit-heat-cell level-${bucket} ${item.future ? "future" : ""}" title="${escapeHtml(item.label || item.date || "")} · ${Number(item.done || 0)} completados"><span>${Number(item.day || 0)}</span>${item.firstOfMonth ? `<small>${escapeHtml(item.month || "")}</small>` : ""}</div>`;
        }).join("")}
      </div>
      <div class="habit-heat-legend"><span>Menos</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>Más</span></div>
    </div>`;
}

function renderHabitAchievements(items) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return `<p class="health-empty">Aún no hay logros calculados.</p>`;
  const labels = {
    "first-step": ["🏆", "Primer paso", "Completa tu primer hábito"],
    "on-fire": ["🔥", "En llamas", "Alcanza una racha de 7 días"],
    "unstoppable": ["🌋", "Imparable", "Alcanza una racha de 30 días"],
    "century": ["💯", "Centenario", "Completa 100 hábitos"],
    "early-bird": ["🌅", "Madrugador", "Completa 7 hábitos por la mañana"],
    "night-owl": ["🌙", "Noctámbulo", "Completa 7 hábitos por la noche"],
    "perfect-week": ["⚡", "Semana perfecta", "Completa todo lo programado durante 7 días"],
    "half-k": ["🚀", "Medio millar", "Completa 500 hábitos"]
  };
  return `<div class="habit-achievements">${rows.map((item) => {
    const meta = labels[item.id] || ["🏅", item.id, ""];
    const value = Math.min(Number(item.value || 0), Number(item.target || 0));
    const pct = Number(item.target || 0) ? Math.round((value / Number(item.target)) * 100) : 0;
    return `<article class="${item.unlocked ? "unlocked" : ""}">
      <span class="habit-achievement-icon">${meta[0]}</span>
      <div><strong>${escapeHtml(meta[1])}</strong><small>${escapeHtml(meta[2])}</small></div>
      <em>${item.unlocked ? "Conseguido" : `${value}/${Number(item.target || 0)}`}</em>
      <progress max="100" value="${pct}"></progress>
    </article>`;
  }).join("")}</div>`;
}

function habitHaptic(wasDone) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(wasDone ? 25 : [12, 30, 18]);
    return;
  }
  if (typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);
  input.click();
  setTimeout(() => input.remove(), 300);
}

function showHabitXpToast(xp) {
  document.querySelector(".habit-xp-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "habit-xp-toast";
  toast.textContent = `+${Number(xp || 0)} XP`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => toast.remove(), 1100);
}

function launchHabitConfetti() {
  document.querySelector(".habit-confetti-layer")?.remove();
  const layer = document.createElement("div");
  layer.className = "habit-confetti-layer";
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.round(Math.random() * 100)}%`;
    piece.style.setProperty("--delay", `${Math.random() * .35}s`);
    piece.style.setProperty("--drift", `${Math.round((Math.random() - .5) * 160)}px`);
    piece.className = `c${i % 4}`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2600);
}

function showHabitLevelUp(level) {
  document.querySelector(".habit-level-up")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "habit-level-up";
  overlay.innerHTML = `<div><span>✦</span><small>SUBIDA DE NIVEL</small><strong>Nivel ${Number(level || 1)}</strong><button type="button">Seguir</button></div>`;
  overlay.querySelector("button")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function openHabitEditor(habitId = null) {
  const data = habitQuestData;
  if (!data) return;
  const habit = habitId ? data.habits.find((item) => item.id === habitId) : null;
  const body = document.querySelector("#dialog-body");
  if (!body) return;

  const category = habit?.category || "personal";
  const frequency = habit?.frequency || "daily";
  const difficulty = habit?.difficulty || "medium";
  const selectedDays = new Set(Array.isArray(habit?.days) ? habit.days : [1, 3, 5]);

  body.innerHTML = `
    <form id="habit-editor-form" class="habit-editor-form">
      <div class="habit-editor-heading">
        <div>
          <p class="context-label">HabitQuest</p>
          <h3>${habit ? "Editar hábito" : "Nuevo hábito"}</h3>
        </div>
        <button type="button" data-habit-editor-cancel>Volver</button>
      </div>

      <div class="habit-editor-name">
        <label><span>Icono</span><input name="icon" maxlength="8" value="${escapeHtml(habit?.icon || "🌱")}" aria-label="Icono"></label>
        <label><span>Nombre</span><input name="name" maxlength="120" required value="${escapeHtml(habit?.name || "")}" placeholder="Ej. Leer 20 páginas"></label>
      </div>

      <div class="habit-editor-grid">
        <label>
          <span>Categoría</span>
          <select name="category">
            ${[
              ["fitness","Fitness"],["learning","Aprendizaje"],["mind","Mente"],["work","Trabajo"],
              ["finance","Finanzas"],["health","Salud"],["sleep","Sueño"],["creativity","Creatividad"],
              ["social","Social"],["personal","Personal"]
            ].map(([value,label]) => `<option value="${value}" ${category === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Dificultad</span>
          <select name="difficulty">
            <option value="easy" ${difficulty === "easy" ? "selected" : ""}>Fácil · 10 XP</option>
            <option value="medium" ${difficulty === "medium" ? "selected" : ""}>Media · 20 XP</option>
            <option value="hard" ${difficulty === "hard" ? "selected" : ""}>Difícil · 30 XP</option>
          </select>
        </label>
        <label>
          <span>Frecuencia</span>
          <select name="frequency" id="habit-frequency">
            <option value="daily" ${frequency === "daily" ? "selected" : ""}>Todos los días</option>
            <option value="weekdays" ${frequency === "weekdays" ? "selected" : ""}>Laborables</option>
            <option value="custom" ${frequency === "custom" ? "selected" : ""}>Personalizada</option>
          </select>
        </label>
        <label>
          <span>Veces al día</span>
          <input name="timesPerDay" type="number" min="1" max="12" step="1" value="${Number(habit?.timesPerDay || 1)}">
        </label>
        <label>
          <span>Recordatorio</span>
          <input name="reminder" type="time" value="${escapeHtml(habit?.reminder || "19:00")}">
        </label>
      </div>

      <fieldset id="habit-custom-days" class="habit-custom-days" ${frequency === "custom" ? "" : "hidden"}>
        <legend>Días</legend>
        ${[["D",0],["L",1],["M",2],["X",3],["J",4],["V",5],["S",6]].map(([label,value]) => `
          <label>
            <input type="checkbox" name="days" value="${value}" ${selectedDays.has(value) ? "checked" : ""}>
            <span>${label}</span>
          </label>`).join("")}
      </fieldset>

      <div class="habit-editor-actions">
        <button type="button" data-habit-editor-cancel>Cancelar</button>
        <button type="submit" class="primary">${habit ? "Guardar cambios" : "Crear hábito"}</button>
      </div>
      <p id="habit-editor-status" class="gym-save-status" role="status"></p>
    </form>`;

  const frequencySelect = body.querySelector("#habit-frequency");
  const customDays = body.querySelector("#habit-custom-days");
  frequencySelect?.addEventListener("change", () => {
    if (customDays) customDays.hidden = frequencySelect.value !== "custom";
  });

  body.querySelectorAll("[data-habit-editor-cancel]").forEach((button) => {
    button.addEventListener("click", () => renderHabitsPanel(habitQuestData));
  });

  body.querySelector("#habit-editor-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = document.querySelector("#habit-editor-status");
    if (status) status.textContent = "Guardando…";
    const payload = {
      name: String(form.get("name") || "").trim(),
      icon: String(form.get("icon") || "🌱").trim(),
      category: String(form.get("category") || "personal"),
      frequency: String(form.get("frequency") || "daily"),
      days: form.getAll("days").map(Number),
      reminder: String(form.get("reminder") || ""),
      difficulty: String(form.get("difficulty") || "medium"),
      timesPerDay: Number(form.get("timesPerDay") || 1)
    };
    const result = await manageHabitQuest(habit ? "update" : "create", {
      ...(habit ? { habitId: habit.id } : {}),
      habit: payload
    });
    if (result) renderHabitsPanel(result);
    else if (status) status.textContent = "No se ha podido guardar.";
  });
}

async function manageHabitQuest(action, payload = {}) {
  try {
    const response = await fetch("/api/habits/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json();
    if (!response.ok || !data.summary) throw new Error(data.code || `HABIT_MANAGE_${response.status}`);
    habitQuestData = data.summary;
    state.habitsSummary = data.summary;
    return data.summary;
  } catch (error) {
    console.warn("Habit management failed", error);
    window.alert("No se ha podido modificar HabitQuest. Si los hábitos cargan pero no se pueden editar, habrá que ampliar el permiso de Google Sheets a escritura.");
    return null;
  }
}

async function moveHabit(habitId, direction) {
  const habits = [...(habitQuestData?.habits || [])];
  const index = habits.findIndex((habit) => habit.id === habitId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= habits.length) return;
  [habits[index], habits[nextIndex]] = [habits[nextIndex], habits[index]];
  const result = await manageHabitQuest("reorder", { order: habits.map((habit) => habit.id) });
  if (result) renderHabitsPanel(result);
}

function bindHabitInteractions() {
  document.querySelectorAll("[data-habit-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.habitTab;
      habitActiveTab = tab || "today";
      document.querySelectorAll("[data-habit-tab]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-habit-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.habitPanel === tab));
    });
  });

  document.querySelectorAll("[data-habit-view-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      habitViewPreference = habitViewMode() === "list" ? "compact" : "list";
      persistHabitUiPreference("second-brain.habit-view", habitViewPreference);
      renderHabitsPanel(habitQuestData);
    });
  });

  document.querySelector("[data-habit-sort]")?.addEventListener("change", (event) => {
    habitSortPreference = event.currentTarget.value || "manual";
    persistHabitUiPreference("second-brain.habit-sort", habitSortPreference);
    renderHabitsPanel(habitQuestData);
  });

  document.querySelectorAll("[data-habit-date-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedHabitDate = shiftDateKey(selectedHabitDate || localDateKey(), Number(button.dataset.habitDateShift || 0));
      void openHabitsDetail(selectedHabitDate);
    });
  });

  document.querySelector("[data-habit-today]")?.addEventListener("click", () => {
    selectedHabitDate = localDateKey();
    void openHabitsDetail(selectedHabitDate);
  });

  document.querySelectorAll("[data-habit-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const habitId = button.dataset.habitToggle;
      if (!habitId) return;
      const before = habitQuestData;
      const beforeHabit = before?.todayHabits?.find((item) => item.id === habitId);
      const previousCount = Math.max(0, Number(beforeHabit?.count || 0));
      const previousLevel = Number(before?.summary?.level?.level || 1);
      const beforeAllDone = Number(before?.summary?.total || 0) > 0 && Number(before?.summary?.done || 0) === Number(before?.summary?.total || 0);
      habitHaptic(Boolean(beforeHabit?.done));
      button.disabled = true;
      button.classList.add("saving");
      try {
        const response = await fetch("/api/habits/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ habitId, date: selectedHabitDate || localDateKey() })
        });
        const payload = await response.json();
        if (!response.ok || !payload.summary) throw new Error(payload.code || `HABIT_TOGGLE_${response.status}`);
        const nextLevel = Number(payload.summary?.summary?.level?.level || 1);
        const afterAllDone = Number(payload.summary?.summary?.total || 0) > 0 && Number(payload.summary?.summary?.done || 0) === Number(payload.summary?.summary?.total || 0);
        const advanced = Number(payload.count || 0) > previousCount;
        renderHabitsPanel(payload.summary);
        if (advanced) showHabitXpToast(beforeHabit?.xpReward || 0);
        if (!beforeAllDone && afterAllDone && (selectedHabitDate || localDateKey()) === localDateKey()) launchHabitConfetti();
        if (nextLevel > previousLevel) {
          launchHabitConfetti();
          showHabitLevelUp(nextLevel);
        }
      } catch (error) {
        button.disabled = false;
        button.classList.remove("saving");
        console.warn("Habit toggle failed", error);
      }
    });
  });

  document.querySelector("[data-habit-new]")?.addEventListener("click", () => openHabitEditor());
  document.querySelectorAll("[data-habit-edit]").forEach((button) => {
    button.addEventListener("click", () => openHabitEditor(button.dataset.habitEdit));
  });
  document.querySelectorAll("[data-habit-archive]").forEach((button) => {
    button.addEventListener("click", async () => {
      const habitId = button.dataset.habitArchive;
      const archived = button.dataset.archived === "true";
      const result = await manageHabitQuest(archived ? "restore" : "archive", { habitId });
      if (result) renderHabitsPanel(result);
    });
  });
  document.querySelectorAll("[data-habit-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const habitId = button.dataset.habitDelete;
      const habit = habitQuestData?.habits?.find((item) => item.id === habitId);
      if (!habitId || !habit) return;
      const confirmed = window.confirm(`¿Eliminar "${habit.name}"? Esto también elimina su histórico. Si quieres conservarlo, archívalo.`);
      if (!confirmed) return;
      const result = await manageHabitQuest("delete", { habitId });
      if (result) renderHabitsPanel(result);
    });
  });
  document.querySelectorAll("[data-habit-move]").forEach((button) => {
    button.addEventListener("click", () => {
      void moveHabit(button.dataset.habitId, Number(button.dataset.habitMove || 0));
    });
  });
}

function bindHealthTabs() {
  document.querySelectorAll("[data-health-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.healthTab;
      document.querySelectorAll("[data-health-tab]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-health-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.healthPanel === tab));
      if (tab === "adherence") void loadHealthAdherence();
    });
  });
}

function renderMedicalSection(events) {
  return `
    <div class="health-section-heading">
      <div>
        <strong>Próximas citas</strong>
        <p>Citas médicas detectadas en los calendarios iCloud seleccionados.</p>
      </div>
      <span>${events.length}</span>
    </div>
    ${events.length
      ? `<div class="health-event-list">${events.slice(0, 30).map(renderHealthEvent).join("")}</div>`
      : '<p class="health-empty">No hay próximas citas médicas detectadas en iCloud.</p>'}`;
}

function renderNutritionPanel(data) {
  const panel = document.querySelector("#nutrition-panel");
  if (!panel) return;

  const date = data.date || localDateKey();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const foods = Array.isArray(data.foods) ? data.foods : [];
  const history = Array.isArray(data.history) ? data.history : [];
  const summary = data.summary || {};
  const consumed = summary.consumed || {};
  const objective = data.objective || null;
  const energy = data.energy || null;
  const nullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const totalBurn = nullableNumber(summary.totalBurn);
  const balance = nullableNumber(summary.balanceKcal);
  const remainingTarget = nullableNumber(summary.remainingToTargetKcal);

  panel.innerHTML = `
    <div class="nutrition-date-nav">
      <button type="button" data-nutrition-shift="-1" aria-label="Día anterior">‹</button>
      <label>
        <span>Fecha</span>
        <input id="nutrition-date" type="date" value="${escapeHtml(date)}">
      </label>
      <button type="button" data-nutrition-shift="1" aria-label="Día siguiente">›</button>
    </div>

    <div class="nutrition-kpis">
      <article>
        <span>Consumidas</span>
        <strong>${formatKcal(consumed.kcal)}</strong>
        <small>P ${formatMacro(consumed.protein)} · C ${formatMacro(consumed.carbs)} · G ${formatMacro(consumed.fat)}</small>
      </article>
      <article>
        <span>Gasto total</span>
        <strong>${totalBurn === null ? "—" : formatKcal(totalBurn)}</strong>
        <small>${energy?.source ? escapeHtml(String(energy.source)) : "Sin registro para esta fecha"}</small>
      </article>
      <article>
        <span>Balance</span>
        <strong class="${balance !== null && balance < 0 ? "negative-balance" : ""}">${balance === null ? "—" : signedKcal(balance)}</strong>
        <small>Ingeridas − gastadas</small>
      </article>
      <article>
        <span>Objetivo</span>
        <strong>${objective?.kcal == null ? "Sin definir" : formatKcal(objective.kcal)}</strong>
        <small>${objective?.kcal == null ? "Pendiente de fijar" : remainingTarget === null ? "Pendiente de calcular" : remainingTarget >= 0 ? `${formatKcal(remainingTarget)} restantes` : `${formatKcal(Math.abs(remainingTarget))} por encima`}</small>
      </article>
    </div>

    ${renderNutritionMacroTargets(consumed, objective)}
    ${renderNutritionSuggestions(foods, consumed, objective)}

    <div class="nutrition-status-grid">
      <article>
        <div>
          <span class="nutrition-source-dot ${energy?.source ? "connected" : ""}"></span>
          <strong>Apple Health</strong>
        </div>
        <p>${energy?.source
          ? [
              energy.activeKcal != null ? `Activas ${formatKcal(energy.activeKcal)}` : null,
              energy.restingKcal != null ? `Reposo ${formatKcal(energy.restingKcal)}` : null,
              energy.totalKcal != null ? `Total ${formatKcal(energy.totalKcal)}` : null,
              energy.steps != null ? `${Number(energy.steps).toLocaleString("es-ES")} pasos` : null,
              energy.exerciseMinutes != null ? `${Math.round(Number(energy.exerciseMinutes))} min ejercicio` : null,
              energy.workoutCount != null ? `${Number(energy.workoutCount)} entrenos` : null
            ].filter(Boolean).join(" · ")
          : "Sin datos importados de Apple Health para esta fecha. Llevar el Watch no basta si el Atajo diario no llegó a sincronizar ese día."}</p>
      </article>
      <article>
        <div><strong>Base de comidas</strong><span>${foods.length}</span></div>
        <p>Cada comida que vayamos definiendo se guardará para reutilizar calorías y macros.</p>
      </article>
    </div>

    <details class="nutrition-food-library">
      <summary>Ver base de comidas (${foods.length})</summary>
      <div>
        ${foods.length
          ? foods.map(food => `
            <article>
              <div><strong>${escapeHtml(food.name)}</strong><small>${food.serving == null ? "Ración" : escapeHtml(String(food.serving)) + " " + escapeHtml(food.unit || "")}</small></div>
              <span>${food.kcal == null ? "—" : formatKcal(food.kcal)}</span>
            </article>`).join("")
          : '<p class="health-empty">Aún no hay comidas guardadas. Las iremos creando cuando me las vayas diciendo.</p>'}
      </div>
    </details>

    <section class="nutrition-day-section">
      <div class="health-section-heading">
        <div>
          <strong>Comidas del día</strong>
          <p>Se mantienen separadas las previstas y las realmente consumidas.</p>
        </div>
        <span>${entries.length}</span>
      </div>
      ${renderNutritionEntries(entries)}
    </section>

    <section class="nutrition-quick-add">
      <div class="health-section-heading">
        <div>
          <strong>Añadir rápido</strong>
          <p>También podrás decírmelo por chat; este formulario es un respaldo directo desde la web.</p>
        </div>
      </div>
      <form id="nutrition-entry-form">
        <label><span>Momento</span>
          <select name="moment">
            <option>Desayuno</option><option>Comida</option><option>Cena</option><option>Snack</option><option>Otro</option>
          </select>
        </label>
        <label class="nutrition-name-field"><span>Comida</span><input name="itemName" list="nutrition-food-options" required placeholder="Ej. arroz con pollo"><datalist id="nutrition-food-options">${foods.map(food => `<option value="${escapeHtml(food.name)}"></option>`).join("")}</datalist></label>
        <label><span>kcal</span><input name="kcal" type="number" min="0" step="1" placeholder="0"></label>
        <label><span>Estado</span>
          <select name="status"><option value="consumido">Consumido</option><option value="planificado">Planificado</option></select>
        </label>
        <button type="submit">Guardar</button>
        <p id="nutrition-entry-status" class="gym-save-status" role="status"></p>
      </form>
    </section>

    <section class="nutrition-history-section">
      <div class="health-section-heading">
        <div><strong>Últimos 14 días</strong><p>Ingesta, gasto y balance energético.</p></div>
      </div>
      ${renderNutritionHistory(history)}
    </section>
  `;

  bindNutritionInteractions(date);
}

function renderNutritionMacroTargets(consumed, objective) {
  if (!objective) return "";
  const rows = [
    ["Calorías", Number(consumed?.kcal || 0), Number(objective.kcal), " kcal", "amber", "máx"],
    ["Proteína", Number(consumed?.protein || 0), Number(objective.protein), " g", "mint", "mín"],
    ["Carbohidratos", Number(consumed?.carbs || 0), Number(objective.carbs), " g", "blue", "ref"],
    ["Grasas", Number(consumed?.fat || 0), Number(objective.fat), " g", "violet", "ref"]
  ].filter(([, , target]) => Number.isFinite(target) && target > 0);

  if (!rows.length) return "";
  return `
    <section class="nutrition-targets-section">
      <div class="health-section-heading">
        <div>
          <strong>Objetivos del día</strong>
          <p>Calorías = techo máximo; proteína = mínimo prioritario; hidratos y grasas = referencias de reparto.</p>
        </div>
      </div>
      <div class="nutrition-target-ring-grid">
        ${rows.map(([label, value, target, suffix, tone, shortLabel]) => {
          const rawPercent = Math.max(0, Math.round((value / target) * 100));
          const progress = Math.min(100, rawPercent);
          const difference = value - target;
          const remaining = Math.max(0, target - value);
          const ringTone = label === "Calorías"
            ? rawPercent <= 100 ? "mint" : rawPercent <= 110 ? "amber" : "coral"
            : label === "Proteína"
              ? rawPercent >= 94 ? "mint" : rawPercent >= 75 ? "amber" : "coral"
              : rawPercent > 150 ? "coral" : rawPercent > 120 ? "amber" : tone;
          const format = (n) => Number.isInteger(n) ? n.toLocaleString("es-ES") : n.toFixed(1).replace(".", ",");
          const status = label === "Calorías"
            ? difference > 0
              ? `Exceso +${format(difference)}${suffix}`
              : difference === 0
                ? "En el límite máximo"
                : `Dentro del máximo · margen ${format(remaining)}${suffix}`
            : label === "Proteína"
              ? difference >= 0
                ? "Mínimo cubierto"
                : `Faltan ${format(remaining)}${suffix}`
              : difference > 0
                ? `+${format(difference)}${suffix} sobre referencia`
                : difference === 0
                  ? "En referencia"
                  : `Quedan ${format(remaining)}${suffix} de referencia`;
          return `
            <article class="nutrition-target-ring-card">
              ${progressRingMarkup(progress, { tone: ringTone, size: "md", label: shortLabel, displayPercent: rawPercent, ariaLabel: `${label}: ${format(value)}${suffix} de ${format(target)}${suffix}. ${status}` })}
              <div>
                <strong>${escapeHtml(label)}</strong>
                <small>${format(value)}${suffix} / ${format(target)}${suffix}</small>
                <span>${escapeHtml(status)}</span>
              </div>
            </article>`;
        }).join("")}
      </div>
    </section>`;
}

function renderNutritionSuggestions(foods, consumed, objective) {
  if (!objective || !Array.isArray(foods) || !foods.length) return "";

  const targets = {
    kcal: Number(objective.kcal || 0),
    protein: Number(objective.protein || 0),
    carbs: Number(objective.carbs || 0),
    fat: Number(objective.fat || 0)
  };
  const current = {
    kcal: Number(consumed?.kcal || 0),
    protein: Number(consumed?.protein || 0),
    carbs: Number(consumed?.carbs || 0),
    fat: Number(consumed?.fat || 0)
  };
  const deficits = {
    kcal: Math.max(0, targets.kcal - current.kcal),
    protein: Math.max(0, targets.protein - current.protein),
    carbs: Math.max(0, targets.carbs - current.carbs),
    fat: Math.max(0, targets.fat - current.fat)
  };

  if (!(targets.kcal > 0) || deficits.kcal <= 0) {
    return `
      <section class="nutrition-suggestions">
        <div class="health-section-heading">
          <div>
            <strong>Plan para completar hoy</strong>
            <p>El presupuesto calórico del día ya está cubierto. No se añaden calorías por el gasto del Apple Watch.</p>
          </div>
        </div>
      </section>`;
  }

  if (deficits.protein <= 0) {
    return `
      <section class="nutrition-suggestions">
        <div class="health-section-heading">
          <div>
            <strong>Plan para completar hoy</strong>
            <p>La prioridad de proteína ya está cubierta. El margen restante es ${escapeHtml(formatKcal(deficits.kcal))}; hidratos y grasas son objetivos secundarios, no una obligación de rellenarlos.</p>
          </div>
        </div>
      </section>`;
  }

  const baseFoods = foods
    .map((food) => {
      const kcal = Number(food.kcal);
      const protein = Number(food.protein);
      const carbs = Number(food.carbs);
      const fat = Number(food.fat);
      const serving = Number(food.serving);
      if (![kcal, protein, carbs, fat, serving].every(Number.isFinite) || kcal <= 0 || serving <= 0 || protein <= 0) return null;
      return {
        food,
        kcal,
        protein,
        carbs,
        fat,
        serving,
        proteinDensity: (protein / kcal) * 100
      };
    })
    .filter(Boolean);

  if (!baseFoods.length) {
    return `
      <section class="nutrition-suggestions">
        <div class="health-section-heading">
          <div>
            <strong>Plan para completar hoy</strong>
            <p>Faltan ${Math.round(deficits.protein)} g de proteína, pero todavía no hay suficientes alimentos con macros completos en la base para construir un plan fiable.</p>
          </div>
        </div>
      </section>`;
  }

  const portionsByFood = baseFoods.map((item) => {
    const unit = String(item.food.unit || "").toLowerCase();
    const factors = unit.includes("ración") || unit.includes("racion")
      ? [0.5, 1]
      : item.proteinDensity >= 15
        ? [0.5, 1, 1.5, 2]
        : [0.5, 1, 1.5];

    return factors.map((factor) => ({
      id: item.food.id,
      name: item.food.name,
      unit: item.food.unit || "",
      quantity: item.serving * factor,
      kcal: item.kcal * factor,
      protein: item.protein * factor,
      carbs: item.carbs * factor,
      fat: item.fat * factor,
      proteinDensity: item.proteinDensity
    })).filter((portion) => portion.kcal <= deficits.kcal + 0.01);
  }).filter((rows) => rows.length);

  const plans = [];
  const addPlan = (items) => {
    if (!items.length) return;
    const total = items.reduce((acc, item) => {
      acc.kcal += item.kcal;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

    if (total.kcal > deficits.kcal + 0.01) return;

    const proteinGap = Math.max(0, deficits.protein - total.protein);
    const proteinExcess = Math.max(0, total.protein - deficits.protein);
    const carbGap = Math.max(0, deficits.carbs - total.carbs);
    const fatGap = Math.max(0, deficits.fat - total.fat);
    const kcalUnused = Math.max(0, deficits.kcal - total.kcal);
    const reachesProtein = proteinGap <= 0.5;
    const quality = items.reduce((sum, item) => sum + Math.min(25, item.proteinDensity), 0) / items.length;

    const score = reachesProtein
      ? 100000
        - proteinExcess * 8
        - kcalUnused * 0.08
        - carbGap * 0.08
        - fatGap * 0.12
        + quality * 2
        - items.length * 3
      : total.protein * 250
        - proteinGap * 60
        - total.kcal * 0.03
        + quality * 2
        - items.length * 2;

    const key = items.map((item) => `${item.id}:${item.quantity}`).sort().join("|");
    plans.push({ items, total, reachesProtein, proteinGap, score, key });
  };

  for (let a = 0; a < portionsByFood.length; a += 1) {
    for (const pa of portionsByFood[a]) addPlan([pa]);
    for (let b = a + 1; b < portionsByFood.length; b += 1) {
      for (const pa of portionsByFood[a]) for (const pb of portionsByFood[b]) addPlan([pa, pb]);
      for (let c = b + 1; c < portionsByFood.length; c += 1) {
        for (const pa of portionsByFood[a]) {
          for (const pb of portionsByFood[b]) {
            for (const pc of portionsByFood[c]) addPlan([pa, pb, pc]);
          }
        }
        for (let d = c + 1; d < portionsByFood.length; d += 1) {
          for (const pa of portionsByFood[a]) {
            for (const pb of portionsByFood[b]) {
              for (const pc of portionsByFood[c]) {
                for (const pd of portionsByFood[d]) addPlan([pa, pb, pc, pd]);
              }
            }
          }
        }
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const plan of plans.sort((a, b) => b.score - a.score)) {
    if (seen.has(plan.key)) continue;
    seen.add(plan.key);
    unique.push(plan);
    if (unique.length >= 3) break;
  }

  if (!unique.length) return "";

  const canReachProtein = unique.some((plan) => plan.reachesProtein);
  const formatQty = (value, unit) => {
    const rounded = Math.abs(value - Math.round(value)) < 0.01 ? Math.round(value) : Number(value.toFixed(1));
    return `${rounded.toLocaleString("es-ES")} ${unit || "ración"}`;
  };
  const labels = ["Plan principal", "Alternativa 1", "Alternativa 2"];

  return `
    <section class="nutrition-suggestions">
      <div class="health-section-heading">
        <div>
          <strong>Plan para completar hoy</strong>
          <p>${canReachProtein
            ? `Prioridad: alcanzar los ${Math.round(targets.protein)} g de proteína sin superar las ${Math.round(targets.kcal)} kcal del día.`
            : `Con porciones razonables de la base actual no se alcanza todavía la proteína objetivo sin salir del margen calórico; se muestra la mejor aproximación.`}</p>
        </div>
      </div>
      <div class="nutrition-suggestion-grid">
        ${unique.map((plan, index) => {
          const projectedKcal = current.kcal + plan.total.kcal;
          const projectedProtein = current.protein + plan.total.protein;
          const remainingProtein = Math.max(0, targets.protein - projectedProtein);
          return `
            <article class="nutrition-plan-card">
              <strong>${escapeHtml(labels[index] || `Opción ${index + 1}`)}</strong>
              <span>${formatKcal(plan.total.kcal)} · P ${formatMacro(plan.total.protein)}</span>
              <div class="nutrition-plan-items">
                ${plan.items.map((item) => `
                  <small><b>${escapeHtml(item.name)}</b> · ${escapeHtml(formatQty(item.quantity, item.unit))} · ${formatKcal(item.kcal)} · P ${formatMacro(item.protein)}</small>`).join("")}
              </div>
              <small class="nutrition-plan-projection">
                Proyección del día: ${formatKcal(projectedKcal)} · P ${formatMacro(projectedProtein)}${remainingProtein > 0.5 ? ` · faltan ${formatMacro(remainingProtein)} de proteína` : " · proteína cubierta"}
              </small>
            </article>`;
        }).join("")}
      </div>
      <p class="nutrition-suggestion-note">El optimizador trata la proteína como restricción principal y las kcal como techo. Hidratos y grasas afinan la solución, pero no se fuerzan. El gasto del Apple Watch no amplía automáticamente el presupuesto de comida.</p>
    </section>`;
}
function renderMenuPanel(data) {
  const panel = document.querySelector("#menu-panel");
  if (!panel) return;

  const rows = Array.isArray(data?.weeklyMenu) ? data.weeklyMenu : [];
  if (!rows.length) {
    panel.innerHTML = `
      <div class="health-empty health-empty-card">
        <strong>Menú semanal preparado, pero todavía vacío</strong>
        <p>La hoja MenuSemanal ya está conectada. Cuando el gestor de Salud añada propuestas o un menú objetivo, aparecerán aquí sin inventar comidas intermedias.</p>
      </div>`;
    return;
  }

  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.date)) groups.set(row.date, []);
    groups.get(row.date).push(row);
  }

  const dayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });
  panel.innerHTML = `
    <div class="health-section-heading">
      <div>
        <strong>Menú objetivo de la semana</strong>
        <p>Plan separado del registro real. Lo consumido sigue registrándose en Nutrición.</p>
      </div>
      <span>${rows.length}</span>
    </div>
    <div class="weekly-menu-grid">
      ${[...groups.entries()].sort((a,b) => a[0].localeCompare(b[0])).map(([date, items]) => {
        const parsed = new Date(`${date}T12:00:00`);
        const label = Number.isNaN(parsed.getTime()) ? date : dayFormatter.format(parsed).replace(".", "");
        const kcal = items.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
        const protein = items.reduce((sum, item) => sum + Number(item.protein || 0), 0);
        return `
          <section class="weekly-menu-day">
            <header><strong>${escapeHtml(label)}</strong><span>${formatKcal(kcal)} · P ${formatMacro(protein)}</span></header>
            ${items.map((item) => `
              <article>
                <div>
                  <small>${escapeHtml(item.moment || "Otro")}${item.gymSession ? " · " + escapeHtml(item.gymSession) : ""}</small>
                  <strong>${escapeHtml(item.name)}</strong>
                  ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
                </div>
                <span>${item.kcal == null ? "—" : formatKcal(item.kcal)}</span>
              </article>`).join("")}
          </section>`;
      }).join("")}
    </div>`;
}

function renderNutritionEntries(entries) {
  if (!entries.length) return '<p class="health-empty">Todavía no hay comidas registradas para este día.</p>';

  const order = ["Desayuno", "Comida", "Cena", "Snack", "Otro"];
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.moment || "Otro";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  return `<div class="nutrition-meal-groups">${[...groups.entries()]
    .sort((a,b) => (order.indexOf(a[0]) < 0 ? 99 : order.indexOf(a[0])) - (order.indexOf(b[0]) < 0 ? 99 : order.indexOf(b[0])))
    .map(([moment, rows]) => `
      <article class="nutrition-meal-group">
        <header><strong>${escapeHtml(moment)}</strong><span>${formatKcal(rows.reduce((sum,row)=>sum+Number(row.kcal||0),0))}</span></header>
        ${rows.map(row => `
          <div class="nutrition-meal-row">
            <div>
              <strong>${escapeHtml(row.itemName)}</strong>
              <small>${row.status === "planificado" ? "Planificado" : "Consumido"}${row.note ? " · " + escapeHtml(row.note) : ""}</small>
            </div>
            <span>${formatKcal(row.kcal)}</span>
          </div>`).join("")}
      </article>`).join("")}</div>`;
}

function renderNutritionHistory(history) {
  if (!history.length) return '<p class="health-empty">Aún no hay histórico suficiente.</p>';
  return `
    <div class="nutrition-history-list">
      ${history.map(item => {
        const balance = item.balanceKcal;
        return `
          <article>
            <time>${escapeHtml(formatNutritionDate(item.date))}</time>
            <span><small>Ingeridas</small><strong>${formatKcal(item.consumedKcal)}</strong></span>
            <span><small>Gasto total</small><strong>${item.burnedKcal == null ? "—" : formatKcal(item.burnedKcal)}</strong></span>
            <span><small>Balance</small><strong class="${balance != null && balance < 0 ? "negative-balance" : ""}">${balance == null ? "—" : signedKcal(balance)}</strong></span>
          </article>`;
      }).join("")}
    </div>`;
}

function bindNutritionInteractions(currentDate) {
  document.querySelector("#nutrition-date")?.addEventListener("change", (event) => {
    if (event.target.value) void loadNutritionPanel(event.target.value);
  });

  document.querySelectorAll("[data-nutrition-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = shiftDateKey(currentDate, Number(button.dataset.nutritionShift || 0));
      void loadNutritionPanel(next);
    });
  });

  document.querySelector("#nutrition-entry-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = document.querySelector("#nutrition-entry-status");
    if (status) status.textContent = "Guardando…";
    try {
      const response = await fetch("/api/nutrition/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          date: currentDate,
          moment: form.get("moment"),
          itemName: form.get("itemName"),
          kcal: form.get("kcal"),
          status: form.get("status"),
          source: "web"
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.code || `NUTRITION_SAVE_${response.status}`);
      if (status) status.textContent = "Guardado ✓";
      await loadNutritionPanel(currentDate);
    } catch (error) {
      if (status) status.textContent = "No se ha podido guardar.";
      console.warn("Nutrition save failed", error);
    }
  });
}

function formatKcal(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString("es-ES")} kcal` : "—";
}

function signedKcal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${Math.round(n).toLocaleString("es-ES")} kcal`;
}

function formatMacro(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n)} g` : "0 g";
}

function formatNutritionDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date).replace(".", "");
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

function renderGymPanel(data) {
  const panel = document.querySelector("#gym-panel");
  if (!panel) return;

  const plan = Array.isArray(data?.plan) ? data.plan : [];
  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  const progress = data?.progress && typeof data.progress === "object" ? data.progress : {};
  const latestByExercise = getLatestGymEntries(sessions);

  if (!plan.length) {
    panel.innerHTML = '<p class="health-empty">Todavía no hay un plan de entrenamiento conectado.</p>';
    return;
  }

  const lastDayId = sessions[0]?.dayId || null;
  const lastIndex = plan.findIndex((day) => day.id === lastDayId);
  const suggestedIndex = lastIndex >= 0 ? (lastIndex + 1) % plan.length : 0;

  panel.innerHTML = `
    <div class="gym-overview">
      <div>
        <span>Plan activo</span>
        <strong>${plan.length} días</strong>
      </div>
      <div>
        <span>Entrenamientos registrados</span>
        <strong>${sessions.length}</strong>
      </div>
      <div>
        <span>Siguiente sugerido</span>
        <strong>${escapeHtml(plan[suggestedIndex]?.title || plan[0].title)}</strong>
      </div>
    </div>

    <div class="gym-day-switch" role="tablist" aria-label="Días del plan">
      ${plan.map((day, index) => `
        <button type="button" class="${index === suggestedIndex ? "active" : ""}" data-gym-day="${escapeHtml(day.id)}">
          <span>Día ${index + 1}</span>
          <strong>${escapeHtml(day.focus || day.title)}</strong>
        </button>`).join("")}
    </div>

    <form id="gym-session-form" class="gym-session-form">
      <input type="hidden" id="gym-day-id" value="${escapeHtml(plan[suggestedIndex].id)}">
      <div id="gym-day-detail"></div>
      <div class="gym-session-footer">
        <label>
          <span>Fecha</span>
          <input id="gym-session-date" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
        </label>
        <label class="gym-notes-field">
          <span>Notas del entrenamiento</span>
          <input id="gym-session-notes" type="text" maxlength="1000" placeholder="Sensaciones, molestias, técnica…">
        </label>
        <button class="gym-save-button" type="submit">Guardar entrenamiento</button>
      </div>
      <p id="gym-save-status" class="gym-save-status" role="status"></p>
    </form>

    <section class="gym-progress-section">
      <div class="health-section-heading">
        <div>
          <strong>Progreso por ejercicio</strong>
          <p>Evolución de la carga registrada.</p>
        </div>
      </div>
      <div class="gym-progress-grid">
        ${renderGymProgress(plan, progress)}
      </div>
    </section>

    <section class="gym-history-section">
      <div class="health-section-heading">
        <div>
          <strong>Histórico reciente</strong>
          <p>Últimos entrenamientos guardados.</p>
        </div>
      </div>
      ${renderGymHistory(sessions)}
    </section>`;

  const planById = new Map(plan.map((day) => [day.id, day]));
  const initialDay = plan[suggestedIndex];
  renderGymDay(initialDay, latestByExercise);

  document.querySelectorAll("[data-gym-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const day = planById.get(button.dataset.gymDay);
      if (!day) return;
      document.querySelectorAll("[data-gym-day]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelector("#gym-day-id").value = day.id;
      renderGymDay(day, latestByExercise);
    });
  });

  document.querySelector("#gym-session-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveGymSessionFromForm(planById);
  });

  document.querySelectorAll(".gym-delete-session").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteGymSession(button.dataset.sessionId);
    });
  });
}

function getLatestGymEntries(sessions) {
  const latest = new Map();
  for (const session of sessions) {
    for (const entry of session.entries || []) {
      if (!entry.exerciseId || latest.has(entry.exerciseId)) continue;
      latest.set(entry.exerciseId, entry);
    }
  }
  return latest;
}

function renderGymDay(day, latestByExercise = new Map()) {
  const container = document.querySelector("#gym-day-detail");
  if (!container || !day) return;

  container.innerHTML = `
    <div class="gym-day-heading">
      <div>
        <p class="context-label">${escapeHtml(day.title)}</p>
        <h3>${escapeHtml(day.focus || "")}</h3>
      </div>
      <span>Descanso ${formatRestSeconds(day.restSeconds)}</span>
    </div>
    <div class="gym-exercise-list">
      ${day.exercises.map((exercise) => {
        const hasHistory = latestByExercise.has(exercise.id);
        const latest = latestByExercise.get(exercise.id) || null;
        const inputLoad = hasHistory ? latest?.loadValue : exercise.loadValue;
        const inputUnit = latest?.loadUnit || exercise.loadUnit || "kg";
        const latestLabel = hasHistory
          ? (latest?.loadValue == null ? "Último: sin carga" : `Último: ${formatGymLoad(latest.loadValue, inputUnit)}`)
          : null;
        const repsValue = exercise.repsTarget || "";
        return `
        <article class="gym-exercise-row" data-exercise-id="${escapeHtml(exercise.id)}">
          <div class="gym-exercise-info">
            <strong>${escapeHtml(exercise.name)}</strong>
            <span>${escapeHtml(formatTarget(exercise))}</span>
            ${exercise.loadNote ? `<small>Referencia: ${escapeHtml(exercise.loadNote)}</small>` : ""}
            ${latestLabel ? `<small class="gym-last-record">${escapeHtml(latestLabel)}</small>` : ""}
            ${exercise.coachingNote ? `<p>${escapeHtml(exercise.coachingNote)}</p>` : ""}
          </div>
          <label class="gym-number-field">
            <span>Series</span>
            <input class="gym-input-sets" type="number" min="0" max="20" step="1" value="${exercise.setsTarget ?? ""}">
            <select class="gym-mobile-picker" data-sync-class="gym-input-sets" aria-label="Series">
              ${renderMobilePickerOptions(exercise.setsTarget ?? "", 0, 12, 1, { blankLabel: "—" })}
            </select>
          </label>
          <label class="gym-number-field">
            <span>Reps</span>
            <input class="gym-input-reps" type="text" maxlength="30" value="${escapeHtml(repsValue)}">
            <select class="gym-mobile-picker" data-sync-class="gym-input-reps" aria-label="Repeticiones">
              ${renderMobileRepOptions(repsValue)}
            </select>
          </label>
          <label class="gym-number-field">
            <span>Peso</span>
            <div class="gym-load-input">
              <input class="gym-input-load" type="number" min="0" max="999" step="0.25" value="${inputLoad ?? ""}" placeholder="—">
              <select class="gym-mobile-picker gym-mobile-load-picker" data-sync-class="gym-input-load" aria-label="Peso">
                ${renderMobilePickerOptions(inputLoad ?? "", 0, 200, 0.25, { blankLabel: "Sin carga", unit: inputUnit })}
              </select>
              <small>${escapeHtml(inputUnit)}</small>
            </div>
          </label>
          <label class="gym-exercise-note">
            <span>Nota</span>
            <input class="gym-input-note" type="text" maxlength="500" placeholder="Opcional">
          </label>
        </article>`;
      }).join("")}
    </div>`;

  container.querySelectorAll(".gym-mobile-picker").forEach((select) => {
    select.addEventListener("change", () => {
      const input = select.closest("label")?.querySelector(`.${select.dataset.syncClass}`);
      if (input) input.value = select.value;
    });
  });
}

function renderMobileRepOptions(currentValue) {
  const current = String(currentValue ?? "");
  const options = [];
  if (current && !/^\d+(?:[.,]\d+)?$/.test(current)) {
    options.push(`<option value="${escapeHtml(current)}" selected>${escapeHtml(current)} objetivo</option>`);
  }
  for (let value = 0; value <= 30; value += 1) {
    const stringValue = String(value);
    const selected = current === stringValue ? " selected" : "";
    options.push(`<option value="${stringValue}"${selected}>${stringValue}</option>`);
  }
  return options.join("");
}

function renderMobilePickerOptions(currentValue, min, max, step, options = {}) {
  const current = currentValue === null || currentValue === undefined ? "" : String(currentValue);
  const rows = [];
  if (options.blankLabel) {
    rows.push(`<option value=""${current === "" ? " selected" : ""}>${escapeHtml(options.blankLabel)}</option>`);
  }

  const precision = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  let currentSeen = current === "";
  for (let value = min; value <= max + step / 10; value += step) {
    const rounded = Number(value.toFixed(precision));
    const stringValue = String(rounded);
    if (stringValue === current) currentSeen = true;
    const selected = stringValue === current ? " selected" : "";
    const label = rounded.toLocaleString("es-ES", { maximumFractionDigits: precision });
    rows.push(`<option value="${stringValue}"${selected}>${escapeHtml(label)}${options.unit ? " " + escapeHtml(options.unit) : ""}</option>`);
  }

  if (current && !currentSeen) {
    rows.unshift(`<option value="${escapeHtml(current)}" selected>${escapeHtml(current)}${options.unit ? " " + escapeHtml(options.unit) : ""}</option>`);
  }
  return rows.join("");
}

async function saveGymSessionFromForm(planById) {
  const dayId = document.querySelector("#gym-day-id")?.value;
  const day = planById.get(dayId);
  if (!day) return;

  const status = document.querySelector("#gym-save-status");
  const sessionDate = document.querySelector("#gym-session-date")?.value;
  const notes = document.querySelector("#gym-session-notes")?.value || "";
  const rows = [...document.querySelectorAll(".gym-exercise-row")];

  const entries = rows.map((row) => {
    const exercise = day.exercises.find((item) => item.id === row.dataset.exerciseId);
    return {
      exerciseId: row.dataset.exerciseId,
      exerciseName: exercise?.name || row.dataset.exerciseId,
      setsDone: row.querySelector(".gym-input-sets")?.value || null,
      repsDone: row.querySelector(".gym-input-reps")?.value || "",
      loadValue: row.querySelector(".gym-input-load")?.value || null,
      loadUnit: exercise?.loadUnit || "kg",
      notes: row.querySelector(".gym-input-note")?.value || ""
    };
  });

  if (status) status.textContent = "Guardando…";

  try {
    const response = await fetch("/api/gym/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sessionDate,
        dayId: day.id,
        dayTitle: day.title,
        notes,
        entries
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.code || `GYM_SAVE_${response.status}`);

    if (status) status.textContent = "Entrenamiento guardado ✓";
    const refresh = await fetch("/api/gym", { headers: { Accept: "application/json" } });
    if (refresh.ok) renderGymPanel(await refresh.json());
  } catch (error) {
    if (status) status.textContent = "No se ha podido guardar. Inténtalo de nuevo.";
    console.warn("Gym save failed", error);
  }
}

function renderGymProgress(plan, progress) {
  const exercises = plan.flatMap((day) => day.exercises);
  const cards = exercises
    .map((exercise) => {
      const points = Array.isArray(progress[exercise.id]) ? progress[exercise.id] : [];
      if (!points.length) return null;
      const first = points[0];
      const last = points[points.length - 1];
      const change = Number(last.value) - Number(first.value);
      return `
        <article class="gym-progress-card">
          <strong>${escapeHtml(exercise.name)}</strong>
          <div>
            <span>${formatGymLoad(last.value, last.unit)}</span>
            ${points.length > 1 ? `<small class="${change > 0 ? "positive" : change < 0 ? "negative" : ""}">${change > 0 ? "+" : ""}${change.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${escapeHtml(last.unit || "kg")}</small>` : '<small>Primer registro</small>'}
          </div>
          ${renderGymSparkline(points)}
        </article>`;
    })
    .filter(Boolean);

  return cards.length ? cards.join("") : '<p class="health-empty">Guarda el primer entrenamiento para empezar a ver tu progreso.</p>';
}

function renderGymSparkline(points) {
  if (!points.length) return "";
  const values = points.map((point) => Number(point.value)).filter(Number.isFinite);
  if (!values.length) return "";
  const width = 150;
  const height = 38;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 4 - ((value - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg class="gym-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline points="${coords.join(" ")}"></polyline></svg>`;
}

function renderGymHistory(sessions) {
  if (!sessions.length) return '<p class="health-empty">Todavía no hay entrenamientos guardados.</p>';
  return `
    <div class="gym-history-list">
      ${sessions.slice(0, 12).map((session) => `
        <details>
          <summary>
            <div>
              <strong>${escapeHtml(session.dayTitle || session.dayId)}</strong>
              <span>${escapeHtml(formatGymDate(session.sessionDate))} · ${session.entries.length} ejercicios</span>
            </div>
          </summary>
          <div class="gym-history-entries">
            ${session.entries.map((entry) => `
              <div>
                <strong>${escapeHtml(entry.exerciseName)}</strong>
                <span>${entry.setsDone ?? "—"} series · ${escapeHtml(entry.repsDone || "—")} reps · ${entry.loadValue == null ? "sin peso" : escapeHtml(formatGymLoad(entry.loadValue, entry.loadUnit))}</span>
              </div>`).join("")}
            ${session.notes ? `<p>${escapeHtml(session.notes)}</p>` : ""}
            <div class="gym-history-actions">
              <button type="button" class="gym-delete-session" data-session-id="${escapeHtml(session.id)}">Eliminar registro</button>
            </div>
          </div>
        </details>`).join("")}
    </div>`;
}

async function deleteGymSession(sessionId) {
  if (!sessionId) return;
  const confirmed = window.confirm("¿Eliminar este entrenamiento del histórico? Esta acción también lo quitará de las gráficas de progreso.");
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/gym/session/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.code || `GYM_DELETE_${response.status}`);

    const refresh = await fetch("/api/gym", { headers: { Accept: "application/json" } });
    if (!refresh.ok) throw new Error(`GYM_REFRESH_${refresh.status}`);
    renderGymPanel(await refresh.json());
  } catch (error) {
    window.alert("No se ha podido eliminar el entrenamiento.");
    console.warn("Gym delete failed", error);
  }
}

function formatTarget(exercise) {
  const sets = exercise.setsTarget ?? "—";
  const reps = exercise.repsTarget || "—";
  return `${sets} series × ${reps} repeticiones`;
}

function formatRestSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "según sensaciones";
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} min`;
}

function formatGymLoad(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${unit || "kg"}`;
}

function formatGymDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(date).replace(".", "");
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
  dialog.classList.remove("wealth-dialog", "important-events-dialog", "budget-dialog", "parents-dialog", "electricity-dialog");

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
  dialog.classList.remove("wealth-dialog", "important-events-dialog", "health-dialog", "budget-dialog", "parents-dialog", "electricity-dialog");
  dialog.classList.add("budget-dialog");

  document.querySelector("#dialog-context").textContent = "Finanzas · Presupuesto mensual";
  document.querySelector("#dialog-title").textContent = monthly?.periodLabel || monthly?.period || "Presupuesto actual";

  if (!monthly) {
    document.querySelector("#dialog-body").innerHTML = "<p>No hay presupuesto mensual conectado.</p>";
    dialog.showModal();
    return;
  }

  const currency = monthly.currency || "EUR";
  const categories = Array.isArray(monthly.categories) ? monthly.categories : [];
  const groups = ["Común", "Miguel", "Andrea"];

  const grouped = Object.fromEntries(groups.map((name) => [name, []]));
  for (const item of categories) {
    const ownerRaw = String(item.owner || item.group || "Común").trim().toLowerCase();
    const owner = ownerRaw === "miguel" ? "Miguel"
      : ownerRaw === "andrea" ? "Andrea"
      : "Común";
    grouped[owner].push(item);
  }

  const miguelNet = firstFinite(monthly.miguelNet, monthly.personalNet);
  const andreaNet = firstFinite(monthly.andreaNet);
  const jointNet = firstFinite(monthly.jointNet);

  document.querySelector("#dialog-body").innerHTML = categories.length
    ? `
      <div class="budget-net-strip">
        <div><span>Libre Miguel</span><strong>${miguelNet === null ? "—" : formatMoney(miguelNet, currency)}</strong></div>
        <div><span>Libre Andrea</span><strong>${andreaNet === null ? "—" : formatMoney(andreaNet, currency)}</strong></div>
        <div><span>Libre conjunto</span><strong>${jointNet === null ? "—" : formatMoney(jointNet, currency)}</strong></div>
      </div>
      <p class="budget-net-note">Estos netos personales se muestran aparte y no se mezclan con el presupuesto común.</p>
      <div class="budget-groups">
        ${groups.map((groupName) => renderBudgetGroup(groupName, grouped[groupName], currency)).join("")}
      </div>`
    : "<p>No hay partidas presupuestadas.</p>";
  document.querySelectorAll('[data-open-electricity="true"]').forEach((node) => {
    node.addEventListener("click", () => void openElectricityDetail());
  });
  dialog.showModal();
}

function renderBudgetGroup(name, items, currency) {
  if (!items.length) return "";

  const totals = items.reduce((acc, item) => {
    const budgeted = numberOrZero(item.budgeted);
    const spent = numberOrZero(item.spent);
    const committed = numberOrZero(item.committed);
    const remaining = Number.isFinite(Number(item.remaining))
      ? Number(item.remaining)
      : budgeted - spent - committed;
    acc.budgeted += budgeted;
    acc.spent += spent;
    acc.committed += committed;
    acc.remaining += remaining;
    return acc;
  }, { budgeted: 0, spent: 0, committed: 0, remaining: 0 });

  return `
    <section class="budget-group budget-group-${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">
      <div class="budget-group-heading">
        <div>
          <p class="context-label">${escapeHtml(name)}</p>
          <h3>${name === "Común" ? "Presupuesto compartido" : "Gastos personales"}</h3>
        </div>
        <div class="budget-group-totals">
          <span><b>${formatMoney(totals.budgeted, currency)}</b> presupuesto</span>
          <span><b>${formatMoney(totals.spent, currency)}</b> gastado</span>
          <span><b>${formatMoney(totals.committed, currency)}</b> comprometido</span>
          <span><b>${formatMoney(totals.remaining, currency)}</b> libre</span>
        </div>
      </div>
      <div class="budget-detail-list">
        ${items.map((item) => renderBudgetCategoryDetail(item, currency)).join("")}
      </div>
    </section>`;
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

  const normalizedId = normalizeForMatch(item.id || "");
  const normalizedTitle = normalizeForMatch(item.title || "");
  const isElectricity = normalizedId === "luz"
    || normalizedTitle === "luz"
    || normalizedTitle.includes("electricidad")
    || normalizedId.includes("electric");
  const tag = isElectricity ? "button" : "article";
  const interactiveAttrs = isElectricity
    ? ' type="button" data-open-electricity="true" aria-label="Abrir histórico de electricidad"'
    : "";

  return `
    <${tag} class="budget-category-item ${overBudget ? "over-budget" : ""} ${isElectricity ? "interactive" : ""}"${interactiveAttrs}>
      <div class="budget-category-head">
        <span class="budget-category-title">${escapeHtml(item.title)}${isElectricity ? '<em class="budget-category-drill">Histórico →</em>' : ""}</span>
        <span class="budget-category-head-right">
          ${sourceLabel ? `<em class="budget-source ${sourceStatus === "PROVISIONAL_CHAT" ? "provisional" : ""}">${sourceLabel}</em>` : ""}
          <strong>${itemProgress === null ? "—" : itemProgress + "%"}</strong>
        </span>
      </div>
      <progress class="budget-category-progress"
                max="100"
                value="${itemProgressValue}"
                aria-label="${escapeHtml(item.title)}: ${itemProgress === null ? "sin porcentaje" : itemProgress + "% gastado"}">${itemProgressValue}</progress>
      <div class="budget-category-metrics">
        <span><small>Presupuesto</small><strong>${formatMoney(itemBudget, currency)}</strong></span>
        <span><small>Gastado</small><strong>${formatMoney(itemSpent, currency)}</strong></span>
        <span><small>Comprometido</small><strong>${formatMoney(itemCommitted, currency)}</strong></span>
        <span><small>Libre</small><strong>${formatMoney(itemRemaining, currency)}</strong></span>
      </div>
      ${item.note ? `<p class="budget-category-note">${escapeHtml(item.note)}</p>` : ""}
    </${tag}>`;
}

async function openElectricityDetail() {
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "important-events-dialog", "health-dialog", "parents-dialog", "electricity-dialog");
  dialog.classList.add("budget-dialog", "electricity-dialog");
  document.querySelector("#dialog-context").textContent = "Finanzas · Presupuesto mensual · Luz";
  document.querySelector("#dialog-title").textContent = "Electricidad";
  document.querySelector("#dialog-body").innerHTML = '<p class="electricity-empty">Cargando histórico privado…</p>';
  if (!dialog.open) dialog.showModal();

  try {
    const response = await fetch("/api/finance/electricity", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("ELECTRICITY_HISTORY_" + response.status);
    const payload = await response.json();
    renderElectricityDetail(payload.electricity);
  } catch (error) {
    console.warn("Electricity detail load failed", error);
    document.querySelector("#dialog-body").innerHTML = `
      <button class="electricity-back" type="button" data-electricity-back="true">← Presupuesto mensual</button>
      <div class="electricity-empty electricity-empty-card">
        <strong>Histórico de Luz no disponible</strong>
        <p>La vista depende de la capa privada derivada LuzHistorico.</p>
      </div>`;
    document.querySelector("[data-electricity-back]")?.addEventListener("click", openBudgetDetail);
  }
}

function renderElectricityDetail(data) {
  const root = document.querySelector("#dialog-body");
  if (!root) return;
  if (!data || !Array.isArray(data.history) || !data.history.length) {
    root.innerHTML = `
      <button class="electricity-back" type="button" data-electricity-back="true">← Presupuesto mensual</button>
      <div class="electricity-empty electricity-empty-card">
        <strong>Sin histórico disponible</strong>
        <p>Cuando LuzHistorico reciba filas, aparecerán aquí automáticamente.</p>
      </div>`;
    root.querySelector("[data-electricity-back]")?.addEventListener("click", openBudgetDetail);
    return;
  }

  const currency = data.currency || "EUR";
  const history = data.history;
  const latest = data.latest || history[history.length - 1] || {};
  const budget = data.budget || {};
  const summary = data.summary || {};
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];

  const period = [formatElectricityDate(latest.periodStart), formatElectricityDate(latest.periodEnd)]
    .filter(Boolean)
    .join(" → ") || "Periodo no informado";

  root.innerHTML = `
    <button class="electricity-back" type="button" data-electricity-back="true">← Presupuesto mensual</button>

    <section class="electricity-summary-grid">
      ${electricityMetric("Media 12 meses", summary.average12Amount, "money", currency)}
      ${electricityMetric("Máximo histórico", summary.maxHistoricalAmount, "money", currency)}
      ${electricityMetric("Última factura", summary.latestAmount, "money", currency)}
      ${electricityMetric("Variación interanual", summary.latestYearOverYearAmountPct, "percent", currency)}
    </section>

    <section class="electricity-current-grid">
      <article>
        <span>Última factura</span>
        <strong>${latest.amount === null || latest.amount === undefined ? "—" : formatMoney(latest.amount, currency)}</strong>
        <small>${escapeHtml(period)}</small>
      </article>
      <article>
        <span>Consumo</span>
        <strong>${formatElectricityNumber(latest.consumptionKwh, 1, " kWh")}</strong>
        <small>${formatElectricityNumber(latest.kwhPerDay, 2, " kWh/día")}</small>
      </article>
      <article>
        <span>Coste diario</span>
        <strong>${formatElectricityNumber(latest.eurPerDay, 2, " €/día")}</strong>
        <small>${latest.days ? escapeHtml(String(latest.days)) + " días facturados" : "Duración no informada"}</small>
      </article>
      <article>
        <span>Cobro previsto</span>
        <strong>${escapeHtml(formatElectricityDate(latest.chargeDate) || "Sin fecha")}</strong>
        <small>${latest.invoiceDate ? "Factura " + escapeHtml(formatElectricityDate(latest.invoiceDate)) : "Fecha de factura no informada"}</small>
      </article>
    </section>

    <section class="electricity-budget-panel">
      <header><strong>Ciclo actual · Luz</strong><span>Fuente financiera oficial</span></header>
      <div>
        ${electricityMetric("Presupuesto", budget.budgeted, "money", currency)}
        ${electricityMetric("Gastado", budget.spent, "money", currency)}
        ${electricityMetric("Comprometido", budget.committed, "money", currency)}
        ${electricityMetric("Saldo restante", budget.remaining, "money", currency)}
      </div>
    </section>

    ${alerts.length ? `
      <section class="electricity-alerts">
        <header><strong>Alertas</strong><span>${alerts.length}</span></header>
        ${alerts.map((alert) => `
          <article class="electricity-alert electricity-alert-${escapeHtml(alert.type || "source")}">
            <span>${escapeHtml(alert.type === "tariff" ? "Tarifa" : alert.type === "consumption" ? "Consumo" : alert.type === "price" ? "Precio" : "Aviso")}</span>
            <p>${escapeHtml(alert.message || "")}</p>
            <time>${escapeHtml(formatElectricityDate(alert.date) || "")}</time>
          </article>`).join("")}
      </section>` : ""}

    <section class="electricity-charts-grid">
      <article class="electricity-chart-card">
        <header><strong>Consumo mensual</strong><span>kWh</span></header>
        ${renderElectricityChart(history, "consumptionKwh", "kWh")}
      </article>
      <article class="electricity-chart-card">
        <header><strong>Importe mensual</strong><span>€</span></header>
        ${renderElectricityChart(history, "amount", "€")}
      </article>
    </section>

    <section class="electricity-history-section">
      <header><strong>Histórico</strong><span>${history.length} facturas / periodos</span></header>
      <div class="electricity-history-list">
        ${[...history].reverse().map((item) => `
          <article>
            <div>
              <strong>${escapeHtml(formatElectricityMonth(item.periodEnd || item.invoiceDate || item.periodStart) || "Periodo")}</strong>
              <small>${escapeHtml([formatElectricityDate(item.periodStart), formatElectricityDate(item.periodEnd)].filter(Boolean).join(" → "))}</small>
            </div>
            <span><b>${item.amount === null ? "—" : formatMoney(item.amount, currency)}</b><small>${formatElectricityNumber(item.eurPerDay, 2, " €/día")}</small></span>
            <span><b>${formatElectricityNumber(item.consumptionKwh, 1, " kWh")}</b><small>${formatElectricityNumber(item.kwhPerDay, 2, " kWh/día")}</small></span>
            <span>
              <b>${formatElectricityVariation(item.yearOverYear?.amountPct)}</b>
              <small>€ vs mismo periodo año anterior</small>
            </span>
            <span>
              <b>${formatElectricityVariation(item.yearOverYear?.consumptionPct)}</b>
              <small>kWh vs mismo periodo año anterior</small>
            </span>
          </article>`).join("")}
      </div>
    </section>

    <p class="electricity-source-note">LuzHistorico es una capa privada derivada. Los PDFs y datos contractuales originales permanecen fuera de la interfaz.</p>
  `;

  root.querySelector("[data-electricity-back]")?.addEventListener("click", openBudgetDetail);
}

function electricityMetric(label, value, type = "number", currency = "EUR") {
  const rendered = value === null || value === undefined || !Number.isFinite(Number(value))
    ? "—"
    : type === "money"
      ? formatMoney(Number(value), currency)
      : type === "percent"
        ? formatElectricityVariation(Number(value))
        : Number(value).toLocaleString("es-ES");
  return `<article class="electricity-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(rendered)}</strong></article>`;
}

function renderElectricityChart(history, field, unit) {
  const rows = (history || [])
    .map((item) => ({
      date: item.periodEnd || item.invoiceDate || item.periodStart || "",
      value: Number(item[field])
    }))
    .filter((item) => item.date && Number.isFinite(item.value));

  if (!rows.length) return '<p class="electricity-empty">Sin datos suficientes.</p>';

  const width = 620;
  const height = 190;
  const padX = 18;
  const padY = 16;
  const values = rows.map((item) => item.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const points = rows.map((item, index) => {
    const x = rows.length === 1 ? width / 2 : padX + (index / (rows.length - 1)) * (width - padX * 2);
    const y = height - padY - ((item.value - min) / span) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = rows[rows.length - 1];

  return `
    <svg class="electricity-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución mensual en ${escapeHtml(unit)}">
      <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}"></line>
      <polyline points="${points}"></polyline>
    </svg>
    <footer>
      <span>${escapeHtml(formatElectricityMonth(rows[0].date))}</span>
      <strong>${last.value.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${escapeHtml(unit)}</strong>
      <span>${escapeHtml(formatElectricityMonth(last.date))}</span>
    </footer>`;
}

function formatElectricityNumber(value, digits = 1, suffix = "") {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: digits }) + suffix
    : "—";
}

function formatElectricityVariation(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return (number > 0 ? "+" : "") + number.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + "%";
}

function formatElectricityDate(value) {
  if (!value) return "";
  const date = new Date(String(value).slice(0, 10) + "T12:00:00");
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatElectricityMonth(value) {
  if (!value) return "";
  const date = new Date(String(value).slice(0, 10) + "T12:00:00");
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(date).replace(".", "");
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

function bindInteractions() {
  const dialog = document.querySelector("#detail-dialog");
  document.querySelector("#show-budget-detail")?.addEventListener("click", openBudgetDetail);
  document.querySelector("#show-debt-detail")?.addEventListener("click", openDebtDetail);
  document.querySelector("#show-wealth-detail")?.addEventListener("click", openWealthDetail);
  document.querySelector("#home-habits-card")?.addEventListener("click", () => openHabitsDetail(localDateKey()));
  document.querySelector("#home-nutrition-card")?.addEventListener("click", async () => {
    await openHealthDetail();
    document.querySelector('[data-health-tab="nutrition"]')?.click();
  });
  document.querySelector("#home-pantry-card")?.addEventListener("click", openPantryDetail);
  document.querySelector("#home-objects-card")?.addEventListener("click", openObjectsDetail);
  document.querySelector("#theme-toggle")?.addEventListener("click", toggleTheme);
  document.querySelector("#demo-mode-toggle")?.addEventListener("click", toggleDemoMode);
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  document.querySelector("#ask-form").addEventListener("submit", handleQuery);
  document.querySelectorAll("[data-quick-query]").forEach((button) => button.addEventListener("click", () => {
    const input = document.querySelector("#ask-input");
    if (!input) return;
    input.value = button.dataset.quickQuery || "";
    document.querySelector("#ask-form")?.requestSubmit();
  }));
  const menuButton = document.querySelector("#menu-button");
  menuButton.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll("[data-nav-area-id]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    document.body.classList.remove("nav-open");
    menuButton.setAttribute("aria-expanded", "false");
    document.querySelectorAll("[data-nav-area-id]").forEach((node) => node.classList.toggle("active", node === link));
    openNavigationArea(link.dataset.navAreaId);
  }));
}

function openNavigationArea(areaId) {
  if (areaId === "area-general") {
    document.querySelector("#overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  openArea(areaId);
}

function openArea(areaId) {
  if (areaId === "area-finance") {
    openBudgetDetail();
    return;
  }
  if (areaId === "area-calendar") {
    document.querySelector("#agenda-overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (areaId === "area-wealth") {
    openWealthDetail();
    return;
  }
  if (areaId === "area-health") {
    openHealthDetail();
    return;
  }
  if (areaId === "area-habits") {
    openHabitsDetail();
    return;
  }
  if (areaId === "area-pantry") {
    openPantryDetail();
    return;
  }
  if (areaId === "area-objects") {
    openObjectsDetail();
    return;
  }
  if (areaId === "area-parents") {
    openParentsDetail();
    return;
  }
  if (areaId === "area-projects" && privateModeKind === "remote") {
    openProjectsDetail(state.decisions);
    return;
  }
  const area = areaById.get(areaId);
  if (!area) return;
  const relatedLoops = (Array.isArray(state.openLoops) ? state.openLoops : []).filter((item) => item.areaId === areaId);
  const relatedProjects = (Array.isArray(state.projects) ? state.projects : []).filter((item) => item.areaId === areaId);
  const relatedGoals = (Array.isArray(state.goals) ? state.goals : []).filter((item) => item.areaId === areaId && item.status !== "archived");
  const relatedDecisions = (Array.isArray(state.decisions) ? state.decisions : [])
    .filter((item) => item.areaId === areaId && item.status === "open");
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "health-dialog", "habits-dialog", "important-events-dialog", "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog", "objects-dialog", "projects-dialog");
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
    ...relatedDecisions.map((item) => ({
      title: `Decisión · ${item.title}`,
      detail: [
        item.question,
        Array.isArray(item.options) && item.options.length ? `Opciones: ${item.options.join(" / ")}` : null,
        item.nextAction && `Siguiente: ${item.nextAction}`,
        (item.dueDate || item.dueAt) && `Fecha: ${String(item.dueDate || item.dueAt).slice(0, 10)}`
      ].filter(Boolean).join(" · "),
    })),
    ...relatedGoals.map((item) => ({
      title: `Objetivo · ${item.title}`,
      detail: [item.horizon, item.metric && item.target && `${item.metric}: ${item.target}`].filter(Boolean).join(" · "),
    })),
  ];
  document.querySelector("#dialog-body").innerHTML = entries.length
    ? `<ul class="dialog-list">${entries.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></li>`).join("")}</ul>`
    : `<p>No hay asuntos asociados a esta área.</p>`;
  dialog.showModal();
}

function showSystemPulse() {
  setSystemOrbState("solving");
  const result = document.querySelector("#query-result");
  const generalHealth = Number(state.areas.find((area) => area.id === "area-general")?.health ?? 0);
  const openLoops = Array.isArray(state.openLoops) ? state.openLoops.length : 0;
  const openDecisions = Array.isArray(state.decisions)
    ? state.decisions.filter((decision) => decision.status === "open").length
    : 0;
  const habits = state.habitsSummary?.summary || {};
  const habitTotal = Number(habits.total || 0);
  const habitDone = Number(habits.done || 0);
  const streak = Number(habits.streak || 0);
  const monthly = state.financeSummary?.monthlyBudget || {};
  const categories = Array.isArray(monthly.categories) ? monthly.categories : [];
  const spent = categories.reduce((sum, item) => sum + numberOrZero(item.spent), 0);
  const planned = Number(monthly.plannedOutflows);
  const financeText = Number.isFinite(planned) && planned > 0
    ? `Finanzas: ${Math.round((spent / planned) * 100)}% del flujo previsto ejecutado.`
    : "Finanzas: sin porcentaje consolidado.";

  window.setTimeout(() => {
    result.hidden = false;
    result.innerHTML = `
      <div class="orb-pulse-summary">
        <strong>Pulso ${generalHealth}/100</strong>
        <span>Hábitos: ${habitTotal ? `${habitDone}/${habitTotal} hoy · racha ${streak} días` : "sin datos"}.</span>
        <span>${openLoops} asuntos abiertos · ${openDecisions} decisiones pendientes.</span>
        <span>${escapeHtml(financeText)}</span>
      </div>`;
    setSystemOrbState("responding", 1400);
  }, 180);
}

async function handleQuery(event) {
  event.preventDefault();
  const input = document.querySelector("#ask-input");
  const result = document.querySelector("#query-result");
  const rawQuery = input.value.trim();
  const query = rawQuery.toLocaleLowerCase("es");

  if (!query) {
    setSystemOrbState("idle");
    result.hidden = false;
    result.innerHTML = "Escribe una consulta o una orden corta, por ejemplo «qué tengo hoy», «abre despensa» o «ver presupuesto».";
    return;
  }

  setSystemOrbState("searching");
  if (await handleQuickCommand(query, result)) {
    setSystemOrbState("responding", 900);
    return;
  }

  const habitEntities = Array.isArray(state.habitsSummary?.habits) ? state.habitsSummary.habits : [];
  const entities = [...state.areas, ...state.projects, ...state.openLoops, ...state.goals, ...state.decisions, ...state.events, ...habitEntities];
  const terms = query.split(/\s+/).filter((term) => term.length > 2);
  const matches = entities.filter((entity) => {
    const haystack = JSON.stringify(entity).toLocaleLowerCase("es");
    return terms.some((term) => haystack.includes(term));
  }).slice(0, 3);

  window.setTimeout(() => {
    result.hidden = false;
    result.innerHTML = matches.length
      ? `<strong>He encontrado ${matches.length} coincidencia${matches.length === 1 ? "" : "s"}:</strong> ${matches.map((item) => escapeHtml(item.title || item.name || "Resultado")).join(" · ")}`
      : "No encuentro una coincidencia directa. Esta barra sirve para consultas rápidas y navegación; las conversaciones de los gestores siguen siendo la interfaz para tareas complejas.";
    setSystemOrbState("responding", 1400);
  }, 120);
}

async function handleQuickCommand(query, result) {
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const openResult = (message) => {
    result.hidden = false;
    result.innerHTML = message;
  };

  if (/\b(despensa)\b/.test(normalized)) {
    openPantryDetail();
    openResult("<strong>Despensa abierta.</strong> Ahí puedes consultar stock, precios y lista de compra.");
    return true;
  }

  if (/\b(objetos|armario|looks|kits)\b/.test(normalized)) {
    openObjectsDetail();
    openResult("<strong>Objetos abierto.</strong> Incluye inventario, armario, looks, kits y listas.");
    return true;
  }

  if (/\b(adherencia|cumplimiento|racha salud)\b/.test(normalized)) {
    openHealthDetail();
    document.querySelector('[data-health-tab="adherence"]')?.click();
    openResult("<strong>Adherencia abierta.</strong> Ahí puedes revisar el mes y el motivo de cada día.");
    return true;
  }

  if (/\b(nutricion|nutri|calorias|macros)\b/.test(normalized)) {
    await openHealthDetail();
    document.querySelector('[data-health-tab="nutrition"]')?.click();
    openResult("<strong>Nutrición abierta.</strong> Puedes revisar el balance y el plan del día.");
    return true;
  }

  if (/\b(habitos|habito)\b/.test(normalized)) {
    openHabitsDetail(localDateKey());
    openResult("<strong>Hábitos abierto.</strong>");
    return true;
  }

  if (/\b(presupuesto|finanzas|gastos)\b/.test(normalized)) {
    openBudgetDetail();
    openResult("<strong>Presupuesto abierto.</strong>");
    return true;
  }

  if (/\b(patrimonio)\b/.test(normalized)) {
    openWealthDetail();
    openResult("<strong>Patrimonio abierto.</strong>");
    return true;
  }

  if (/\b(padres)\b/.test(normalized)) {
    openParentsDetail();
    openResult("<strong>Padres abierto.</strong>");
    return true;
  }

  if (/\b(proyectos|proyecto)\b/.test(normalized)) {
    if (privateModeKind === "remote") openProjectsDetail(state.decisions);
    else openArea("area-projects");
    openResult("<strong>Proyectos abierto.</strong> Ahí tienes estado, documentación, repositorios y relaciones.");
    return true;
  }

  if (/\b(agenda|calendario|semana)\b/.test(normalized)) {
    document.querySelector("#agenda-overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    openResult("<strong>Agenda localizada.</strong> Te he llevado al calendario de la semana.");
    return true;
  }

  if (/\b(que tengo hoy|hoy que tengo|agenda de hoy|plan de hoy)\b/.test(normalized)) {
    const today = localDateKey();
    const events = (Array.isArray(state.events) ? state.events : [])
      .filter((item) => String(item.startsAt || item.date || "").slice(0, 10) === today)
      .sort((a, b) => String(a.startsAt || "").localeCompare(String(b.startsAt || "")));
    const habits = state.habitsSummary?.summary || {};
    const habitTotal = Number(habits.total || 0);
    const habitDone = Number(habits.done || 0);
    const eventText = events.length
      ? events.slice(0, 4).map((item) => escapeHtml(item.title || "Evento")).join(" · ")
      : "sin eventos registrados";
    const habitText = habitTotal ? ` · Hábitos ${habitDone}/${habitTotal}` : "";
    openResult(`<strong>Hoy:</strong> ${eventText}${habitText}.`);
    return true;
  }

  return false;
}

let systemOrbResetTimer = null;

function setSystemOrbState(nextState, resetAfterMs = 0) {
  const orb = document.querySelector("#system-orb");
  if (!orb) return;
  if (systemOrbResetTimer) {
    window.clearTimeout(systemOrbResetTimer);
    systemOrbResetTimer = null;
  }
  orb.setAttribute("state", nextState);
  if (resetAfterMs > 0) {
    systemOrbResetTimer = window.setTimeout(() => {
      orb.setAttribute("state", "idle");
      systemOrbResetTimer = null;
    }, resetAfterMs);
  }
}

function priorityRank(priority) { return { low: 1, medium: 2, high: 3 }[priority] || 0; }
function sensitivityLabel(value) { return value.replace("_", " "); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

init();
