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
  family: "⌂", wealth: "◆", projects: "✦", "open-loops": "!", goals: "○",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const shortDateFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

async function init() {
  await loadLocalPrivateState();
  await loadRemotePrivateState();
  areaById = new Map(state.areas.map((area) => [area.id, area]));
  renderMode();
  renderDate();
  renderNavigation();
  renderFocus();
  renderEvents();
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
    <a class="nav-link ${index === 0 ? "active" : ""}" href="${area.slug === "general" ? "#overview" : `#area-${area.slug}`}" style="--area-color:${colors[area.tone]}">
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
  document.querySelector("#event-list").innerHTML = state.events.map((event) => {
    const date = new Date(event.startsAt);
    const month = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", "");
    const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(date);
    return `
      <div class="event-item">
        <div class="event-date"><strong>${date.getDate()}</strong><span>${month}</span></div>
        <div><strong>${escapeHtml(event.title)}</strong><p>${time} · ${escapeHtml(areaById.get(event.areaId).shortTitle)}</p></div>
      </div>`;
  }).join("");
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
  document.querySelector("#show-decisions").addEventListener("click", openDecisions);
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
  const area = areaById.get(areaId);
  const relatedLoops = state.openLoops.filter((item) => item.areaId === areaId);
  const relatedProjects = state.projects.filter((item) => item.areaId === areaId);
  const dialog = document.querySelector("#detail-dialog");
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
