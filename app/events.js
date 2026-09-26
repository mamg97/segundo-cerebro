let workspaceState = null;
let workspaceMode = null;
let workspacePayload = null;
let workspaceTab = "active";

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value, currency) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function eventDate(value, options) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", options || {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date).replaceAll(".", "");
}

function dateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function statusLabel(status) {
  const labels = {
    PROPUESTO: "Propuesto",
    PENDIENTE: "Pendiente",
    CONFIRMADO: "Confirmado",
    EN_CURSO: "En curso",
    CERRADO: "Cerrado",
    CANCELADO: "Cancelado"
  };
  return labels[String(status || "").toUpperCase()] || status || "Confirmado";
}

function kindLabel(kind) {
  const labels = {
    travel: "Viaje",
    social: "Evento",
    birthday: "Cumpleaños",
    medical: "Cita",
    important: "Importante"
  };
  return labels[String(kind || "").toLowerCase()] || "Evento";
}

function dialog() {
  return document.querySelector("#detail-dialog");
}

function prepareDialog(className) {
  const node = dialog();
  if (!node) return null;
  node.classList.remove(
    "wealth-dialog", "health-dialog", "habits-dialog", "important-events-dialog",
    "budget-dialog", "parents-dialog", "electricity-dialog", "pantry-dialog",
    "objects-dialog", "projects-dialog", "events-workspace-dialog", "event-detail-dialog"
  );
  if (className) node.classList.add(className);
  return node;
}

export function eventsAreaFromState(state, privateModeKind) {
  if (privateModeKind !== "remote") return null;
  const summary = state && state.eventsSummary ? state.eventsSummary : {};
  const active = Number(summary.activeCount || 0);
  const inProgress = Number(summary.inProgressCount || 0);
  const history = Number(summary.historyCount || 0);
  return {
    id: "area-events",
    slug: "events",
    title: "Eventos",
    shortTitle: "Eventos",
    summary: inProgress
      ? String(inProgress) + " en curso · " + String(active) + " activos · " + String(history) + " históricos."
      : String(active) + " próximos · " + String(history) + " históricos.",
    health: 85,
    tone: "blue",
    module: "Events",
    sensitivity: "confidencial",
    status: inProgress ? "attention" : "steady"
  };
}

async function loadEvents() {
  const response = await fetch("/api/events?scope=all", {
    headers: { Accept: "application/json" },
    cache: "no-store",
    credentials: "same-origin"
  });
  if (!response.ok) throw new Error("EVENTS_" + response.status);
  return response.json();
}

function eventCard(item) {
  const start = eventDate(item.startsAt, { day: "numeric", month: "short", year: "numeric" });
  const end = item.endsAt ? eventDate(item.endsAt, { day: "numeric", month: "short", year: "numeric" }) : null;
  const range = end && end !== start ? start + " → " + end : start;
  return [
    '<button type="button" class="events-record-card status-', escapeHtml(String(item.status || "").toLowerCase()), '" data-event-record-id="', escapeHtml(item.id), '">',
      '<span class="events-record-kind">', escapeHtml(kindLabel(item.kind)), '</span>',
      '<strong>', escapeHtml(item.title), '</strong>',
      '<span class="events-record-status">', escapeHtml(statusLabel(item.status)), '</span>',
      '<p>', escapeHtml(range), item.location ? " · " + escapeHtml(item.location) : "", '</p>',
      item.summary ? '<small>' + escapeHtml(item.summary) + '</small>' : "",
    '</button>'
  ].join("");
}

