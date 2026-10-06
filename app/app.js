import "./vendor/thinking-orbs/register.js";
import { mockState } from "../core/mock-state.js";
import { initDemoMode, toggleDemoMode } from "./demo-mode.js?v=0.25.0";
import { openPantryDetail, pantryAreaFromState, renderHomePantryCard } from "./pantry.js?v=0.42.21";
import { openObjectsDetail, objectsAreaFromState, renderHomeObjectsCard } from "./objects.js?v=0.41.8";
import { openProjectsDetail } from "./projects.js?v=0.37.2";
import { loadHealthAdherence } from "./adherence.js?v=0.33.8";
import { progressRingMarkup, updateProgressRing } from "./progress-ring.js?v=0.33.8";
import { renderMidasVisualLab } from "./midas-lab.js?v=0.40.18";

let state = mockState;
let areaById = new Map();
let privateMode = false;
let privateModeKind = null;
let remoteStateLoadError = null;
let eventsWorkspacePayload = null;
let eventsWorkspaceTab = "active";

function eventsAreaFromStateFallback(currentState, mode) {
  if (mode !== "remote") return null;
  const summary = currentState?.eventsSummary || {};
  const active = Number(summary.activeCount || 0);
  const inProgress = Number(summary.inProgressCount || 0);
  const history = Number(summary.historyCount || 0);
  return {
    id: "area-events",
    slug: "events",
    title: "Eventos",
    shortTitle: "Eventos",
    summary: inProgress
      ? `${inProgress} en curso · ${active} activos · ${history} históricos.`
      : `${active} próximos · ${history} históricos.`,
    health: 85,
    tone: "blue",
    module: "Events",
    sensitivity: "confidencial",
    status: inProgress ? "attention" : "steady"
  };
}

function eventStatusLabel(status) {
  const labels = {
    PROPUESTO: "Propuesto",
    PENDIENTE: "Pendiente",
    CONFIRMADO: "Confirmado",
    EN_CURSO: "En curso",
    CERRADO: "Cerrado",
    CANCELADO: "Cancelado"
  };
  return labels[String(status || "").toUpperCase()] || String(status || "Confirmado");
}

function eventKindLabel(kind) {
  const labels = {
    travel: "Viaje",
    social: "Evento",
    birthday: "Cumpleaños",
    medical: "Cita",
    important: "Importante"
  };
  return labels[String(kind || "").toLowerCase()] || "Evento";
}

function eventDateLabel(value, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", withTime
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" }
  ).format(date).replace(".", "");
}

function prepareEventsDialog(className) {
  const dialog = document.querySelector("#detail-dialog");
  if (!dialog) return null;
  dialog.classList.remove(
    "wealth-dialog", "health-dialog", "habits-dialog", "important-events-dialog",
    "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog",
    "objects-dialog", "projects-dialog", "events-workspace-dialog", "event-detail-dialog"
  );
  if (className) dialog.classList.add(className);
  return dialog;
}

async function fetchEventsInline() {
  const response = await fetch("/api/events?scope=all", {
    headers: { Accept: "application/json" },
    cache: "no-store",
    credentials: "same-origin"
  });
  if (!response.ok) throw new Error("EVENTS_" + response.status);
  return response.json();
}

function isBirthdayReminderOnly(value) {
  const text = normalizeForMatch(value);
  const isBirthday = /cumple|cumpleanos|birthday/.test(text);
  const hasConcretePlan = /cena|comida|fiesta|quedada|merienda|copas|celebracion|reserva|restaurante|bar|casa de|en casa/.test(text);
  return isBirthday && !hasConcretePlan;
}

function collectLiveCalendarEventsForWorkspace() {
  const finance = state.financeSummary || {};
  const rules = Array.isArray(state.importantEventRules)
    ? state.importantEventRules
    : Array.isArray(finance.importantEventRules)
      ? finance.importantEventRules
      : [];

  return (Array.isArray(state.events) ? state.events : [])
    .filter((event) => !isBirthdayReminderOnly([event.title, event.location || event.locationRef].filter(Boolean).join(" ")))
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
      const inferredKind = inferImportantKind([event.title, event.location || event.locationRef].filter(Boolean).join(" "));
      if (!rule && inferredKind === "important") return null;
      return {
        id: event.id || [event.calendarName, event.title, event.startsAt].join("|"),
        title: rule?.displayTitle || safeDisplayEventTitle(event.title),
        kind: rule?.kind || inferredKind,
        status: eventStatusFromDates(event.startsAt, event.endsAt, event.status),
        startsAt: event.startsAt,
        endsAt: event.endsAt || event.startsAt,
        location: event.location || event.locationRef || null,
        calendarRef: event.id || null,
        financeRef: null,
        objectsListRef: null,
        summary: rule?.note || null,
        finalSummary: null,
        sensitivity: event.sensitivity || "confidencial",
        source: "calendar-live"
      };
    })
    .filter(Boolean);
}

function mergeLiveEventsIntoPayload(payload) {
  const persisted = Array.isArray(payload?.events) ? payload.events : [];
  const live = collectLiveCalendarEventsForWorkspace();
  const byId = new Map(persisted.map((item) => [String(item.id), item]));
  for (const item of live) {
    const key = String(item.id);
    const existing = byId.get(key);
    byId.set(key, existing ? { ...existing, ...item, status: item.status } : item);
  }
  return {
    ...(payload || {}),
    events: [...byId.values()].sort((a, b) => new Date(a.startsAt || 0) - new Date(b.startsAt || 0))
  };
}

function renderEventsWorkspaceInline() {
  const body = document.querySelector("#dialog-body");
  if (!body || !eventsWorkspacePayload) return;
  const all = (Array.isArray(eventsWorkspacePayload.events) ? eventsWorkspacePayload.events : [])
    .filter((item) => !isBirthdayReminderOnly([item.title, item.location].filter(Boolean).join(" ")));
  const active = all.filter((item) => !["CERRADO", "CANCELADO"].includes(item.status));
  const history = all.filter((item) => ["CERRADO", "CANCELADO"].includes(item.status));
  const selected = eventsWorkspaceTab === "history" ? history : active;

  body.innerHTML = `
    <div class="events-workspace">
      <div class="events-workspace-summary">
        <article><span>Activos</span><strong>${active.length}</strong></article>
        <article><span>En curso</span><strong>${active.filter((item) => item.status === "EN_CURSO").length}</strong></article>
        <article><span>Histórico</span><strong>${history.length}</strong></article>
      </div>
      <div class="events-tabs" role="tablist" aria-label="Eventos">
        <button type="button" data-events-inline-tab="active" class="${eventsWorkspaceTab === "active" ? "active" : ""}">Próximos y en curso</button>
        <button type="button" data-events-inline-tab="history" class="${eventsWorkspaceTab === "history" ? "active" : ""}">Histórico</button>
      </div>
      <div class="events-record-list">
        ${selected.length ? selected.map((item) => {
          const start = eventDateLabel(item.startsAt);
          const end = item.endsAt ? eventDateLabel(item.endsAt) : null;
          const range = end && end !== start ? start + " → " + end : start;
          return `
            <button type="button" class="events-record-card status-${escapeHtml(String(item.status || "").toLowerCase())}" data-event-inline-id="${escapeHtml(item.id)}">
              <span class="events-record-kind">${escapeHtml(eventKindLabel(item.kind))}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <span class="events-record-status">${escapeHtml(eventStatusLabel(item.status))}</span>
              <p>${escapeHtml(range)}${item.location ? " · " + escapeHtml(item.location) : ""}</p>
              ${item.summary ? "<small>" + escapeHtml(item.summary) + "</small>" : ""}
            </button>`;
        }).join("") : ('<div class="events-empty"><strong>Sin eventos en esta vista</strong><p>' + (eventsWorkspaceTab === "history" ? "Todavía no hay eventos cerrados guardados desde que activamos el histórico." : "No hay eventos activos que mostrar.") + '</p></div>')}
      </div>
    </div>`;

  body.querySelectorAll("[data-events-inline-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      eventsWorkspaceTab = button.dataset.eventsInlineTab === "history" ? "history" : "active";
      renderEventsWorkspaceInline();
    });
  });

  body.querySelectorAll("[data-event-inline-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = all.find((candidate) => candidate.id === button.dataset.eventInlineId) || null;
      void openEventDetailInline(button.dataset.eventInlineId, item);
    });
  });
}

async function openEventsWorkspaceInline(initialTab = "active") {
  const dialog = prepareEventsDialog("events-workspace-dialog");
  if (!dialog) return;
  eventsWorkspaceTab = initialTab === "history" ? "history" : "active";
  document.querySelector("#dialog-context").textContent = "Eventos · privado";
  document.querySelector("#dialog-title").textContent = "Eventos";
  document.querySelector("#dialog-body").innerHTML = '<p class="events-loading">Cargando eventos…</p>';
  if (!dialog.open) dialog.showModal();

  if (privateModeKind !== "remote") {
    document.querySelector("#dialog-body").innerHTML = '<div class="events-empty"><strong>Histórico disponible en modo privado remoto</strong></div>';
    return;
  }

  try {
    eventsWorkspacePayload = mergeLiveEventsIntoPayload(await fetchEventsInline());
    renderEventsWorkspaceInline();
  } catch (error) {
    console.warn("Events workspace load failed", error);
    document.querySelector("#dialog-body").innerHTML =
      '<div class="events-empty"><strong>No se ha podido cargar el histórico</strong><p>El panel principal sigue operativo.</p></div>';
  }
}

function findEventFinanceInline(event) {
  const finance = state.financeSummary || {};
  const commitments = Array.isArray(finance.upcomingCommitments) ? finance.upcomingCommitments : [];
  if (event?.financeRef) {
    const byId = commitments.find((item) => item.id === event.financeRef);
    if (byId) return byId;
  }
  const title = normalizeForMatch(event?.title || "");
  return commitments.find((item) => {
    const candidate = normalizeForMatch(item?.title || "");
    return candidate === title
      || (title.length >= 5 && candidate.includes(title))
      || (candidate.length >= 5 && title.includes(candidate));
  }) || null;
}

