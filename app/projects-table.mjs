/* Private PROYECTOS table. All values arrive from /api/projects; no catalogue data is bundled. */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}
function normalized(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}
function token(value) {
  return String(value || "pendiente").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replaceAll("_", "-");
}
function cellText(value) {
  const raw = String(value || "—");
  return '<span class="project-table-truncate" title="' + escapeHtml(raw) + '">' + escapeHtml(raw) + '</span>';
}
function badge(value, kind) {
  const label = String(value || "PENDIENTE").replaceAll("_", " ");
  const cls = kind === "docs" ? "project-doc-status docs-" : "project-status status-";
  return '<span class="' + cls + escapeHtml(token(value)) + '">' + escapeHtml(label) + '</span>';
}
export function projectTableMarkup(projects, catalogue = projects) {
  const rows = Array.isArray(projects) ? projects : [];
  const all = Array.isArray(catalogue) ? catalogue : [];
  const childCount = new Map();
  for (const item of all) {
    if (item && item.parentId) childCount.set(item.parentId, (childCount.get(item.parentId) || 0) + 1);
  }
  return '<div class="projects-table-scroll" role="region" aria-label="Tabla de proyectos, desplazamiento horizontal" tabindex="0">' +
    '<table class="projects-table"><colgroup><col class="col-project"><col class="col-area"><col class="col-type"><col class="col-status"><col class="col-priority"><col class="col-docs"><col class="col-children"><col class="col-next"></colgroup>' +
    '<thead><tr><th scope="col">Proyecto</th><th scope="col">Área</th><th scope="col">Tipo</th><th scope="col">Estado</th><th scope="col">Prioridad</th><th scope="col">Documentación</th><th scope="col">Subproyectos</th><th scope="col">Siguiente acción</th></tr></thead><tbody>' +
    rows.map(project => {
      const searchable = [project.name, project.alias, project.area, project.type, project.summary, project.priority, project.nextAction]
        .concat(project.relatedDomains || []).filter(Boolean).join(" ");
      const name = project.name || "Proyecto sin nombre";
      const nextAction = project.nextAction || "Sin siguiente acción";
      const children = childCount.get(project.id) || 0;
      return '<tr class="project-row" data-project-search="' + escapeHtml(normalized(searchable)) +
        '" data-project-status="' + escapeHtml(project.status || "") +
        '" data-project-area="' + escapeHtml(project.area || "") + '">' +
        '<th scope="row"><button type="button" class="project-row-open" data-project-id="' + escapeHtml(project.id) +
        '" title="Abrir ficha de ' + escapeHtml(name) + '"><span>' + escapeHtml(name) + '</span></button></th>' +
        '<td>' + cellText(project.area) + '</td>' +
        '<td>' + cellText(project.type) + '</td>' +
        '<td>' + badge(project.status, "status") + '</td>' +
        '<td>' + cellText(project.priority) + '</td>' +
        '<td>' + badge(project.docsStatus, "docs") + '</td>' +
        '<td class="project-table-count">' + children + '</td>' +
        '<td class="project-table-next">' + cellText(nextAction) + '</td></tr>';
    }).join("") + '</tbody></table></div>';
}