function availableYears(events) {
  const years = new Set();
  for (const item of events || []) {
    const key = String(item.startsAt || "").slice(0, 4);
    if (/^\d{4}$/.test(key)) years.add(key);
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

function renderWorkspace() {
  const body = document.querySelector("#dialog-body");
  if (!body || !workspacePayload) return;
  const all = Array.isArray(workspacePayload.events) ? workspacePayload.events : [];
  const active = all.filter((item) => !["CERRADO", "CANCELADO"].includes(item.status));
  const history = all.filter((item) => ["CERRADO", "CANCELADO"].includes(item.status));
  const selected = workspaceTab === "history" ? history : active;
  const years = availableYears(history);

  body.innerHTML = [
    '<div class="events-workspace">',
      '<div class="events-workspace-summary">',
        '<article><span>Activos</span><strong>', String(active.length), '</strong></article>',
        '<article><span>En curso</span><strong>', String(active.filter((item) => item.status === "EN_CURSO").length), '</strong></article>',
        '<article><span>Histórico</span><strong>', String(history.length), '</strong></article>',
      '</div>',
      '<div class="events-tabs" role="tablist" aria-label="Eventos">',
        '<button type="button" data-events-tab="active" class="', workspaceTab === "active" ? "active" : "", '">Próximos y en curso</button>',
        '<button type="button" data-events-tab="history" class="', workspaceTab === "history" ? "active" : "", '">Histórico</button>',
      '</div>',
      workspaceTab === "history" && years.length
        ? '<div class="events-history-years"><span>Años disponibles</span>' + years.map((year) => '<button type="button" data-events-year="' + escapeHtml(year) + '">' + escapeHtml(year) + '</button>').join("") + '</div>'
        : "",
      '<div class="events-record-list">',
        selected.length
          ? selected.map(eventCard).join("")
          : '<div class="events-empty"><strong>Sin eventos en esta vista</strong><p>Los eventos cerrados se conservarán aquí automáticamente.</p></div>',
      '</div>',
    '</div>'
  ].join("");

  body.querySelectorAll("[data-events-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      workspaceTab = button.dataset.eventsTab === "history" ? "history" : "active";
      renderWorkspace();
    });
  });

  body.querySelectorAll("[data-events-year]").forEach((button) => {
    button.addEventListener("click", () => {
      const year = button.dataset.eventsYear;
      body.querySelectorAll(".events-record-card").forEach((card) => {
        const event = history.find((item) => item.id === card.dataset.eventRecordId);
        card.hidden = Boolean(event && !String(event.startsAt || "").startsWith(year));
      });
      body.querySelectorAll("[data-events-year]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });

  body.querySelectorAll("[data-event-record-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const fallback = all.find((item) => item.id === button.dataset.eventRecordId) || null;
      void openEventDetail(workspaceState, workspaceMode, button.dataset.eventRecordId, fallback);
    });
  });
}

export async function openEventsWorkspace(state, privateModeKind, initialTab) {
  workspaceState = state || {};
  workspaceMode = privateModeKind;
  workspaceTab = initialTab === "history" ? "history" : "active";
  const node = prepareDialog("events-workspace-dialog");
  if (!node) return;

  document.querySelector("#dialog-context").textContent = "Eventos · privado";
  document.querySelector("#dialog-title").textContent = "Eventos";
  document.querySelector("#dialog-body").innerHTML = '<p class="events-loading">Cargando eventos…</p>';
  node.showModal();

  if (privateModeKind !== "remote") {
    document.querySelector("#dialog-body").innerHTML = '<div class="events-empty"><strong>Histórico disponible en modo privado remoto</strong></div>';
    return;
  }

  try {
    workspacePayload = await loadEvents();
    renderWorkspace();
  } catch (error) {
    console.warn("Events workspace load failed", error);
    document.querySelector("#dialog-body").innerHTML =
      '<div class="events-empty"><strong>No se ha podido cargar el histórico</strong><p>El resto del Segundo Cerebro sigue operativo.</p></div>';
  }
}

function findFinance(event, state) {
  const finance = state && state.financeSummary ? state.financeSummary : {};
  const commitments = Array.isArray(finance.upcomingCommitments) ? finance.upcomingCommitments : [];
  if (event && event.financeRef) {
    const byId = commitments.find((item) => item.id === event.financeRef);
    if (byId) return byId;
  }
  const title = normalize(event && event.title);
  return commitments.find((item) => {
    const value = normalize(item && item.title);
    return value === title
      || (title.length >= 5 && value.includes(title))
      || (value.length >= 5 && title.includes(value));
  }) || null;
}

function financeMarkup(event, state, facts) {
  const item = findFinance(event, state);
  const spendFacts = (facts || []).filter((fact) => fact.type === "GASTO");
  if (!item && !spendFacts.length) {
    return '<section class="event-detail-section"><div class="event-detail-section-head"><strong>Finanzas</strong><span>Fuente canónica externa</span></div><p class="events-muted">Sin vínculo financiero estructurado todavía.</p></section>';
  }

  const currency = item && item.currency ? item.currency : "EUR";
  const total = item && Number.isFinite(Number(item.totalBudget)) ? Number(item.totalBudget) : null;
  const reserved = item && Number.isFinite(Number(item.reserved)) ? Number(item.reserved) : null;
  const needed = item && Number.isFinite(Number(item.needed)) ? Number(item.needed) : null;
  const delta = total !== null && reserved !== null ? total - reserved : null;

  return [
    '<section class="event-detail-section">',
      '<div class="event-detail-section-head"><strong>Finanzas</strong><span>Finanzas conserva la fuente de verdad</span></div>',
      item ? [
        '<div class="event-finance-grid">',
          '<article><span>Importe asociado</span><strong>', money(total, currency), '</strong></article>',
          '<article><span>Reservado</span><strong>', money(reserved, currency), '</strong></article>',
          '<article><span>Pendiente</span><strong>', money(needed, currency), '</strong></article>',
          '<article><span>Diferencia</span><strong class="', delta > 0 ? "negative" : "", '">', delta === null ? "—" : money(delta, currency), '</strong></article>',
        '</div>',
        item.note ? '<p class="event-source-note">' + escapeHtml(item.note) + '</p>' : ""
      ].join("") : "",
      spendFacts.length ? '<div class="event-fact-mini-list">' + spendFacts.map((fact) => '<p><span>' + escapeHtml(eventDate(fact.happenedAt, { day: "2-digit", month: "2-digit" })) + '</span>' + escapeHtml(fact.summary) + '</p>').join("") + '</div>' : "",
    '</section>'
  ].join("");
}

function factsMarkup(facts) {
  if (!facts || !facts.length) {
    return '<section class="event-detail-section"><div class="event-detail-section-head"><strong>Crónica</strong><span>0 hechos</span></div><p class="events-muted">Todavía no hay hechos fechados guardados para este evento.</p></section>';
  }
  return [
    '<section class="event-detail-section">',
      '<div class="event-detail-section-head"><strong>Crónica</strong><span>', String(facts.length), ' hechos</span></div>',
      '<div class="event-timeline">',
        facts.map((fact) => [
          '<article>',
            '<time>', escapeHtml(eventDate(fact.happenedAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })), '</time>',
            '<div><span class="event-fact-type">', escapeHtml(fact.type), '</span><p>', escapeHtml(fact.summary), '</p></div>',
          '</article>'
        ].join("")).join(""),
      '</div>',
    '</section>'
  ].join("");
}