async function hydrateEventNutritionInline(event) {
  const panel = document.querySelector("#event-inline-nutrition");
  if (!panel || !event?.startsAt) return;
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt || event.startsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    panel.innerHTML = '<p class="events-muted">Sin fechas válidas.</p>';
    return;
  }
  const dates = [];
  const current = new Date(start);
  current.setHours(12, 0, 0, 0);
  const last = new Date(end);
  last.setHours(12, 0, 0, 0);
  while (current <= last && dates.length < 14) {
    dates.push(localDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  try {
    const results = await Promise.all(dates.map(async (date) => {
      const response = await fetch("/api/nutrition?date=" + encodeURIComponent(date), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) return null;
      return { date, value: await response.json() };
    }));
    const valid = results.filter(Boolean);
    panel.innerHTML = valid.length
      ? '<div class="event-nutrition-days">' + valid.map(({ date, value }) => {
          const consumed = value?.summary?.consumed || {};
          const kcal = Number.isFinite(Number(consumed.kcal)) ? Math.round(Number(consumed.kcal)) + " kcal" : "Sin kcal";
          const protein = Number.isFinite(Number(consumed.protein)) ? Math.round(Number(consumed.protein)) + " g proteína" : "Proteína sin dato";
          return '<article><strong>' + escapeHtml(eventDateLabel(date + "T12:00:00")) + '</strong><span>' + escapeHtml(kcal) + '</span><small>' + escapeHtml(protein) + '</small></article>';
        }).join("") + '</div>'
      : '<p class="events-muted">Sin datos nutricionales asociados.</p>';
  } catch (error) {
    console.warn("Event nutrition load failed", error);
    panel.innerHTML = '<p class="events-muted">Nutrición no disponible.</p>';
  }
}

async function hydrateEventObjectsInline(event) {
  const panel = document.querySelector("#event-inline-objects");
  if (!panel) return;
  try {
    const response = await fetch("/api/objects", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("OBJECTS_" + response.status);
    const data = await response.json();
    const lists = Array.isArray(data.lists) ? data.lists : [];
    const eventTitle = normalizeForMatch(event?.title || "");
    const match = lists.find((item) => event?.objectsListRef && item.id === event.objectsListRef)
      || lists.find((item) => {
        const ref = normalizeForMatch(item?.eventRef || "");
        return ref && eventTitle && (ref.includes(eventTitle) || eventTitle.includes(ref));
      })
      || lists.find((item) => String(item?.startDate || "") === String(event?.startsAt || "").slice(0, 10));

    if (!match) {
      panel.innerHTML = '<p class="events-muted">No hay una lista de Objetos vinculada.</p>';
      return;
    }
    const items = Array.isArray(match.items) ? match.items : [];
    const prepared = items.filter((item) => item.state === "PREPARADO").length;
    panel.innerHTML = '<div class="event-objects-head"><div><strong>' + escapeHtml(match.name || "Lista de equipaje") + '</strong><span>' + prepared + '/' + items.length + ' preparados</span></div></div>'
      + '<div class="event-objects-items">'
      + (items.length
        ? items.map((item) => '<span class="state-' + escapeHtml(String(item.state || "").toLowerCase()) + '"><i></i>' + escapeHtml(item.name || "Necesidad") + '<small>' + escapeHtml(item.state || "") + '</small></span>').join("")
        : '<p class="events-muted">Lista sin items.</p>')
      + '</div>';
  } catch (error) {
    console.warn("Event objects load failed", error);
    panel.innerHTML = '<p class="events-muted">Objetos no disponible.</p>';
  }
}

function renderEventDetailInline(payload) {
  const event = payload.event;
  const facts = Array.isArray(payload.facts) ? payload.facts : [];
  const references = Array.isArray(payload.references) ? payload.references : [];
  const finance = findEventFinanceInline(event);
  const currency = finance?.currency || "EUR";
  const total = firstFinite(finance?.totalBudget);
  const reserved = firstFinite(finance?.reserved);
  const needed = firstFinite(finance?.needed);
  const body = document.querySelector("#dialog-body");

  document.querySelector("#dialog-context").textContent = eventKindLabel(event.kind) + " · " + eventStatusLabel(event.status);
  document.querySelector("#dialog-title").textContent = event.title;
  body.innerHTML = `
    <div class="event-detail">
      <button type="button" class="events-back" data-events-inline-back="true">← Volver a Eventos</button>
      <section class="event-detail-hero">
        <div>
          <span class="event-detail-status status-${escapeHtml(String(event.status || "").toLowerCase())}">${escapeHtml(eventStatusLabel(event.status))}</span>
          <p>${escapeHtml(eventDateLabel(event.startsAt))}${event.endsAt ? " → " + escapeHtml(eventDateLabel(event.endsAt)) : ""}</p>
          ${event.location ? "<p>" + escapeHtml(event.location) + "</p>" : ""}
          ${event.summary ? '<p class="event-detail-summary">' + escapeHtml(event.summary) + '</p>' : ""}
        </div>
      </section>
      <section class="event-detail-section">
        <div class="event-detail-section-head"><strong>Finanzas</strong><span>Fuente canónica Finanzas</span></div>
        ${finance ? `
          <div class="event-finance-grid">
            <article><span>Importe asociado</span><strong>${total === null ? "—" : formatMoney(total, currency)}</strong></article>
            <article><span>Reservado</span><strong>${reserved === null ? "—" : formatMoney(reserved, currency)}</strong></article>
            <article><span>Pendiente</span><strong>${needed === null ? "—" : formatMoney(needed, currency)}</strong></article>
            <article><span>Estado</span><strong>${escapeHtml(finance.status || "—")}</strong></article>
          </div>`
          : '<p class="events-muted">Sin vínculo financiero estructurado todavía.</p>'}
      </section>
      <section class="event-detail-section"><div class="event-detail-section-head"><strong>Nutrición</strong><span>Salud · por fechas</span></div><div id="event-inline-nutrition"><p class="events-muted">Cargando Nutrición…</p></div></section>
      <section class="event-detail-section"><div class="event-detail-section-head"><strong>Equipaje y objetos</strong><span>OBJETOS</span></div><div id="event-inline-objects"><p class="events-muted">Buscando lista vinculada…</p></div></section>
      <section class="event-detail-section">
        <div class="event-detail-section-head"><strong>Crónica</strong><span>${facts.length} hechos</span></div>
        ${facts.length
          ? '<div class="event-timeline">' + facts.map((fact) => '<article><time>' + escapeHtml(eventDateLabel(fact.happenedAt, true)) + '</time><div><span class="event-fact-type">' + escapeHtml(fact.type) + '</span><p>' + escapeHtml(fact.summary) + '</p></div></article>').join("") + '</div>'
          : '<p class="events-muted">Todavía no hay hechos fechados guardados para este evento.</p>'}
      </section>
      ${references.length ? `
        <section class="event-detail-section">
          <div class="event-detail-section-head"><strong>Referencias</strong><span>${references.length}</span></div>
          <div class="event-reference-list">${references.map((ref) => '<span><strong>' + escapeHtml(ref.label || ref.type || ref.sourceProvider) + '</strong><small>' + escapeHtml(ref.sourceProvider || "") + '</small></span>').join("")}</div>
        </section>` : ""}
      ${event.finalSummary ? '<section class="event-detail-section event-final-summary"><div class="event-detail-section-head"><strong>Balance final</strong><span>Cierre</span></div><p>' + escapeHtml(event.finalSummary) + '</p></section>' : ""}
    </div>`;

  body.querySelector("[data-events-inline-back]")?.addEventListener("click", () => void openEventsWorkspaceInline(eventsWorkspaceTab));
  void hydrateEventNutritionInline(event);
  void hydrateEventObjectsInline(event);
}

async function openEventDetailInline(eventId, fallback) {
  const dialog = prepareEventsDialog("event-detail-dialog");
  if (!dialog) return;
  document.querySelector("#dialog-context").textContent = "Eventos · detalle";
  document.querySelector("#dialog-title").textContent = fallback?.title || "Evento";
  document.querySelector("#dialog-body").innerHTML = '<p class="events-loading">Cargando ficha del evento…</p>';
  if (!dialog.open) dialog.showModal();

  let payload = null;
  if (privateModeKind === "remote" && eventId) {
    try {
      const response = await fetch("/api/events/" + encodeURIComponent(eventId), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin"
      });
      if (response.ok) payload = await response.json();
    } catch (error) {
      console.warn("Event detail load failed", error);
    }
  }

  if (!payload?.event && fallback) {
    payload = {
      event: {
        id: fallback.id,
        title: fallback.title,
        kind: fallback.kind,
        status: fallback.status || "CONFIRMADO",
        startsAt: fallback.startsAt,
        endsAt: fallback.endsAt,
        location: fallback.location || null,
        financeRef: fallback.financeRef || fallback.id || null,
        objectsListRef: null,
        summary: fallback.note || null,
        finalSummary: null
      },
      facts: [],
      references: []
    };
  }

  if (!payload?.event) {
    document.querySelector("#dialog-body").innerHTML = '<div class="events-empty"><strong>No se ha podido reconstruir este evento</strong></div>';
    return;
  }
  renderEventDetailInline(payload);
}

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

function refreshApp() {
  const button = document.querySelector("#refresh-app");
  if (button) {
    button.disabled = true;
    button.classList.add("is-refreshing");
    button.setAttribute("aria-label", "Actualizando Segundo Cerebro");
    button.setAttribute("aria-busy", "true");
  }
  window.setTimeout(() => window.location.reload(), 80);
}

let orbMediaQuery = null;

function syncSystemOrbResponsiveSize() {
  const orb = document.querySelector("#system-orb");
  if (!orb) return;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const nextSize = mobile ? "46" : "58";
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

  if (!state.areas.some((area) => area.id === "area-events")) {
    const eventsArea = eventsAreaFromStateFallback(state, privateModeKind);
    if (eventsArea) {
      const calendarIndex = state.areas.findIndex((area) => area.id === "area-calendar");
      const insertAt = calendarIndex >= 0 ? calendarIndex + 1 : 1;
      state.areas.splice(insertAt, 0, eventsArea);
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
  renderEvents();
  renderBudgetOverview();
  renderDebtOverview();
  renderGiftsOverview();
  renderCreditOverview();
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

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("private-state-timeout"), 9000);

  try {
    const response = await fetch("/api/state", {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal
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
    remoteStateLoadError = null;
  } catch (error) {
    remoteStateLoadError = error;
    console.warn("No se pudo cargar el estado privado remoto; la interfaz continuará sin bloquearse.", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function renderMode() {
  const generalHealth = state.areas.find((area) => area.id === "area-general")?.health ?? 0;
  const openDecisions = (Array.isArray(state.decisions) ? state.decisions : []).filter((decision) => decision.status === "open").length;
  const local = privateModeKind === "local";
  const remote = privateModeKind === "remote";
  document.querySelector("#show-midas-detail")?.toggleAttribute("hidden", globalThis.__SECOND_BRAIN_REMOTE__ !== true);

  const remoteUnavailable = globalThis.__SECOND_BRAIN_REMOTE__ === true && !remote && Boolean(remoteStateLoadError);
  document.querySelector("#privacy-mode-title").textContent = remote ? "Modo privado remoto" : local ? "Modo local privado" : remoteUnavailable ? "Modo privado" : "Modo demo";
  document.querySelector("#privacy-mode-detail").textContent = remote ? "Protegido por autenticación" : local ? "No se publica en GitHub" : remoteUnavailable ? "Conexión temporalmente no disponible" : "Solo datos ficticios";
  document.querySelector("#data-mode-badge")?.replaceChildren(remote ? "Estado personal privado" : local ? "Estado personal local" : "Entorno mock");
  document.querySelector("#profile-button")?.setAttribute("aria-label", privateMode ? "Perfil privado" : "Perfil ficticio");
  document.querySelector("#query-submit")?.setAttribute("aria-label", privateMode ? "Consultar estado privado" : "Consultar datos ficticios");
  const queryHelp = document.querySelector("#query-help");
  if (queryHelp) {
    queryHelp.textContent = remote
      ? "Consulta datos conectados o usa órdenes como «abre despensa», «ver presupuesto» o «qué tengo hoy»."
      : local
        ? "Consulta el estado local o abre módulos con órdenes cortas."
        : "Prueba consultas y accesos rápidos sobre los datos de demostración.";
  }
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
  const childIds = new Set(["area-events", "area-parents", "area-habits", "area-pantry"]);
  const canonicalOrder = [
    "area-general", "area-career", "area-finance", "area-calendar",
    "area-partner", "area-family", "area-health", "area-objects",
    "area-wealth", "area-projects"
  ];
  const orderRank = new Map(canonicalOrder.map((id, index) => [id, index]));
  const parents = state.areas
    .filter((area) => !metaAreas.has(area.id) && !childIds.has(area.id))
    .sort((a, b) => (orderRank.get(a.id) ?? 999) - (orderRank.get(b.id) ?? 999));

  nav.innerHTML = parents.map((area, index) => `
    <div class="nav-group" data-nav-group="${escapeHtml(area.id)}">
      <a class="nav-link nav-link-parent nav-tone-${escapeHtml(area.tone || "blue")} ${index === 0 ? "active" : ""}" href="#overview" data-nav-area-id="${area.id}">
        ${escapeHtml(area.shortTitle)}
      </a>
    </div>`
  ).join("");
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
        <span class="focus-dot priority-${item.priority === "high" ? "high" : item.priority === "medium" ? "medium" : "normal"}"></span>
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
  const sourceStatus = document.querySelector("#calendar-source-status");
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

  if (sourceStatus) {
    const source = state.calendarSummary?.source || {};
    const selected = Number(source.selectedCalendarCount);
    const matched = Number(source.matchedCalendarCount);
    const freshness = String(source.freshness || "");
    const ratio = Number.isFinite(selected) && selected > 0 && Number.isFinite(matched)
      ? matched + "/" + selected + " calendarios"
      : "";
    if (freshness === "fallback") {
      sourceStatus.textContent = ["iCloud · copia estable", ratio].filter(Boolean).join(" · ");
      sourceStatus.hidden = false;
    } else if (freshness === "mixed" || freshness === "degraded") {
      sourceStatus.textContent = ["iCloud · sincronización parcial", ratio, "completada con copia estable"].filter(Boolean).join(" · ");
      sourceStatus.hidden = false;
    } else if (ratio) {
      sourceStatus.textContent = "iCloud · " + ratio;
      sourceStatus.hidden = false;
    } else {
      sourceStatus.hidden = true;
      sourceStatus.textContent = "";
    }
  }

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
  void renderHomeHealthCard();
  if (privateModeKind === "remote") void loadHomeWeeklyMenu();
  else hideHomeWeeklyMenu();
  renderHomePantryCard(state, privateModeKind);
  renderHomeObjectsCard(state, privateModeKind);
}

function homeHealthMetricNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatHomeHealthInteger(value, suffix = "") {
  const number = homeHealthMetricNumber(value);
  return number === null ? "—" : Math.round(number).toLocaleString("es-ES") + suffix;
}

function formatHomeHealthDecimal(value, suffix = "") {
  const number = homeHealthMetricNumber(value);
  return number === null ? "—" : number.toFixed(1).replace(".", ",") + suffix;
}

function setHomeHealthMetric(mainId, detailId, main, detail) {
  const mainNode = document.querySelector("#" + mainId);
  const detailNode = document.querySelector("#" + detailId);
  if (mainNode) mainNode.textContent = main;
  if (detailNode) detailNode.textContent = detail;
}

function homeHealthSourceLabel(source) {
  const raw = String(source || "").trim();
  const normalized = raw.toLowerCase();
  if (!raw) return "";
  if (normalized.includes("zepp")) return "Zepp";
  if (normalized.includes("apple")) return "Apple Health";
  if (normalized.includes("habit")) return "Hábitos";
  if (normalized.includes("health_sheet")) return "Salud";
  return raw.replace(/[_-]+/g, " ");
}

function formatHomeHealthUpdate(value, source = "") {
  const sourceLabel = homeHealthSourceLabel(source);
  if (!value) return sourceLabel ? sourceLabel + " · hora no disponible" : "Actualización no disponible";
  const raw = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(raw + "T12:00:00+02:00")
    : new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return [sourceLabel, raw].filter(Boolean).join(" · ");
  const hasTime = !/^\d{4}-\d{2}-\d{2}$/.test(raw);
  const formatted = new Intl.DateTimeFormat("es-ES", hasTime
    ? { timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }
  ).format(parsed).replace(".", "");
  return [sourceLabel, formatted].filter(Boolean).join(" · ");
}

function setHomeHealthUpdated(key, value, source = "") {
  const node = document.querySelector("#home-health-" + key + "-updated");
  if (!node) return;
  node.textContent = formatHomeHealthUpdate(value, source);
  if (value) node.setAttribute("datetime", String(value));
  else node.removeAttribute("datetime");
}

function shortHomeGymReason(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Pausa temporal";
  const upper = raw.toUpperCase();
  if (/MEDICAL_PAUSE|HERIDA|PUNTO|DERMAT|SANGR|RECUPER/.test(upper)) return "Recuperación médica";
  if (/VIAJE|VACAC/.test(upper)) return "Viaje / descanso";
  const cleaned = raw.replace(/^[A-Z0-9_ -]+\s*[·:\-]\s*/i, "").split(/[.;\n]/)[0].trim();
  return cleaned.length > 52 ? cleaned.slice(0, 49).trimEnd() + "…" : (cleaned || "Pausa temporal");
}

function setHomeHealthRing(ringId, value, options = {}) {
  const ring = document.querySelector("#" + ringId);
  if (!ring) return;
  updateProgressRing(ring, value, {
    tone: options.tone || "blue",
    label: options.label || "",
    displayPercent: options.displayPercent,
    ariaLabel: options.ariaLabel || "Resumen de Salud"
  });
  const valueNode = ring.querySelector(".progress-ring-value");
  const labelNode = ring.querySelector(".progress-ring-center small");
  if (valueNode && options.centerValue !== undefined) valueNode.textContent = options.centerValue;
  if (labelNode && options.centerLabel !== undefined) labelNode.textContent = options.centerLabel;
}

function homeHealthPercent(value, target) {
  const current = homeHealthMetricNumber(value);
  const goal = homeHealthMetricNumber(target);
  if (current === null || goal === null || goal <= 0) return null;
  return Math.max(0, Math.round((current / goal) * 100));
}

function renderHomeHealthHabitsSummary() {
  const summary = state.habitsSummary?.summary || {};
  const total = Math.max(0, Number(summary.total || 0));
  const done = Math.max(0, Number(summary.done || 0));
  const streak = Math.max(0, Number(summary.streak || 0));
  const percentage = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : null;
  setHomeHealthMetric(
    "home-health-habits-main",
    "home-health-habits-detail",
    total > 0 ? done + " / " + total : "—",
    total > 0 ? percentage + "% hoy · racha " + streak + " d" : "Sin hábitos programados"
  );
  setHomeHealthRing("home-health-habits-ring", percentage, {
    tone: "violet",
    label: "hoy",
    ariaLabel: total > 0 ? percentage + "% de hábitos completados hoy" : "Sin hábitos programados"
  });
  setHomeHealthUpdated("habits", state.habitsSummary?.source?.updatedAt || null, "Hábitos");
}

function deriveGymTodaySummary(healthData, gymData = {}) {
  const activityGoal = healthData.activityObjective || {};
  const overviewGym = healthData.gym || {};
  const plan = Array.isArray(gymData?.plan) ? gymData.plan : [];
  const sessions = Array.isArray(gymData?.sessions)
    ? gymData.sessions
    : Array.isArray(overviewGym.sessions) ? overviewGym.sessions : [];
  const sessionsThisWeek = homeHealthMetricNumber(overviewGym.sessionsThisWeek) ?? 0;
  const strengthTarget = homeHealthMetricNumber(activityGoal.strengthSessionsWeek);
  const paused = Boolean(gymData?.trainingStatus?.paused) || strengthTarget === 0;
  const selectedDate = healthData.date || localDateKey();

  if (paused) {
    const reason = String(gymData?.trainingStatus?.reason || activityGoal.note || "Pausa temporal del entrenamiento de fuerza.");
    const detail = shortHomeGymReason(reason);
    return {
      main: "Pausado",
      detail,
      updatedAt: gymData?.trainingStatus?.updatedAt || gymData?.trainingStatus?.effectiveDate || activityGoal.updatedAt || activityGoal.effectiveDate || null,
      progress: null,
      tone: "amber",
      centerValue: "⏸",
      centerLabel: "pausa",
      ariaLabel: "Gimnasio pausado: " + detail
    };
  }

  const todaySession = sessions.find((session) => String(session?.sessionDate || "") === selectedDate) || null;
  if (todaySession) {
    const day = plan.find((candidate) => candidate.id === todaySession.dayId);
    const detail = day?.title || day?.focus || todaySession.dayId || "Sesión registrada";
    return {
      main: "Hecho",
      detail,
      updatedAt: todaySession.createdAt || todaySession.sessionDate || null,
      progress: 100,
      tone: "mint",
      centerValue: "✓",
      centerLabel: "hecho",
      ariaLabel: "Entrenamiento de hoy completado: " + detail
    };
  }

  if (!plan.length) {
    return {
      main: "Sin plan",
      detail: "Plan no disponible",
      updatedAt: gymData?.trainingStatus?.updatedAt || activityGoal.updatedAt || null,
      progress: null,
      tone: "blue",
      centerValue: "—",
      centerLabel: "gym",
      ariaLabel: "Sin plan de entrenamiento conectado"
    };
  }

  const lastDayId = sessions[0]?.dayId || null;
  const lastIndex = plan.findIndex((day) => day.id === lastDayId);
  const suggestedIndex = lastIndex >= 0 ? (lastIndex + 1) % plan.length : 0;
  const suggested = plan[suggestedIndex] || plan[0];
  const suggestedTitle = suggested?.title || suggested?.focus || "Siguiente sesión";

  if (strengthTarget !== null && strengthTarget > 0 && sessionsThisWeek >= strengthTarget) {
    return {
      main: "Descanso",
      detail: "Objetivo semanal cubierto · siguiente " + suggestedTitle,
      updatedAt: sessions[0]?.createdAt || gymData?.trainingStatus?.updatedAt || activityGoal.updatedAt || null,
      progress: 100,
      tone: "mint",
      centerValue: "✓",
      centerLabel: "sem",
      ariaLabel: "Objetivo semanal de gimnasio cubierto. Siguiente sesión: " + suggestedTitle
    };
  }

  const progress = strengthTarget !== null && strengthTarget > 0
    ? Math.max(0, Math.round((sessionsThisWeek / strengthTarget) * 100))
    : 0;
  const weekText = strengthTarget !== null && strengthTarget > 0
    ? " · " + sessionsThisWeek + "/" + Math.round(strengthTarget) + " esta semana"
    : "";
  return {
    main: "Sugerido",
    detail: suggestedTitle + weekText,
    updatedAt: sessions[0]?.createdAt || gymData?.trainingStatus?.updatedAt || activityGoal.updatedAt || null,
    progress,
    tone: "blue",
    centerValue: "Hoy",
    centerLabel: "gym",
    ariaLabel: "Siguiente entrenamiento sugerido: " + suggestedTitle
  };
}

function healthWeightSummary(body = {}, selectedDate = localDateKey()) {
  const samples = (Array.isArray(body.samples) ? body.samples : [])
    .filter((sample) => sample?.type === "bodyMass" && homeHealthMetricNumber(sample.value) !== null)
    .sort((a, b) => String(a.measuredAt || a.date || "").localeCompare(String(b.measuredAt || b.date || "")));
  const latest = body.weightToday || samples.at(-1) || null;
  const currentStart = shiftDateKey(selectedDate, -6);
  const previousStart = shiftDateKey(selectedDate, -13);
  const previousEnd = shiftDateKey(selectedDate, -7);
  const currentDays = new Set(samples.filter((sample) => sample.date >= currentStart && sample.date <= selectedDate).map((sample) => sample.date)).size;
  const previousDays = new Set(samples.filter((sample) => sample.date >= previousStart && sample.date <= previousEnd).map((sample) => sample.date)).size;
  const average = homeHealthMetricNumber(body.weight7dAverage);
  const rawWeeklyChange = homeHealthMetricNumber(body.weightWeeklyChange);
  const trendReady = currentDays >= 5 && previousDays >= 5 && rawWeeklyChange !== null;
  return {
    latest,
    value: homeHealthMetricNumber(latest?.value),
    average,
    weeklyChange: trendReady ? rawWeeklyChange : null,
    rawWeeklyChange,
    currentDays,
    previousDays,
    trendReady
  };
}

function renderHomeGymSummary(healthData, gymData) {
  const summary = deriveGymTodaySummary(healthData, gymData);
  setHomeHealthMetric("home-health-gym-main", "home-health-gym-detail", summary.main, summary.detail);
  setHomeHealthUpdated("gym", summary.updatedAt, "Gym");
  setHomeHealthRing("home-health-gym-ring", summary.progress, {
    tone: summary.tone,
    centerValue: summary.centerValue,
    centerLabel: summary.centerLabel,
    ariaLabel: summary.ariaLabel
  });
}

async function renderHomeHealthCard() {
  renderHomeHealthHabitsSummary();

  if (privateModeKind !== "remote") {
    for (const key of ["kcal", "protein", "gym", "weight"]) {
      setHomeHealthMetric("home-health-" + key + "-main", "home-health-" + key + "-detail", "—", "Disponible en modo privado");
      setHomeHealthUpdated(key, null, "");
      setHomeHealthRing("home-health-" + key + "-ring", null, {
        tone: key === "protein" ? "mint" : key === "kcal" ? "amber" : "blue",
        centerValue: "—",
        centerLabel: key === "protein" ? "prot" : key === "weight" ? "kg" : key,
        ariaLabel: "Disponible en modo privado"
      });
    }
    return;
  }

  try {
    const [response, gymResponse] = await Promise.all([
      fetch("/api/health/overview?date=" + encodeURIComponent(localDateKey()), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin"
      }),
      fetch("/api/gym", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin"
      }).catch(() => null)
    ]);
    if (!response.ok) throw new Error("HOME_HEALTH_" + response.status);
    const data = await response.json();
    const gymData = gymResponse?.ok ? await gymResponse.json().catch(() => null) : null;

    const consumed = data.nutritionSummary?.consumed || {};
    const nutritionGoal = data.nutritionObjective || {};
    const kcal = homeHealthMetricNumber(consumed.kcal) ?? 0;
    const protein = homeHealthMetricNumber(consumed.protein) ?? 0;
    const kcalTarget = homeHealthMetricNumber(nutritionGoal.kcal);
    const proteinTarget = homeHealthMetricNumber(nutritionGoal.protein);

    const kcalPct = homeHealthPercent(kcal, kcalTarget);
    const kcalRemaining = kcalTarget === null ? null : kcalTarget - kcal;
    setHomeHealthMetric(
      "home-health-kcal-main",
      "home-health-kcal-detail",
      kcalTarget !== null
        ? Math.round(kcal).toLocaleString("es-ES") + " / " + Math.round(kcalTarget).toLocaleString("es-ES") + " kcal"
        : Math.round(kcal).toLocaleString("es-ES") + " kcal",
      kcalRemaining === null
        ? "Objetivo pendiente"
        : kcalRemaining >= 0
          ? "Faltan " + Math.round(kcalRemaining).toLocaleString("es-ES") + " kcal"
          : "+" + Math.round(Math.abs(kcalRemaining)).toLocaleString("es-ES") + " kcal sobre objetivo"
    );
    setHomeHealthRing("home-health-kcal-ring", kcalPct, {
      tone: kcalPct !== null && kcalPct > 105 ? "coral" : "amber",
      label: "kcal",
      displayPercent: kcalPct,
      ariaLabel: kcalPct === null ? "Objetivo de calorías pendiente" : kcalPct + "% del objetivo diario de calorías"
    });

    const proteinPct = homeHealthPercent(protein, proteinTarget);
    const proteinRemaining = proteinTarget === null ? null : proteinTarget - protein;
    setHomeHealthMetric(
      "home-health-protein-main",
      "home-health-protein-detail",
      proteinTarget !== null
        ? Math.round(protein).toLocaleString("es-ES") + " / " + Math.round(proteinTarget).toLocaleString("es-ES") + " g"
        : Math.round(protein).toLocaleString("es-ES") + " g",
      proteinRemaining === null
        ? "Objetivo pendiente"
        : proteinRemaining > 0
          ? "Faltan " + Math.round(proteinRemaining).toLocaleString("es-ES") + " g"
          : "Objetivo cumplido"
    );
    setHomeHealthRing("home-health-protein-ring", proteinPct, {
      tone: "mint",
      label: "prot",
      displayPercent: proteinPct,
      ariaLabel: proteinPct === null ? "Objetivo de proteína pendiente" : proteinPct + "% del objetivo diario de proteína"
    });
    const nutritionUpdatedAt = data.nutritionSummary?.updatedAt || null;
    const nutritionUpdateSource = data.nutritionSummary?.updateKind === "objective" ? "Objetivo" : "Nutrición";
    setHomeHealthUpdated("kcal", nutritionUpdatedAt, nutritionUpdateSource);
    setHomeHealthUpdated("protein", nutritionUpdatedAt, nutritionUpdateSource);

    renderHomeGymSummary(data, gymData || {});

    const body = data.body || {};
    const weightSummary = healthWeightSummary(body, data.date || localDateKey());
    const latestWeightSample = weightSummary.latest;
    const displayedWeight = weightSummary.value;
    const weightDetail = [
      weightSummary.average !== null ? "Media 7 d " + formatHomeHealthDecimal(weightSummary.average, " kg") : null,
      weightSummary.trendReady && weightSummary.weeklyChange !== null
        ? "Δ " + (weightSummary.weeklyChange > 0 ? "+" : "") + weightSummary.weeklyChange.toFixed(1).replace(".", ",") + " kg"
        : weightSummary.currentDays > 0
          ? "cobertura " + weightSummary.currentDays + "/7 días"
          : null
    ].filter(Boolean).join(" · ") || "Sin tendencia disponible";
    setHomeHealthMetric(
      "home-health-weight-main",
      "home-health-weight-detail",
      formatHomeHealthDecimal(displayedWeight, " kg"),
      weightDetail
    );
    setHomeHealthUpdated(
      "weight",
      latestWeightSample?.measuredAt || latestWeightSample?.importedAt || latestWeightSample?.date || null,
      latestWeightSample?.source || "Peso"
    );
  } catch (error) {
    for (const key of ["kcal", "protein", "gym", "weight"]) {
      setHomeHealthMetric("home-health-" + key + "-main", "home-health-" + key + "-detail", "—", "No se ha podido cargar");
      setHomeHealthUpdated(key, null, "");
      if (key !== "weight") {
        setHomeHealthRing("home-health-" + key + "-ring", null, {
          tone: key === "protein" ? "mint" : key === "kcal" ? "amber" : "blue",
          centerValue: "—",
          centerLabel: key === "protein" ? "prot" : key,
          ariaLabel: "No se ha podido cargar el resumen de Salud"
        });
      }
    }
    console.warn("Home health load failed", error);
  }
}

function renderHomeHabitsCard() {
  const summary = state.habitsSummary?.summary || {};
  const total = Math.max(0, Number(summary.total || 0));
  const done = Math.max(0, Number(summary.done || 0));
  const pending = Math.max(0, total - done);
  const streak = Math.max(0, Number(summary.streak || 0));
  const percentage = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : null;
  const value = document.querySelector("#home-habits-value");
  const label = document.querySelector("#home-habits-label");
  const ring = document.querySelector("#home-habits-ring");
  const doneNode = document.querySelector("#home-habits-done");
  const pendingNode = document.querySelector("#home-habits-pending");
  const percentNode = document.querySelector("#home-habits-percent");
  const streakNode = document.querySelector("#home-habits-streak");
  const statusNode = document.querySelector("#home-habits-status");

  if (value) value.textContent = total > 0 ? done + " / " + total : "—";
  if (label) label.textContent = total > 0
    ? percentage + "% completado · racha " + streak + " días"
    : "Sin hábitos programados";
  if (doneNode) doneNode.textContent = total > 0 ? String(done) : "—";
  if (pendingNode) pendingNode.textContent = total > 0 ? String(pending) : "—";
  if (percentNode) percentNode.textContent = percentage == null ? "—" : percentage + "%";
  if (streakNode) streakNode.textContent = total > 0 ? streak + " días" : "—";
  if (statusNode) statusNode.textContent = total > 0
    ? done + " de " + total + " completados hoy"
    : "Sin hábitos programados";

  updateProgressRing(ring, percentage, {
    tone: "violet",
    label: "hoy",
    ariaLabel: total > 0 ? done + " de " + total + " hábitos completados hoy" : "Sin hábitos programados"
  });
}

async function loadHomeWeeklyMenu(primaryData = null) {
  if (Array.isArray(primaryData?.weeklyMenu) && primaryData.weeklyMenu.length) {
    renderHomeWeeklyMenu(primaryData);
    return true;
  }

  try {
    const response = await fetch("/api/nutrition/menu?date=" + encodeURIComponent(localDateKey()), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("HOME_WEEKLY_MENU_" + response.status);
    const data = await response.json();
    renderHomeWeeklyMenu(data);
    return Array.isArray(data.weeklyMenu) && data.weeklyMenu.length > 0;
  } catch (error) {
    renderHomeWeeklyMenuUnavailable();
    console.warn("Home weekly menu fallback failed", error);
    return false;
  }
}

async function renderHomeNutritionCard() {
  const consumedNode = document.querySelector("#home-kcal-consumed");
  const burnedNode = document.querySelector("#home-kcal-burned");
  const targetNode = document.querySelector("#home-kcal-target");
  const percentNode = document.querySelector("#home-kcal-percent");
  const statusNode = document.querySelector("#home-kcal-status");
  const ring = document.querySelector("#home-kcal-ring");
  if (!consumedNode || !burnedNode || !targetNode || !statusNode || !ring) return;
  if (privateModeKind !== "remote") {
    consumedNode.textContent = "—";
    burnedNode.textContent = "—";
    targetNode.textContent = "—";
    if (percentNode) percentNode.textContent = "—";
    statusNode.textContent = "Disponible en la aplicación privada";
    hideHomeWeeklyMenu();
    updateProgressRing(ring, null, { tone: "amber", label: "kcal", ariaLabel: "Nutrición disponible en la aplicación privada" });
    return;
  }

  try {
    const response = await fetch("/api/nutrition?date=" + encodeURIComponent(localDateKey()), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("HOME_NUTRITION_" + response.status);
    const data = await response.json();
    void loadHomeWeeklyMenu(data);
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
      if (percentNode) percentNode.textContent = rawPct + "%";
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
      if (percentNode) percentNode.textContent = "—";
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
    if (percentNode) percentNode.textContent = "—";
    statusNode.textContent = "No se ha podido cargar Nutrición";
    void loadHomeWeeklyMenu(null);
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
      ${renderHomeLiquidityOverview(monthly.liquidityAccounts, currency)}
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
  container.querySelectorAll("[data-important-event-id]").forEach((card) => {
    const open = () => {
      const item = importantEvents.find((candidate) => candidate.id === card.dataset.importantEventId) || null;
      void openEventDetailInline(card.dataset.importantEventId, item);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
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
    <article class="event-budget-item important-event-item ${compact ? "compact" : "detail"}" data-important-event-id="${escapeHtml(item.id || "")}" role="button" tabindex="0" aria-label="Abrir ${escapeHtml(item.title)}">
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
  const now = Date.now();
  const rules = Array.isArray(state.importantEventRules)
    ? state.importantEventRules
    : Array.isArray(finance.importantEventRules)
      ? finance.importantEventRules
      : [];

  const calendarItems = (Array.isArray(state.events) ? state.events : [])
    .filter((event) => new Date(event.endsAt || event.startsAt).getTime() >= now)
    .filter((event) => !isBirthdayReminderOnly([event.title, event.location || event.locationRef].filter(Boolean).join(" ")))
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
      const inferredKind = inferImportantKind([event.title, event.location || event.locationRef].filter(Boolean).join(" "));
      if (!rule && inferredKind === "important") return null;
      return {
        id: event.id || rule?.id || [event.calendarName, event.title, event.startsAt].join("|"),
        title: rule?.displayTitle || safeDisplayEventTitle(event.title),
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location || event.locationRef || null,
        kind: rule?.kind || inferredKind,
        status: eventStatusFromDates(event.startsAt, event.endsAt, event.status),
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
      const kind = inferImportantKind(item.title);
      if (kind === "important") return null;
      return {
        ...item,
        title,
        startsAt: item.date ? `${item.date}T12:00:00` : null,
        endsAt: item.date ? `${item.date}T23:59:59` : null,
        kind,
        status: "CONFIRMADO",
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

function eventStatusFromDates(startsAt, endsAt, baseStatus = "CONFIRMADO") {
  const base = String(baseStatus || "CONFIRMADO").toUpperCase();
  if (base === "CANCELADO") return "CANCELADO";
  const start = startsAt ? new Date(startsAt).getTime() : NaN;
  const end = new Date(endsAt || startsAt || "").getTime();
  const now = Date.now();
  if (Number.isFinite(end) && end < now) return "CERRADO";
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) return "EN_CURSO";
  if (base === "PROPUESTO" || base === "PENDIENTE") return base;
  return "CONFIRMADO";
}

function inferImportantKind(title) {
  const text = normalizeForMatch(title);
  if (/viaje|vuelo|escapada|marbella|valencia|puy du fou|hotel|airbnb/.test(text)) return "travel";
  if (/boda|preboda|celebracion|aniversario|cena|comida|fiesta|quedada|merienda|copas|concierto|teatro|festival|espectaculo|parque tematico/.test(text)) return "social";
  return "important";
}

function classifyHealthEvent(event) {
  const text = normalizeForMatch([event.title, event.location, event.locationRef, event.calendarName].filter(Boolean).join(" "));
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

const FAMILY_WEALTH_CATEGORY_LABELS = {
  investment: "Inversión",
  property: "Inmueble",
  business: "Negocio",
  cash: "Liquidez",
  debt: "Deuda",
  other: "Otro"
};

const FAMILY_WEALTH_STATUS_LABELS = {
  confirmed: "Confirmado",
  estimated: "Estimado",
  pending: "Pendiente de valorar"
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

    let wealthPayload = null;
    if (scope === "shared") {
      try {
        const wealthResponse = await fetch("/api/family/wealth", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin"
        });
        if (!wealthResponse.ok) throw new Error("FAMILY_WEALTH_" + wealthResponse.status);
        wealthPayload = await wealthResponse.json();
      } catch (wealthError) {
        console.warn("Family wealth load failed", wealthError);
        wealthPayload = { error: true, items: [], summary: {} };
      }
    }

    renderParentsPanel(scope, payload.cases || [], payload.summary || {}, wealthPayload);
  } catch (error) {
    console.warn("Family cases load failed", error);
    panel.innerHTML = '<div class="parents-empty parents-empty-card"><strong>No se han podido cargar los casos</strong><p>La estructura privada sigue separada del resto de Salud y Finanzas.</p></div>';
  }
}

function renderParentsPanel(scope, cases, summary, wealthPayload = null) {
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

    ${scope === "shared" ? renderFamilyWealthSection(wealthPayload) : ""}

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

  if (scope === "shared") bindFamilyWealthControls(panel, wealthPayload);
}

function renderFamilyWealthSection(payload) {
  if (payload?.error) {
    return `
      <section class="parents-wealth-section">
        <div class="parents-list-heading">
          <div><strong>Patrimonio familiar</strong><p>Activos, deudas y valoraciones separados de las finanzas personales.</p></div>
        </div>
        <div class="parents-empty parents-empty-card"><strong>No se ha podido cargar el patrimonio</strong><p>Los casos familiares siguen disponibles.</p></div>
      </section>
    `;
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const summary = payload?.summary || {};
  const grossAssets = Number(summary.grossAssets || 0);
  const liabilities = Number(summary.liabilities || 0);
  const netKnown = Number(summary.netKnown || 0);
  const investments = Number(summary.investments || 0);
  const pending = Number(summary.pendingValuations || 0);
  const investmentItems = items
    .filter((item) => item.category === "investment" && item.valuationStatus !== "pending" && Number(item.amountEur) > 0)
    .sort((a, b) => Number(b.amountEur || 0) - Number(a.amountEur || 0));
  const investmentTotal = investmentItems.reduce((total, item) => total + Number(item.amountEur || 0), 0);
  const primaryInvestment = investmentItems[0] || null;
  const secondaryInvestment = investmentItems[1] || null;
  const otherInvestmentAmount = investmentItems.slice(2).reduce((total, item) => total + Number(item.amountEur || 0), 0);
  const primaryPct = investmentTotal > 0 ? (Number(primaryInvestment?.amountEur || 0) / investmentTotal) * 100 : 0;
  const secondaryEndPct = investmentTotal > 0
    ? ((Number(primaryInvestment?.amountEur || 0) + Number(secondaryInvestment?.amountEur || 0)) / investmentTotal) * 100
    : 0;
  const secondaryPct = Math.max(0, secondaryEndPct - primaryPct);
  const otherPct = Math.max(0, 100 - secondaryEndPct);
  const comparisonMax = Math.max(grossAssets, liabilities, 1);
  const assetsWidth = Math.max(0, Math.min(100, (grossAssets / comparisonMax) * 100));
  const debtWidth = Math.max(0, Math.min(100, (liabilities / comparisonMax) * 100));
  const pendingItems = items.filter((item) => item.valuationStatus === "pending" || item.amountEur === null || item.amountEur === undefined);

  return `
    <section class="parents-wealth-section">
      <div class="parents-list-heading parents-wealth-heading">
        <div>
          <strong>Patrimonio familiar</strong>
          <p>Valores privados. El negocio y los inmuebles se muestran separados para evitar dobles conteos.</p>
        </div>
        <button type="button" class="parents-wealth-add" data-family-wealth-add>+ Añadir partida</button>
      </div>

      <div class="parents-wealth-summary">
        <article><span>Activos conocidos</span><strong>${formatMoney(grossAssets, "EUR")}</strong></article>
        <article><span>Inversiones</span><strong>${formatMoney(investments, "EUR")}</strong></article>
        <article><span>Deuda conocida</span><strong>${formatMoney(liabilities, "EUR")}</strong></article>
        <article><span>Neto conocido${pending > 0 ? " · incompleto" : ""}</span><strong>${formatMoney(netKnown, "EUR")}</strong></article>
        <article><span>Pendiente valorar</span><strong>${pending}</strong></article>
      </div>

      <div class="parents-wealth-visual-grid">
        <article class="parents-wealth-chart-card">
          <div class="parents-wealth-chart-head">
            <div>
              <span>Composición</span>
              <strong>Inversiones financieras</strong>
            </div>
            <small>${investmentItems.length} posiciones</small>
          </div>
          ${investmentTotal > 0 ? `
            <div class="parents-wealth-investment-chart">
              <div
                class="parents-wealth-donut"
                role="img"
                aria-label="Composición de inversiones financieras"
              >
                <svg class="parents-wealth-donut-svg" viewBox="0 0 42 42" aria-hidden="true">
                  <circle class="parents-wealth-donut-track" cx="21" cy="21" r="15.9155" pathLength="100"></circle>
                  <circle class="parents-wealth-donut-segment is-primary" cx="21" cy="21" r="15.9155" pathLength="100"
                    stroke-dasharray="${primaryPct.toFixed(2)} ${Math.max(0, 100 - primaryPct).toFixed(2)}"></circle>
                  <circle class="parents-wealth-donut-segment is-secondary" cx="21" cy="21" r="15.9155" pathLength="100"
                    stroke-dasharray="${secondaryPct.toFixed(2)} ${Math.max(0, 100 - secondaryPct).toFixed(2)}"
                    stroke-dashoffset="${(-primaryPct).toFixed(2)}"></circle>
                  <circle class="parents-wealth-donut-segment is-other" cx="21" cy="21" r="15.9155" pathLength="100"
                    stroke-dasharray="${otherPct.toFixed(2)} ${Math.max(0, 100 - otherPct).toFixed(2)}"
                    stroke-dashoffset="${(-secondaryEndPct).toFixed(2)}"></circle>
                </svg>
                <div>
                  <span>Total</span>
                  <strong>${formatMoney(investmentTotal, "EUR")}</strong>
                </div>
              </div>
              <div class="parents-wealth-chart-legend">
                ${primaryInvestment ? renderFamilyInvestmentLegendRow(primaryInvestment, "primary", investmentTotal) : ""}
                ${secondaryInvestment ? renderFamilyInvestmentLegendRow(secondaryInvestment, "secondary", investmentTotal) : ""}
                ${otherInvestmentAmount > 0 ? renderFamilyInvestmentLegendRow({ label: "Otras inversiones", amountEur: otherInvestmentAmount }, "other", investmentTotal) : ""}
              </div>
            </div>
          ` : '<div class="parents-wealth-chart-empty">Sin inversiones valoradas todavía.</div>'}
        </article>

        <article class="parents-wealth-chart-card">
          <div class="parents-wealth-chart-head">
            <div>
              <span>Balance conocido</span>
              <strong>Activos frente a deuda</strong>
            </div>
            <small>${pending > 0 ? "Incompleto" : "Actualizado"}</small>
          </div>
          <div class="parents-wealth-comparison">
            <div class="parents-wealth-comparison-row">
              <div><span>Activos valorados</span><strong>${formatMoney(grossAssets, "EUR")}</strong></div>
              <progress class="parents-wealth-comparison-track is-assets" max="100" value="${assetsWidth.toFixed(2)}" aria-label="Proporción de activos valorados"></progress>
            </div>
            <div class="parents-wealth-comparison-row">
              <div><span>Deuda conocida</span><strong>${formatMoney(liabilities, "EUR")}</strong></div>
              <progress class="parents-wealth-comparison-track is-debt" max="100" value="${debtWidth.toFixed(2)}" aria-label="Proporción de deuda conocida"></progress>
            </div>
          </div>
          <div class="parents-wealth-net-callout">
            <span>Neto conocido</span>
            <strong>${formatMoney(netKnown, "EUR")}</strong>
            ${pending > 0 ? "<small>No incluye todavía los activos pendientes de valorar.</small>" : ""}
          </div>
        </article>
      </div>

      ${pendingItems.length ? `
        <div class="parents-wealth-pending">
          <div class="parents-wealth-pending-head">
            <strong>Por incorporar a la valoración</strong>
            <span>${pendingItems.length} pendientes</span>
          </div>
          <div class="parents-wealth-pending-grid">
            ${pendingItems.map((item) => `
              <article>
                <span>${escapeHtml(FAMILY_WEALTH_CATEGORY_LABELS[item.category] || item.category)}</span>
                <strong>${escapeHtml(item.label)}</strong>
                <small>Pendiente de valorar</small>
              </article>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="parents-wealth-list">
        ${items.length ? items.map(renderFamilyWealthItem).join("") : `
          <div class="parents-empty parents-empty-card">
            <strong>Patrimonio todavía sin cargar</strong>
            <p>Añade inversiones, inmuebles, negocio y deudas. Los importes se guardan solo en D1 privado.</p>
          </div>`}
      </div>

      <form class="parents-wealth-form" id="family-wealth-form" hidden>
        <input type="hidden" name="id" value="">
        <div class="parents-wealth-form-head">
          <div><strong data-family-wealth-form-title>Nueva partida</strong><p>Dato privado · nunca se versiona en Git.</p></div>
          <button type="button" class="parents-wealth-close" data-family-wealth-close aria-label="Cerrar">×</button>
        </div>
        <div class="parents-wealth-form-grid">
          <label class="span-2">Nombre<input name="label" maxlength="240" required placeholder="Ej. inversión, vivienda, local o negocio"></label>
          <label>Tipo
            <select name="category" required>
              ${Object.entries(FAMILY_WEALTH_CATEGORY_LABELS).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label>Titularidad
            <select name="ownerScope" required>
              <option value="shared">Común</option>
              <option value="father">Padre</option>
              <option value="mother">Madre</option>
            </select>
          </label>
          <label>Valor (€)<input name="amountEur" inputmode="decimal" placeholder="Vacío si está pendiente"></label>
          <label>Estado
            <select name="valuationStatus" required>
              <option value="confirmed">Confirmado</option>
              <option value="estimated">Estimado</option>
              <option value="pending">Pendiente de valorar</option>
            </select>
          </label>
          <label>Fecha valor<input name="asOfDate" type="date"></label>
          <label>Fuente
            <select name="sourceProvider">
              <option value="d1">Dato privado</option>
              <option value="finance">Finanzas</option>
              <option value="litos">LITOS</option>
              <option value="document">Documento</option>
              <option value="email">Email</option>
              <option value="drive">Drive</option>
              <option value="other">Otra</option>
            </select>
          </label>
          <label class="span-2">Nota<input name="note" maxlength="2000" placeholder="Contexto de valoración, sin duplicar documentos"></label>
        </div>
        <div class="parents-wealth-form-actions">
          <button type="button" class="parents-wealth-delete" data-family-wealth-delete hidden>Eliminar</button>
          <button type="submit" class="parents-wealth-save">Guardar</button>
        </div>
        <p class="parents-wealth-form-status" data-family-wealth-form-status aria-live="polite"></p>
      </form>
    </section>
  `;
}

function renderFamilyInvestmentLegendRow(item, tone, total) {
  const amount = Number(item?.amountEur || 0);
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return `
    <div class="parents-wealth-legend-row">
      <i class="tone-${escapeHtml(tone)}"></i>
      <div>
        <span>${escapeHtml(item?.label || "Inversión")}</span>
        <small>${pct.toFixed(1)}%</small>
      </div>
      <strong>${formatMoney(amount, "EUR")}</strong>
    </div>
  `;
}

function renderFamilyWealthItem(item) {
  const amount = item.amountEur === null || item.amountEur === undefined
    ? "Pendiente"
    : formatMoney(Number(item.amountEur), "EUR");
  const owner = FAMILY_SCOPE_LABELS[item.ownerScope] || item.ownerScope || "Común";
  const status = FAMILY_WEALTH_STATUS_LABELS[item.valuationStatus] || item.valuationStatus || "—";
  const date = formatFamilyDate(item.asOfDate || item.updatedAt);
  const external = item.managedBy === "finance-sheet";
  return `
    <button class="parents-wealth-item ${item.category === "debt" ? "is-debt" : ""} ${external ? "is-source-managed" : ""}" type="button" data-family-wealth-id="${escapeHtml(item.id)}" ${external ? 'data-family-wealth-readonly="true"' : ""}>
      <div class="parents-wealth-item-main">
        <span>${escapeHtml(FAMILY_WEALTH_CATEGORY_LABELS[item.category] || item.category)}</span>
        <strong>${escapeHtml(item.label)}</strong>
        <small>${escapeHtml(owner)} · ${escapeHtml(status)}${date ? ` · ${escapeHtml(date)}` : ""}${external ? " · Fuente privada" : ""}</small>
      </div>
      <strong class="parents-wealth-amount">${escapeHtml(amount)}</strong>
    </button>
  `;
}

function bindFamilyWealthControls(panel, payload) {
  const form = panel.querySelector("#family-wealth-form");
  if (!form) return;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const addButton = panel.querySelector("[data-family-wealth-add]");
  const closeButton = form.querySelector("[data-family-wealth-close]");
  const deleteButton = form.querySelector("[data-family-wealth-delete]");
  const statusNode = form.querySelector("[data-family-wealth-form-status]");
  const titleNode = form.querySelector("[data-family-wealth-form-title]");

  const openForm = (item = null) => {
    form.reset();
    form.elements.id.value = item?.id || "";
    form.elements.label.value = item?.label || "";
    form.elements.category.value = item?.category || "investment";
    form.elements.ownerScope.value = item?.ownerScope || "shared";
    form.elements.amountEur.value = item?.amountEur ?? "";
    form.elements.valuationStatus.value = item?.valuationStatus || (item?.amountEur == null ? "pending" : "confirmed");
    form.elements.asOfDate.value = item?.asOfDate ? String(item.asOfDate).slice(0, 10) : "";
    form.elements.sourceProvider.value = item?.sourceProvider || "d1";
    form.elements.note.value = item?.note || "";
    titleNode.textContent = item ? "Editar partida" : "Nueva partida";
    deleteButton.hidden = !item;
    statusNode.textContent = "";
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const closeForm = () => {
    form.hidden = true;
    statusNode.textContent = "";
  };

  addButton?.addEventListener("click", () => openForm());
  closeButton?.addEventListener("click", closeForm);
  panel.querySelectorAll("[data-family-wealth-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items.find((entry) => entry.id === button.dataset.familyWealthId);
      if (!item) return;
      if (item.managedBy === "finance-sheet") {
        statusNode.textContent = "Esta partida viene de la fuente financiera privada y se actualiza desde allí.";
        return;
      }
      openForm(item);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusNode.textContent = "Guardando…";
    const id = form.elements.id.value;
    const payloadBody = {
      label: form.elements.label.value,
      category: form.elements.category.value,
      ownerScope: form.elements.ownerScope.value,
      amountEur: form.elements.amountEur.value,
      valuationStatus: form.elements.valuationStatus.value,
      asOfDate: form.elements.asOfDate.value,
      sourceProvider: form.elements.sourceProvider.value,
      note: form.elements.note.value
    };
    try {
      const response = await fetch(id ? "/api/family/wealth/" + encodeURIComponent(id) : "/api/family/wealth", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payloadBody)
      });
      if (!response.ok) throw new Error("FAMILY_WEALTH_SAVE_" + response.status);
      await loadParentsPanel("shared");
    } catch (error) {
      console.warn("Family wealth save failed", error);
      statusNode.textContent = "No se ha podido guardar. Revisa los datos e inténtalo de nuevo.";
    }
  });

  deleteButton?.addEventListener("click", async () => {
    const id = form.elements.id.value;
    if (!id || !window.confirm("¿Eliminar esta partida patrimonial?")) return;
    statusNode.textContent = "Eliminando…";
    try {
      const response = await fetch("/api/family/wealth/" + encodeURIComponent(id), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error("FAMILY_WEALTH_DELETE_" + response.status);
      await loadParentsPanel("shared");
    } catch (error) {
      console.warn("Family wealth delete failed", error);
      statusNode.textContent = "No se ha podido eliminar.";
    }
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

function openHealthDetail(options = {}) {
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.remove("wealth-dialog", "important-events-dialog", "budget-dialog", "parents-dialog", "electricity-dialog");
  dialog.classList.add("health-dialog");
  document.querySelector("#dialog-context").textContent = "Salud · estado privado";
  document.querySelector("#dialog-title").textContent = "Salud";

  document.querySelector("#dialog-body").innerHTML = `
    <div class="health-tabs" role="tablist" aria-label="Apartados de salud">
      <button class="active" type="button" data-health-tab="overview">Resumen</button>
      <button type="button" data-health-tab="medical">Médicos</button>
      <button type="button" data-health-tab="gym">Gimnasio</button>
      <button type="button" data-health-tab="nutrition">Nutrición</button>
      <button type="button" data-health-tab="recipes">Recetas</button>
      <button type="button" data-health-tab="adherence">Adherencia</button>
      <button type="button" data-health-tab="menu">Menú</button>
    </div>
    <div class="health-tab-panels">
      <section class="health-tab-panel active" data-health-panel="overview">
        <div id="health-overview-panel"><p class="health-empty">Cargando Apple Health…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="medical">
        <div id="medical-panel"><p class="health-empty">Cargando citas médicas desde iCloud…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="gym">
        <div id="gym-panel"><p class="health-empty">Cargando plan e histórico…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="nutrition">
        <div id="nutrition-panel"><p class="health-empty">Cargando nutrición…</p></div>
      </section>
      <section class="health-tab-panel" data-health-panel="recipes">
        <div id="recipes-panel"><p class="health-empty">Cargando recetario…</p></div>
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
  void loadMedicalAppointments();
  void loadGymPanel();
  if (options.skipNutritionLoad !== true) void loadNutritionPanel(localDateKey());
}

async function loadHealthOverview(dateKey = localDateKey()) {
  const panel = document.querySelector("#health-overview-panel");
  if (panel) panel.innerHTML = '<p class="health-empty">Cargando Apple Health…</p>';
  try {
    const [response, gymResponse] = await Promise.all([
      fetch("/api/health/overview?date=" + encodeURIComponent(dateKey), {
        headers: { Accept: "application/json" },
        cache: "no-store"
      }),
      fetch("/api/gym", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      }).catch(() => null)
    ]);
    if (!response.ok) throw new Error("HEALTH_OVERVIEW_" + response.status);
    const payload = await response.json();
    const gymData = gymResponse?.ok ? await gymResponse.json().catch(() => null) : null;
    renderHealthOverview(payload, gymData || {});
    loadHealthHistory("365", payload.date || dateKey);
  } catch (error) {
    if (panel) panel.innerHTML = '<div class="health-empty health-empty-card"><strong>Apple Health no disponible</strong><p>No se ha podido cargar el resumen de actividad y composición corporal.</p></div>';
    console.warn("Health overview load failed", error);
  }
}

function renderHealthOverview(data, gymData = {}) {
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

  const weightSummary = healthWeightSummary(body, data.date || localDateKey());
  const latestWeightSample = weightSummary.latest;
  const latestWeight = weightSummary.value;
  const weightAvg = weightSummary.average;
  const weeklyChange = weightSummary.weeklyChange;
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
  const kcalProgress = homeHealthPercent(kcalConsumed, kcalTarget);
  const proteinProgress = homeHealthPercent(proteinConsumed, proteinTarget);
  const gymSummary = deriveGymTodaySummary(data, gymData);

  const habitSummary = state.habitsSummary?.summary || {};
  const habitTotal = Math.max(0, Number(habitSummary.total || 0));
  const habitDone = Math.max(0, Number(habitSummary.done || 0));
  const habitStreak = Math.max(0, Number(habitSummary.streak || 0));
  const habitProgress = habitTotal > 0
    ? Math.max(0, Math.min(100, Math.round((habitDone / habitTotal) * 100)))
    : null;

  let recompositionStatus = "Cobertura insuficiente";
  if (weightSummary.trendReady && Number.isFinite(weeklyChange)) {
    recompositionStatus = weeklyChange <= -0.15 && weeklyChange >= -0.45
      ? "En rumbo"
      : "Revisar tendencia";
  } else if (Number.isFinite(waistDelta) && waistDelta < 0) {
    recompositionStatus = "Cintura mejorando";
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
  const weightCoverageText = weightSummary.currentDays > 0
    ? weightSummary.currentDays + "/7 días"
    : "sin mediciones";
  const previousWeightCoverageText = weightSummary.previousDays > 0
    ? weightSummary.previousDays + "/7 previos"
    : "sin semana previa";
  const nutritionUpdated = formatHomeHealthUpdate(
    nutrition.updatedAt || nutritionGoal.updatedAt || null,
    nutrition.updateKind === "objective" ? "Objetivo" : "Nutrición"
  );
  const habitsUpdated = formatHomeHealthUpdate(state.habitsSummary?.source?.updatedAt || null, "Hábitos");
  const gymUpdated = formatHomeHealthUpdate(gymSummary.updatedAt, "Gym");
  const weightUpdated = formatHomeHealthUpdate(
    latestWeightSample?.measuredAt || latestWeightSample?.importedAt || latestWeightSample?.date || null,
    latestWeightSample?.source || "Peso"
  );
  const bodyMetricUpdated = (sample, fallback = "") => formatHomeHealthUpdate(
    sample?.measuredAt || sample?.importedAt || sample?.date || null,
    sample?.source || fallback
  );

  panel.innerHTML = `
    <div class="health-dashboard-status progress-ring-status">
      <span data-health-summary="habits">
        ${progressRingMarkup(habitProgress, { tone: "violet", size: "sm", label: "hoy", ariaLabel: habitTotal > 0 ? habitProgress + "% de hábitos completados hoy" : "Sin hábitos programados" })}
        <span>
          <small>Hábitos</small>
          <strong id="health-summary-habits-main">${habitTotal > 0 ? habitDone + " / " + habitTotal : "—"}</strong>
          <em>${habitTotal > 0 ? habitProgress + "% hoy · racha " + habitStreak + " d" : "Sin hábitos programados"}</em>
          <time>${escapeHtml(habitsUpdated)}</time>
        </span>
      </span>
      <span data-health-summary="kcal">
        ${progressRingMarkup(kcalProgress, { tone: kcalProgress !== null && kcalProgress > 105 ? "coral" : "amber", size: "sm", label: "kcal", ariaLabel: kcalProgress === null ? "Objetivo de calorías pendiente" : kcalProgress + "% del objetivo diario de calorías" })}
        <span>
          <small>Kcal hoy</small>
          <strong id="health-summary-kcal-main">${kcalTarget !== null ? fmt0(kcalConsumed) + " / " + fmt0(kcalTarget) + " kcal" : fmt0(kcalConsumed, " kcal")}</strong>
          <em>${kcalTarget === null ? "Objetivo pendiente" : kcalTarget - kcalConsumed >= 0 ? "Faltan " + fmt0(kcalTarget - kcalConsumed) + " kcal" : "+" + fmt0(Math.abs(kcalTarget - kcalConsumed)) + " kcal sobre objetivo"}</em>
          <time>${escapeHtml(nutritionUpdated)}</time>
        </span>
      </span>
      <span data-health-summary="protein">
        ${progressRingMarkup(proteinProgress, { tone: "mint", size: "sm", label: "prot", ariaLabel: proteinProgress === null ? "Objetivo de proteína pendiente" : proteinProgress + "% del objetivo diario de proteína" })}
        <span>
          <small>Proteína hoy</small>
          <strong id="health-summary-protein-main">${proteinTarget !== null ? fmt0(proteinConsumed) + " / " + fmt0(proteinTarget) + " g" : fmt0(proteinConsumed, " g")}</strong>
          <em>${proteinTarget === null ? "Objetivo pendiente" : proteinTarget - proteinConsumed > 0 ? "Faltan " + fmt0(proteinTarget - proteinConsumed) + " g" : "Objetivo cumplido"}</em>
          <time>${escapeHtml(nutritionUpdated)}</time>
        </span>
      </span>
      <span data-health-summary="gym">
        ${progressRingMarkup(gymSummary.progress, { tone: gymSummary.tone, size: "sm", label: gymSummary.centerLabel, ariaLabel: gymSummary.ariaLabel, centerValue: gymSummary.centerValue })}
        <span>
          <small>Gym hoy</small>
          <strong id="health-summary-gym-main">${escapeHtml(gymSummary.main)}</strong>
          <em>${escapeHtml(gymSummary.detail)}</em>
          <time>${escapeHtml(gymUpdated)}</time>
        </span>
      </span>
      <span class="health-status-text-only health-status-weight" data-health-summary="weight">
        <small>Peso</small>
        <strong id="health-summary-weight-main">${fmt1(latestWeight, " kg")}</strong>
        <em>${weightAvg !== null ? "Media 7 d " + fmt1(weightAvg, " kg") + " · " + weightCoverageText : "Sin media disponible"}</em>
        <time>${escapeHtml(weightUpdated)}</time>
      </span>
    </div>

    <div class="health-recomp-grid">
      <section class="health-recomp-card">
        <header><span>Composición corporal</span><strong>${escapeHtml(recompositionStatus)}</strong></header>
        <div class="health-recomp-kpis">
          <div>
            <small>Último peso</small>
            <strong>${fmt1(latestWeight, " kg")}</strong>
            <span class="health-metric-freshness">${escapeHtml(weightUpdated)}</span>
          </div>
          <div>
            <small>Media 7 días</small>
            <strong>${fmt1(weightAvg, " kg")}</strong>
            <span class="health-metric-freshness">${weightCoverageText}</span>
          </div>
          <div>
            <small>Cambio semanal</small>
            <strong class="${changeClass}">${changeText}</strong>
            <span class="health-metric-freshness">${weightSummary.trendReady ? weightCoverageText + " · " + previousWeightCoverageText : "Pendiente · " + weightCoverageText + " · " + previousWeightCoverageText}</span>
          </div>
          <div>
            <small>Cintura</small>
            <strong>${fmt1(waist, " cm")}</strong>
            <span class="health-metric-freshness">${escapeHtml(bodyMetricUpdated(body.waist, "Salud"))}</span>
          </div>
          <div>
            <small>Grasa</small>
            <strong>${fmt1(bodyFat, "%")}</strong>
            <span class="health-metric-freshness">${escapeHtml(bodyMetricUpdated(body.bodyFat, "Peso"))}</span>
          </div>
          <div>
            <small>Masa magra</small>
            <strong>${fmt1(lean, " kg")}</strong>
            <span class="health-metric-freshness">${escapeHtml(bodyMetricUpdated(body.leanBodyMass, "Peso"))}</span>
          </div>
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

  const healthGymRing = panel.querySelector('[data-health-summary="gym"] .progress-ring');
  if (healthGymRing) {
    const centerValue = healthGymRing.querySelector(".progress-ring-value");
    const centerLabel = healthGymRing.querySelector(".progress-ring-center small");
    if (centerValue) centerValue.textContent = gymSummary.centerValue;
    if (centerLabel) centerLabel.textContent = gymSummary.centerLabel;
  }

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
  const paused = normalizeHealthLabel(goal.status).includes("pausa");
  if (paused) {
    return `
      <article class="is-paused">
        <div>
          <strong>${escapeHtml(metric)}</strong>
          <small>Pausa temporal · benchmark congelado</small>
        </div>
        <p>${escapeHtml(goal.target || "Objetivo conservado para la reanudación")}</p>
      </article>`;
  }
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
    renderRecipesPanel(payload);
    renderMenuPanel(payload);
  } catch (error) {
    if (panel) {
      panel.innerHTML = `
        <div class="health-empty health-empty-card">
          <strong>Nutrición todavía no está conectada</strong>
          <p>La base privada ya está preparada. Falta activar la conexión del Sheet de Salud en el Worker.</p>
        </div>`;
    }
    const recipesPanel = document.querySelector("#recipes-panel");
    if (recipesPanel) {
      recipesPanel.innerHTML = '<div class="health-empty health-empty-card"><strong>Recetario no disponible</strong><p>No se ha podido cargar la fuente de recetas.</p></div>';
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
          <progress class="habit-week-track" max="100" value="${Math.max(4, pct)}" aria-label="${escapeHtml(item.label || "")}: ${pct}%"></progress>
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
  input.className = "habit-haptic-switch";
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
    piece.className = `c${i % 4} p${i % 7} d${i % 5} x${i % 5}`;
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
      if (tab === "medical") void loadMedicalAppointments();
    });
  });
}

function renderMedicalSection(events, options = {}) {
  const sourceNote = options.sourceNote
    ? `<p class="health-source-note">${escapeHtml(options.sourceNote)}</p>`
    : "";
  return `
    <div class="health-section-heading">
      <div>
        <strong>Próximas citas</strong>
        <p>Citas médicas detectadas directamente en los calendarios iCloud seleccionados.</p>
        ${sourceNote}
      </div>
      <span>${events.length}</span>
    </div>
    ${events.length
      ? `<div class="health-event-list">${events.slice(0, 30).map(renderHealthEvent).join("")}</div>`
      : '<p class="health-empty">No hay próximas citas médicas detectadas en iCloud.</p>'}`;
}

function mergeMedicalAppointments(liveEvents = [], localEvents = []) {
  const merged = new Map();
  const keyFor = (event) => {
    const id = String(event?.id || "").trim();
    if (id) return "id:" + id;
    const title = normalizeForMatch(event?.title || "");
    const startsAt = String(event?.startsAt || "");
    return "semantic:" + title + "|" + startsAt;
  };

  for (const event of [...localEvents, ...liveEvents]) {
    if (!event) continue;
    const key = keyFor(event);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...event } : event);
  }

  return [...merged.values()]
    .filter((event) => {
      const end = new Date(event.endsAt || event.startsAt || "").getTime();
      return Number.isFinite(end) && end >= Date.now() - 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.startsAt || 0) - new Date(b.startsAt || 0));
}

async function loadMedicalAppointments() {
  const panel = document.querySelector("#medical-panel");
  if (!panel) return;

  const local = collectHealthEvents().filter((event) => event.healthKind === "medical");

  // Render the medical events already loaded in Agenda immediately. A second
  // CalDAV request must enrich this state, never erase it with a transient 0.
  if (local.length) {
    panel.innerHTML = renderMedicalSection(local, {
      sourceNote: "Citas médicas cargadas desde Agenda · refrescando iCloud…"
    });
  }

  try {
    const response = await fetch("/api/health/appointments", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("MEDICAL_APPOINTMENTS_" + response.status);
    const payload = await response.json();
    const live = Array.isArray(payload.events) ? payload.events : [];
    const events = mergeMedicalAppointments(live, local);
    const refreshedAt = payload.source?.updatedAt
      ? "iCloud actualizado " + eventDateLabel(payload.source.updatedAt, true)
      : "Fuente iCloud en directo";
    const selectedCalendars = Number(payload.source?.selectedCalendarCount);
    const matchedCalendars = Number(payload.source?.matchedCalendarCount);
    const missingCalendars = Array.isArray(payload.source?.missingCalendars)
      ? payload.source.missingCalendars.filter(Boolean)
      : [];
    const calendarStatus = Number.isFinite(selectedCalendars) && Number.isFinite(matchedCalendars) && selectedCalendars > 0
      ? ` · calendarios ${matchedCalendars}/${selectedCalendars} enlazados`
      : "";
    const missingStatus = missingCalendars.length
      ? ` · no encontrados: ${missingCalendars.join(", ")}`
      : "";
    const sourceNote = live.length
      ? refreshedAt + calendarStatus + missingStatus
      : local.length
        ? refreshedAt + calendarStatus + missingStatus + " · sin perder las citas ya cargadas en Agenda"
        : refreshedAt + calendarStatus + missingStatus;

    panel.innerHTML = renderMedicalSection(events, { sourceNote });
  } catch (error) {
    panel.innerHTML = renderMedicalSection(local, {
      sourceNote: local.length
        ? "No se ha podido refrescar iCloud; mostrando las citas ya cargadas en Agenda."
        : "No se ha podido consultar iCloud en este momento."
    });
    console.warn("Medical appointments load failed", error);
  }
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
  const energySampleTime = energy?.sampledAt && Number.isFinite(new Date(energy.sampledAt).getTime())
    ? new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(energy.sampledAt))
    : null;

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
        <small>${energy?.source
          ? `${escapeHtml(String(energy.source))}${energySampleTime ? ` · actualizado ${escapeHtml(energySampleTime)}` : ""}`
          : "Sin registro para esta fecha"}</small>
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
            ].filter(Boolean).concat(energySampleTime ? [`actualizado ${energySampleTime}`] : []).join(" · ")
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
            <option>Desayuno</option><option>Media mañana</option><option>Comida</option><option>Merienda</option><option>Cena</option><option>Otro</option>
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
function weeklyMenuItemIsVisible(item) {
  const status = String(item?.status || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/^(omitid[oa]|retirad[oa]|cancelad[oa]|cancelled|skipped)$/.test(status)) return false;

  const hasExplicitKcal = item?.kcal !== null && item?.kcal !== undefined && item?.kcal !== "";
  const hasExplicitProtein = item?.protein !== null && item?.protein !== undefined && item?.protein !== "";
  const explicitZero = hasExplicitKcal
    && hasExplicitProtein
    && Number(item.kcal) === 0
    && Number(item.protein) === 0;

  // A true unknown stays visible as "—"; an explicit 0/0 row is operational noise.
  return !explicitZero;
}

function weeklyMenuItemIsConsumed(item) {
  const status = String(item?.status || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /^(consumid[oa]|hech[oa]|completad[oa]|done|completed)$/.test(status);
}

function weeklyMenuModel(data) {
  const rows = (Array.isArray(data?.weeklyMenu) ? data.weeklyMenu : [])
    .filter(weeklyMenuItemIsVisible);
  const objective = data?.objective && typeof data.objective === "object" ? data.objective : {};
  const kcalTarget = objective.kcal == null ? null : Number(objective.kcal);
  const proteinTarget = objective.protein == null ? null : Number(objective.protein);
  const groups = new Map();

  for (const row of rows) {
    if (!groups.has(row.date)) groups.set(row.date, []);
    groups.get(row.date).push(row);
  }

  const momentOrder = new Map([
    ["manana oficina", 0],
    ["desayuno", 1],
    ["media manana", 2],
    ["comida", 3],
    ["merienda", 4],
    ["cena", 5],
    ["cena · complemento", 5],
    ["cena complemento", 5],
    ["complemento cena", 5],
    ["otro", 6]
  ]);
  const normalizedMoment = (value) => String(value || "Otro")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const days = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rawItems]) => {
      const items = [...rawItems].sort((a, b) =>
        (momentOrder.get(normalizedMoment(a.moment)) ?? 99)
        - (momentOrder.get(normalizedMoment(b.moment)) ?? 99)
      );
      const incompleteItems = items.filter((item) => item.kcal == null || item.protein == null);
      const nutritionComplete = incompleteItems.length === 0;
      const kcal = items.reduce((sum, item) => sum + (Number.isFinite(Number(item.kcal)) ? Number(item.kcal) : 0), 0);
      const protein = items.reduce((sum, item) => sum + (Number.isFinite(Number(item.protein)) ? Number(item.protein) : 0), 0);
      const consumedItems = items.filter(weeklyMenuItemIsConsumed);
      const consumedKcal = consumedItems.reduce((sum, item) => sum + (Number.isFinite(Number(item.kcal)) ? Number(item.kcal) : 0), 0);
      const consumedProtein = consumedItems.reduce((sum, item) => sum + (Number.isFinite(Number(item.protein)) ? Number(item.protein) : 0), 0);
      const consumedIncompleteItems = consumedItems.filter((item) => item.kcal == null || item.protein == null);
      const consumedNutritionComplete = consumedIncompleteItems.length === 0;
      const hasConsumed = consumedItems.length > 0;
      const hasPendingPlan = items.some((item) => !weeklyMenuItemIsConsumed(item));
      const kcalPct = nutritionComplete && Number.isFinite(kcalTarget) && kcalTarget > 0 ? Math.round((kcal / kcalTarget) * 100) : null;
      const proteinPct = nutritionComplete && Number.isFinite(proteinTarget) && proteinTarget > 0 ? Math.round((protein / proteinTarget) * 100) : null;
      return {
        date,
        items,
        kcal,
        protein,
        consumedKcal,
        consumedProtein,
        consumedIncompleteItems,
        consumedNutritionComplete,
        hasConsumed,
        hasPendingPlan,
        kcalPct,
        proteinPct,
        nutritionComplete,
        incompleteItems,
        kcalRemaining: nutritionComplete && Number.isFinite(kcalTarget) ? kcalTarget - kcal : null,
        proteinRemaining: nutritionComplete && Number.isFinite(proteinTarget) ? proteinTarget - protein : null
      };
    });

  return {
    rows,
    days,
    kcalTarget: Number.isFinite(kcalTarget) ? kcalTarget : null,
    proteinTarget: Number.isFinite(proteinTarget) ? proteinTarget : null
  };
}

function weeklyMenuTargetLine(day, model) {
  if (!day.nutritionComplete) {
    const pending = day.incompleteItems
      .filter((item) => item?.nutritionStatus === "pending-confirmation");
    if (pending.length) {
      const names = pending.map((item) => item.name).filter(Boolean).join(" · ");
      return `Pendiente de confirmar${names ? `: ${names}` : ""}. El total mostrado es solo el subtotal conocido; no se inventan macros.`;
    }
    const missing = day.incompleteItems
      .map((item) => item.name)
      .filter(Boolean)
      .join(" · ");
    return `Datos nutricionales incompletos${missing ? `: faltan ${missing}` : ""}. El total mostrado es solo el subtotal conocido.`;
  }

  const parts = [];
  if (model.kcalTarget !== null) {
    const delta = day.kcalRemaining;
    parts.push(delta >= 0
      ? `Quedan ${formatKcal(delta)}`
      : `${formatKcal(Math.abs(delta))} sobre kcal`);
  }
  if (model.proteinTarget !== null) {
    const delta = day.proteinRemaining;
    parts.push(delta > 0.5
      ? `faltan ${formatMacro(delta)} proteína`
      : delta < -0.5
        ? `${formatMacro(Math.abs(delta))} sobre proteína`
        : "proteína cubierta");
  }
  return parts.join(" · ");
}

function weeklyMenuDayLabel(date, options = {}) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("es-ES", {
    weekday: options.long ? "long" : "short",
    day: "numeric",
    month: "short"
  }).format(parsed).replace(".", "");
}

function weeklyMenuProgressVisualState(metric, value, target) {
  const numericValue = Number(value);
  const numericTarget = Number(target);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericTarget) || numericTarget <= 0) return null;

  const ratio = Math.max(0, numericValue / numericTarget);
  let quality = 0;

  if (metric === "kcal") {
    // 100% is ideal. Below target degrades gradually; overshooting is penalized faster.
    quality = ratio <= 1
      ? (ratio - 0.70) / 0.30
      : 1 - ((ratio - 1) / 0.10);
  } else {
    // Protein is a minimum/target: 100%+ is ideal; below 70% is a clear failure.
    quality = ratio >= 1 ? 1 : (ratio - 0.70) / 0.30;
  }

  quality = Math.max(0, Math.min(1, quality));
  const hue = Math.round(120 * quality);
  const lightness = quality >= 0.82 ? 38 : 46;
  return {
    pct: Math.round(ratio * 100),
    color: `hsl(${hue} 82% ${lightness}%)`,
    quality
  };
}

function renderNutritionQualityMeter(metric, value, target, label, incomplete = false) {
  const visual = weeklyMenuProgressVisualState(metric, value, target);
  if (!visual) return "";
  const width = Math.max(0, Math.min(100, visual.pct || 0));
  const qualityStep = Math.max(0, Math.min(10, Math.round((visual.quality || 0) * 10)));
  const toneClass = incomplete ? "is-neutral" : `q-${qualityStep}`;
  return `
    <div
      class="nutrition-quality-meter ${incomplete ? "is-incomplete" : ""}"
      role="progressbar"
      aria-label="${escapeHtml(label)}: ${visual.pct}% del objetivo${incomplete ? ", subtotal conocido; sin valoración final" : ""}"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${width}"
    >
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect class="nutrition-quality-meter-track" x="0" y="0" width="100" height="6" rx="3" ry="3"></rect>
        <rect class="nutrition-quality-meter-fill ${toneClass}" x="0" y="0" width="${width}" height="6" rx="3" ry="3"></rect>
      </svg>
    </div>`;
}

function renderWeeklyMenuProgress(label, value, target, pct, tone, incomplete = false) {
  if (!Number.isFinite(target) || target <= 0) {
    return `
      <div class="weekly-menu-progress ${tone}">
        <div><span>${escapeHtml(label)}</span><strong>${label === "Proteína" ? formatMacro(value) : formatKcal(value)}</strong></div>
        <small>Objetivo pendiente</small>
      </div>`;
  }

  const visual = weeklyMenuProgressVisualState(tone, value, target);
  const effectivePct = visual?.pct ?? (Number.isFinite(pct) ? pct : 0);
  const displayValue = label === "Proteína" ? formatMacro(value) : formatKcal(value);
  const displayTarget = label === "Proteína" ? formatMacro(target) : formatKcal(target);
  return `
    <div class="weekly-menu-progress ${tone} ${incomplete ? "is-incomplete" : ""}">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${incomplete ? "<small>Subtotal </small>" : ""}${displayValue} <small>/ ${displayTarget}</small></strong>
      </div>
      ${renderNutritionQualityMeter(tone, value, target, label, incomplete)}
      <small>${incomplete ? `Subtotal consumido conocido · ${effectivePct}% del objetivo` : `${effectivePct}% consumido del objetivo`}</small>
    </div>`;
}

function weeklyMenuIngredientAmount(ingredient) {
  const grams = Number(ingredient?.gramsForMeal);
  if (Number.isFinite(grams)) {
    return `${grams.toLocaleString("es-ES", { maximumFractionDigits: grams < 10 ? 1 : 0 })} g`;
  }
  const quantity = Number(ingredient?.quantityForMeal);
  if (Number.isFinite(quantity)) {
    return `${quantity.toLocaleString("es-ES", { maximumFractionDigits: quantity < 10 ? 1 : 0 })} ${ingredient?.unit || ""}`.trim();
  }
  return "—";
}

function renderWeeklyMenuEntityAction(item) {
  const recipeId = String(item?.recipeId || "").trim();
  if (recipeId) {
    if (!item?.recipe) {
      return '<span class="weekly-menu-sync-note">Receta vinculada pendiente de cargar</span>';
    }
    return `
      <button class="weekly-menu-entity-link" type="button" data-menu-recipe-open="${escapeHtml(recipeId)}">
        Abrir receta <span aria-hidden="true">→</span>
      </button>`;
  }

  const foodId = String(item?.foodId || "").trim();
  const pantryProductId = String(item?.pantryProductId || "").trim();
  if (foodId && item?.pantrySyncStatus === "linked" && pantryProductId) {
    return `
      <button class="weekly-menu-entity-link" type="button" data-menu-product-open="${escapeHtml(pantryProductId)}">
        Ver alimento en Despensa <span aria-hidden="true">→</span>
      </button>`;
  }
  if (foodId && item?.pantrySyncStatus === "missing") {
    return '<span class="weekly-menu-sync-note is-warning">Pendiente de sincronizar con Despensa</span>';
  }
  return "";
}

function renderWeeklyMenuIngredients(item) {
  const ingredients = Array.isArray(item?.ingredients) ? item.ingredients : [];
  const totalKcal = item.kcal == null ? null : Number(item.kcal);
  const totalProtein = item.protein == null ? null : Number(item.protein);
  const entityAction = renderWeeklyMenuEntityAction(item);

  if (!ingredients.length) {
    const quantity = Number(item?.quantity);
    const hasQuantity = Number.isFinite(quantity);
    const note = String(item?.note || "").trim();
    if (!hasQuantity && !note && !entityAction) return "";

    const amount = hasQuantity
      ? `${quantity.toLocaleString("es-ES", { maximumFractionDigits: quantity < 10 ? 1 : 0 })} ${item?.unit || ""}`.trim()
      : "—";

    return `
      <details class="weekly-menu-ingredients weekly-menu-ingredients-fallback">
        <summary>Ver ingredientes y cantidades</summary>
        <div class="weekly-menu-ingredients-table-wrap">
          <table class="weekly-menu-ingredients-table">
            <colgroup>
              <col class="weekly-menu-col-ingredient">
              <col class="weekly-menu-col-grams">
              <col class="weekly-menu-col-kcal">
              <col class="weekly-menu-col-protein">
            </colgroup>
            <thead>
              <tr>
                <th>Comida</th>
                <th>Cantidad</th>
                <th>kcal</th>
                <th>Prot.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(item?.name || "Comida")}</td>
                <td>${escapeHtml(amount)}</td>
                <td>${Number.isFinite(totalKcal) ? escapeHtml(formatKcal(totalKcal)) : "—"}</td>
                <td>${Number.isFinite(totalProtein) ? escapeHtml(formatMacro(totalProtein)) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ${note ? `<small class="weekly-menu-ingredients-note weekly-menu-ingredients-detail">${escapeHtml(note)}</small>` : ""}
        ${entityAction}
      </details>`;
  }

  return `
    <details class="weekly-menu-ingredients">
      <summary>Ver ingredientes y cantidades</summary>
      <div class="weekly-menu-ingredients-table-wrap">
        <table class="weekly-menu-ingredients-table">
          <colgroup>
            <col class="weekly-menu-col-ingredient">
            <col class="weekly-menu-col-grams">
            <col class="weekly-menu-col-kcal">
            <col class="weekly-menu-col-protein">
          </colgroup>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>g</th>
              <th>kcal</th>
              <th>Prot.</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map((ingredient) => {
              const kcal = Number(ingredient?.kcalForMeal);
              const protein = Number(ingredient?.proteinForMeal);
              return `
                <tr>
                  <td>${escapeHtml(ingredient.name || "Ingrediente")}</td>
                  <td>${escapeHtml(weeklyMenuIngredientAmount(ingredient))}</td>
                  <td>${Number.isFinite(kcal) ? escapeHtml(formatKcal(kcal)) : "—"}</td>
                  <td>${Number.isFinite(protein) ? escapeHtml(formatMacro(protein)) : "—"}</td>
                </tr>`;
            }).join("")}
          </tbody>
          <tfoot>
            <tr>
              <th>Total de tu ración</th>
              <th></th>
              <th>${Number.isFinite(totalKcal) ? escapeHtml(formatKcal(totalKcal)) : "—"}</th>
              <th>${Number.isFinite(totalProtein) ? escapeHtml(formatMacro(totalProtein)) : "—"}</th>
            </tr>
          </tfoot>
        </table>
      </div>
      <small class="weekly-menu-ingredients-note">${weeklyMenuItemIsConsumed(item) ? "Cantidades registradas como consumidas." : "Cantidades previstas para tu ración; se registrarán como consumidas cuando confirmes la comida."}</small>
      ${entityAction}
    </details>`;
}

function renderWeeklyMenuItemTitle(item, interactive = true) {
  const label = escapeHtml(item?.name || "Comida");
  if (!interactive) return `<strong>${label}</strong>`;

  const recipeId = String(item?.recipeId || "").trim();
  if (recipeId && item?.recipe) {
    return `
      <button class="weekly-menu-title-link" type="button" data-menu-recipe-open="${escapeHtml(recipeId)}" aria-label="Abrir receta: ${label}">
        <strong>${label}</strong><span aria-hidden="true">↗</span>
      </button>`;
  }

  const pantryProductId = String(item?.pantryProductId || "").trim();
  if (pantryProductId && item?.pantrySyncStatus === "linked") {
    return `
      <button class="weekly-menu-title-link" type="button" data-menu-product-open="${escapeHtml(pantryProductId)}" aria-label="Abrir alimento en Despensa: ${label}">
        <strong>${label}</strong><span aria-hidden="true">↗</span>
      </button>`;
  }

  return `<strong>${label}</strong>`;
}

function renderWeeklyMenuMeal(item, compact = false, showMoment = true) {
  const kcal = item.kcal == null ? "— kcal" : formatKcal(item.kcal);
  const protein = item.protein == null ? "P —" : `P ${formatMacro(item.protein)}`;
  const quantity = Number.isFinite(Number(item.quantity))
    ? `${Number(item.quantity).toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${item.unit || ""}`.trim()
    : "";
  const consumed = weeklyMenuItemIsConsumed(item);
  return `
    <article class="weekly-menu-meal ${consumed ? "is-consumed" : ""}">
      <div class="weekly-menu-meal-main">
        <div class="weekly-menu-meal-copy">
          ${showMoment ? `<span class="weekly-menu-moment">${escapeHtml(item.moment || "Otro")}</span>` : ""}
          ${renderWeeklyMenuItemTitle(item, !compact)}
          ${!compact && (quantity || item.note || item.gymSession) ? `
            <p>${[
              quantity,
              item.gymSession ? escapeHtml(item.gymSession) : "",
              item.note ? escapeHtml(item.note) : ""
            ].filter(Boolean).join(" · ")}</p>` : ""}
        </div>
        <div class="weekly-menu-meal-macros">
          <b>${kcal}</b>
          <span>${protein}</span>
        </div>
      </div>
      ${compact ? "" : renderWeeklyMenuIngredients(item)}
    </article>`;
}

function renderWeeklyMenuGroupItems(rows, compact = false) {
  return `
    <div class="weekly-menu-group-items ${compact ? "is-compact" : ""}">
      ${rows.map((item) => {
        const consumed = weeklyMenuItemIsConsumed(item);
        const kcal = item.kcal == null ? "— kcal" : formatKcal(item.kcal);
        const protein = item.protein == null ? "P —" : `P ${formatMacro(item.protein)}`;
        const quantity = Number.isFinite(Number(item.quantity))
          ? `${Number(item.quantity).toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${item.unit || ""}`.trim()
          : "";
        return `
          <div class="weekly-menu-group-item ${consumed ? "is-consumed" : ""}">
            <div class="weekly-menu-group-item-copy">
              ${renderWeeklyMenuItemTitle(item, !compact)}
              ${!compact && quantity ? `<small>${escapeHtml(quantity)}</small>` : ""}
            </div>
            <div class="weekly-menu-group-item-macros">
              <b>${kcal}</b>
              <span>${protein}</span>
            </div>
          </div>`;
      }).join("")}
    </div>`;
}

function renderWeeklyMenuMealGroup(items) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!rows.length) return "";
  if (rows.length === 1) return renderWeeklyMenuMeal(rows[0]);

  const consumed = rows.every(weeklyMenuItemIsConsumed);
  const moment = canonicalWeeklyMenuMoment(rows[0]);
  const incomplete = rows.some((item) => item.kcal == null || item.protein == null);
  const knownKcal = rows.reduce((sum, item) => sum + (Number.isFinite(Number(item.kcal)) ? Number(item.kcal) : 0), 0);
  const knownProtein = rows.reduce((sum, item) => sum + (Number.isFinite(Number(item.protein)) ? Number(item.protein) : 0), 0);

  return `
    <article class="weekly-menu-meal weekly-menu-meal-grouped ${consumed ? "is-consumed" : ""}">
      <div class="weekly-menu-meal-copy">
        <span class="weekly-menu-moment">${escapeHtml(moment)}</span>
        ${renderWeeklyMenuGroupItems(rows)}
        ${incomplete ? `<small class="weekly-menu-group-subtotal">Subtotal conocido · ${escapeHtml(formatKcal(knownKcal))} · P ${escapeHtml(formatMacro(knownProtein))}</small>` : ""}
      </div>
      <details class="weekly-menu-ingredients">
        <summary>Ver componentes y cantidades</summary>
        <div class="weekly-menu-ingredients-table-wrap">
          <table class="weekly-menu-ingredients-table">
            <thead>
              <tr>
                <th>Componente</th>
                <th>Cantidad</th>
                <th>kcal</th>
                <th>Prot.</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((item) => {
                const quantity = Number.isFinite(Number(item.quantity))
                  ? `${Number(item.quantity).toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${item.unit || ""}`.trim()
                  : "—";
                return `
                  <tr class="${weeklyMenuItemIsConsumed(item) ? "is-consumed" : ""}">
                    <td>
                      ${escapeHtml(item.name || "Comida")}
                      ${renderWeeklyMenuEntityAction(item)}
                    </td>
                    <td>${escapeHtml(quantity)}</td>
                    <td>${item.kcal == null ? "—" : escapeHtml(formatKcal(item.kcal))}</td>
                    <td>${item.protein == null ? "—" : escapeHtml(formatMacro(item.protein))}</td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </details>
    </article>`;
}

function renderMenuMasterLinks() {
  return `
    <nav class="master-source-links" aria-label="Maestros de datos del menú">
      <span>Maestros</span>
      <a href="/api/source-link?target=pantry-products" target="_blank" rel="noopener noreferrer">Productos ↗</a>
      <a href="/api/source-link?target=health-foods" target="_blank" rel="noopener noreferrer">Comidas ↗</a>
      <a href="/api/source-link?target=health-recipes" target="_blank" rel="noopener noreferrer">Recetas ↗</a>
    </nav>`;
}

async function openMenuPantryProduct(panel, data, productId) {
  const onBack = () => renderMenuPanel(data);
  panel.innerHTML = `
    <button type="button" class="recipe-back" data-menu-product-back>← Volver al menú</button>
    <p class="recipe-pending" role="status">Cargando ficha de Despensa…</p>`;
  panel.querySelector("[data-menu-product-back]")?.addEventListener("click", onBack);

  try {
    const [pantryResponse, detailResponse] = await Promise.all([
      fetch("/api/pantry", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(`/api/pantry/products/${encodeURIComponent(productId)}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } })
    ]);
    if (!pantryResponse.ok || !detailResponse.ok) throw new Error("PANTRY_PRODUCT_" + detailResponse.status);
    const [pantry, detail] = await Promise.all([pantryResponse.json(), detailResponse.json()]);
    const { renderProductDetail } = await import("./pantry.js?v=0.42.21");
    renderProductDetail(detail.item, pantry, {
      container: panel,
      onBack,
      backLabel: "← Volver al menú"
    });
  } catch (error) {
    panel.innerHTML = `
      <button type="button" class="recipe-back" data-menu-product-back>← Volver al menú</button>
      <div class="pantry-source-error">
        <strong>No se ha podido cargar la ficha de Despensa</strong>
        <p>El vínculo canónico se conserva. Puedes reintentar sin crear otro alimento.</p>
        <button type="button" data-menu-product-retry>Reintentar</button>
      </div>`;
    panel.querySelector("[data-menu-product-back]")?.addEventListener("click", onBack);
    panel.querySelector("[data-menu-product-retry]")?.addEventListener("click", () => void openMenuPantryProduct(panel, data, productId));
    console.warn("Menu Pantry product load failed", error);
  }
}

function bindMenuEntityLinks(panel, data) {
  const recipes = Array.isArray(data?.recipes) ? data.recipes : [];

  panel.querySelectorAll("[data-menu-recipe-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const recipeId = String(button.dataset.menuRecipeOpen || "");
      const recipe = recipes.find((candidate) => String(candidate.id || "") === recipeId);
      const recipesPanel = document.querySelector("#recipes-panel");
      if (!recipe || !recipesPanel) return;

      document.querySelector('[data-health-tab="recipes"]')?.click();
      renderRecipeDetail(recipesPanel, data, recipe, {
        backLabel: "← Volver al menú",
        onBack: () => {
          document.querySelector('[data-health-tab="menu"]')?.click();
          renderMenuPanel(data);
        }
      });
      recipesPanel.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  });

  panel.querySelectorAll("[data-menu-product-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = String(button.dataset.menuProductOpen || "");
      if (productId) void openMenuPantryProduct(panel, data, productId);
    });
  });
}

