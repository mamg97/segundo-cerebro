import { mockState } from "../core/mock-state.js";

const colors = {
  ink: "#52647f", blue: "#2867e8", mint: "#2e8b78", sky: "#3984a8",
  rose: "#c45d7b", amber: "#b7791f", violet: "#7057b6", cyan: "#16859b",
  coral: "#db5d49", lime: "#668f2d",
};

const symbols = {
  general: "◎", career: "↗", finance: "≋", calendar: "□", partner: "◇",
  family: "⌂", wealth: "◆", projects: "✦", "open-loops": "!", goals: "○",
};

const areaById = new Map(mockState.areas.map((area) => [area.id, area]));
const dateFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const shortDateFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

function init() {
  renderDate();
  renderNavigation();
  renderFocus();
  renderEvents();
  renderAreas();
  renderSystemMap();
  bindInteractions();
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
  nav.innerHTML = mockState.areas.map((area, index) => `
    <a class="nav-link ${index === 0 ? "active" : ""}" href="${area.slug === "general" ? "#overview" : `#area-${area.slug}`}" style="--area-color:${colors[area.tone]}">
      ${escapeHtml(area.shortTitle)}
    </a>
  `).join("");
}

function renderFocus() {
  const sorted = [...mockState.openLoops].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
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
  document.querySelector("#event-list").innerHTML = mockState.events.map((event) => {
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
  document.querySelector("#areas-grid").innerHTML = mockState.areas.slice(1).map((area) => `
    <button id="area-${area.slug}" class="area-card" type="button" data-area-id="${area.id}" style="--area-color:${colors[area.tone]};--health:${area.health}%">
      <span class="area-top"><span class="area-symbol">${symbols[area.slug]}</span><span class="area-health">${area.health}</span></span>
      <h3>${escapeHtml(area.title)}</h3>
      <p>${escapeHtml(area.summary)}</p>
      <span class="area-bar" aria-hidden="true"><span></span></span>
    </button>
  `).join("");
}

function renderSystemMap() {
  const areas = mockState.areas.slice(1);
  const compact = window.matchMedia("(max-width: 520px)").matches;
  const radiusX = compact ? 37 : 39;
  const radiusY = compact ? 39 : 36;
  const centerY = 50;
  const nodes = areas.map((area, index) => {
    const angle = (-90 + (360 / areas.length) * index) * Math.PI / 180;
    return { area, x: 50 + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY };
  });
  document.querySelector("#map-nodes").innerHTML = nodes.map(({ area, x, y }) => `
    <div class="map-node" style="left:${x}%;top:${y}%;--node-color:${colors[area.tone]}"><span></span>${escapeHtml(area.shortTitle)}</div>
  `).join("");
  document.querySelector("#map-lines").innerHTML = nodes.map(({ x, y }) => `
    <line class="map-line" x1="400" y1="250" x2="${x * 8}" y2="${y * 5}"></line>
  `).join("");
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
  const relatedLoops = mockState.openLoops.filter((item) => item.areaId === areaId);
  const relatedProjects = mockState.projects.filter((item) => item.areaId === areaId);
  const dialog = document.querySelector("#detail-dialog");
  document.querySelector("#dialog-context").textContent = `${area.module} · ${sensitivityLabel(area.sensitivity)}`;
  document.querySelector("#dialog-title").textContent = area.title;
  const entries = [
    ...relatedLoops.map((item) => ({ title: item.title, detail: item.nextAction })),
    ...relatedProjects.map((item) => ({ title: item.title, detail: `${item.progress}% · ${item.nextAction}` })),
  ];
  document.querySelector("#dialog-body").innerHTML = entries.length
    ? `<ul class="dialog-list">${entries.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></li>`).join("")}</ul>`
    : `<p>No hay asuntos mock asociados a esta área.</p>`;
  dialog.showModal();
}

function openDecisions() {
  const dialog = document.querySelector("#detail-dialog");
  document.querySelector("#dialog-context").textContent = "Coordinador · Datos ficticios";
  document.querySelector("#dialog-title").textContent = "Decisiones abiertas";
  document.querySelector("#dialog-body").innerHTML = `<ul class="dialog-list">${mockState.decisions.map((item) => `
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
    result.innerHTML = "Escribe una pregunta o el nombre de un área para buscar en el estado ficticio.";
    return;
  }
  const entities = [...mockState.areas, ...mockState.projects, ...mockState.openLoops, ...mockState.goals, ...mockState.decisions, ...mockState.events];
  const terms = query.split(/\s+/).filter((term) => term.length > 2);
  const matches = entities.filter((entity) => {
    const haystack = JSON.stringify(entity).toLocaleLowerCase("es");
    return terms.some((term) => haystack.includes(term));
  }).slice(0, 3);
  result.hidden = false;
  result.innerHTML = matches.length
    ? `<strong>He encontrado ${matches.length} coincidencia${matches.length === 1 ? "" : "s"} en los mocks:</strong> ${matches.map((item) => escapeHtml(item.title)).join(" · ")}`
    : "No hay coincidencias en los datos ficticios. La conexión con fuentes reales y el asistente de lenguaje natural quedan para una fase futura.";
}

function priorityRank(priority) { return { low: 1, medium: 2, high: 3 }[priority] || 0; }
function sensitivityLabel(value) { return value.replace("_", " "); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

init();