function refsMarkup(refs) {
  if (!refs || !refs.length) return "";
  return [
    '<section class="event-detail-section">',
      '<div class="event-detail-section-head"><strong>Referencias</strong><span>', String(refs.length), '</span></div>',
      '<div class="event-reference-list">',
        refs.map((ref) => '<span><strong>' + escapeHtml(ref.label || ref.type || ref.sourceProvider) + '</strong><small>' + escapeHtml(ref.sourceProvider) + '</small></span>').join(""),
      '</div>',
    '</section>'
  ].join("");
}

function dateKeysBetween(startValue, endValue) {
  const startKey = dateKey(startValue);
  const endKey = dateKey(endValue || startValue);
  if (!startKey || !endKey) return [];
  const dates = [];
  const current = new Date(startKey + "T12:00:00+02:00");
  const end = new Date(endKey + "T12:00:00+02:00");
  while (current <= end && dates.length < 14) {
    dates.push(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function hydrateNutrition(event) {
  const panel = document.querySelector("#event-nutrition");
  if (!panel || !event) return;
  const dates = dateKeysBetween(event.startsAt, event.endsAt);
  if (!dates.length) {
    panel.innerHTML = '<p class="events-muted">Sin fechas válidas para consultar Nutrición.</p>';
    return;
  }

  try {
    const results = await Promise.all(dates.map(async (date) => {
      const response = await fetch("/api/nutrition?date=" + encodeURIComponent(date), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) return null;
      const data = await response.json();
      return { date, data };
    }));

    const valid = results.filter(Boolean);
    if (!valid.length) {
      panel.innerHTML = '<p class="events-muted">Sin datos nutricionales asociados a las fechas del evento.</p>';
      return;
    }

    panel.innerHTML = '<div class="event-nutrition-days">' + valid.map(({ date, data }) => {
      const consumed = data.summary && data.summary.consumed ? data.summary.consumed : {};
      const energy = data.energy || {};
      return [
        '<article>',
          '<strong>', escapeHtml(eventDate(date + "T12:00:00", { weekday: "short", day: "numeric", month: "short" })), '</strong>',
          '<span>', Number.isFinite(Number(consumed.kcal)) ? Math.round(Number(consumed.kcal)) + " kcal" : "Sin kcal", '</span>',
          '<small>', Number.isFinite(Number(consumed.protein)) ? Math.round(Number(consumed.protein)) + " g proteína" : "Proteína sin dato", '</small>',
          Number.isFinite(Number(energy.steps)) ? '<small>' + Math.round(Number(energy.steps)).toLocaleString("es-ES") + " pasos</small>' : "",
        '</article>'
      ].join("");
    }).join("") + '</div>';
  } catch (error) {
    console.warn("Event nutrition load failed", error);
    panel.innerHTML = '<p class="events-muted">No se ha podido cargar Nutrición.</p>';
  }
}

async function hydrateObjects(event) {
  const panel = document.querySelector("#event-objects");
  if (!panel || !event) return;
  try {
    const response = await fetch("/api/objects", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("OBJECTS_" + response.status);
    const data = await response.json();
    const lists = Array.isArray(data.lists) ? data.lists : [];
    const eventTitle = normalize(event.title);
    const match = lists.find((item) => event.objectsListRef && item.id === event.objectsListRef)
      || lists.find((item) => {
        const ref = normalize(item.eventRef);
        return ref && eventTitle && (ref.includes(eventTitle) || eventTitle.includes(ref));
      })
      || lists.find((item) => {
        const start = String(item.startDate || "");
        return start && start === String(event.startsAt || "").slice(0, 10);
      });

    if (!match) {
      panel.innerHTML = '<p class="events-muted">No hay una lista de Objetos vinculada.</p>';
      return;
    }

    const items = Array.isArray(match.items) ? match.items : [];
    const prepared = items.filter((item) => item.state === "PREPARADO").length;
    panel.innerHTML = [
      '<div class="event-objects-head"><div><strong>', escapeHtml(match.name), '</strong><span>', String(prepared), '/', String(items.length), ' preparados</span></div></div>',
      '<div class="event-objects-items">',
        items.length ? items.map((item) => '<span class="state-' + escapeHtml(String(item.state || "").toLowerCase()) + '"><i></i>' + escapeHtml(item.name || "Necesidad") + '<small>' + escapeHtml(item.state || "") + '</small></span>').join("") : '<p class="events-muted">Lista sin items.</p>',
      '</div>'
    ].join("");
  } catch (error) {
    console.warn("Event objects load failed", error);
    panel.innerHTML = '<p class="events-muted">No se ha podido cargar Objetos.</p>';
  }
}

function fallbackDetail(fallback) {
  if (!fallback) return null;
  return {
    event: {
      id: fallback.id,
      title: fallback.title,
      kind: fallback.kind,
      status: fallback.status || "CONFIRMADO",
      startsAt: fallback.startsAt,
      endsAt: fallback.endsAt,
      location: fallback.location || null,
      participants: [],
      financeRef: fallback.financeRef || fallback.id || null,
      objectsListRef: null,
      summary: fallback.note || null,
      finalSummary: null
    },
    facts: [],
    references: []
  };
}

function renderEventDetail(payload, state) {
  const event = payload.event;
  const facts = Array.isArray(payload.facts) ? payload.facts : [];
  const refs = Array.isArray(payload.references) ? payload.references : [];
  const body = document.querySelector("#dialog-body");

  document.querySelector("#dialog-context").textContent = kindLabel(event.kind) + " · " + statusLabel(event.status);
  document.querySelector("#dialog-title").textContent = event.title;
  body.innerHTML = [
    '<div class="event-detail">',
      '<button type="button" class="events-back" data-events-back="true">← Volver a Eventos</button>',
      '<section class="event-detail-hero">',
        '<div>',
          '<span class="event-detail-status status-', escapeHtml(String(event.status || "").toLowerCase()), '">', escapeHtml(statusLabel(event.status)), '</span>',
          '<p>', escapeHtml(eventDate(event.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })),
          event.endsAt ? " → " + escapeHtml(eventDate(event.endsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })) : "", '</p>',
          event.location ? '<p>' + escapeHtml(event.location) + '</p>' : "",
          event.summary ? '<p class="event-detail-summary">' + escapeHtml(event.summary) + '</p>' : "",
        '</div>',
        Array.isArray(event.participants) && event.participants.length
          ? '<div class="event-participants"><span>Participantes</span><strong>' + escapeHtml(event.participants.join(" · ")) + '</strong></div>'
          : "",
      '</section>',
      financeMarkup(event, state, facts),
      '<section class="event-detail-section"><div class="event-detail-section-head"><strong>Nutrición y actividad</strong><span>Salud · por fechas</span></div><div id="event-nutrition"><p class="events-muted">Cargando datos de Salud…</p></div></section>',
      '<section class="event-detail-section"><div class="event-detail-section-head"><strong>Equipaje y objetos</strong><span>OBJETOS · lista contextual</span></div><div id="event-objects"><p class="events-muted">Buscando lista vinculada…</p></div></section>',
      factsMarkup(facts),
      refsMarkup(refs),
      event.finalSummary
        ? '<section class="event-detail-section event-final-summary"><div class="event-detail-section-head"><strong>Balance final</strong><span>Cierre del evento</span></div><p>' + escapeHtml(event.finalSummary) + '</p></section>'
        : "",
    '</div>'
  ].join("");

  body.querySelector("[data-events-back]")?.addEventListener("click", () => {
    void openEventsWorkspace(workspaceState || state, workspaceMode || "remote", workspaceTab);
  });

  void hydrateNutrition(event);
  void hydrateObjects(event);
}

export async function openEventDetail(state, privateModeKind, eventId, fallback) {
  workspaceState = state || workspaceState || {};
  workspaceMode = privateModeKind || workspaceMode;
  const node = prepareDialog("event-detail-dialog");
  if (!node) return;

  document.querySelector("#dialog-context").textContent = "Eventos · detalle";
  document.querySelector("#dialog-title").textContent = fallback && fallback.title ? fallback.title : "Evento";
  document.querySelector("#dialog-body").innerHTML = '<p class="events-loading">Cargando ficha del evento…</p>';
  if (!node.open) node.showModal();

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
  if (!payload || !payload.event) payload = fallbackDetail(fallback);
  if (!payload || !payload.event) {
    document.querySelector("#dialog-body").innerHTML = '<div class="events-empty"><strong>No se ha podido reconstruir este evento</strong></div>';
    return;
  }
  renderEventDetail(payload, workspaceState || state || {});
}