function renderMenuPanel(data) {
  const panel = document.querySelector("#menu-panel");
  if (!panel) return;

  const model = weeklyMenuModel(data);
  if (!model.rows.length) {
    panel.innerHTML = `
      ${renderMenuMasterLinks()}
      <div class="health-empty health-empty-card">
        <strong>Menú semanal preparado, pero todavía vacío</strong>
        <p>La hoja MenuSemanal ya está conectada. Cuando el gestor de Salud añada propuestas o un menú objetivo, aparecerán aquí sin inventar comidas intermedias.</p>
      </div>`;
    return;
  }

  panel.innerHTML = `
    <div class="weekly-menu-hero">
      <div>
        <p class="context-label">Plan nutricional</p>
        <h3>Menú objetivo de la semana</h3>
        <p>Las barras se rellenan únicamente con consumo confirmado. El plan semanal permanece como referencia hasta que cada alimento o comida se marque como consumido.</p>
      </div>
      <div class="weekly-menu-objective-chips">
        <span><small>Objetivo kcal</small><strong>${model.kcalTarget === null ? "Pendiente" : formatKcal(model.kcalTarget)}</strong></span>
        <span><small>Objetivo proteína</small><strong>${model.proteinTarget === null ? "Pendiente" : formatMacro(model.proteinTarget)}</strong></span>
      </div>
    </div>

    ${renderMenuMasterLinks()}

    <div class="weekly-menu-grid weekly-menu-grid-rich">
      ${model.days.map((day) => {
        const isToday = day.date === localDateKey();
        const targetLine = weeklyMenuTargetLine(day, model);
        const mealGroups = groupWeeklyMenuItemsByMoment(day.items);
        const display = weeklyMenuDayDisplayTotals(day, model);
        return `
          <section class="weekly-menu-day weekly-menu-day-rich ${isToday ? "is-today" : ""}">
            <header>
              <div>
                <small>${display.hasConsumed
                  ? (day.hasPendingPlan ? "Consumo confirmado · plan pendiente" : "Consumo confirmado")
                  : (isToday ? "Hoy · sin consumo confirmado" : "Planificado · sin consumo confirmado")}</small>
                <strong>${escapeHtml(weeklyMenuDayLabel(day.date, { long: true }))}</strong>
              </div>
              <span>${mealGroups.length} toma${mealGroups.length === 1 ? "" : "s"} · ${day.items.length} elemento${day.items.length === 1 ? "" : "s"}</span>
            </header>

            <div class="weekly-menu-day-progress">
              ${renderWeeklyMenuProgress("Calorías", display.kcal, model.kcalTarget, display.kcalPct, "kcal", !day.consumedNutritionComplete)}
              ${renderWeeklyMenuProgress("Proteína", display.protein, model.proteinTarget, display.proteinPct, "protein", !day.consumedNutritionComplete)}
            </div>

            <div class="weekly-menu-meal-list">
              ${mealGroups.map((group) => renderWeeklyMenuMealGroup(group.items)).join("")}
            </div>

            ${day.hasPendingPlan
              ? `<footer>Consumo confirmado: ${escapeHtml(formatKcal(display.kcal))} · ${escapeHtml(formatMacro(display.protein))}. Plan previsto: ${escapeHtml(formatKcal(day.kcal))} · ${escapeHtml(formatMacro(day.protein))}.${!day.nutritionComplete && targetLine ? " " + escapeHtml(targetLine) : ""}</footer>`
              : (targetLine ? `<footer>${escapeHtml(targetLine)}</footer>` : "")}
          </section>`;
      }).join("")}
    </div>`;

  bindMenuEntityLinks(panel, data);
}

function hideHomeWeeklyMenu() {
  const panel = document.querySelector("#home-weekly-menu-panel");
  const content = document.querySelector("#home-weekly-menu-content");
  if (!panel || !content) return;
  panel.hidden = true;
  content.innerHTML = "";
}

function renderHomeWeeklyMenuUnavailable() {
  const panel = document.querySelector("#home-weekly-menu-panel");
  const content = document.querySelector("#home-weekly-menu-content");
  if (!panel || !content) return;
  panel.hidden = false;
  content.innerHTML = `
    <div class="home-weekly-menu-state">
      <strong>Menú semanal temporalmente no disponible</strong>
      <p>La fuente sigue existiendo. Este bloque se mantiene visible para que un fallo de Nutrición no haga desaparecer la sección.</p>
    </div>`;
}

function normalizeWeeklyMenuMoment(value) {
  return String(value || "Otro")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function canonicalWeeklyMenuMoment(item) {
  const raw = String(item?.moment || "Otro").trim() || "Otro";
  const moment = normalizeWeeklyMenuMoment(raw);
  const context = normalizeWeeklyMenuMoment([raw, item?.name || item?.itemName, item?.note].filter(Boolean).join(" "));

  if (/^postre\b/.test(moment)) {
    if (/\b(comida|almuerzo|mediodia)\b/.test(context)) return "Comida";
    return "Cena";
  }

  if (/^snack\b/.test(moment)) {
    if (/\b(media manana|manana)\b/.test(context) && !/\b(despues oficina|tarde|merienda)\b/.test(context)) {
      return "Media mañana";
    }
    return "Merienda";
  }

  if (/^(cena\s*·?\s*complemento|complemento\s+cena)$/.test(moment)) return "Cena";
  if (/^cierre\b/.test(moment)) return "Cena";
  return raw;
}

function renderHomeWeeklyMenuMealGroup(items) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!rows.length) return "";
  if (rows.length === 1) return renderWeeklyMenuMeal({ ...rows[0], moment: canonicalWeeklyMenuMoment(rows[0]) }, true);

  const moment = canonicalWeeklyMenuMoment(rows[0]);
  const consumed = rows.every(weeklyMenuItemIsConsumed);

  return `
    <article class="weekly-menu-meal weekly-menu-meal-grouped ${consumed ? "is-consumed" : ""}">
      <div class="weekly-menu-meal-copy">
        <span class="weekly-menu-moment">${escapeHtml(moment)}</span>
        ${renderWeeklyMenuGroupItems(rows, true)}
      </div>
    </article>`;
}

function groupWeeklyMenuItemsByMoment(items) {
  const groups = [];
  const byKey = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const label = canonicalWeeklyMenuMoment(item);
    const key = normalizeWeeklyMenuMoment(label);
    if (!byKey.has(key)) {
      const group = { key, label, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(item);
  }
  return groups;
}

function weeklyMenuMomentRank(value) {
  const order = new Map([
    ["manana oficina", 0],
    ["desayuno", 1],
    ["media manana", 2],
    ["comida", 3],
    ["merienda", 4],
    ["cena", 5],
    ["otro", 6]
  ]);
  return order.get(normalizeWeeklyMenuMoment(value)) ?? 99;
}

function weeklyMenuMatrixMoments(days) {
  const found = new Map();
  for (const day of Array.isArray(days) ? days : []) {
    for (const item of Array.isArray(day?.items) ? day.items : []) {
      const label = canonicalWeeklyMenuMoment(item);
      const key = normalizeWeeklyMenuMoment(label);
      if (!found.has(key)) found.set(key, label);
    }
  }
  return [...found.entries()]
    .sort((a, b) => weeklyMenuMomentRank(a[1]) - weeklyMenuMomentRank(b[1]) || a[1].localeCompare(b[1], "es"))
    .map(([key, label]) => ({ key, label }));
}

function weeklyMenuItemsForMoment(day, momentKey) {
  return (Array.isArray(day?.items) ? day.items : [])
    .filter((item) => normalizeWeeklyMenuMoment(canonicalWeeklyMenuMoment(item)) === momentKey);
}

function renderHomeWeeklyMenuMatrixCell(items) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!rows.length) return '<span class="home-weekly-menu-empty-cell">—</span>';

  return `
    <div class="weekly-menu-group-items is-compact">
      ${rows.map((item) => {
        const consumed = weeklyMenuItemIsConsumed(item);
        const kcal = item.kcal == null ? "— kcal" : formatKcal(item.kcal);
        const protein = item.protein == null ? "P —" : `P ${formatMacro(item.protein)}`;
        const recipeId = String(item?.recipeId || "").trim();
        const title = recipeId
          ? `
            <button class="weekly-menu-title-link home-weekly-menu-recipe-link" type="button" data-home-menu-recipe-open="${escapeHtml(recipeId)}" aria-label="Abrir receta: ${escapeHtml(item.name || "Comida")}">
              <strong>${escapeHtml(item.name || "Comida")}</strong><span aria-hidden="true">↗</span>
            </button>`
          : `<strong>${escapeHtml(item.name || "Comida")}</strong>`;

        return `
          <div class="weekly-menu-group-item ${consumed ? "is-consumed" : ""}">
            <div class="weekly-menu-group-item-copy">
              ${title}
            </div>
            <div class="weekly-menu-group-item-macros">
              <b>${kcal}</b>
              <span>${protein}</span>
            </div>
          </div>`;
      }).join("")}
    </div>`;
}

async function openHomeWeeklyMenuRecipe(data, recipeId) {
  let payload = data;
  let recipe = (Array.isArray(payload?.recipes) ? payload.recipes : [])
    .find((candidate) => String(candidate?.id || "") === String(recipeId || ""));

  if (!recipe) {
    const response = await fetch("/api/nutrition?date=" + encodeURIComponent(localDateKey()), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("HOME_RECIPE_" + response.status);
    payload = await response.json();
    recipe = (Array.isArray(payload?.recipes) ? payload.recipes : [])
      .find((candidate) => String(candidate?.id || "") === String(recipeId || ""));
  }

  if (!recipe) throw new Error("HOME_RECIPE_NOT_FOUND");

  openHealthDetail({ skipNutritionLoad: true });
  document.querySelector('[data-health-tab="recipes"]')?.click();
  const recipesPanel = document.querySelector("#recipes-panel");
  if (!recipesPanel) return;

  renderRecipeDetail(recipesPanel, payload, recipe, {
    backLabel: "← Volver al resumen",
    onBack: () => document.querySelector("#detail-dialog")?.close()
  });
}

function bindHomeWeeklyMenuRecipeLinks(content, data) {
  content.querySelectorAll("[data-home-menu-recipe-open]").forEach((button) => {
    button.addEventListener("click", () => {
      button.disabled = true;
      void openHomeWeeklyMenuRecipe(data, button.dataset.homeMenuRecipeOpen)
        .catch((error) => {
          console.warn("Home weekly menu recipe open failed", error);
          button.disabled = false;
        });
    });
  });
}

function focusHomeWeeklyMenuOnToday(content) {
  if (!content) return;
  const today = localDateKey();
  if (content.dataset.weeklyMenuFocusedDate === today) return;

  requestAnimationFrame(() => {
    const scroller = content.querySelector(".home-weekly-menu-table-scroll");
    const todayHeader = content.querySelector(`[data-menu-date="${CSS.escape(today)}"]`);
    if (!scroller || !todayHeader) return;

    const rowLabelWidth = content.querySelector(".home-weekly-menu-corner")?.offsetWidth || 0;
    const left = Math.max(0, todayHeader.offsetLeft - rowLabelWidth - 8);
    scroller.scrollTo({ left, behavior: "auto" });
    content.dataset.weeklyMenuFocusedDate = today;
  });
}

function weeklyMenuDayDisplayTotals(day, model) {
  const kcal = Number(day?.consumedKcal || 0);
  const protein = Number(day?.consumedProtein || 0);
  const kcalPct = Number.isFinite(Number(model?.kcalTarget)) && Number(model.kcalTarget) > 0
    ? Math.round((kcal / Number(model.kcalTarget)) * 100)
    : null;
  const proteinPct = Number.isFinite(Number(model?.proteinTarget)) && Number(model.proteinTarget) > 0
    ? Math.round((protein / Number(model.proteinTarget)) * 100)
    : null;
  return {
    hasConsumed: Boolean(day?.hasConsumed),
    kcal,
    protein,
    kcalPct,
    proteinPct
  };
}

function renderHomeWeeklyMenuDayHeader(day, model) {
  const isToday = day.date === localDateKey();
  const display = weeklyMenuDayDisplayTotals(day, model);
  const plannedIncomplete = !day.nutritionComplete;
  const consumedIncomplete = !day.consumedNutritionComplete;
  const stateLabel = display.hasConsumed
    ? (display.kcalPct == null ? "Consumo confirmado" : display.kcalPct + "% kcal consumidas")
    : "0% consumido";
  const kcalPlanQualifier = plannedIncomplete ? "subtotal previsto" : "previsto";
  const proteinPlanQualifier = plannedIncomplete ? "subtotal previsto" : "previsto";
  const kcalConsumedLabel = consumedIncomplete ? "Subtotal consumido conocido" : "Consumido";
  const proteinConsumedLabel = consumedIncomplete ? "Subtotal consumido conocido" : "Consumido";

  return `
    <div data-menu-date="${escapeHtml(day.date)}" class="home-weekly-menu-table-day ${isToday ? "is-today" : ""}">
      <header>
        <div>
          <small>${isToday ? "Hoy" : "Día"}</small>
          <strong>${escapeHtml(weeklyMenuDayLabel(day.date))}</strong>
        </div>
        <span>${escapeHtml(stateLabel)}</span>
      </header>
      <div class="home-weekly-menu-progress">
        <div>
          <span><i class="kcal"></i>Kcal</span>
          <b>${formatKcal(day.kcal)} <small>${escapeHtml(kcalPlanQualifier)}${model.kcalTarget !== null ? ` · obj. ${formatKcal(model.kcalTarget)}` : ""}</small></b>
          ${model.kcalTarget !== null
            ? renderNutritionQualityMeter("kcal", display.kcal, model.kcalTarget, "Kcal consumidas", consumedIncomplete)
            : ""}
          <small class="home-weekly-menu-consumed-line">${escapeHtml(kcalConsumedLabel)}: ${escapeHtml(formatKcal(display.kcal))}${display.kcalPct == null ? "" : ` · ${display.kcalPct}%`}</small>
        </div>
        <div>
          <span><i class="protein"></i>Proteína</span>
          <b>${formatMacro(day.protein)} <small>${escapeHtml(proteinPlanQualifier)}${model.proteinTarget !== null ? ` · obj. ${formatMacro(model.proteinTarget)}` : ""}</small></b>
          ${model.proteinTarget !== null
            ? renderNutritionQualityMeter("protein", display.protein, model.proteinTarget, "Proteína consumida", consumedIncomplete)
            : ""}
          <small class="home-weekly-menu-consumed-line">${escapeHtml(proteinConsumedLabel)}: ${escapeHtml(formatMacro(display.protein))}${display.proteinPct == null ? "" : ` · ${display.proteinPct}%`}</small>
        </div>
      </div>
    </div>`;
}

function renderHomeWeeklyMenu(data) {
  const panel = document.querySelector("#home-weekly-menu-panel");
  const content = document.querySelector("#home-weekly-menu-content");
  if (!panel || !content) return;

  const model = weeklyMenuModel(data);
  panel.hidden = false;

  if (!model.rows.length) {
    content.innerHTML = `
      <div class="home-weekly-menu-state">
        <strong>Menú semanal sin filas para esta semana</strong>
        <p>La sección permanece visible para distinguir un menú vacío de un error de carga.</p>
      </div>`;
    return;
  }

  const moments = weeklyMenuMatrixMoments(model.days);

  content.innerHTML = `
    <div class="home-weekly-menu-table-scroll" role="region" aria-label="Menú semanal por momento y día" tabindex="0">
      <div class="home-weekly-menu-table">
        <div class="home-weekly-menu-corner">
          <span>Momento</span>
        </div>
        ${model.days.map((day) => renderHomeWeeklyMenuDayHeader(day, model)).join("")}

        ${moments.map((moment) => `
          <div class="home-weekly-menu-row-label">
            <span>${escapeHtml(moment.label)}</span>
          </div>
          ${model.days.map((day) => {
            const rows = weeklyMenuItemsForMoment(day, moment.key);
            const allConsumed = rows.length > 0 && rows.every(weeklyMenuItemIsConsumed);
            return `
              <div
                class="home-weekly-menu-table-cell ${allConsumed ? "is-consumed" : ""}"
                data-menu-date="${escapeHtml(day.date)}"
                data-menu-moment="${escapeHtml(moment.key)}"
              >
                ${renderHomeWeeklyMenuMatrixCell(rows)}
              </div>`;
          }).join("")}
        `).join("")}
      </div>
    </div>`;

  focusHomeWeeklyMenuOnToday(content);
  bindHomeWeeklyMenuRecipeLinks(content, data);
}

function formatRecipeAmount(ingredient) {
  const quantity = ingredient?.quantity == null || ingredient.quantity === "" ? NaN : Number(ingredient.quantity);
  const grams = ingredient?.grams == null || ingredient.grams === "" ? NaN : Number(ingredient.grams);
  if (Number.isFinite(quantity)) {
    const unit = String(ingredient?.unit || "").trim();
    return `${quantity.toLocaleString("es-ES", { maximumFractionDigits: quantity < 10 ? 1 : 0 })}${unit ? " " + unit : ""}`;
  }
  if (Number.isFinite(grams)) {
    return `${grams.toLocaleString("es-ES", { maximumFractionDigits: grams < 10 ? 1 : 0 })} g`;
  }
  return "";
}

function recipePhotoMarkup(recipe, loading = "lazy") {
  return recipe.photoUrl
    ? `<img src="${escapeHtml(recipe.photoUrl)}" alt="Foto de ${escapeHtml(recipe.name || "receta")}" loading="${escapeHtml(loading)}">`
    : `<div class="recipe-photo-placeholder" aria-label="Receta sin foto"><span>⌁</span><small>Sin foto todavía</small></div>`;
}

function recipeMacrosLabel(recipe) {
  return [
    recipe.kcalPerServing == null ? null : formatKcal(recipe.kcalPerServing),
    recipe.proteinPerServing == null ? null : `P ${formatMacro(recipe.proteinPerServing)}`
  ].filter(Boolean).join(" · ");
}

function renderRecipeDetail(panel, data, recipe, options = {}) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const onBack = typeof options.onBack === "function" ? options.onBack : () => renderRecipesPanel(data);
  const backLabel = options.backLabel || "← Volver al recetario";
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const macros = recipeMacrosLabel(recipe);

  panel.innerHTML = `
    <div class="recipe-detail-toolbar">
      <button class="recipe-back" type="button" data-recipes-back>${escapeHtml(backLabel)}</button>
      <a class="master-source-link" href="/api/source-link?target=health-recipes" target="_blank" rel="noopener noreferrer">Abrir Sheet ↗</a>
    </div>

    <article class="recipe-card recipe-detail-card" data-recipe-id="${escapeHtml(recipe.id || "")}">
      <div class="recipe-photo recipe-detail-photo">
        ${recipePhotoMarkup(recipe, "eager")}
      </div>
      <div class="recipe-card-body">
        <header>
          <div>
            <p class="context-label">Nutrición · receta</p>
            <h4>${escapeHtml(recipe.name || "Receta")}</h4>
            <p>${recipe.servings == null ? "Raciones pendientes" : `${Number(recipe.servings).toLocaleString("es-ES")} ración${Number(recipe.servings) === 1 ? "" : "es"}`}${macros ? " · " + escapeHtml(macros) : ""}</p>
          </div>
          ${recipe.precision ? `<span class="recipe-precision">${escapeHtml(recipe.precision)}</span>` : ""}
        </header>

        <div class="recipe-detail-sections">
          <section class="recipe-section recipe-ingredients">
            <h5>Ingredientes</h5>
            ${ingredients.length
              ? `<p class="recipe-ingredient-hint">Pulsa un alimento para ver macros, precio y ficha de producto.</p><ul>${ingredients.map((ingredient, index) => `
                  <li>
                    <button class="recipe-ingredient-link" type="button" data-recipe-ingredient="${index}" aria-label="Ver ficha de ${escapeHtml(ingredient.name || "Ingrediente")}">${escapeHtml(ingredient.name || "Ingrediente")} <span aria-hidden="true">↗</span></button>
                    <strong>${escapeHtml(formatRecipeAmount(ingredient) || "—")}</strong>
                  </li>`).join("")}</ul>`
              : '<p class="recipe-pending">Ingredientes pendientes de confirmar.</p>'}
          </section>

          <section class="recipe-section recipe-steps">
            <h5>Preparación</h5>
            ${steps.length
              ? `<ol>${steps.map((step) => `
                  <li>
                    <span>${escapeHtml(step.instruction || "")}</span>
                    ${step.timeMinutes != null || step.temperature || step.utensil
                      ? `<small>${[
                          step.timeMinutes != null ? `${Number(step.timeMinutes)} min` : null,
                          step.temperature || null,
                          step.utensil || null
                        ].filter(Boolean).map(escapeHtml).join(" · ")}</small>`
                      : ""}
                  </li>`).join("")}</ol>`
              : '<p class="recipe-pending">Preparación pendiente de confirmar.</p>'}
          </section>
        </div>

        ${recipe.note ? `<p class="recipe-note">${escapeHtml(recipe.note)}</p>` : ""}
      </div>
    </article>
  `;

  panel.querySelector("[data-recipes-back]")?.addEventListener("click", onBack);
  panel.querySelectorAll("[data-recipe-ingredient]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const { openRecipeIngredient } = await import("./recipe-products.js?v=0.42.1");
        if (!button.isConnected) return;
        await openRecipeIngredient(panel, ingredients[Number(button.dataset.recipeIngredient)], recipe, () => {
          renderRecipeDetail(panel, data, recipe, options);
          panel.querySelector(`[data-recipe-ingredient="${button.dataset.recipeIngredient}"]`)?.focus({ preventScroll: true });
        });
      } catch {
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = "No se pudo abrir. Pulsa para reintentar";
        }
      }
    });
  });
}

function renderRecipesPanel(data) {
  const panel = document.querySelector("#recipes-panel");
  if (!panel) return;

  const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
  panel.innerHTML = `
    <div class="recipes-toolbar">
      <div>
        <p class="context-label">Nutrición · recetario</p>
        <h3>Recetas</h3>
        <p>Pulsa una receta para abrir su ficha completa con ingredientes y preparación.</p>
      </div>
      <a class="master-source-link" href="/api/source-link?target=health-recipes" target="_blank" rel="noopener noreferrer">Abrir Sheet ↗</a>
    </div>

    ${recipes.length ? `
      <div class="recipes-grid">
        ${recipes.map((recipe) => `
          <button
            class="recipe-card recipe-catalog-card"
            type="button"
            data-recipe-open="${escapeHtml(recipe.id || "")}"
            aria-label="Abrir receta ${escapeHtml(recipe.name || "Receta")}"
          >
            <span class="recipe-photo recipe-catalog-photo">
              ${recipePhotoMarkup(recipe)}
            </span>
            <strong>${escapeHtml(recipe.name || "Receta")}</strong>
          </button>
        `).join("")}
      </div>`
      : '<div class="health-empty health-empty-card"><strong>Recetario preparado</strong><p>Cuando se añada la primera receta a la fuente privada, aparecerá aquí automáticamente.</p></div>'}
  `;

  panel.querySelectorAll("[data-recipe-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const recipe = recipes.find((candidate) => String(candidate.id || "") === String(button.dataset.recipeOpen || ""));
      if (recipe) renderRecipeDetail(panel, data, recipe);
    });
  });
}

function renderNutritionEntries(entries) {
  if (!entries.length) return '<p class="health-empty">Todavía no hay comidas registradas para este día.</p>';

  const order = ["Mañana oficina", "Desayuno", "Media mañana", "Comida", "Merienda", "Cena", "Otro"];
  const groups = new Map();
  for (const entry of entries) {
    const key = canonicalWeeklyMenuMoment({ moment: entry.moment, itemName: entry.itemName, note: entry.note });
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

let gymPanelData = null;
let gymLibraryMeta = null;
const GYM_CUSTOM_ANIMATIONS = [
  {
    key: "press-banca-plano-barra",
    animationUrl: "./assets/gym-animations/press-banca-plano-barra-v5.gif",
    posterUrl: "./assets/gym-animations/press-banca-plano-barra-poster-v5.png",
    labels: ["press de banca plano barra", "press banca plano barra", "flat barbell bench press", "press de banca", "press banca"]
  },
  {
    key: "military-press",
    animationUrl: "./assets/gym-animations/military-press-v2.gif",
    posterUrl: "./assets/gym-animations/military-press-v2-poster.png",
    labels: ["press militar", "press militar con barra", "standing barbell military press"]
  }
];
let gymLibraryState = {
  query: "",
  muscle: "",
  equipment: "",
  category: "",
  featured: "video",
  contextPlanExerciseId: null,
  results: []
};

function normalizeGymAnimationLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function gymCustomAnimationFor(exercise) {
  if (!exercise) return null;
  const normalizedId = normalizeGymAnimationLabel(exercise.id);
  const normalizedName = normalizeGymAnimationLabel(exercise.name);
  return GYM_CUSTOM_ANIMATIONS.find((animation) =>
    normalizedId === animation.key.replaceAll("-", " ") ||
    animation.labels.some((label) => normalizedName === label)
  ) || null;
}

function gymCustomAnimationMarkup(animation, label, className = "") {
  if (!animation) return "";
  return `
    <span class="gym-exercise-animation ${escapeHtml(className)}" role="img" aria-label="${escapeHtml(label)}">
      <img class="gym-exercise-animation-media gym-exercise-animation-gif" src="${escapeHtml(animation.animationUrl)}" alt="" loading="lazy" decoding="async">
      <img class="gym-exercise-animation-media gym-exercise-animation-poster" src="${escapeHtml(animation.posterUrl)}" alt="" loading="lazy" decoding="async">
    </span>`;
}

function gymPlanExerciseLinkMap(data = gymPanelData) {
  return new Map(
    (Array.isArray(data?.exerciseLinks) ? data.exerciseLinks : [])
      .map((item) => [String(item.planExerciseId || ""), item])
      .filter(([id]) => id)
  );
}

function gymPlanExerciseById(exerciseId, data = gymPanelData) {
  const id = String(exerciseId || "");
  for (const day of Array.isArray(data?.plan) ? data.plan : []) {
    const exercise = (Array.isArray(day.exercises) ? day.exercises : []).find((item) => String(item.id) === id);
    if (exercise) return { ...exercise, dayId: day.id, dayTitle: day.title };
  }
  return null;
}

function renderGymPlanReference(plan) {
  return `
    <section class="gym-plan-reference-section">
      <div class="health-section-heading">
        <div>
          <strong>Tu plan actual</strong>
          <p>Puedes abrir la técnica de cualquier ejercicio aunque el entrenamiento esté pausado.</p>
        </div>
      </div>
      <div class="gym-plan-reference-grid">
        ${plan.map((day) => `
          <article class="gym-plan-reference-day">
            <header>
              <small>${escapeHtml(day.title || day.id)}</small>
              <strong>${escapeHtml(day.focus || "")}</strong>
            </header>
            <div>
              ${(day.exercises || []).map((exercise) => `
                <button type="button" class="gym-plan-reference-exercise" data-gym-technique-id="${escapeHtml(exercise.id)}">
                  <span>
                    <strong>${escapeHtml(exercise.name)}</strong>
                    <small>${escapeHtml(formatTarget(exercise))}</small>
                  </span>
                  <b>${gymCustomAnimationFor(exercise) ? "Ver GIF →" : "Técnica →"}</b>
                </button>`).join("")}
            </div>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderGymPlanView(data) {
  const plan = Array.isArray(data?.plan) ? data.plan : [];
  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  const progress = data?.progress && typeof data.progress === "object" ? data.progress : {};
  const trainingStatus = data?.trainingStatus && typeof data.trainingStatus === "object"
    ? data.trainingStatus
    : { paused: false };

  if (!plan.length) {
    return '<p class="health-empty">Todavía no hay un plan de entrenamiento conectado.</p>';
  }

  if (trainingStatus.paused) {
    return `
      <section class="gym-pause-card">
        <span>Recuperación temporal</span>
        <strong>Entrenamiento de fuerza pausado</strong>
        <p>${escapeHtml(trainingStatus.reason || "El objetivo activo marca una pausa temporal. El plan base se conserva para la reanudación.")}</p>
        <small>No se propone ni se registra una sesión mientras esta pausa siga activa.</small>
      </section>

      ${renderGymPlanReference(plan)}

      <section class="gym-progress-section">
        <div class="health-section-heading">
          <div>
            <strong>Progreso congelado</strong>
            <p>Los benchmarks se conservan y no se evalúan durante la pausa.</p>
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
            <p>Las sesiones previas se mantienen intactas.</p>
          </div>
        </div>
        ${renderGymHistory(sessions)}
      </section>`;
  }

  const lastDayId = sessions[0]?.dayId || null;
  const lastIndex = plan.findIndex((day) => day.id === lastDayId);
  const suggestedIndex = lastIndex >= 0 ? (lastIndex + 1) % plan.length : 0;

  return `
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
}

function renderGymLibraryShell() {
  return `
    <div class="gym-library-toolbar">
      <form id="gym-library-search" class="gym-library-search">
        <label>
          <span>Buscar ejercicio</span>
          <input id="gym-library-query" type="search" autocomplete="off" placeholder="Press banca, curl, dominadas…" value="${escapeHtml(gymLibraryState.query)}">
        </label>
        <label>
          <span>Músculo</span>
          <select id="gym-library-muscle"><option value="">Todos</option></select>
        </label>
        <label>
          <span>Equipo</span>
          <select id="gym-library-equipment"><option value="">Todo</option></select>
        </label>
        <button type="submit">Buscar</button>
      </form>
      <div class="gym-library-mode">
        <button type="button" class="${gymLibraryState.featured === "video" ? "active" : ""}" data-gym-library-featured="video">Con vídeo</button>
        <button type="button" class="${gymLibraryState.featured === "" ? "active" : ""}" data-gym-library-featured="">Todo el catálogo</button>
      </div>
      <p class="gym-library-source">Biblioteca libre · wger · 0 € · se conserva la atribución/licencia de cada recurso.</p>
    </div>
    <div id="gym-library-status" class="gym-library-status" role="status">Cargando biblioteca…</div>
    <div id="gym-library-results" class="gym-library-grid"></div>
    <div id="gym-library-detail" class="gym-library-detail" hidden></div>`;
}

function renderGymPanel(data) {
  const panel = document.querySelector("#gym-panel");
  if (!panel) return;
  gymPanelData = data || {};
  const plan = Array.isArray(data?.plan) ? data.plan : [];

  panel.innerHTML = `
    <div class="gym-view-switch" role="tablist" aria-label="Vista de gimnasio">
      <button type="button" class="active" data-gym-view="plan">Mi plan</button>
      <button type="button" data-gym-view="library">Biblioteca de ejercicios</button>
    </div>
    <section class="gym-view-panel active" data-gym-view-panel="plan">
      <section id="gym-plan-animation-detail" aria-label="Demostración del ejercicio" hidden></section>
      ${renderGymPlanView(data)}
    </section>
    <section class="gym-view-panel" data-gym-view-panel="library" hidden>
      ${renderGymLibraryShell()}
    </section>`;

  panel.querySelectorAll("[data-gym-view]").forEach((button) => {
    button.addEventListener("click", () => setGymPanelView(button.dataset.gymView));
  });

  bindGymTechniqueButtons(panel);

  const trainingStatus = data?.trainingStatus && typeof data.trainingStatus === "object"
    ? data.trainingStatus
    : { paused: false };
  if (trainingStatus.paused || !plan.length) return;

  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  const lastDayId = sessions[0]?.dayId || null;
  const lastIndex = plan.findIndex((day) => day.id === lastDayId);
  const suggestedIndex = lastIndex >= 0 ? (lastIndex + 1) % plan.length : 0;
  const latestByExercise = getLatestGymEntries(sessions);
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

function setGymPanelView(view) {
  const panel = document.querySelector("#gym-panel");
  if (!panel) return;
  const target = view === "library" ? "library" : "plan";
  panel.querySelectorAll("[data-gym-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.gymView === target);
  });
  panel.querySelectorAll("[data-gym-view-panel]").forEach((section) => {
    const active = section.dataset.gymViewPanel === target;
    section.hidden = !active;
    section.classList.toggle("active", active);
  });
  if (target === "library") void loadGymExerciseLibrary();
}

function bindGymTechniqueButtons(root = document) {
  root.querySelectorAll("[data-gym-technique-id]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const exercise = gymPlanExerciseById(button.dataset.gymTechniqueId);
      if (!exercise) return;
      void openGymTechniqueForPlanExercise(exercise);
    });
  });
}

async function openGymTechniqueForPlanExercise(exercise) {
  const animation = gymCustomAnimationFor(exercise);
  const detail = document.querySelector("#gym-plan-animation-detail");
  if (animation && detail) {
    setGymPanelView("plan");
    detail.hidden = false;
    detail.innerHTML = `
      <button type="button" class="gym-library-back" id="gym-animation-close">← Volver al plan</button>
      <article class="gym-exercise-detail-card">
        <div class="gym-exercise-detail-media">
          ${gymCustomAnimationMarkup(animation, `Animación de ${exercise.name}`, "gym-exercise-hero-animation")}
          <span class="gym-exercise-media-caption">Animación propia en bucle · ilustración orientativa</span>
        </div>
        <div class="gym-exercise-detail-copy">
          <h3 id="gym-animation-heading" tabindex="-1">${escapeHtml(exercise.name)}</h3>
          <p class="gym-exercise-description">El GIF corresponde a esta variante del ejercicio. Puedes consultar por separado las fichas técnicas de la biblioteca.</p>
          <button type="button" class="gym-library-back" id="gym-animation-library">Consultar biblioteca</button>
        </div>
      </article>`;
    document.querySelector("#gym-animation-close")?.addEventListener("click", () => {
      detail.hidden = true;
      // Release the image while the demonstration is closed.
      detail.innerHTML = "";
      const trigger = [...document.querySelectorAll("[data-gym-technique-id]")]
        .find((button) => button.dataset.gymTechniqueId === String(exercise.id));
      trigger?.focus();
    });
    document.querySelector("#gym-animation-library")?.addEventListener("click", () => {
      detail.hidden = true;
      detail.innerHTML = "";
      void openGymExternalTechnique(exercise);
    });
    document.querySelector("#gym-animation-heading")?.focus({ preventScroll: true });
    detail.scrollIntoView({ block: "start" });
    return;
  }
  await openGymExternalTechnique(exercise);
}

async function openGymExternalTechnique(exercise) {
  setGymPanelView("library");
  gymLibraryState.contextPlanExerciseId = exercise.id;
  const link = gymPlanExerciseLinkMap().get(String(exercise.id));
  if (link?.providerExerciseId) {
    await openGymLibraryExercise(link.providerExerciseId, exercise.id);
    return;
  }
  gymLibraryState.query = exercise.name || "";
  const queryInput = document.querySelector("#gym-library-query");
  if (queryInput) queryInput.value = gymLibraryState.query;
  await loadGymExerciseLibrary({ autoOpenFirst: true, contextPlanExerciseId: exercise.id });
}

async function ensureGymLibraryMeta() {
  if (gymLibraryMeta) return gymLibraryMeta;
  const response = await fetch("/api/gym/exercises/meta", {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("GYM_LIBRARY_META_" + response.status);
  gymLibraryMeta = await response.json();
  return gymLibraryMeta;
}

function populateGymLibraryFilters(meta) {
  const muscle = document.querySelector("#gym-library-muscle");
  const equipment = document.querySelector("#gym-library-equipment");
  if (muscle && muscle.options.length <= 1) {
    muscle.insertAdjacentHTML("beforeend", (meta?.muscles || []).map((item) =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.nameOriginal || "Músculo")}</option>`
    ).join(""));
  }
  if (equipment && equipment.options.length <= 1) {
    equipment.insertAdjacentHTML("beforeend", (meta?.equipment || []).map((item) =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || "Equipo")}</option>`
    ).join(""));
  }
  if (muscle) muscle.value = gymLibraryState.muscle;
  if (equipment) equipment.value = gymLibraryState.equipment;
}

function bindGymLibraryControls() {
  const form = document.querySelector("#gym-library-search");
  if (form && form.dataset.bound !== "1") {
    form.dataset.bound = "1";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      gymLibraryState.query = document.querySelector("#gym-library-query")?.value?.trim() || "";
      gymLibraryState.muscle = document.querySelector("#gym-library-muscle")?.value || "";
      gymLibraryState.equipment = document.querySelector("#gym-library-equipment")?.value || "";
      gymLibraryState.featured = gymLibraryState.query || gymLibraryState.muscle || gymLibraryState.equipment ? "" : gymLibraryState.featured;
      void loadGymExerciseLibrary({ force: true });
    });
  }
  document.querySelectorAll("[data-gym-library-featured]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      gymLibraryState.featured = button.dataset.gymLibraryFeatured || "";
      gymLibraryState.query = "";
      gymLibraryState.muscle = "";
      gymLibraryState.equipment = "";
      const input = document.querySelector("#gym-library-query");
      if (input) input.value = "";
      void loadGymExerciseLibrary({ force: true });
    });
  });
}

function gymLibraryPreview(exercise, index) {
  const animation = gymCustomAnimationFor(exercise);
  const video = exercise?.videos?.[0] || null;
  const image = exercise?.images?.find((item) => item.isMain) || exercise?.images?.[0] || null;
  if (animation) {
    return gymCustomAnimationMarkup(animation, `Animación de ${exercise.name}`, "gym-library-preview-animation");
  }
  if (video && index < 8) {
    return `<video class="gym-library-preview-media" src="${escapeHtml(video.url)}" ${image?.previewUrl ? `poster="${escapeHtml(image.previewUrl)}"` : ""} muted loop playsinline autoplay preload="metadata"></video>`;
  }
  if (image) {
    return `<img class="gym-library-preview-media" src="${escapeHtml(image.previewUrl || image.originalUrl)}" alt="" loading="lazy">`;
  }
  if (video) {
    return `<div class="gym-library-video-placeholder"><span>▶</span><small>Vídeo disponible</small></div>`;
  }
  return '<div class="gym-library-video-placeholder"><span>◇</span><small>Sin multimedia</small></div>';
}

function renderGymLibraryResults(exercises) {
  const grid = document.querySelector("#gym-library-results");
  const status = document.querySelector("#gym-library-status");
  const detail = document.querySelector("#gym-library-detail");
  if (!grid || !status) return;
  if (detail) detail.hidden = true;
  grid.hidden = false;
  gymLibraryState.results = exercises;

  if (!exercises.length) {
    grid.innerHTML = "";
    status.textContent = "No hay ejercicios que coincidan con esos filtros.";
    return;
  }

  status.textContent = exercises.length + " ejercicios cargados";
  grid.innerHTML = exercises.map((exercise, index) => {
    const customAnimation = gymCustomAnimationFor(exercise);
    const muscles = (exercise.muscles || []).map((item) => item.name).filter(Boolean).slice(0, 2).join(" · ");
    const equipment = (exercise.equipment || []).map((item) => item.name).filter(Boolean).slice(0, 2).join(" · ");
    return `
      <button type="button" class="gym-library-card" data-gym-library-id="${escapeHtml(exercise.id)}">
        <span class="gym-library-card-media">
          ${gymLibraryPreview(exercise, index)}
          ${customAnimation ? '<b class="gym-library-media-badge">Animación</b>' : exercise.hasVideo ? '<b class="gym-library-media-badge">▶ vídeo</b>' : ""}
          ${exercise.inPlan ? '<b class="gym-library-plan-badge">En tu plan</b>' : ""}
        </span>
        <span class="gym-library-card-copy">
          <strong>${escapeHtml(exercise.name)}</strong>
          <small>${escapeHtml(muscles || exercise.category?.name || "Ejercicio")}</small>
          <em>${escapeHtml(equipment || "Sin equipo indicado")}</em>
        </span>
      </button>`;
  }).join("");

  grid.querySelectorAll("[data-gym-library-id]").forEach((button) => {
    button.addEventListener("click", () => {
      void openGymLibraryExercise(button.dataset.gymLibraryId, gymLibraryState.contextPlanExerciseId);
    });
  });
}

async function loadGymExerciseLibrary(options = {}) {
  const view = document.querySelector('[data-gym-view-panel="library"]');
  if (!view || view.hidden) return;

  bindGymLibraryControls();
  const status = document.querySelector("#gym-library-status");
  if (status) status.textContent = "Cargando biblioteca libre…";

  if (options.contextPlanExerciseId !== undefined) {
    gymLibraryState.contextPlanExerciseId = options.contextPlanExerciseId || null;
  }

  try {
    const meta = await ensureGymLibraryMeta();
    populateGymLibraryFilters(meta);
    bindGymLibraryControls();

    const params = new URLSearchParams();
    const query = gymLibraryState.query || "";
    if (query) params.set("q", query);
    if (gymLibraryState.muscle) params.set("muscle", gymLibraryState.muscle);
    if (gymLibraryState.equipment) params.set("equipment", gymLibraryState.equipment);
    if (!query && !gymLibraryState.muscle && !gymLibraryState.equipment && gymLibraryState.featured) {
      params.set("featured", gymLibraryState.featured);
    }
    params.set("limit", "24");

    const response = await fetch("/api/gym/exercises?" + params.toString(), {
      headers: { Accept: "application/json" },
      cache: options.force ? "reload" : "no-store"
    });
    if (!response.ok) throw new Error("GYM_LIBRARY_" + response.status);
    const payload = await response.json();
    renderGymLibraryResults(Array.isArray(payload.exercises) ? payload.exercises : []);

    if (options.autoOpenFirst && payload.exercises?.[0]) {
      await openGymLibraryExercise(payload.exercises[0].id, gymLibraryState.contextPlanExerciseId);
    }
  } catch (error) {
    const grid = document.querySelector("#gym-library-results");
    if (grid) grid.innerHTML = "";
    if (status) status.textContent = "La biblioteca libre no está disponible ahora. Tu plan y tu histórico siguen intactos.";
    console.warn("Gym exercise library load failed", error);
  }
}

function gymExerciseLicenseText(exercise) {
  const media = exercise?.videos?.[0] || exercise?.images?.[0] || null;
  const license = media?.license || exercise?.license || null;
  const parts = [
    license?.title || "Licencia declarada por wger",
    license?.author ? "Autor: " + license.author : null
  ].filter(Boolean);
  return parts.join(" · ");
}

function renderGymLibraryDetail(exercise, contextPlanExerciseId = null) {
  const grid = document.querySelector("#gym-library-results");
  const status = document.querySelector("#gym-library-status");
  const detail = document.querySelector("#gym-library-detail");
  if (!detail) return;
  if (grid) grid.hidden = true;
  if (status) status.textContent = "";

  const video = exercise?.videos?.find((item) => item.isMain) || exercise?.videos?.[0] || null;
  const image = exercise?.images?.find((item) => item.isMain) || exercise?.images?.[0] || null;
  const planExercise = contextPlanExerciseId ? gymPlanExerciseById(contextPlanExerciseId) : null;
  // A candidate library result may be a different variant from the plan row.
  const customAnimation = gymCustomAnimationFor(exercise);
  const existingLink = contextPlanExerciseId ? gymPlanExerciseLinkMap().get(String(contextPlanExerciseId)) : null;
  const linkedToThis = existingLink && String(existingLink.providerExerciseId) === String(exercise.id);
  const days = Array.isArray(gymPanelData?.plan) ? gymPanelData.plan : [];
  const muscleNames = (exercise.muscles || []).map((item) => item.name).filter(Boolean);
  const secondaryNames = (exercise.secondaryMuscles || []).map((item) => item.name).filter(Boolean);
  const equipmentNames = (exercise.equipment || []).map((item) => item.name).filter(Boolean);

  const mediaMarkup = customAnimation
    ? gymCustomAnimationMarkup(customAnimation, `Animación técnica de ${planExercise?.name || exercise.name}`, "gym-exercise-hero-animation")
    : video
      ? `<video class="gym-exercise-hero-media" src="${escapeHtml(video.url)}" ${image?.previewUrl ? `poster="${escapeHtml(image.previewUrl)}"` : ""} controls autoplay muted loop playsinline preload="metadata"></video>`
      : image
        ? `<img class="gym-exercise-hero-media" src="${escapeHtml(image.originalUrl || image.previewUrl)}" alt="${escapeHtml(exercise.name)}">`
        : '<div class="gym-exercise-hero-empty">Sin recurso visual disponible</div>';

  detail.hidden = false;
  detail.innerHTML = `
    <button type="button" class="gym-library-back" id="gym-library-back">← Volver a la biblioteca</button>
    <article class="gym-exercise-detail-card">
      <div class="gym-exercise-detail-media">
        ${mediaMarkup}
        <span class="gym-exercise-media-caption">${customAnimation ? "Animación propia en bucle" : video ? "Demostración en bucle" : image ? "Referencia visual" : "Sin multimedia"}${customAnimation ? " · ilustración orientativa" : " · wger"}</span>
      </div>
      <div class="gym-exercise-detail-copy">
        <p class="context-label">${escapeHtml(exercise.category?.name || "Ejercicio")}</p>
        <h3>${escapeHtml(exercise.name)}</h3>
        <div class="gym-exercise-tags">
          ${muscleNames.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
          ${equipmentNames.map((name) => `<span class="is-equipment">${escapeHtml(name)}</span>`).join("")}
        </div>
        ${exercise.description ? `<p class="gym-exercise-description">${escapeHtml(exercise.description)}</p>` : '<p class="gym-exercise-description is-muted">wger no aporta instrucciones textuales para esta variante.</p>'}
        <dl class="gym-exercise-anatomy">
          <div><dt>Principal</dt><dd>${escapeHtml(muscleNames.join(", ") || "—")}</dd></div>
          <div><dt>Secundarios</dt><dd>${escapeHtml(secondaryNames.join(", ") || "—")}</dd></div>
          <div><dt>Equipo</dt><dd>${escapeHtml(equipmentNames.join(", ") || "—")}</dd></div>
        </dl>

        ${planExercise ? `
          <section class="gym-library-link-card">
            <small>Ejercicio de tu plan</small>
            <strong>${escapeHtml(planExercise.name)}</strong>
            <button type="button" id="gym-link-current-exercise" ${linkedToThis ? "disabled" : ""}>
              ${linkedToThis ? "Ficha vinculada ✓" : "Usar esta ficha para mi ejercicio"}
            </button>
          </section>` : ""}

        <section class="gym-library-add-card">
          <div>
            <small>Añadir al plan</small>
            <strong>${exercise.inPlan ? "Este ejercicio ya está asociado a tu plan" : "Configura la entrada inicial"}</strong>
          </div>
          <div class="gym-library-add-fields">
            <label><span>Día</span><select id="gym-library-add-day">
              ${days.map((day) => `<option value="${escapeHtml(day.id)}">${escapeHtml(day.title || day.id)}</option>`).join("")}
            </select></label>
            <label><span>Series</span><input id="gym-library-add-sets" type="number" min="1" max="12" value="3"></label>
            <label><span>Reps</span><input id="gym-library-add-reps" type="text" maxlength="30" value="8-12"></label>
          </div>
          <button type="button" id="gym-library-add" ${exercise.inPlan || !days.length ? "disabled" : ""}>
            ${exercise.inPlan ? "Ya está en tu plan" : "Añadir al plan"}
          </button>
          <p id="gym-library-action-status" class="gym-library-action-status"></p>
        </section>

        <footer class="gym-exercise-attribution">
          <strong>Fuente libre: wger</strong>
          <span>${escapeHtml(gymExerciseLicenseText(exercise))}</span>
          <small>Segundo Cerebro no copia contenido premium ni multimedia de Lyfta/RepDB.</small>
        </footer>
      </div>
    </article>`;

  document.querySelector("#gym-library-back")?.addEventListener("click", () => {
    detail.hidden = true;
    if (grid) grid.hidden = false;
    if (status) status.textContent = gymLibraryState.results.length + " ejercicios cargados";
    gymLibraryState.contextPlanExerciseId = null;
  });

  document.querySelector("#gym-link-current-exercise")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const actionStatus = document.querySelector("#gym-library-action-status");
    button.disabled = true;
    if (actionStatus) actionStatus.textContent = "Vinculando ficha…";
    try {
      const response = await fetch("/api/gym/exercise-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          planExerciseId: contextPlanExerciseId,
          providerExerciseId: exercise.id
        })
      });
      if (!response.ok) throw new Error("GYM_LINK_" + response.status);
      const payload = await response.json();
      const links = Array.isArray(gymPanelData.exerciseLinks) ? gymPanelData.exerciseLinks : [];
      gymPanelData.exerciseLinks = links.filter((item) => String(item.planExerciseId) !== String(contextPlanExerciseId)).concat(payload.link);
      exercise.inPlan = true;
      button.textContent = "Ficha vinculada ✓";
      if (actionStatus) actionStatus.textContent = "Ficha visual vinculada a tu ejercicio.";
    } catch (error) {
      button.disabled = false;
      if (actionStatus) actionStatus.textContent = "No se ha podido vincular la ficha.";
      console.warn("Gym exercise link save failed", error);
    }
  });

  document.querySelector("#gym-library-add")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const actionStatus = document.querySelector("#gym-library-action-status");
    const dayId = document.querySelector("#gym-library-add-day")?.value || "";
    const setsTarget = document.querySelector("#gym-library-add-sets")?.value || "3";
    const repsTarget = document.querySelector("#gym-library-add-reps")?.value || "8-12";
    button.disabled = true;
    if (actionStatus) actionStatus.textContent = "Añadiendo a la fuente canónica…";
    try {
      const response = await fetch("/api/gym/plan/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          dayId,
          providerExerciseId: exercise.id,
          setsTarget,
          repsTarget
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload.code === "GYM_EXERCISE_ALREADY_IN_PLAN") {
          exercise.inPlan = true;
          button.textContent = "Ya está en tu plan";
          if (actionStatus) actionStatus.textContent = "Ese ejercicio ya estaba en el plan.";
          return;
        }
        throw new Error(payload.code || "GYM_PLAN_WRITE_" + response.status);
      }
      exercise.inPlan = true;
      button.textContent = "Añadido ✓";
      const day = (gymPanelData.plan || []).find((item) => String(item.id) === String(dayId));
      if (day) {
        day.exercises = [...(day.exercises || []), {
          id: payload.added.exerciseId,
          name: payload.added.exerciseName,
          setsTarget: payload.added.setsTarget,
          repsTarget: payload.added.repsTarget,
          order: (day.exercises?.length || 0) + 1
        }];
      }
      gymPanelData.exerciseLinks = [...(gymPanelData.exerciseLinks || []), payload.link].filter(Boolean);
      if (actionStatus) actionStatus.textContent = "Añadido al plan y guardado en GimnasioPlan.";
    } catch (error) {
      button.disabled = false;
      if (actionStatus) actionStatus.textContent = "No se ha podido añadir al plan.";
      console.warn("Gym plan exercise add failed", error);
    }
  });
}

async function openGymLibraryExercise(exerciseId, contextPlanExerciseId = null) {
  const status = document.querySelector("#gym-library-status");
  if (status) status.textContent = "Cargando ficha…";
  try {
    let exercise = gymLibraryState.results.find((item) => String(item.id) === String(exerciseId)) || null;
    if (!exercise || !exercise.description) {
      const response = await fetch("/api/gym/exercises/" + encodeURIComponent(exerciseId), {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("GYM_EXERCISE_" + response.status);
      exercise = (await response.json()).exercise;
    }
    renderGymLibraryDetail(exercise, contextPlanExerciseId);
  } catch (error) {
    if (status) status.textContent = "No se ha podido abrir la ficha de este ejercicio.";
    console.warn("Gym exercise detail load failed", error);
  }
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
            <div class="gym-exercise-title-row">
              <strong>${escapeHtml(exercise.name)}</strong>
              <button type="button" class="gym-technique-button" data-gym-technique-id="${escapeHtml(exercise.id)}">Técnica</button>
            </div>
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
  bindGymTechniqueButtons(container);
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
  const accounts = Array.isArray(finance.creditAccounts) ? finance.creditAccounts : [];
  const credit = accounts.find((item) => String(item.status || "").toLowerCase() !== "closed") || null;

  const obligations = debt.debts
    .filter((item) => !/corte ingl[eé]s|financiera|\beci\b/i.test(String(item.title || "")))
    .slice()
    .sort((a, b) => {
      const paymentDelta = (firstFinite(b.monthlyPayment) || 0) - (firstFinite(a.monthlyPayment) || 0);
      if (paymentDelta) return paymentDelta;
      return (firstFinite(b.balance) || 0) - (firstFinite(a.balance) || 0);
    })
    .slice(0, 4);

  const grossPending = firstFinite(credit?.grossPending);
  const netExposure = firstFinite(credit?.netHouseholdExposure);
  const nextReceipt = firstFinite(credit?.estimatedNextReceipt);
  const revolving = firstFinite(credit?.revolvingBalance);

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

    ${obligations.length ? `
      <section class="home-debt-breakdown" aria-label="Principales obligaciones activas">
        <div class="home-debt-breakdown-heading">
          <strong>Principales obligaciones</strong>
          <span>por cuota mensual</span>
        </div>
        <div class="home-debt-obligations">
          ${obligations.map((item) => {
            const balance = firstFinite(item.balance);
            const payment = firstFinite(item.monthlyPayment);
            return `
              <div class="home-debt-obligation">
                <strong>${escapeHtml(item.title || "Obligación")}</strong>
                <span>${payment === null ? "Cuota —" : formatMoney(payment, currency) + "/mes"}</span>
                <small>${balance === null ? "Saldo por completar" : formatMoney(balance, currency) + " pendiente"}</small>
              </div>`;
          }).join("")}
        </div>
      </section>` : ""}

    ${credit ? `
      <section class="home-debt-credit-summary" aria-label="Resumen de El Corte Inglés">
        <div class="home-debt-breakdown-heading">
          <strong>${escapeHtml(credit.name || "El Corte Inglés")}</strong>
          <span>crédito · no se suma de nuevo al total</span>
        </div>
        <div class="home-debt-credit-grid">
          <span><small>Pendiente bruto</small><strong>${grossPending === null ? "—" : formatMoney(grossPending, currency)}</strong></span>
          <span><small>Próximo recibo</small><strong>${nextReceipt === null ? "—" : formatMoney(nextReceipt, currency)}</strong></span>
          <span><small>Revolving</small><strong>${revolving === null ? "—" : formatMoney(revolving, currency)}</strong></span>
          <span><small>Exposición propia</small><strong>${netExposure === null ? "—" : formatMoney(netExposure, currency)}</strong></span>
        </div>
      </section>` : ""}

    ${debt.sourceUpdatedAt ? `<p class="debt-source-note">Fuente de deudas · ${escapeHtml(formatFinanceDate(debt.sourceUpdatedAt, debt.sourceUpdatedAt))}</p>` : ""}
    ${totalBalance === null
      ? '<p class="debt-source-note">Las cuotas están registradas; faltan saldos pendientes para calcular la deuda total real.</p>'
      : ""}`;
}

function formatGiftPeriod(period) {
  if (!/^\d{4}-\d{2}$/.test(String(period || ""))) return period || "—";
  const [year, month] = String(period).split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
}

function giftCategoryLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "bodas") return "Bodas";
  if (normalized === "reyes") return "Reyes";
  return value || "Fondo";
}

function renderGiftsOverview() {
  const gifts = state.financeSummary?.gifts || null;
  const container = document.querySelector("#gifts-summary");
  const yearPill = document.querySelector("#gifts-year");
  if (!container) return;

  if (yearPill) yearPill.textContent = gifts?.year ? String(gifts.year) : "Sin datos";

  if (!gifts || !Array.isArray(gifts.funds)) {
    container.innerHTML = `
      <div class="gifts-empty">
        <strong>Fondos de regalos pendientes de conectar</strong>
        <p>Cuando exista la tabla privada Regalos aparecerán aquí Bodas, Reyes y los pagos conciliados.</p>
      </div>`;
    return;
  }

  const currency = gifts.currency || "EUR";
  const funds = gifts.funds;
  const fundRows = Array.isArray(gifts.fundRows) ? gifts.fundRows : [];
  const paidWeddings = Array.isArray(gifts.paidWeddings) ? gifts.paidWeddings : [];
  const pendingWeddings = Array.isArray(gifts.unreconciledWeddings) ? gifts.unreconciledWeddings : [];
  const nextYearWeddings = Array.isArray(gifts.nextYearWeddings) ? gifts.nextYearWeddings : [];
  const cashAvailable = firstFinite(gifts.cashAvailable);
  const pendingCash = firstFinite(gifts.pendingCash) ?? 0;
  const projectedCash = firstFinite(gifts.projectedCash);
  const contributedTotal = firstFinite(gifts.contributedTotal);
  const totalPaid = firstFinite(gifts.totalPaidWeddings) ?? 0;
  const nextYearTarget = firstFinite(gifts.nextYearWeddingTarget) ?? 0;

  const currentWeddingPending = pendingWeddings.reduce(
    (sum, item) => sum + Math.max(0, firstFinite(item.plannedAmount) || 0),
    0
  );
  const currentPendingWeddingLabel = pendingWeddings[0]?.label || "boda pendiente";

  const fundCards = funds.map((fund) => {
    const stored = firstFinite(fund.stored);
    const target = firstFinite(fund.target);
    const paid = firstFinite(fund.paid) ?? 0;
    const available = firstFinite(fund.available);
    const pending = firstFinite(fund.pendingCash) ?? 0;
    const projected = firstFinite(fund.projectedAvailable);
    const progressBase = fund.category === "bodas" ? stored : projected ?? stored;
    const progress = progressBase !== null && target !== null && target > 0
      ? Math.max(0, Math.min(100, (progressBase / target) * 100))
      : null;
    const reyesRemaining = fund.category === "reyes" && target !== null && projected !== null
      ? Math.max(0, target - projected)
      : null;

    return `
      <article class="gift-fund-card">
        <div class="gift-fund-head">
          <strong>${escapeHtml(giftCategoryLabel(fund.category))}</strong>
          <span>${stored === null ? "—" : formatMoney(stored, currency)}${target === null ? "" : " / " + formatMoney(target, currency)}</span>
        </div>
        <progress class="gift-progress" max="100" value="${progress === null ? 0 : progress.toFixed(1)}" aria-label="Progreso de ${escapeHtml(giftCategoryLabel(fund.category))}"></progress>
        <div class="gift-fund-meta">
          ${fund.category === "bodas"
            ? `<span>Pagado <strong>${formatMoney(paid, currency)}</strong></span><span>Reservado ${escapeHtml(currentPendingWeddingLabel)} <strong>${formatMoney(available ?? currentWeddingPending, currency)}</strong></span>`
            : `<span>En sobre <strong>${formatMoney(available ?? stored ?? 0, currency)}</strong></span>${pending > 0 ? `<span>+ madre <strong>${formatMoney(pending, currency)}</strong></span>` : ""}${reyesRemaining !== null ? `<span>Faltan <strong>${formatMoney(reyesRemaining, currency)}</strong></span>` : ""}`}
        </div>
      </article>`;
  }).join("");

  const monthMap = new Map();
  for (const row of fundRows) {
    const period = String(row.period || "");
    if (!period) continue;
    const item = monthMap.get(period) || { period, bodas: 0, reyes: 0, cumulative: 0, categories: new Map() };
    const amount = firstFinite(row.monthlySaved) ?? 0;
    item[row.category] = (item[row.category] || 0) + amount;
    item.categories.set(row.category, firstFinite(row.storedCumulative) ?? 0);
    item.cumulative = [...item.categories.values()].reduce((sum, value) => sum + value, 0);
    monthMap.set(period, item);
  }
  const monthlyRows = [...monthMap.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => {
      const parts = [];
      if (row.bodas) parts.push("Bodas +" + formatMoney(row.bodas, currency));
      if (row.reyes) parts.push("Reyes +" + formatMoney(row.reyes, currency));
      if (!parts.length) parts.push("Sin entrada");
      return `
        <div class="gift-month-row">
          <span>${escapeHtml(formatGiftPeriod(row.period))}</span>
          <strong>${escapeHtml(parts.join(" · "))}</strong>
          <span>${formatMoney(row.cumulative, currency)}</span>
        </div>`;
    }).join("");

  const paidRows = paidWeddings.map((item) => `
    <article class="gift-wedding-row">
      <div>
        <strong>${escapeHtml(item.label || "Boda")}</strong>
        <small>Pagada${item.eventDate ? " · " + escapeHtml(formatFinanceDate(item.eventDate, item.eventDate)) : ""}</small>
      </div>
      <span>${formatMoney(firstFinite(item.paidAmount) || 0, currency)}</span>
    </article>`).join("");

  const pendingRows = pendingWeddings.map((item) => `
    <article class="gift-wedding-row is-pending">
      <div>
        <strong>${escapeHtml(item.label || "Boda")}</strong>
        <small>${escapeHtml(formatFinanceDate(item.eventDate, item.eventDate || "Fecha pendiente"))} · pendiente</small>
      </div>
      <span>${formatMoney(firstFinite(item.plannedAmount) || 0, currency)}</span>
    </article>`).join("");

  const nextRows = nextYearWeddings.map((item) => `
    <article class="gift-wedding-row is-future">
      <div>
        <strong>${escapeHtml(item.label || "Boda")}</strong>
        <small>${escapeHtml(formatFinanceDate(item.eventDate, item.eventDate || "Fecha pendiente"))}</small>
      </div>
      <span>${formatMoney(firstFinite(item.plannedAmount) || 0, currency)}</span>
    </article>`).join("");

  container.innerHTML = `
    <div class="gifts-summary-grid">
      <section class="gift-funds-column">
        <div class="gift-envelope-head">
          <div>
            <strong>Sobre de regalos</strong>
            <span>dinero físico disponible ahora</span>
          </div>
          <div class="gift-envelope-kpi">
            <span>${cashAvailable === null ? "—" : formatMoney(cashAvailable, currency)}</span>
            ${pendingCash > 0 ? `<small>+${formatMoney(pendingCash, currency)} pendiente de tu madre · ${projectedCash === null ? "—" : formatMoney(projectedCash, currency)} previsto</small>` : ""}
          </div>
        </div>

        <div class="gift-fund-cards">${fundCards || '<p class="gift-empty-inline">Sin fondos registrados.</p>'}</div>

        <div class="gift-reconciliation">
          <span>Aportado ene–hoy <strong>${contributedTotal === null ? "—" : formatMoney(contributedTotal, currency)}</strong></span>
          <span>− bodas pagadas <strong>${formatMoney(totalPaid, currency)}</strong></span>
          <span>= sobre actual <strong>${cashAvailable === null ? "—" : formatMoney(cashAvailable, currency)}</strong></span>
        </div>

        <div class="gift-monthly-table" role="table" aria-label="Aportaciones mensuales a Bodas y Reyes">
          <div class="gift-month-row gift-month-head" role="row">
            <span>Mes</span><strong>Aportación</strong><span>Acum. fondos</span>
          </div>
          ${monthlyRows || '<p class="gift-empty-inline">Sin histórico mensual.</p>'}
        </div>
      </section>

      <section class="gift-paid-column">
        <div class="gift-column-heading">
          <div><strong>Bodas</strong><span>${Number(gifts.paidWeddingCount || 0)} pagadas · ${pendingWeddings.length} pendiente ${gifts.year}</span></div>
          <div class="gift-total-kpi">
            <span>${formatMoney(totalPaid, currency)}</span>
            <small>pagado</small>
          </div>
        </div>

        <div class="gift-paid-list">
          ${paidRows || '<div class="gift-empty-inline">Todavía no hay pagos de boda confirmados.</div>'}
          ${pendingRows}
        </div>

        <div class="gift-next-year">
          <div class="gift-next-year-head">
            <div><strong>${escapeHtml(String(gifts.nextYear || ""))} · próximas bodas</strong><span>${nextYearWeddings.length} previstas</span></div>
            <b>${formatMoney(nextYearTarget, currency)}</b>
          </div>
          <div class="gift-paid-list">
            ${nextRows || '<div class="gift-empty-inline">Sin bodas futuras registradas.</div>'}
          </div>
        </div>
      </section>
    </div>
    ${gifts.sourceUpdatedAt ? `<p class="gift-source-note">Fuente financiera · ${escapeHtml(formatFinanceDate(gifts.sourceUpdatedAt, gifts.sourceUpdatedAt))}</p>` : ""}
  `;
}

function renderCreditOverview() {
  const accounts = Array.isArray(state.financeSummary?.creditAccounts)
    ? state.financeSummary.creditAccounts
    : [];
  const container = document.querySelector("#credit-summary");
  if (!container) return;

  const account = accounts.find((item) => String(item.status || "").toLowerCase() !== "closed") || null;
  if (!account) {
    container.innerHTML = `
      <div class="credit-empty">
        <strong>Cuenta de crédito pendiente de conectar</strong>
        <p>Cuando exista una cuenta de crédito privada aparecerán aquí saldo, cuotas y reembolsos.</p>
      </div>`;
    return;
  }

  const currency = "EUR";
  const grossPending = firstFinite(account.grossPending);
  const netExposure = firstFinite(account.netHouseholdExposure);
  const nextReceipt = firstFinite(account.estimatedNextReceipt);
  const revolving = firstFinite(account.revolvingBalance);
  const reimbursement = firstFinite(account.monthlyThirdPartyReimbursement);

  container.innerHTML = `
    <div class="credit-summary-grid">
      <div class="credit-summary-primary">
        <span>Pendiente bruto</span>
        <strong>${grossPending === null ? "—" : formatMoney(grossPending, currency)}</strong>
      </div>
      <div>
        <span>Exposición propia</span>
        <strong>${netExposure === null ? "—" : formatMoney(netExposure, currency)}</strong>
      </div>
      <div>
        <span>Próximo recibo</span>
        <strong>${nextReceipt === null ? "—" : formatMoney(nextReceipt, currency)}</strong>
      </div>
      <div>
        <span>Revolving</span>
        <strong>${revolving === null ? "—" : formatMoney(revolving, currency)}</strong>
      </div>
    </div>
    ${reimbursement !== null && reimbursement > 0
      ? `<p class="credit-source-note">Incluye un reembolso mensual de terceros de ${formatMoney(reimbursement, currency)} conciliado por separado.</p>`
      : ""}`;
}

function renderCreditProductItem(item, currency = "EUR") {
  const remaining = firstFinite(item.remaining);
  const monthly = firstFinite(item.monthlyPayment);
  const reimbursement = firstFinite(item.reimbursementMonthly);
  const status = String(item.status || "active").toLowerCase();
  const installment = item.installmentCurrent !== null && item.installmentCurrent !== undefined
    && item.installmentTotal !== null && item.installmentTotal !== undefined
    ? `${item.installmentCurrent}/${item.installmentTotal}`
    : null;

  return `
    <article class="credit-product-item ${status === "closed" ? "is-closed" : ""}">
      <div class="credit-product-head">
        <div>
          <strong>${escapeHtml(item.label || "Producto")}</strong>
          <span>${escapeHtml(item.type || "crédito")}${item.economicOwner ? " · " + escapeHtml(item.economicOwner) : ""}</span>
        </div>
        <strong>${remaining === null ? (status === "closed" ? "Cerrado" : "—") : formatMoney(remaining, currency)}</strong>
      </div>
      <div class="credit-product-meta">
        <span>Cuota <b>${monthly === null ? "—" : formatMoney(monthly, currency)}</b></span>
        ${installment ? `<span>Plazo <b>${escapeHtml(installment)}</b></span>` : ""}
        ${item.lastDue ? `<span>Fin <b>${escapeHtml(formatFinanceDate(item.lastDue, item.lastDue))}</b></span>` : ""}
        ${reimbursement !== null && reimbursement > 0 ? `<span>Reembolso <b>${formatMoney(reimbursement, currency)}/mes</b></span>` : ""}
      </div>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
    </article>`;
}

// ECI detail: purchases + past receipts + future schedule
function openCreditDetail() {
  const accounts = Array.isArray(state.financeSummary?.creditAccounts)
    ? state.financeSummary.creditAccounts
    : [];
  const account = accounts.find((item) => String(item.status || "").toLowerCase() !== "closed") || null;
  const dialog = document.querySelector("#detail-dialog");
  if (!dialog) return;

  dialog.classList.remove("wealth-dialog", "important-events-dialog", "health-dialog", "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog", "objects-dialog", "projects-dialog");
  document.querySelector("#dialog-context").textContent = "Finanzas · Crédito";
  document.querySelector("#dialog-title").textContent = account?.name || "Cuentas de crédito";

  if (!account) {
    document.querySelector("#dialog-body").innerHTML = "<p>No hay cuentas de crédito conectadas.</p>";
    dialog.showModal();
    return;
  }

  const currency = "EUR";
  const products = Array.isArray(account.products) ? account.products : [];
  const activeProducts = products.filter((item) => String(item.status || "").toLowerCase() !== "closed");
  const closedProducts = products.filter((item) => String(item.status || "").toLowerCase() === "closed");
  const history = (Array.isArray(state.financeSummary?.creditHistory) ? state.financeSummary.creditHistory : [])
    .slice()
    .sort((a, b) => String(b.dueDate || "").localeCompare(String(a.dueDate || "")));
  const movements = (Array.isArray(state.financeSummary?.creditMovements) ? state.financeSummary.creditMovements : [])
    .slice()
    .sort((a, b) => String(b.operationDate || "").localeCompare(String(a.operationDate || "")));
  const future = (Array.isArray(state.financeSummary?.creditFuture) ? state.financeSummary.creditFuture : [])
    .slice()
    .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));

  const grossPending = firstFinite(account.grossPending);
  const netExposure = firstFinite(account.netHouseholdExposure);
  const nextReceipt = firstFinite(account.estimatedNextReceipt);
  const reimbursementRemaining = firstFinite(account.expectedThirdPartyReimbursement);
  const revolvingNetPurchases = movements
    .filter((item) => String(item.financingBucket || "").toLowerCase() === "revolving")
    .reduce((sum, item) => sum + (firstFinite(item.amount) || 0), 0);

  document.querySelector("#dialog-body").innerHTML = `
    <div class="credit-detail">
      <div class="credit-detail-summary">
        <article><span>Pendiente bruto</span><strong>${grossPending === null ? "—" : formatMoney(grossPending, currency)}</strong></article>
        <article><span>Exposición propia</span><strong>${netExposure === null ? "—" : formatMoney(netExposure, currency)}</strong></article>
        <article><span>Próximo recibo estimado</span><strong>${nextReceipt === null ? "—" : formatMoney(nextReceipt, currency)}</strong></article>
        <article><span>Reembolsos terceros pendientes</span><strong>${reimbursementRemaining === null ? "—" : formatMoney(reimbursementRemaining, currency)}</strong></article>
      </div>

      <section class="credit-detail-section">
        <div class="credit-detail-heading">
          <div><strong>Productos activos</strong><span>Revolving y aplazamientos</span></div>
          <small>${activeProducts.length} activos</small>
        </div>
        <div class="credit-product-list">
          ${activeProducts.length ? activeProducts.map((item) => renderCreditProductItem(item, currency)).join("") : "<p>Sin productos activos.</p>"}
        </div>
      </section>

      ${future.length ? `
        <section class="credit-detail-section">
          <div class="credit-detail-heading">
            <div><strong>Próximos cargos</strong><span>Calendario previsto de Financiera ECI</span></div>
            <small>${future.length} componentes</small>
          </div>
          <p class="credit-source-note">Las cuotas contractuales se muestran como programadas. El revolving es una proyección suponiendo que no haya nuevas compras; intereses y último pago pueden variar ligeramente.</p>
          <div class="credit-history-scroll" role="region" aria-label="Próximos cargos de Financiera El Corte Inglés" tabindex="0">
            <table class="credit-history-table">
              <thead><tr><th>Fecha</th><th>Concepto</th><th>Plazo</th><th>Bruto</th><th>Reembolso</th><th>Neto hogar</th></tr></thead>
              <tbody>${future.map((item) => {
                const installment = item.installmentNo !== null && item.installmentNo !== undefined
                  && item.installmentTotal !== null && item.installmentTotal !== undefined
                  ? `${item.installmentNo}/${item.installmentTotal}`
                  : item.componentType === "revolving" ? "revolving" : "—";
                return `
                  <tr>
                    <td>${escapeHtml(formatFinanceDate(item.dueDate, item.dueDate || "—"))}</td>
                    <td>${escapeHtml(item.label || item.componentId || "—")}${item.status === "projected" ? " · estimado" : ""}</td>
                    <td>${escapeHtml(installment)}</td>
                    <td>${item.grossAmount === null ? "—" : formatMoney(item.grossAmount, currency)}</td>
                    <td>${item.expectedReimbursement === null || item.expectedReimbursement === 0 ? "—" : formatMoney(item.expectedReimbursement, currency)}</td>
                    <td><strong>${item.netHouseholdAmount === null ? "—" : formatMoney(item.netHouseholdAmount, currency)}</strong></td>
                  </tr>`;
              }).join("")}</tbody>
            </table>
          </div>
        </section>` : ""}

      ${movements.length ? `
        <section class="credit-detail-section">
          <div class="credit-detail-heading">
            <div><strong>Compras que alimentaron el revolving</strong><span>Movimientos identificados en extractos ECI</span></div>
            <small>Neto ${formatMoney(revolvingNetPurchases, currency)}</small>
          </div>
          <div class="credit-history-scroll" role="region" aria-label="Compras históricas del revolving ECI" tabindex="0">
            <table class="credit-history-table credit-movements-table">
              <thead><tr><th>Fecha</th><th>Departamento / comercio</th><th>Tipo</th><th>Importe</th></tr></thead>
              <tbody>${movements.map((item) => `
                <tr>
                  <td>${escapeHtml(formatFinanceDate(item.operationDate, item.operationDate || "—"))}</td>
                  <td title="${escapeHtml(item.note || "")}">
                    <strong>${escapeHtml(item.department || item.merchant || "—")}</strong>
                    ${item.merchant && item.department ? `<small>${escapeHtml(item.merchant)}</small>` : ""}
                  </td>
                  <td>${escapeHtml(item.movementType === "refund" ? "Devolución" : "Compra")}</td>
                  <td class="${Number(item.amount) < 0 ? "is-negative" : ""}">${item.amount === null ? "—" : formatMoney(item.amount, currency)}</td>
                </tr>`).join("")}</tbody>
            </table>
          </div>
        </section>` : ""}

      ${history.length ? `
        <section class="credit-detail-section">
          <div class="credit-detail-heading">
            <div><strong>Histórico de recibos</strong><span>Conciliación mensual</span></div>
            <small>${history.length} periodos</small>
          </div>
          <div class="credit-history-scroll" role="region" aria-label="Histórico de recibos de crédito" tabindex="0">
            <table class="credit-history-table">
              <thead><tr><th>Vencimiento</th><th>Compras</th><th>Intereses</th><th>Revolving</th><th>Aplazamientos</th><th>Total</th></tr></thead>
              <tbody>${history.map((item) => `
                <tr>
                  <td>${escapeHtml(formatFinanceDate(item.dueDate, item.dueDate || "—"))}</td>
                  <td>${item.purchases === null ? "—" : formatMoney(item.purchases, currency)}</td>
                  <td>${item.interest === null ? "—" : formatMoney(item.interest, currency)}</td>
                  <td>${item.paymentRevolving === null ? "—" : formatMoney(item.paymentRevolving, currency)}</td>
                  <td>${item.installmentReceipt === null ? "—" : formatMoney(item.installmentReceipt, currency)}</td>
                  <td><strong>${item.totalReceipt === null ? "—" : formatMoney(item.totalReceipt, currency)}</strong></td>
                </tr>`).join("")}</tbody>
            </table>
          </div>
        </section>` : ""}

      ${closedProducts.length ? `
        <details class="credit-closed-products">
          <summary>Financiaciones cerradas · ${closedProducts.length}</summary>
          <div class="credit-product-list">${closedProducts.map((item) => renderCreditProductItem(item, currency)).join("")}</div>
        </details>` : ""}
    </div>`;
  dialog.showModal();
}

function formatLoanBenchmarkPercent(value, { signed = true, suffix = "%" } = {}) {
  const number = firstFinite(value);
  if (number === null) return "—";
  const pct = number * 100;
  const sign = signed && pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`;
}

function loanInvestmentBenchmarkTone(item) {
  const advantage = firstFinite(item?.netAdvantage);
  if (advantage === null || Math.abs(advantage) < 0.005) return "neutral";
  return advantage > 0 ? "positive" : "negative";
}

function loanInvestmentBenchmarkOutcome(item, currency) {
  const advantage = firstFinite(item?.netAdvantage);
  if (advantage === null) return { label: "Resultado pendiente", amount: "—" };
  if (Math.abs(advantage) < 0.005) return { label: "Empate técnico", amount: formatMoney(0, currency) };
  return advantage > 0
    ? { label: "Batiendo al banco", amount: "+" + formatMoney(Math.abs(advantage), currency) }
    : { label: "Por debajo del banco", amount: "−" + formatMoney(Math.abs(advantage), currency) };
}

function renderLoanInvestmentBenchmarkCards(wealth, compact = false) {
  const rows = Array.isArray(wealth?.loanInvestmentBenchmarks)
    ? wealth.loanInvestmentBenchmarks.filter((item) => item?.id)
    : [];
  if (!rows.length) return "";

  return `<section class="loan-benchmark-list ${compact ? "is-compact" : ""}" aria-label="Préstamos frente a inversiones">
    ${rows.map((item) => {
      const currency = item.currency || wealth?.currency || "EUR";
      const tone = loanInvestmentBenchmarkTone(item);
      const outcome = loanInvestmentBenchmarkOutcome(item, currency);
      const provisional = String(item.dataStatus || "").toLowerCase() === "provisional";
      const through = formatFinanceDate(item.throughDate, item.throughDate || "Sin fecha");
      return `
        <button
          type="button"
          class="loan-benchmark-card is-${tone}"
          data-loan-investment-benchmark-id="${escapeHtml(item.id)}"
          aria-label="Abrir detalle de ${escapeHtml(item.label || "préstamo frente a inversión")}">
          <span class="loan-benchmark-head">
            <span>
              <small>Préstamo vs inversión</small>
              <strong>${escapeHtml(item.label || "Comparativa")}</strong>
            </span>
            <em class="loan-benchmark-status ${provisional ? "is-provisional" : ""}">${provisional ? "Provisional" : "Actualizado"}</em>
          </span>
          <span class="loan-benchmark-outcome">
            <strong>${escapeHtml(outcome.label)}</strong>
            <b>${escapeHtml(outcome.amount)}</b>
          </span>
          <span class="loan-benchmark-metrics">
            <span><small>Cartera</small><strong>${escapeHtml(formatLoanBenchmarkPercent(item.portfolioReturnPct))}</strong></span>
            <span><small>Banco · periodo</small><strong>${escapeHtml(formatLoanBenchmarkPercent(item.loanEquivalentReturnPct, { signed: false }))}</strong></span>
            <span><small>Spread bruto</small><strong>${escapeHtml(formatLoanBenchmarkPercent(item.grossSpreadPct, { suffix: "pp" }))}</strong></span>
          </span>
          <span class="loan-benchmark-foot">Resultado neto tras costes · ${escapeHtml(through)} <i aria-hidden="true">→</i></span>
        </button>`;
    }).join("")}
  </section>`;
}

function openLoanInvestmentBenchmarkDetail(benchmarkId) {
  const wealth = state.financeSummary?.wealth || {};
  const rows = Array.isArray(wealth.loanInvestmentBenchmarks) ? wealth.loanInvestmentBenchmarks : [];
  const item = rows.find((candidate) => String(candidate.id) === String(benchmarkId));
  const dialog = document.querySelector("#detail-dialog");
  if (!dialog || !item) return;

  const currency = item.currency || wealth.currency || "EUR";
  const tone = loanInvestmentBenchmarkTone(item);
  const outcome = loanInvestmentBenchmarkOutcome(item, currency);
  const provisional = String(item.dataStatus || "").toLowerCase() === "provisional";
  const netAdvantage = firstFinite(item.netAdvantage);
  const grossGain = firstFinite(item.grossInvestmentGain);
  const netGain = firstFinite(item.netInvestmentGain);
  const loanCost = firstFinite(item.loanCostEquivalent);
  const tracedCapital = firstFinite(item.tracedCapital);
  const initialCosts = firstFinite(item.initialCosts);

  dialog.classList.remove("important-events-dialog", "health-dialog", "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog", "objects-dialog", "projects-dialog");
  dialog.classList.add("wealth-dialog");
  document.querySelector("#dialog-context").textContent = "Patrimonio · Préstamo vs inversión";
  document.querySelector("#dialog-title").textContent = item.label || "Comparativa préstamo e inversión";
  document.querySelector("#dialog-body").innerHTML = `
    <div class="loan-benchmark-detail">
      <section class="loan-benchmark-detail-hero is-${tone}">
        <div>
          <span>Resultado neto hasta ${escapeHtml(formatFinanceDate(item.throughDate, item.throughDate || "—"))}</span>
          <strong>${escapeHtml(outcome.label)}</strong>
          <small>${provisional ? "Cálculo provisional · hay datos pendientes de reconciliar" : "Cálculo actualizado con las fuentes privadas disponibles"}</small>
        </div>
        <b>${escapeHtml(outcome.amount)}</b>
      </section>

      <section class="loan-benchmark-detail-grid">
        <article><span>Capital trazado</span><strong>${tracedCapital === null ? "—" : formatMoney(tracedCapital, currency)}</strong><small>${escapeHtml(item.investmentLabel || "Inversión")}</small></article>
        <article><span>Rentabilidad cartera</span><strong>${escapeHtml(formatLoanBenchmarkPercent(item.portfolioReturnPct))}</strong><small>Anualizada: ${escapeHtml(formatLoanBenchmarkPercent(item.portfolioAnnualizedPct))}</small></article>
        <article><span>Coste banco equivalente</span><strong>${escapeHtml(formatLoanBenchmarkPercent(item.loanEquivalentReturnPct, { signed: false }))}</strong><small>TAE: ${escapeHtml(formatLoanBenchmarkPercent(item.loanTae, { signed: false }))}</small></article>
        <article><span>Spread bruto</span><strong>${escapeHtml(formatLoanBenchmarkPercent(item.grossSpreadPct, { suffix: "pp" }))}</strong><small>Antes de costes iniciales</small></article>
      </section>

      <section class="loan-benchmark-money-grid">
        <article><span>Ganancia inversión bruta</span><strong>${grossGain === null ? "—" : formatMoney(grossGain, currency)}</strong></article>
        <article><span>Costes iniciales</span><strong>${initialCosts === null ? "—" : formatMoney(initialCosts, currency)}</strong></article>
        <article><span>Ganancia inversión tras costes</span><strong>${netGain === null ? "—" : formatMoney(netGain, currency)}</strong></article>
        <article><span>Coste equivalente del banco</span><strong>${loanCost === null ? "—" : formatMoney(loanCost, currency)}</strong></article>
        <article class="is-result"><span>Ventaja neta inversión − banco</span><strong class="is-${tone}">${netAdvantage === null ? "—" : (netAdvantage > 0 ? "+" : "") + formatMoney(netAdvantage, currency)}</strong></article>
      </section>

      <section class="loan-benchmark-period">
        <div><span>Periodo comparable</span><strong>${escapeHtml(formatFinanceDate(item.startDate, item.startDate || "—"))} → ${escapeHtml(formatFinanceDate(item.throughDate, item.throughDate || "—"))}</strong></div>
        <div><span>Préstamo de referencia</span><strong>${escapeHtml(item.loanLabel || "Préstamo")}</strong></div>
      </section>

      <section class="loan-benchmark-explanation">
        <h3>Cómo leerlo</h3>
        <p>La comparación usa el mismo periodo para ambos lados. La cartera se mide sin confundir aportaciones o retiradas con rentabilidad; el banco se convierte desde la TAE a un coste equivalente para ese mismo intervalo. Después se restan los costes iniciales atribuibles a la inversión.</p>
        ${item.methodology ? `<p><strong>Metodología:</strong> ${escapeHtml(item.methodology)}</p>` : ""}
        ${item.note ? `<p><strong>Estado del dato:</strong> ${escapeHtml(item.note)}</p>` : ""}
        ${item.sourceBasis ? `<p class="loan-benchmark-source"><strong>Fuentes:</strong> ${escapeHtml(item.sourceBasis)}</p>` : ""}
      </section>

      <button type="button" class="loan-benchmark-back text-action" data-loan-benchmark-back>← Volver a Patrimonio</button>
    </div>`;

  document.querySelector("[data-loan-benchmark-back]")?.addEventListener("click", openWealthDetail);
  dialog.showModal();
}

function renderWealthOverview() {
  const wealth = state.financeSummary?.wealth || null;
  const container = document.querySelector("#wealth-summary");
  if (!container) return;

  const allocation = Array.isArray(wealth?.allocation)
    ? wealth.allocation.filter((item) => Number.isFinite(Number(item.amount)) && Number(item.amount) > 0)
    : [];
  const allocationTotal = allocation.reduce((sum, item) => sum + Number(item.amount), 0);
  const current = allocationTotal > 0 ? allocationTotal : firstFinite(wealth?.currentPatrimony);

  if (!wealth || current === null) {
    container.innerHTML = `
      <div class="wealth-empty">
        <strong>Patrimonio pendiente de conectar</strong>
        <p>La distribución aparecerá cuando exista un snapshot patrimonial privado.</p>
      </div>`;
    return;
  }

  const currency = wealth.currency || "EUR";
  const dates = allocation.map((item) => item.updatedAt).filter(Boolean).sort();
  const latestAllocationDate = dates.length ? dates[dates.length - 1] : null;
  const asOf = formatFinanceDate(latestAllocationDate || wealth.currentDate, "Fecha no disponible");
  const needsRefresh = allocation.some((item) => /requiere refresco|retirada posterior|no representa el saldo actual/i.test(String(item.note || "")));

  container.innerHTML = `
    <div class="wealth-summary-value">
      <span>Patrimonio total</span>
      <strong>${formatMoney(current, currency)}</strong>
      <small>PatrimonioDetalle · ${escapeHtml(asOf)}${needsRefresh ? " · refresco pendiente en alguna fuente" : ""}</small>
    </div>
    ${renderHomeWealthAllocation(allocation, currency)}
    ${renderLoanInvestmentBenchmarkCards(wealth, true)}
    ${renderEtoroAllocationBar(wealth, currency, true)}
  `;
}

function formatWealthDailyPercent(value) {
  const number = firstFinite(value);
  if (number === null) return "—";
  const pct = number * 100;
  return `${pct > 0 ? "+" : ""}${pct.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function wealthDailyTone(value) {
  const number = firstFinite(value);
  if (number === null || Math.abs(number) < 0.0005) return "neutral";
  return number > 0 ? "positive" : "negative";
}

function renderWealthDailyRows(rows, fallbackCurrency) {
  return `<div class="wealth-daily-table-scroll" role="region" aria-label="Histórico diario de patrimonio" tabindex="0">
    <table class="wealth-daily-table">
      <thead><tr><th>Fecha</th><th>Patrimonio</th><th>Día</th><th>P/L día</th><th>Movimiento</th></tr></thead>
      <tbody>${rows.map((item) => {
        const currency = item.currency || fallbackCurrency;
        const patrimony = firstFinite(item.patrimony);
        const pnl = firstFinite(item.pnlDay);
        const tone = wealthDailyTone(item.changePct);
        return `<tr>
          <td>${escapeHtml(formatFinanceDate(item.date, item.date || "—"))}</td>
          <td>${patrimony === null ? "—" : escapeHtml(formatMoney(patrimony, currency))}</td>
          <td class="wealth-daily-number is-${tone}">${escapeHtml(formatWealthDailyPercent(item.changePct))}</td>
          <td class="wealth-daily-number is-${tone}">${pnl === null ? "—" : escapeHtml(formatMoney(pnl, currency))}</td>
          <td><span class="wealth-daily-movement is-${tone}">${escapeHtml(item.movement || "—")}</span></td>
        </tr>`;
      }).join("")}</tbody>
    </table>
  </div>`;
}

function renderWealthDailyDiary(diary, fallbackCurrency = "EUR") {
  const rows = (Array.isArray(diary) ? diary : [])
    .filter((item) => item?.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!rows.length) {
    return `<section class="wealth-daily-section wealth-daily-empty">
      <div class="wealth-daily-heading">
        <div><strong>Diario de patrimonio</strong><span>Cierre diario de cartera</span></div>
      </div>
      <p>Aún no hay cierres diarios registrados.</p>
    </section>`;
  }

  const latest = rows[0];
  const latestWithPatrimony = rows.find((item) => firstFinite(item.patrimony) !== null) || latest;
  const currency = latestWithPatrimony.currency || fallbackCurrency;
  const patrimony = firstFinite(latestWithPatrimony.patrimony);
  const pnl = firstFinite(latest.pnlDay);
  const tone = wealthDailyTone(latest.changePct);
  const importedCount = rows.filter((item) => item.sourceStatus === "IMPORTED_MASTER").length;
  const recent = rows.slice(0, 12);

  return `<section class="wealth-daily-section">
    <div class="wealth-daily-heading">
      <div>
        <strong>Diario de patrimonio</strong>
        <span>Antes «Diario mercados» · cierre nocturno de Delta</span>
      </div>
      <small>${escapeHtml(formatFinanceDate(latest.date, latest.date))}</small>
    </div>

    <div class="wealth-daily-kpis">
      <article>
        <span>Patrimonio</span>
        <strong>${patrimony === null ? "—" : escapeHtml(formatMoney(patrimony, currency))}</strong>
        <small>${escapeHtml(latestWithPatrimony.source || "Fuente privada")}</small>
      </article>
      <article class="is-${tone}">
        <span>Cambio del día</span>
        <strong>${escapeHtml(formatWealthDailyPercent(latest.changePct))}</strong>
        <small>${escapeHtml(latest.movement || "Sin clasificación")}</small>
      </article>
      <article class="is-${tone}">
        <span>P/L del día</span>
        <strong>${pnl === null ? "—" : escapeHtml(formatMoney(pnl, latest.currency || fallbackCurrency))}</strong>
        <small>Cierre diario</small>
      </article>
    </div>

    <div class="wealth-daily-recent">
      <div class="wealth-daily-subheading"><strong>Últimos registros</strong><span>${rows.length} cierres almacenados</span></div>
      ${renderWealthDailyRows(recent, fallbackCurrency)}
    </div>

    ${rows.length > recent.length ? `<details class="wealth-daily-history">
      <summary>Ver histórico completo · ${rows.length} registros</summary>
      ${renderWealthDailyRows(rows, fallbackCurrency)}
    </details>` : ""}

    ${importedCount ? `<p class="wealth-daily-note">Se han importado ${importedCount} registros históricos desde DIARIO MERCADOS. El maestro histórico no tenía una columna de patrimonio total, por eso esos cierres muestran «—» en Patrimonio cuando no existe un valor explícito.</p>` : ""}
  </section>`;
}

let deltaHistoryUiState = { items: [], total: 0, hasMore: false, loading: false };

function formatDeltaQuantity(value) {
  const number = firstFinite(value);
  if (number === null) return "—";
  return number.toLocaleString("es-ES", { maximumFractionDigits: 6 });
}

function deltaMetric(summary, key) {
  return firstFinite(summary?.metrics?.[key]?.value);
}

function renderDeltaOperationRows(items = []) {
  if (!items.length) return '<div class="delta-history-empty">No hay compraventas para mostrar.</div>';
  return `<div class="delta-history-table-scroll" role="region" aria-label="Operaciones históricas Delta" tabindex="0">
    <table class="delta-history-table">
      <thead><tr><th>Fecha</th><th>Operación</th><th>Activo</th><th>Cantidad</th><th>Importe</th><th>Mercado / broker</th></tr></thead>
      <tbody>${items.map((item) => {
        const side = item.way === "BUY" ? "buy" : item.way === "SELL" ? "sell" : "other";
        const quote = firstFinite(item.quoteAmount);
        return `<tr>
          <td>${escapeHtml(formatFinanceDate(String(item.date || "").slice(0, 10), "—"))}</td>
          <td><span class="delta-side is-${side}">${escapeHtml(item.way || "—")}</span></td>
          <td><strong>${escapeHtml(item.symbol || "—")}</strong><small>${escapeHtml(item.baseType || "")}</small></td>
          <td class="delta-number">${escapeHtml(formatDeltaQuantity(item.baseAmount))}</td>
          <td class="delta-number">${quote === null || !item.quoteCurrency ? "—" : escapeHtml(formatMoney(quote, item.quoteCurrency))}</td>
          <td><span>${escapeHtml(item.exchange || "—")}</span><small>${escapeHtml(item.broker || "—")}</small></td>
        </tr>`;
      }).join("")}</tbody>
    </table>
  </div>`;
}

function renderDeltaHistoryPanel(payload) {
  if (!payload?.ok) {
    return `<section class="delta-history-section">
      <div class="delta-history-heading"><div><strong>Histórico Delta</strong><span>Operaciones de cartera</span></div></div>
      <p class="delta-history-error">No se ha podido cargar el histórico de Delta.</p>
    </section>`;
  }

  const summary = payload.summary || {};
  const rowsTotal = deltaMetric(summary, "rows_total") ?? payload.counts?.rows ?? null;
  const trades = deltaMetric(summary, "market_trades") ?? payload.counts?.marketTrades ?? null;
  const assets = deltaMetric(summary, "unique_assets");
  const syncAdjustments = deltaMetric(summary, "sync_adjustments") ?? payload.counts?.syncAdjustments ?? null;
  const activeDays = deltaMetric(summary, "active_trading_days");
  const topAssets = (summary.topAssets || []).slice(0, 10);
  const years = summary.years || [];
  const turnover = summary.turnover || [];

  return `<section class="delta-history-section">
    <div class="delta-history-heading">
      <div>
        <strong>Histórico de operaciones Delta</strong>
        <span>Export completo privado · compraventas reales separadas de ajustes de sincronización</span>
      </div>
      <small>${rowsTotal === null ? "—" : rowsTotal.toLocaleString("es-ES")} filas</small>
    </div>

    <div class="delta-history-kpis">
      <article><span>Compraventas</span><strong>${trades === null ? "—" : trades.toLocaleString("es-ES")}</strong><small>BUY + SELL operativos</small></article>
      <article><span>Activos</span><strong>${assets === null ? "—" : assets.toLocaleString("es-ES")}</strong><small>distintos operados</small></article>
      <article><span>Días activos</span><strong>${activeDays === null ? "—" : activeDays.toLocaleString("es-ES")}</strong><small>con compraventas</small></article>
      <article><span>Ajustes excluidos</span><strong>${syncAdjustments === null ? "—" : syncAdjustments.toLocaleString("es-ES")}</strong><small>sync / balance Delta</small></article>
    </div>

    <div class="delta-history-insights">
      <article>
        <div class="delta-history-subhead"><strong>Actividad por año</strong><span>nº de compraventas</span></div>
        <div class="delta-year-grid">${years.map((item) => `<div><span>${escapeHtml(item.year)}</span><strong>${Number(item.operations || 0).toLocaleString("es-ES")}</strong><small>${escapeHtml(item.note || "")}</small></div>`).join("")}</div>
      </article>
      <article>
        <div class="delta-history-subhead"><strong>Activos más operados</strong><span>concentración de actividad</span></div>
        <div class="delta-top-assets">${topAssets.map((item, index) => `<span><b>${index + 1}</b>${escapeHtml(item.symbol)}<strong>${Number(item.operations || 0).toLocaleString("es-ES")}</strong></span>`).join("")}</div>
      </article>
    </div>

    <div class="delta-turnover">
      <div class="delta-history-subhead"><strong>Volumen bruto transaccional</strong><span>No equivale a beneficio ni a aportación neta</span></div>
      <div class="delta-turnover-grid">${turnover.map((item) => `<div><span>${escapeHtml(item.currency)}</span><strong>${item.amount === null ? "—" : escapeHtml(formatMoney(item.amount, item.currency))}</strong></div>`).join("")}</div>
    </div>

    <div class="delta-history-operations">
      <div class="delta-history-subhead">
        <strong>Compraventas históricas</strong>
        <span id="delta-history-count">${deltaHistoryUiState.items.length.toLocaleString("es-ES")} de ${Number(payload.page?.total || 0).toLocaleString("es-ES")}</span>
      </div>
      <div id="delta-history-rows">${renderDeltaOperationRows(deltaHistoryUiState.items)}</div>
      ${deltaHistoryUiState.hasMore ? '<button type="button" class="delta-load-more" id="delta-load-more">Ver 100 operaciones más</button>' : ""}
    </div>

    <p class="delta-history-note">El archivo completo queda archivado de forma privada. Los ajustes automáticos y filas de sincronización se conservan, pero no se contabilizan como decisiones de inversión. El export por sí solo no permite afirmar la rentabilidad histórica total sin reconstruir lotes, corporate actions y flujos externos.</p>
  </section>`;
}

async function loadDeltaHistory(reset = true) {
  const panel = document.querySelector("#delta-history-panel");
  if (!panel || deltaHistoryUiState.loading) return;
  if (reset) {
    deltaHistoryUiState = { items: [], total: 0, hasMore: false, loading: true };
    panel.innerHTML = '<section class="delta-history-section"><div class="delta-history-heading"><div><strong>Histórico Delta</strong><span>Cargando operaciones privadas…</span></div></div></section>';
  } else {
    deltaHistoryUiState.loading = true;
    const button = document.querySelector("#delta-load-more");
    if (button) { button.disabled = true; button.textContent = "Cargando…"; }
  }

  try {
    const offset = reset ? 0 : deltaHistoryUiState.items.length;
    const response = await fetch("/api/finance/delta?kind=trade&limit=100&offset=" + encodeURIComponent(offset), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("DELTA_HISTORY_" + response.status);
    const payload = await response.json();
    const pageItems = Array.isArray(payload.page?.items) ? payload.page.items : [];
    deltaHistoryUiState.items = reset ? pageItems : [...deltaHistoryUiState.items, ...pageItems];
    deltaHistoryUiState.total = Number(payload.page?.total || deltaHistoryUiState.items.length);
    deltaHistoryUiState.hasMore = Boolean(payload.page?.hasMore);
    deltaHistoryUiState.loading = false;
    if (panel) panel.innerHTML = renderDeltaHistoryPanel(payload);

    const button = document.querySelector("#delta-load-more");
    if (button) button.addEventListener("click", () => void loadDeltaHistory(false));
  } catch (error) {
    console.warn("Delta history load failed", error);
    deltaHistoryUiState.loading = false;
    if (panel) panel.innerHTML = renderDeltaHistoryPanel({ ok: false });
  }
}

function openWealthDetail() {
  const wealth = state.financeSummary?.wealth || null;
  const dialog = document.querySelector("#detail-dialog");
  dialog.classList.add("wealth-dialog");
  document.querySelector("#dialog-context").textContent = "Patrimonio · Distribución y conciliación";
  document.querySelector("#dialog-title").textContent = "Patrimonio financiero";

  const allocation = Array.isArray(wealth?.allocation)
    ? wealth.allocation.filter((item) => Number.isFinite(Number(item.amount)) && Number(item.amount) > 0)
    : [];
  if (!wealth || (!allocation.length && firstFinite(wealth.currentPatrimony) === null)) {
    document.querySelector("#dialog-body").innerHTML = "<p>No hay patrimonio conectado.</p>";
    dialog.showModal();
    return;
  }

  const history = Array.isArray(wealth.history)
    ? wealth.history.filter((item) => item.date)
    : [];
  const currency = wealth.currency || "EUR";

  document.querySelector("#dialog-body").innerHTML = `
    <div class="wealth-detail">
      ${renderWealthAllocation(wealth, currency)}

      ${renderLoanInvestmentBenchmarkCards(wealth, false)}

      ${renderEtoroAllocationBar(wealth, currency, false)}

      ${renderWealthDailyDiary(wealth.dailyDiary, currency)}

      <div id="delta-history-panel"></div>

      ${history.length ? `
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
            <div><strong>Evolución del patrimonio histórico</strong><span>Referencia registrada el día 1 de cada mes</span></div>
          </div>
          ${renderWealthLineChart(history, [
            { key: "patrimony", className: "patrimony-line" }
          ], currency, "Evolución del patrimonio")}
        </section>` : ""}
    </div>`;
  dialog.showModal();
  void loadDeltaHistory(true);
}

const MIDAS_GROUPS = [
  ["diario_heredado", "Algoritmo genético original · S&P 500"],
  ["paper_nuevo", "Campaña nueva 2026 · EE. UU. · USD"],
  ["weekly_ml_demo", "Weekly ML · ensemble y expertos · USD"],
  ["capital_cycle_demo", "Capital Cycle · underinvestment + calidad + giro · USD"],
  ["buy_the_dip_demo", "Buy The Dip corpus · deep value + situaciones especiales · USD"],
  ["tfg_demo_adaptado", "TFG corregido 2026 · técnico + AHP + MAD · USD"],
  ["tfm_demo_adaptado", "TFM · modelos adaptados a cartera demo · EUR"],
  ["historica_pendiente", "Ideas históricas pendientes"]
];

const MIDAS_STATUS = {
  demo_con_diario: "Demo con diario",
  programada_sin_diario: "Programada, sin sesión",
  pendiente_modelo: "Modelo pendiente",
  sin_diario_disponible: "Diario privado no enlazado",
  diario_heredado_observado: "Simulación histórica registrada",
  sin_ejecucion_comparable: "Pendiente de adaptación"
};

function formatMidasPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function renderMidasRows(rows) {
  const formatRisk = (value) => typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
  return `<div class="midas-table-scroll" role="region" aria-label="Resultados y riesgo de estrategias" tabindex="0">
    <table class="midas-table">
      <thead><tr><th scope="col">Estrategia</th><th scope="col">Estado</th><th scope="col">Última sesión</th><th scope="col">Día</th><th scope="col">Acumulado</th><th scope="col">Vol. anual.</th><th scope="col">Máx. DD</th><th scope="col">Sharpe</th><th scope="col">Capital demo</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <th scope="row"><span>${escapeHtml(row.label)}</span>${row.provenance ? `<small class="midas-provenance">Origen: ${escapeHtml(row.provenance)}</small>` : ""}${row.note && ["diario_heredado", "historica_pendiente"].includes(row.group) ? `<small>${escapeHtml(row.note)}</small>` : ""}</th>
        <td data-label="Estado"><span class="midas-status ${row.status === "demo_con_diario" ? "is-running" : ""}">${escapeHtml(MIDAS_STATUS[row.status] || row.status)}</span></td>
        <td data-label="Última sesión">${escapeHtml(formatFinanceDate(row.last_session, "—"))}</td>
        <td class="midas-number" data-label="Día">${formatMidasPercent(row.day_return_pct)}</td>
        <td class="midas-number" data-label="Acumulado">${formatMidasPercent(row.return_pct)}</td>
        <td class="midas-number" data-label="Vol. anual.">${formatMidasPercent(row.annualized_volatility_pct)}</td>
        <td class="midas-number" data-label="Máx. DD">${formatMidasPercent(row.max_drawdown_pct)}</td>
        <td class="midas-number" data-label="Sharpe">${formatRisk(row.sharpe_0rf)}</td>
        <td class="midas-number" data-label="Capital demo">${row.last_equity === null || !row.currency ? "—" : escapeHtml(formatMoney(row.last_equity, row.currency))}</td>
      </tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderMidasResearch(research) {
  if (!research || research.status !== "ok") {
    return `<section class="midas-research midas-research-unavailable">
      <div class="midas-research-heading">
        <div><strong>Tesis y CAGR 2031</strong><span>Watchlist privada</span></div>
      </div>
      <p>La watchlist privada no está disponible en esta carga.</p>
    </section>`;
  }

  const rows = Array.isArray(research.cagr2031) ? research.cagr2031 : [];
  const theses = new Map((Array.isArray(research.theses) ? research.theses : []).map((item) => [item.ticker, item]));
  const complete = rows.filter((row) => row.bear && row.base && row.bull).length;
  const pending = Math.max(0, rows.length - complete);

  return `<section class="midas-research">
    <div class="midas-research-heading">
      <div>
        <strong>Tesis y CAGR 2031</strong>
        <span>Watchlist privada para revisar cuando exista liquidez</span>
      </div>
      <div class="midas-research-counts">
        <b>${rows.length} tesis</b>
        <small>${complete} con CAGR 2031 · ${pending} pendientes</small>
      </div>
    </div>
    <p class="midas-research-rule">Cada tesis nueva debe conservar escenarios bear / base / bull a 2031. Si el estudio histórico tenía otro horizonte, no se extrapola: aparece pendiente hasta recalcularlo.</p>
    <div class="midas-research-table-scroll" role="region" aria-label="Tesis de inversión y CAGR a 2031" tabindex="0">
      <table class="midas-research-table">
        <thead><tr>
          <th>Ticker / empresa</th><th>Tema</th><th>Bear 2031</th><th>Base 2031</th><th>Bull 2031</th><th>Última tesis</th><th>Estado</th>
        </tr></thead>
        <tbody>${rows.map((row) => {
          const thesis = theses.get(row.ticker) || {};
          const statusClass = row.bear && row.base && row.bull ? "is-complete" : "is-pending";
          const original = row.originalHorizon && (row.originalBear || row.originalBase || row.originalBull)
            ? `<small>Histórico ${escapeHtml(row.originalHorizon)}: ${escapeHtml([row.originalBear, row.originalBase, row.originalBull].filter(Boolean).join(" / "))}</small>`
            : "";
          return `<tr>
            <td><strong>${escapeHtml(row.ticker)}</strong><span>${escapeHtml(row.company)}</span>${thesis.summary ? `<small>${escapeHtml(thesis.summary)}</small>` : ""}</td>
            <td>${escapeHtml(row.theme || thesis.theme || "—")}</td>
            <td class="midas-cagr-value">${row.bear ? escapeHtml(row.bear) : "—"}</td>
            <td class="midas-cagr-value is-base">${row.base ? escapeHtml(row.base) : "—"}${!row.base ? original : ""}</td>
            <td class="midas-cagr-value">${row.bull ? escapeHtml(row.bull) : "—"}</td>
            <td>${escapeHtml(formatFinanceDate(row.studyDate || thesis.lastReview, "—"))}</td>
            <td><span class="midas-research-status ${statusClass}">${escapeHtml(row.status || "Pendiente")}</span></td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>
  </section>`;
}

function renderMidasExecutionHealth(health, dashboard) {
  const genetic = (dashboard?.tracks || []).find((row) => row.id === "genetic_sp500_forward");
  const workflowRows = Array.isArray(health?.workflows) ? health.workflows : [];
  const stateLabels = {
    success: "Correcto",
    running: "Ejecutándose",
    not_due_yet: "Aún no toca",
    failed: "Fallo",
    missing_due_run: "Ejecución ausente"
  };
  const rows = workflowRows.map((row) => ({
    label: row.name
      .replace("MIDAS paper comparison", "Estrategias diarias")
      .replace("MIDAS TFM shadow forecasts", "TFM diario")
      .replace("MIDAS capital cycle paper", "Capital Cycle")
      .replace("MIDAS Buy The Dip paper", "Buy The Dip")
      .replace("MIDAS weekly ML paper", "Weekly ML")
      .replace("MIDAS TFG corrected paper", "TFG corregido"),
    state: row.state,
    ok: row.ok,
    detail: row.detail,
    timestamp: row.created_at,
    run: row.run_number
  }));
  rows.push({
    label: "Genético S&P 500 prospectivo",
    state: genetic?.status === "demo_con_diario" && genetic?.last_session ? "success" : "missing_due_run",
    ok: genetic?.status === "demo_con_diario" && Boolean(genetic?.last_session),
    detail: genetic?.last_session ? "Diario privado enlazado hasta " + genetic.last_session : "Sin snapshot prospectivo enlazado",
    timestamp: null,
    run: null
  });

  const unavailable = health?.status !== "ok";
  const attention = !unavailable && rows.some((row) => row.ok === false);
  const overall = unavailable ? "Estado operativo no disponible" : attention ? "Requiere atención" : "Ejecución controlada";
  return `<section class="midas-runtime-health ${attention ? "is-attention" : unavailable ? "is-unknown" : "is-healthy"}">
    <div class="midas-runtime-heading">
      <div><span class="context-label">Salud operativa</span><strong>${escapeHtml(overall)}</strong></div>
      <small>${health?.checked_at_utc ? "Comprobado " + escapeHtml(formatFinanceDate(health.checked_at_utc)) : "La auditoría horaria valida además Actions + diarios"}</small>
    </div>
    <div class="midas-runtime-grid">
      ${rows.map((row) => `<article class="midas-runtime-item is-${escapeHtml(row.state || "unknown")}">
        <span class="midas-runtime-dot" aria-hidden="true"></span>
        <div><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(stateLabels[row.state] || "Estado desconocido")}${row.run ? " · run #" + escapeHtml(row.run) : ""}${row.timestamp ? " · " + escapeHtml(formatFinanceDate(row.timestamp)) : ""}</small>${row.detail ? `<em>${escapeHtml(row.detail)}</em>` : ""}</div>
      </article>`).join("")}
    </div>
  </section>`;
}

function renderMidasReport(dashboard, stale, research = null, lab = null) {
  const rows = dashboard.tracks || [];
  const observed = rows.filter((row) => ["demo_con_diario", "diario_heredado_observado"].includes(row.status)).length;
  const originalGenetic = rows.find((row) => row.id === "genetic_sp500_legacy");
  const lastSessions = rows.map((row) => row.last_session).filter(Boolean).sort();
  const latest = lastSessions.length ? lastSessions[lastSessions.length - 1] : null;
  return `<div class="midas-report">
    <div class="midas-intro">
      <p><strong>${observed} ${observed === 1 ? "estrategia" : "estrategias"} con resultados en este informe</strong><span>Último cierre registrado: ${escapeHtml(formatFinanceDate(latest, "aún ninguno"))}</span></p>
      <p class="midas-updated">Informe generado ${escapeHtml(formatFinanceDate(dashboard.generated_at_utc))}${stale ? " · copia temporal: la fuente no responde" : ""}</p>
    </div>
    ${originalGenetic ? `<p class="midas-genetic-note"><strong>Genético original S&P 500</strong><span>El historial antiguo se conserva como referencia: anotaba operaciones al mismo cierre que generaba la señal y su rentabilidad no era alcanzable con esa regla. La fila «versión corregida» empieza una campaña nueva: señal al cierre y ejecución simulada en la apertura siguiente, con costes. Sus cifras siguen siendo ficticias, sin órdenes confirmadas por un bróker. El «genético nuevo congelado» de ocho acciones es otra estrategia demo.</span></p>` : ""}
    ${renderMidasExecutionHealth(lab?.competitionHealth, dashboard)}
    <p class="midas-caveat">Capital ficticio y operaciones simuladas. La comparación principal sigue rentabilidad acumulada y riesgo realizado (volatilidad anualizada según la cadencia registrada, máximo drawdown y Sharpe descriptivo con rf=0). Cada estrategia conserva sus propios plazos y reglas; si las fechas de inicio difieren no forman una clasificación común hasta disponer de una ventana solapada suficiente. «Día» compara el último cierre con el anterior registrado. Las líneas prospectivas nuevas admiten acciones fraccionadas; el bootstrap Weekly ML visible hasta el primer forward real es una prueba anterior a ese cambio y no se recalcula.</p>
    ${renderMidasVisualLab(dashboard, lab)}
    ${renderMidasResearch(research)}
    ${MIDAS_GROUPS.map(([group, title]) => {
      const groupRows = rows.filter((row) => row.group === group);
      if (!groupRows.length) return "";
      if (group === "historica_pendiente") {
        return `<details class="midas-pending"><summary>${title} <span>${groupRows.length}</span></summary>${renderMidasRows(groupRows)}</details>`;
      }
      const groupNote = group === "diario_heredado"
        ? `<p class="midas-group-note">Diario antiguo congelado y campaña corregida separada. Compara la versión corregida solo cuando acumule sesiones prospectivas.</p>`
        : group === "tfm_demo_adaptado"
          ? '<p class="midas-group-note">Modelos reimplementados en 2026 con una regla de cartera provisional común.</p>'
          : "";
      return `<section class="midas-group"><h3>${title}</h3>${groupNote}${renderMidasRows(groupRows)}</section>`;
    }).join("")}
    <p class="midas-source">Fuente: <a href="https://github.com/mamg97/midas-paper-lab/blob/main/strategy_state/dashboard.md" target="_blank" rel="noopener noreferrer">diario público MIDAS</a>.${originalGenetic?.status === "diario_heredado_observado" ? " La cifra del genético original procede de un extracto validado de su diario privado; no se publican posiciones ni operaciones." : " La estrategia genética original mantiene su diario privado, aún no enlazado."}</p>
  </div>`;
}

async function openMidasDialog() {
  if (globalThis.__SECOND_BRAIN_REMOTE__ !== true) return;
  const dialog = document.querySelector("#midas-dialog");
  const target = document.querySelector("#midas-report");
  if (!dialog.open) dialog.showModal();
  target.innerHTML = '<p class="midas-loading">Cargando el último informe de MIDAS…</p>';
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/midas", {
      headers: { Accept: "application/json" }, credentials: "same-origin",
      cache: "no-store", signal: controller.signal
    });
    if (!response.ok) throw new Error(`MIDAS_HTTP_${response.status}`);
    const result = await response.json();
    if (!result.ok || !Array.isArray(result.dashboard?.tracks)) throw new Error("MIDAS_INVALID_RESPONSE");
    if (dialog.open) target.innerHTML = renderMidasReport(result.dashboard, result.stale, result.research, result.lab);
  } catch {
    if (dialog.open) {
      target.innerHTML = '<div class="midas-error"><strong>No se pudo cargar el informe.</strong><p>El diario público puede estar aún sin publicar o temporalmente inaccesible.</p><button id="midas-retry" type="button">Reintentar</button></div>';
      target.querySelector("#midas-retry")?.addEventListener("click", () => void openMidasDialog());
    }
  } finally {
    window.clearTimeout(timeout);
  }
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
    : sourceStatus === "CONFIRMADO_EXTRACTOS_ECI" || sourceStatus === "CONFIRMADO_EXTRACTO_ECI"
      ? "Confirmado · extractos"
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

function quantizeBarSegments(segments, total) {
  const safeTotal = Math.max(0, Number(total) || 0);
  if (!safeTotal || !segments.length) return segments.map((item) => ({ ...item, visibleAmount: 0, visiblePct: 0, pctClass: "pct-0" }));

  let remaining = safeTotal;
  const visible = segments.map((item) => {
    const amount = Math.max(0, Number(item.amount) || 0);
    const visibleAmount = Math.min(amount, remaining);
    remaining = Math.max(0, remaining - visibleAmount);
    return { ...item, visibleAmount, exactVisiblePct: (visibleAmount / safeTotal) * 100 };
  });
  const floors = visible.map((item) => Math.floor(item.exactVisiblePct));
  let points = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = visible
    .map((item, index) => ({ index, fraction: item.exactVisiblePct - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < order.length && points > 0; i += 1) {
    if (visible[order[i].index].visibleAmount > 0) {
      floors[order[i].index] += 1;
      points -= 1;
    }
  }
  if (points > 0) {
    const firstVisible = visible.findIndex((item) => item.visibleAmount > 0);
    if (firstVisible >= 0) floors[firstVisible] += points;
  }
  return visible.map((item, index) => ({
    ...item,
    visiblePct: Math.max(0, Math.min(100, floors[index])),
    pctClass: `pct-${Math.max(0, Math.min(100, floors[index]))}`
  }));
}

function allocationColorClass(label, index) {
  // Within a single visual block, index-based assignment keeps adjacent
  // categories visually unique. The palette has 12 commitment colors;
  // Retenido and Libre use their own dedicated colors outside this range.
  return `allocation-${(Math.max(0, Number(index) || 0) % 12) + 1}`;
}

function buildLiquidityLeaderLayout(segments, height = 258) {
  const ordered = [...segments].reverse();
  if (!ordered.length) return [];

  let topPct = 0;
  return ordered.map((segment, index) => {
    const visiblePct = Math.max(0, Number(segment.visiblePct) || 0);
    const barCenterY = height * ((topPct + (visiblePct / 2)) / 100);
    topPct += visiblePct;
    return {
      ...segment,
      barCenterY,
      rowCenterY: height * ((index + 0.5) / ordered.length)
    };
  });
}

function formatFinanceDate(value, fallback = "Sin fecha") {
  if (!value) return fallback;
  const raw = String(value);
  const date = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "");
}

function formatShortChargeDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slash = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  let date = null;

  if (iso) {
    date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  } else if (slash) {
    const year = Number(slash[3]) < 100 ? 2000 + Number(slash[3]) : Number(slash[3]);
    date = new Date(year, Number(slash[2]) - 1, Number(slash[1]), 12);
  } else {
    const parsed = new Date(raw);
    if (Number.isFinite(parsed.getTime())) date = parsed;
  }

  if (!date || !Number.isFinite(date.getTime())) return raw;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" })
    .format(date)
    .replace(".", "");
}

function liquidityChargeLabel(item) {
  if (!item) return null;

  if (item.chargeDate) {
    const label = formatShortChargeDate(item.chargeDate);
    if (!label) return null;
    const due = new Date(`${String(item.chargeDate).slice(0, 10)}T12:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    return Number.isFinite(due.getTime()) && due < today
      ? `Previsto: ${label} · verificar`
      : `Cobro: ${label}`;
  }

  if (item.chargeDay !== null && item.chargeDay !== undefined && String(item.chargeDay).trim() !== "") {
    const day = Number(item.chargeDay);
    if (Number.isFinite(day) && day >= 1 && day <= 31) return `Cobro: día ${day}`;
  }

  const note = String(item.note || "").trim();
  if (!note) return null;

  // Prefer the next/expected charge over later dates such as "último pago previsto".
  let match = note.match(/(?:pr[oó]ximo\s+)?(?:cargo|cobro|pago)\s+(?:previsto|esperado|programado)?[^0-9]{0,18}(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (match) return `Cobro: ${formatShortChargeDate(match[1])}`;

  match = note.match(/alrededor\s+del\s+d[ií]a\s+(\d{1,2})\b/i);
  if (match) return `Cobro: aprox. día ${Number(match[1])}`;

  match = note.match(/(?:pr[oó]ximo\s+)?(?:cargo|cobro|pago)[^.;]{0,28}?\bd[ií]a\s+(\d{1,2})\b/i);
  if (match) return `Cobro: día ${Number(match[1])}`;

  // Some canonical notes use compact wording such as "Cargo BBVA, día 4".
  if (/(?:cargo|cobro|pago)/i.test(note)) {
    match = note.match(/\bd[ií]a\s+(\d{1,2})\b/i);
    if (match) return `Cobro: día ${Number(match[1])}`;
  }

  return null;
}

function liquidityVisualModel(account, fallbackCurrency = "EUR") {
  const currency = account?.currency || fallbackCurrency;
  const balance = Math.max(0, numberOrZero(account?.balance));
  const allAllocations = (Array.isArray(account?.allocations) ? account.allocations : [])
    .filter((item) => Number.isFinite(Number(item.amount)) && Number(item.amount) > 0);
  const holds = allAllocations.filter((item) => String(item.kind || "").toLowerCase() === "card_hold");
  const allocations = allAllocations.filter((item) => String(item.kind || "").toLowerCase() !== "card_hold");
  const retained = holds.reduce((sum, item) => sum + Number(item.amount), 0);
  const committed = allocations.reduce((sum, item) => sum + Number(item.amount), 0);
  const free = Math.max(0, balance - committed - retained);
  const explicitInternalFree = firstFinite(account?.free);
  const internalFree = explicitInternalFree !== null ? Math.max(0, explicitInternalFree) : free;
  const personalAdjustment = internalFree - free;
  const excess = Math.max(0, committed + retained - balance);
  const availableAfterHolds = Math.max(0, balance - retained);
  const rawSegments = [
    ...(retained > 0 ? [{
      label: "Retenciones bancarias",
      amount: retained,
      className: "allocation-hold",
      kind: "hold"
    }] : []),
    ...allocations.map((item, index) => ({
      label: item.label || "Compromiso",
      amount: Number(item.amount),
      className: allocationColorClass(item.label, index),
      note: item.note || null,
      chargeDate: item.chargeDate || null,
      chargeDay: item.chargeDay ?? null,
      kind: "commitment"
    })),
    ...(free > 0 ? [{
      label: "Libre",
      amount: free,
      className: "allocation-free",
      kind: "free"
    }] : [])
  ];

  return {
    currency,
    balance,
    holds,
    allocations,
    retained,
    committed,
    free,
    internalFree,
    personalAdjustment,
    excess,
    availableAfterHolds,
    rawSegments,
    segments: quantizeBarSegments(rawSegments, balance)
  };
}

function orderedLiquidityAccounts(accounts) {
  const accountRank = new Map([
    ["openbank-miguel", 0],
    ["openbank-andrea", 1],
    ["santander-comun", 2],
    ["bbva-comun", 3]
  ]);
  return [...(Array.isArray(accounts) ? accounts : [])]
    .sort((a, b) => (accountRank.get(a.id) ?? 99) - (accountRank.get(b.id) ?? 99));
}

function renderHomeLiquidityOverview(accounts, fallbackCurrency = "EUR") {
  const orderedAccounts = orderedLiquidityAccounts(accounts).slice(0, 4);
  if (!orderedAccounts.length) return "";

  return `
    <section class="home-liquidity-overview" aria-label="Estado actual de las cuentas">
      <div class="home-finance-mini-heading">
        <strong>Estado de cuentas</strong>
        <span>Disponible bancario y distribución</span>
      </div>
      <div class="home-liquidity-grid">
        ${orderedAccounts.map((account) => {
          const model = liquidityVisualModel(account, fallbackCurrency);
          const shortName = account.bank && account.owner
            ? `${account.bank} · ${account.owner}`
            : account.name || account.id || "Cuenta";
          return `
            <article class="home-liquidity-account ${model.excess > 0.01 ? "has-overflow" : ""}">
              <div class="home-liquidity-account-head">
                <span title="${escapeHtml(account.name || shortName)}">${escapeHtml(shortName)}</span>
                <strong>${formatMoney(model.availableAfterHolds, model.currency)}</strong>
              </div>
              <div class="home-liquidity-account-body">
                <div class="home-liquidity-bar" role="img" aria-label="${escapeHtml(shortName)}: ${escapeHtml(formatMoney(model.availableAfterHolds, model.currency))} disponibles en el banco; saldo total ${escapeHtml(formatMoney(model.balance, model.currency))}">
                  ${model.segments.map((segment) => `
                    <div class="home-liquidity-segment ${segment.className} ${segment.pctClass}"
                         title="${escapeHtml(segment.label)} · ${escapeHtml(formatMoney(segment.amount, model.currency))}"></div>
                  `).join("")}
                </div>
                <div class="home-liquidity-account-meta">
                  ${model.retained > 0 ? `<span>Saldo total <b>${formatMoney(model.balance, model.currency)}</b></span>` : ""}
                  <span>Libre interno <b>${formatMoney(model.internalFree, model.currency)}</b></span>
                  ${Math.abs(model.personalAdjustment) > 0.01 ? `<span>Ajuste personal <b>${model.personalAdjustment > 0 ? "+" : ""}${formatMoney(model.personalAdjustment, model.currency)}</b></span>` : ""}
                  ${model.retained > 0 ? `<span>Retenido <b>${formatMoney(model.retained, model.currency)}</b></span>` : ""}
                  ${model.excess > 0.01 ? `<span class="is-warning">Pendiente de cubrir <b>${formatMoney(model.excess, model.currency)}</b></span>` : ""}
                </div>
              </div>
            </article>`;
        }).join("")}
      </div>
    </section>`;
}

function renderHomeWealthAllocation(items, fallbackCurrency = "EUR") {
  const positions = (Array.isArray(items) ? items : [])
    .filter((item) => Number.isFinite(Number(item.amount)) && Number(item.amount) > 0);
  if (!positions.length) return "";

  const total = positions.reduce((sum, item) => sum + Number(item.amount), 0);
  const segments = quantizeBarSegments(positions.map((item, index) => ({
    ...item,
    label: item.platform || item.id || "Posición",
    className: allocationColorClass(item.platform || item.id, index)
  })), total);

  return `
    <section class="home-wealth-allocation" aria-label="Distribución actual del patrimonio">
      <div class="home-finance-mini-heading">
        <strong>Distribución actual</strong>
        <span>Por plataforma</span>
      </div>
      <div class="home-wealth-stack" role="img" aria-label="Distribución del patrimonio por plataforma">
        ${segments.map((item) => `
          <div class="home-wealth-segment ${item.className} ${item.pctClass}"
               title="${escapeHtml(item.platform || item.id || "Posición")} · ${escapeHtml(formatMoney(item.amount, item.currency || fallbackCurrency))}"></div>
        `).join("")}
      </div>
      <div class="home-wealth-legend">
        ${positions.map((item, index) => {
          const amount = Number(item.amount);
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return `
            <div>
              <i class="${allocationColorClass(item.platform || item.id, index)}"></i>
              <span>${escapeHtml(item.platform || item.id || "Posición")}</span>
              <small>${pct.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%</small>
              <b>${formatMoney(amount, item.currency || fallbackCurrency)}</b>
            </div>`;
        }).join("")}
      </div>
    </section>`;
}

function renderEtoroAllocationBar(wealth, fallbackCurrency = "EUR", compact = false) {
  const rows = (Array.isArray(wealth?.etoroAllocations) ? wealth.etoroAllocations : [])
    .filter((item) => Number.isFinite(Number(item.reservedAmount)) && Number(item.reservedAmount) >= 0);
  if (!rows.length) return "";

  const total = rows.reduce((sum, item) => sum + Number(item.reservedAmount || 0), 0);
  if (!(total > 0)) return "";

  const earmarked = rows.filter((item) => item.kind !== "core");
  const monthlyOut = earmarked.reduce((sum, item) => sum + Number(item.monthlyOut || 0), 0);
  const segments = quantizeBarSegments(rows.map((item, index) => ({
    ...item,
    amount: Number(item.reservedAmount || 0),
    className: allocationColorClass(item.id || item.label, index)
  })), total);
  const nextDates = earmarked.map((item) => item.nextWithdrawal).filter(Boolean).sort();
  const nextDate = nextDates.length ? nextDates[0] : null;

  return `
    <section class="etoro-allocation ${compact ? "is-compact" : ""}" aria-label="Dinero de eToro reservado por destino">
      <div class="etoro-allocation-heading">
        <div>
          <strong>eToro · dinero con destino</strong>
          <span>Qué parte del valor actual está comprometida y cuánto debe salir cada mes</span>
        </div>
        <div class="etoro-allocation-kpi">
          <small>Salida mensual actual</small>
          <b>${formatMoney(monthlyOut, fallbackCurrency)}</b>
          ${nextDate ? `<span>próxima · ${escapeHtml(formatFinanceDate(nextDate, nextDate))}</span>` : ""}
        </div>
      </div>

      <div class="etoro-allocation-stack" role="img" aria-label="Distribución del valor actual de eToro por destino">
        ${segments.map((item) => `
          <div class="etoro-allocation-segment ${item.className} ${item.pctClass}"
               title="${escapeHtml(item.label || item.id)} · ${escapeHtml(formatMoney(item.amount, fallbackCurrency))}"></div>
        `).join("")}
      </div>

      <div class="etoro-allocation-legend">
        ${rows.map((item, index) => {
          const amount = Number(item.reservedAmount || 0);
          const pct = total > 0 ? (amount / total) * 100 : 0;
          const monthly = Number(item.monthlyOut || 0);
          const endLabel = item.lastWithdrawal ? formatFinanceDate(item.lastWithdrawal, item.lastWithdrawal) : null;
          return `
            <article class="etoro-allocation-row">
              <i class="${allocationColorClass(item.id || item.label, index)}"></i>
              <div class="etoro-allocation-label">
                <strong>${escapeHtml(item.label || item.id || "Bloque")}</strong>
                <span>${pct.toLocaleString("es-ES", { maximumFractionDigits: 1 })}% de eToro</span>
                ${item.note && !compact ? `<small>${escapeHtml(item.note)}</small>` : ""}
              </div>
              <div class="etoro-allocation-values">
                <b>${formatMoney(amount, fallbackCurrency)}</b>
                ${item.kind === "core"
                  ? `<span>sin retirada programada</span>`
                  : `<span>${formatMoney(monthly, fallbackCurrency)}/mes${endLabel ? " · hasta " + escapeHtml(endLabel) : ""}</span>`}
              </div>
            </article>`;
        }).join("")}
      </div>

      <p class="etoro-allocation-note">100% de la barra = valor actual de eToro. Los bloques comprometidos son importes nominales del maestro; si cambia el mercado, el bloque «Resto inversión eToro» absorbe la variación hasta el siguiente cierre.</p>
    </section>`;
}

function renderLiquidityAccounts(accounts, fallbackCurrency = "EUR", periodLabel = null) {
  if (!Array.isArray(accounts) || !accounts.length) {
    return `
      <section class="liquidity-section liquidity-section-empty">
        <div class="liquidity-section-heading">
          <div><p class="context-label">Liquidez por cuenta</p><h3>Distribución del saldo real por destino</h3></div>
        </div>
        <p>La visualización aparecerá cuando Finanzas complete Cuentas y ReservasCuenta.</p>
      </section>`;
  }

  const accountRank = new Map([
    ["openbank-miguel", 0], ["openbank-andrea", 1], ["santander-comun", 2], ["bbva-comun", 3]
  ]);
  const orderedAccounts = [...accounts].sort((a, b) => (accountRank.get(a.id) ?? 99) - (accountRank.get(b.id) ?? 99));

  return `
    <section class="liquidity-section">
      <div class="liquidity-section-heading">
        <div>
          <p class="context-label">Liquidez por cuenta</p>
          <h3>Cómo está distribuido el dinero de cada cuenta</h3>
        </div>
        <span>${periodLabel ? `Ciclo ${escapeHtml(periodLabel)} · ` : ""}100% de cada barra = saldo actual real</span>
      </div>
      <div class="liquidity-account-list">
        ${orderedAccounts.map((account) => {
          const model = liquidityVisualModel(account, fallbackCurrency);
          const {
            currency,
            balance,
            holds,
            allocations,
            retained,
            committed,
            free,
            internalFree,
            personalAdjustment,
            excess,
            availableAfterHolds,
            rawSegments,
            segments
          } = model;
          const leaderLayout = buildLiquidityLeaderLayout(segments);
          const denseLegend = leaderLayout.length > 6;
          const leaderCountClass = [
            `leader-count-${Math.min(20, leaderLayout.length)}`,
            denseLegend ? "is-variable-height" : ""
          ].filter(Boolean).join(" ");

          return `
            <article class="liquidity-account-card ${excess > 0.01 ? "has-overflow" : ""}">
              <header class="liquidity-card-header">
                <div>
                  <strong>${escapeHtml(account.name || account.id || "Cuenta")}</strong>
                  <span>${escapeHtml([account.bank, account.owner].filter(Boolean).join(" · "))}</span>
                  <small>Actualizado: ${escapeHtml(formatFinanceDate(account.updatedAt, "Sin fecha de actualización"))}</small>
                </div>
                <div class="liquidity-balance">
                  <small>Saldo actual</small>
                  <b>${formatMoney(balance, currency)}</b>
                  ${retained > 0 ? `<span>Tras retenciones: <strong>${formatMoney(availableAfterHolds, currency)}</strong></span>` : ""}
                </div>
              </header>

              <div class="liquidity-account-chart ${denseLegend ? "has-variable-legend" : ""}">
                <svg class="liquidity-leader-layer" width="100%" height="258" aria-hidden="true">
                  ${leaderLayout.map((segment) => segment.visiblePct > 0 ? `
                    <line class="liquidity-leader-line"
                          x1="71" y1="${segment.barCenterY.toFixed(2)}"
                          x2="92" y2="${segment.rowCenterY.toFixed(2)}"></line>
                    <circle class="liquidity-leader-dot ${segment.className}"
                            cx="92" cy="${segment.rowCenterY.toFixed(2)}" r="2.6"></circle>
                  ` : "").join("")}
                </svg>

                <div class="liquidity-bar-wrap">
                  <div class="liquidity-stacked-bar-2d" role="img" aria-label="${escapeHtml(account.name || "Cuenta")}: distribución de ${escapeHtml(formatMoney(balance, currency))}">
                    ${segments.map((segment) => `
                      <div class="liquidity-bar-segment-2d ${segment.className} ${segment.pctClass}" title="${escapeHtml(segment.label)} · ${escapeHtml(formatMoney(segment.amount, currency))}"></div>
                    `).join("")}
                  </div>
                  <small class="liquidity-bar-caption">Saldo real = 100%</small>
                </div>

                <div class="liquidity-account-legend ${leaderCountClass}">
                  ${leaderLayout.map((segment) => {
                    const pct = balance > 0 ? (segment.amount / balance) * 100 : 0;
                    const chargeLabel = liquidityChargeLabel(segment);
                    return `
                      <div class="liquidity-legend-row ${segment.visiblePct > 0 ? "" : "is-outside-balance"}">
                        <i class="${segment.className}"></i>
                        <span>
                          <em>${escapeHtml(segment.label)}</em>
                          <small>${segment.visiblePct > 0
                            ? pct.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + "% del saldo"
                            : "Pendiente del ciclo · aún no cubierto por el saldo actual"}</small>
                        </span>
                        <span class="liquidity-legend-value">
                          <b>${formatMoney(segment.amount, currency)}</b>
                          ${chargeLabel ? `<small class="liquidity-charge-date">${escapeHtml(chargeLabel)}</small>` : ""}
                        </span>
                      </div>`;
                  }).join("")}
                </div>
              </div>

              <section class="bank-holds-block">
                <div class="bank-holds-heading">
                  <div><strong>Retenciones bancarias</strong><span>${holds.length ? holds.length + " pendientes" : "Sin retenciones pendientes"}</span></div>
                  <b>${formatMoney(retained, currency)}</b>
                </div>
                ${holds.length ? `
                  <div class="bank-holds-list">
                    ${holds.map((hold) => `
                      <article>
                        <div>
                          <strong>${escapeHtml(hold.label || "Retención")}</strong>
                          <small>${escapeHtml(hold.note || "Pendiente de consolidación bancaria.")}</small>
                        </div>
                        <div>
                          <b>${formatMoney(numberOrZero(hold.amount), currency)}</b>
                          <small>Consolidación: pendiente de consolidación</small>
                        </div>
                      </article>
                    `).join("")}
                  </div>` : '<p class="bank-holds-empty">Sin retenciones pendientes.</p>'}
              </section>

              <footer class="liquidity-account-summary">
                <span>Comprometido <b>${formatMoney(committed, currency)}</b></span>
                <span>Libre interno <b>${formatMoney(internalFree, currency)}</b></span>
                ${Math.abs(personalAdjustment) > 0.01 ? `<span>Ajuste personal <b>${personalAdjustment > 0 ? "+" : ""}${formatMoney(personalAdjustment, currency)}</b></span>` : ""}
                <span>Retenido <b>${formatMoney(retained, currency)}</b></span>
                <span>Pendiente de cubrir <b>${excess > 0.01 ? formatMoney(excess, currency) : "0,00 €"}</b></span>
              </footer>
              ${excess > 0.01 ? `<p class="liquidity-warning">Quedan ${formatMoney(excess, currency)} de compromisos del ciclo que todavía no están cubiertos por el saldo actual. No significa que ya se hayan cobrado.</p>` : ""}
            </article>`;
        }).join("")}
      </div>
    </section>`;
}

function renderWealthAllocation(wealth, fallbackCurrency = "EUR") {
  const items = (Array.isArray(wealth?.allocation) ? wealth.allocation : [])
    .filter((item) => Number.isFinite(Number(item.amount)) && Number(item.amount) > 0);
  if (!items.length) {
    return `
      <section class="wealth-allocation-section wealth-allocation-empty">
        <div><strong>Distribución patrimonial</strong><span>Por custodio o plataforma</span></div>
        <p>Se mostrará cuando Finanzas complete PatrimonioDetalle.</p>
      </section>`;
  }

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const segments = quantizeBarSegments(items.map((item, index) => ({
    ...item,
    label: item.platform,
    className: allocationColorClass(item.platform, index)
  })), total);
  const allocationDates = items.map((item) => item.updatedAt).filter(Boolean).sort();
  const allocationDate = allocationDates.length ? allocationDates[allocationDates.length - 1] : null;
  const historicTotal = firstFinite(wealth?.currentPatrimony);
  const historicDate = wealth?.currentDate || null;
  const differentSnapshot = allocationDate && historicDate && String(allocationDate).slice(0, 10) !== String(historicDate).slice(0, 10);
  const historicalDifference = historicTotal === null ? null : total - historicTotal;
  const needsRefresh = items.some((item) => /requiere refresco|retirada posterior|no representa el saldo actual/i.test(String(item.note || "")));

  return `
    <section class="wealth-allocation-section">
      <div class="wealth-primary-summary">
        <div>
          <span>Patrimonio total</span>
          <strong>${formatMoney(total, fallbackCurrency)}</strong>
          <small>PatrimonioDetalle · ${escapeHtml(formatFinanceDate(allocationDate, "Sin fecha"))}</small>
        </div>
        <span class="wealth-reconciliation-status ${needsRefresh ? "is-warning" : "is-ok"}">${needsRefresh ? "Alguna fuente requiere refresco" : "Último detalle disponible"}</span>
      </div>

      <div class="wealth-stack-wrap">
        <div class="wealth-stack-bar" role="img" aria-label="Distribución del patrimonio financiero por plataforma">
          ${segments.map((item) => `<div class="wealth-stack-segment ${item.className} ${item.pctClass}" title="${escapeHtml(item.platform)} · ${escapeHtml(formatMoney(item.amount, item.currency || fallbackCurrency))}"></div>`).join("")}
        </div>
      </div>

      <div class="wealth-platform-grid">
        ${items.map((item, index) => {
          const amount = Number(item.amount);
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return `
            <article class="wealth-platform-card">
              <div class="wealth-platform-head"><i class="${allocationColorClass(item.platform, index)}"></i><strong>${escapeHtml(item.platform)}</strong></div>
              <b>${formatMoney(amount, item.currency || fallbackCurrency)}</b>
              <span>${pct.toLocaleString("es-ES", { maximumFractionDigits: 1 })}% del total</span>
              <small>Origen: PatrimonioDetalle</small>
              <small>Último dato: ${escapeHtml(formatFinanceDate(item.updatedAt, "Sin fecha"))}</small>
              ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            </article>`;
        }).join("")}
      </div>

      <section class="wealth-reconciliation-block">
        <div class="wealth-reconciliation-heading">
          <div><strong>Referencia de conciliación</strong><span>El dashboard no altera ninguna cifra para hacerla cuadrar.</span></div>
        </div>
        <div class="wealth-reconciliation-grid">
          <article>
            <span>PatrimonioDetalle</span>
            <strong>${formatMoney(total, fallbackCurrency)}</strong>
            <small>${escapeHtml(formatFinanceDate(allocationDate, "Sin fecha"))}</small>
          </article>
          ${historicTotal !== null ? `
            <article class="${!differentSnapshot && Math.abs(historicalDifference || 0) > 0.01 ? "has-difference" : ""}">
              <span>Patrimonio histórico</span>
              <strong>${formatMoney(historicTotal, fallbackCurrency)}</strong>
              <small>${escapeHtml(formatFinanceDate(historicDate, "Sin fecha"))}</small>
              <em>${differentSnapshot ? "Snapshot de otra fecha: no comparable 1:1" : "Diferencia: " + formatMoney(historicalDifference || 0, fallbackCurrency)}</em>
            </article>` : ""}
        </div>
        ${needsRefresh ? '<p class="wealth-reconciliation-warning">Alguna plataforma tiene un dato marcado como pendiente de refresco por Finanzas. Se muestra el último dato asentado, sin corregirlo artificialmente.</p>' : ""}
      </section>
    </section>`;
}

function transactionAccountLabel(account) {
  if (!account) return "Cuenta";
  if (account.bank && account.owner) return `${account.bank} · ${account.owner}`;
  return account.name || account.id || "Cuenta";
}

function renderAccountTransactionTable(rows, accountLabel, currency = "EUR") {
  const visibleRows = (Array.isArray(rows) ? rows : []).slice(0, 24);
  if (!visibleRows.length) {
    return `
      <div class="account-transactions-empty">
        <strong>Sin movimientos importados</strong>
        <span>La cuenta está conectada, pero todavía no hay registros disponibles en MovimientosCuenta.</span>
      </div>`;
  }

  return `
    <div class="account-transactions-scroll" role="region" aria-label="Últimos movimientos de ${escapeHtml(accountLabel || "la cuenta")}" tabindex="0">
      <table class="account-transactions-table">
        <thead><tr><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Saldo</th></tr></thead>
        <tbody>${visibleRows.map((item) => {
          const amount = firstFinite(item.amount);
          const balance = firstFinite(item.balanceAfter);
          const tone = amount === null ? "neutral" : amount > 0 ? "positive" : amount < 0 ? "negative" : "neutral";
          return `
            <tr>
              <td>${escapeHtml(formatFinanceDate(item.operationDate, item.operationDate || "—"))}</td>
              <td title="${escapeHtml(item.description || "")}">${escapeHtml(item.description || "—")}</td>
              <td class="account-transaction-amount is-${tone}">${amount === null ? "—" : formatMoney(amount, item.currency || currency)}</td>
              <td>${balance === null ? "—" : formatMoney(balance, item.currency || currency)}</td>
            </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

function renderAccountTransactionsWorkspace(transactions, accounts, fallbackCurrency = "EUR") {
  const sourceRows = Array.isArray(transactions) ? transactions : [];
  const connectedAccounts = Array.isArray(accounts) ? accounts : [];
  const accountMap = new Map();

  connectedAccounts.forEach((account) => {
    if (!account?.id) return;
    accountMap.set(account.id, {
      id: account.id,
      label: transactionAccountLabel(account),
      currency: account.currency || fallbackCurrency
    });
  });

  sourceRows.forEach((item) => {
    if (!item?.accountId || accountMap.has(item.accountId)) return;
    accountMap.set(item.accountId, {
      id: item.accountId,
      label: item.accountId,
      currency: item.currency || fallbackCurrency
    });
  });

  const catalog = [...accountMap.values()];
  if (!catalog.length) return "";

  const rowsByAccount = new Map(catalog.map((account) => [account.id, []]));
  sourceRows.forEach((item) => {
    if (!item?.accountId) return;
    if (!rowsByAccount.has(item.accountId)) rowsByAccount.set(item.accountId, []);
    rowsByAccount.get(item.accountId).push(item);
  });

  const initialAccount = catalog.find((account) => (rowsByAccount.get(account.id) || []).length > 0) || catalog[0];

  return `
    <section class="account-transactions-section">
      <div class="account-transactions-heading">
        <div>
          <p class="context-label">Movimientos bancarios</p>
          <h3>Registros por cuenta</h3>
        </div>
        <div class="account-transactions-heading-actions">
          <span>Fuente RAW conciliada</span>
          <a
            class="account-transactions-sheet-link"
            href="/api/source-link?target=finance-records"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir Sheet financiero con todos los registros">
            Abrir Sheet ↗
          </a>
        </div>
      </div>

      <div class="account-transactions-tabs" role="tablist" aria-label="Cuentas con histórico bancario">
        ${catalog.map((account, index) => {
          const rows = rowsByAccount.get(account.id) || [];
          const active = account.id === initialAccount.id;
          return `
            <button
              type="button"
              id="account-transactions-tab-${index}"
              class="${active ? "active" : ""}"
              role="tab"
              aria-selected="${active ? "true" : "false"}"
              aria-controls="account-transactions-panel-${index}"
              tabindex="${active ? "0" : "-1"}"
              data-account-transactions-tab="${escapeHtml(account.id)}">
              <span>${escapeHtml(account.label)}</span>
              <small>${rows.length ? rows.length : "0"}</small>
            </button>`;
        }).join("")}
      </div>

      <div class="account-transactions-panels">
        ${catalog.map((account, index) => {
          const rows = rowsByAccount.get(account.id) || [];
          const active = account.id === initialAccount.id;
          return `
            <section
              id="account-transactions-panel-${index}"
              class="account-transactions-panel ${active ? "active" : ""}"
              role="tabpanel"
              aria-labelledby="account-transactions-tab-${index}"
              data-account-transactions-panel="${escapeHtml(account.id)}"
              ${active ? "" : "hidden"}>
              <div class="account-transactions-current">
                <div>
                  <strong>${escapeHtml(account.label)}</strong>
                  <span>${rows.length
                    ? `Mostrando hasta ${Math.min(24, rows.length)} registros recientes`
                    : "Sin histórico importado todavía"}</span>
                </div>
                <small>${rows.length ? `${rows.length} registros disponibles en esta carga` : "0 registros"}</small>
              </div>
              ${renderAccountTransactionTable(rows, account.label, account.currency)}
            </section>`;
        }).join("")}
      </div>
    </section>`;
}

function initializeAccountTransactionTabs(root = document) {
  const section = root.querySelector?.(".account-transactions-section");
  if (!section) return;

  const currentButtons = () => [...section.querySelectorAll("[data-account-transactions-tab]")];
  const currentPanels = () => [...section.querySelectorAll("[data-account-transactions-panel]")];
  if (!currentButtons().length || !currentPanels().length) return;

  const activate = (accountId, focus = false) => {
    const buttons = currentButtons();
    const panels = currentPanels();

    buttons.forEach((button) => {
      const selected = button.dataset.accountTransactionsTab === accountId;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });

    panels.forEach((panel) => {
      const selected = panel.dataset.accountTransactionsPanel === accountId;
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });

    section.dataset.activeAccount = accountId;
  };

  section.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-account-transactions-tab]");
    if (!button || !section.contains(button)) return;
    activate(button.dataset.accountTransactionsTab);
  });

  section.addEventListener("keydown", (event) => {
    const button = event.target.closest?.("[data-account-transactions-tab]");
    if (!button || !section.contains(button) || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const buttons = currentButtons();
    const index = buttons.indexOf(button);
    if (index < 0) return;

    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    activate(buttons[nextIndex].dataset.accountTransactionsTab, true);
  });

  const buttons = currentButtons();
  const selected = buttons.find((button) => button.getAttribute("aria-selected") === "true") || buttons[0];
  activate(selected.dataset.accountTransactionsTab);
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
  const liquidityAccounts = Array.isArray(monthly.liquidityAccounts) ? monthly.liquidityAccounts : [];
  const accountTransactions = Array.isArray(finance.accountTransactions) ? finance.accountTransactions : [];
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

  document.querySelector("#dialog-body").innerHTML = (categories.length || liquidityAccounts.length)
    ? `
      <div class="budget-net-strip">
        <div><span>Libre Miguel</span><strong>${miguelNet === null ? "—" : formatMoney(miguelNet, currency)}</strong></div>
        <div><span>Libre Andrea</span><strong>${andreaNet === null ? "—" : formatMoney(andreaNet, currency)}</strong></div>
        <div><span>Libre conjunto</span><strong>${jointNet === null ? "—" : formatMoney(jointNet, currency)}</strong></div>
      </div>
      <p class="budget-net-note">El dinero libre real se determina por cuenta después de retenciones y compromisos. El saldo restante de una categoría significa presupuesto aún sin ejecutar, no dinero libre para gastar.</p>
      ${renderLiquidityAccounts(liquidityAccounts, currency, monthly.periodLabel || monthly.period || null)}
      ${renderAccountTransactionsWorkspace(accountTransactions, liquidityAccounts, currency)}
      ${categories.length ? `<div class="budget-groups">
        ${groups.map((groupName) => renderBudgetGroup(groupName, grouped[groupName], currency)).join("")}
      </div>` : ""}
      `
    : "<p>No hay partidas presupuestadas ni liquidez por cuenta conectada.</p>";
  document.querySelectorAll('[data-open-electricity="true"]').forEach((node) => {
    node.addEventListener("click", () => void openElectricityDetail());
  });
  initializeAccountTransactionTabs(document.querySelector("#dialog-body"));
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
          <span><b>${formatMoney(totals.remaining, currency)}</b> saldo partidas</span>
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
    : sourceStatus === "RECONCILIADO_SHEET" || sourceStatus === "RECONCILIADO_SANTANDER" || sourceStatus === "RECONCILIADO_MAESTRO_SANTANDER" || sourceStatus === "RECONCILIADO_OPENBANK"
      ? "Conciliado"
      : sourceStatus === "CONFIRMADO_EXTRACTOS_ECI" || sourceStatus === "CONFIRMADO_EXTRACTO_ECI"
        ? "Confirmado · extractos"
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
        <span><small>Saldo partida</small><strong>${formatMoney(itemRemaining, currency)}</strong></span>
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
  document.querySelector("#show-credit-detail")?.addEventListener("click", openCreditDetail);
  document.querySelector("#show-wealth-detail")?.addEventListener("click", openWealthDetail);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-loan-investment-benchmark-id]");
    if (!trigger) return;
    openLoanInvestmentBenchmarkDetail(trigger.dataset.loanInvestmentBenchmarkId);
  });
  document.querySelector("#show-midas-detail")?.addEventListener("click", () => void openMidasDialog());
  document.querySelector("#close-midas-dialog")?.addEventListener("click", () => document.querySelector("#midas-dialog")?.close());
  document.querySelector("#show-event-history")?.addEventListener("click", () => void openEventsWorkspaceInline("history"));
  const openHealthTabFromHome = (tab) => {
    openHealthDetail();
    document.querySelector(`[data-health-tab="${tab}"]`)?.click();
  };
  document.querySelector("#home-health-open")?.addEventListener("click", () => openHealthTabFromHome("overview"));
  document.querySelector("#home-health-summary")?.addEventListener("click", () => openHealthTabFromHome("overview"));
  document.querySelector("#home-health-habits")?.addEventListener("click", () => openHabitsDetail(localDateKey()));
  document.querySelector("#home-health-medical")?.addEventListener("click", () => openHealthTabFromHome("medical"));
  document.querySelector("#home-health-gym")?.addEventListener("click", () => openHealthTabFromHome("gym"));
  document.querySelector("#home-health-nutrition")?.addEventListener("click", () => openHealthTabFromHome("nutrition"));
  document.querySelector("#home-health-recipes")?.addEventListener("click", () => openHealthTabFromHome("recipes"));
  document.querySelector("#home-health-menu")?.addEventListener("click", () => openHealthTabFromHome("menu"));
  document.querySelector("#show-home-weekly-menu")?.addEventListener("click", () => openHealthTabFromHome("menu"));
  document.querySelector("#home-pantry-open")?.addEventListener("click", () => openPantryDetail("inventory"));
  document.querySelector("#home-pantry-inventory")?.addEventListener("click", () => openPantryDetail("inventory"));
  document.querySelector("#home-shopping-list")?.addEventListener("click", () => openPantryDetail("shopping"));
  document.querySelector("#home-objects-open")?.addEventListener("click", () => openObjectsDetail("summary"));
  document.querySelector("#home-objects-inventory")?.addEventListener("click", () => openObjectsDetail("inventory"));
  document.querySelector("#home-objects-wardrobe-link")?.addEventListener("click", () => openObjectsDetail("wardrobe"));
  document.querySelector("#home-objects-looks")?.addEventListener("click", () => openObjectsDetail("looks"));
  document.querySelector("#home-objects-kits")?.addEventListener("click", () => openObjectsDetail("kits"));
  document.querySelector("#home-wealth-detail")?.addEventListener("click", openWealthDetail);
  document.querySelector("#home-wealth-evolution")?.addEventListener("click", openWealthDetail);
  document.querySelector("#home-wealth-midas")?.addEventListener("click", () => void openMidasDialog());
  document.querySelector("#home-debt-detail")?.addEventListener("click", openDebtDetail);
  document.querySelector("#home-debt-credit")?.addEventListener("click", openCreditDetail);
  document.querySelector("#theme-toggle")?.addEventListener("click", toggleTheme);
  document.querySelector("#demo-mode-toggle")?.addEventListener("click", toggleDemoMode);
  document.querySelector("#refresh-app")?.addEventListener("click", refreshApp);
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  document.querySelector("#ask-form")?.addEventListener("submit", handleQuery);
  document.querySelectorAll("[data-quick-query]").forEach((button) => button.addEventListener("click", () => {
    const input = document.querySelector("#ask-input");
    if (!input) return;
    input.value = button.dataset.quickQuery || "";
    document.querySelector("#ask-form")?.requestSubmit();
  }));
  const menuButton = document.querySelector("#menu-button");
  menuButton?.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll("[data-nav-area-id]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    document.body.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
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
  if (areaId === "area-events") {
    void openEventsWorkspaceInline("active");
    return;
  }
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
    openProjectsDetail(state.decisions, openMidasDialog);
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

  if (/\b(lista de la compra|lista compra|compra)\b/.test(normalized)) {
    openPantryDetail("shopping");
    openResult("<strong>Lista de la compra abierta.</strong>");
    return true;
  }

  if (/\b(despensa)\b/.test(normalized)) {
    openPantryDetail("inventory");
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
    if (privateModeKind === "remote") openProjectsDetail(state.decisions, openMidasDialog);
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
