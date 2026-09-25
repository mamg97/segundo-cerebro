let currentPayload = null;
let currentTab = "summary";
let currentDecisions = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[c]));
}
function safeUrl(value) {
  const s = String(value ?? "").trim();
  return /^https:\/\/[^ ]+$/i.test(s) ? s : null;
}
function words(value) { return String(value || "").replaceAll("_", " "); }
function cssToken(value) { return String(value || "pending").toLowerCase().replaceAll("_", "-"); }
function extLink(text, url, primary = false) {
  const u = safeUrl(url);
  return u ? '<a class="project-link'+(primary?' primary':'')+'" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+' ↗</a>' : "";
}
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function projectDecisions(project) {
  const names = [project && project.name, project && project.alias]
    .map(normalizeText)
    .filter(function (value) { return value.length >= 4; });
  return currentDecisions.filter(function (decision) {
    if (decision.projectId && decision.projectId === project.id) return true;
    const title = normalizeText(decision.title);
    return names.some(function (name) { return title.includes(name); });
  });
}

function empty(title, detail) {
  return '<div class="projects-empty"><strong>'+esc(title)+'</strong>'+(detail?'<p>'+esc(detail)+'</p>':'')+'</div>';
}
function projectCard(project, payload, featured) {
  const children = (payload.projects || []).filter((x) => x.parentId === project.id);
  const haystack = [project.name, project.alias, project.area, project.type, project.summary].concat(project.relatedDomains || []).filter(Boolean).join(" ").toLocaleLowerCase("es");
  return '<button class="project-card'+(featured?' featured':'')+'" type="button" data-project-id="'+esc(project.id)+'" data-project-search="'+esc(haystack)+'" data-project-status="'+esc(project.status)+'" data-project-area="'+esc(project.area||'')+'">'+
    '<span class="project-card-top"><span class="project-area">'+esc(project.area||project.type||"Proyecto")+'</span><span class="project-status status-'+esc(cssToken(project.status))+'">'+esc(words(project.status))+'</span></span>'+
    '<strong>'+esc(project.name)+'</strong>'+
    (project.alias?'<small class="project-alias">'+esc(project.alias)+'</small>':'')+
    '<p>'+esc(project.summary||"Sin resumen")+'</p>'+
    '<span class="project-card-meta"><span>'+esc(project.type||"Proyecto")+'</span><span class="project-doc-status docs-'+esc(cssToken(project.docsStatus))+'">'+esc(project.docsStatus||"PENDIENTE")+'</span></span>'+
    (children.length?'<span class="project-children">'+children.length+' subproyecto'+(children.length===1?'':'s')+'</span>':'')+
    (project.nextAction?'<span class="project-next"><small>Siguiente</small>'+esc(project.nextAction)+'</span>':'')+
    '</button>';
}
function renderSummary(payload) {
  const s = payload.summary || {};
  const projects = payload.projects || [];
  const top = projects.filter((p) => !p.parentId);
  const attention = projects.filter((p) => ["PAUSADO","PENDIENTE"].includes(p.status) || p.docsStatus !== "COMPLETA");
  return '<div class="projects-kpis">'+
    '<article><span>Proyectos registrados</span><strong>'+Number(s.total||0)+'</strong><small>'+Number(s.topLevel||top.length)+' principales</small></article>'+
    '<article><span>Activos</span><strong>'+Number(s.active||0)+'</strong><small>en seguimiento</small></article>'+
    '<article><span>Documentación completa</span><strong>'+Math.max(0,Number(s.total||0)-Number(s.pendingDocs||0))+'</strong><small>con contrato consolidado</small></article>'+
    '<article><span>Revisar</span><strong>'+attention.length+'</strong><small>pausados, pendientes o doc parcial</small></article>'+
    '</div>'+
    '<section class="projects-section"><div class="projects-heading"><div><small>Mapa</small><strong>Proyectos principales</strong></div><button type="button" data-project-tab="all">Ver todos</button></div>'+
    '<div class="projects-featured-grid">'+(top.length?top.map((p)=>projectCard(p,payload,true)).join(""):empty("No hay proyectos principales",""))+'</div></section>'+
    (currentDecisions.length
      ? '<section class="projects-section project-area-decisions"><div class="projects-heading"><div><small>Criterio pendiente</small><strong>Decisiones de Proyectos</strong></div></div><div class="project-relations">'+
        currentDecisions.map(function (decision) {
          return '<article><span class="relation-type">Decisión</span><div><strong>'+esc(decision.title)+'</strong></div><p>'+esc(decision.question||decision.nextAction||"Pendiente de resolver")+'</p></article>';
        }).join("")+'</div></section>'
      : '');
}
function renderAll(payload) {
  const projects = payload.projects || [];
  const statuses = [...new Set(projects.map((p)=>p.status).filter(Boolean))];
  const areas = [...new Set(projects.map((p)=>p.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  return '<section class="projects-toolbar">'+
    '<input id="projects-search" type="search" placeholder="Buscar proyecto, área o tecnología…" autocomplete="off">'+
    '<select id="projects-status"><option value="">Todos los estados</option>'+statuses.map((v)=>'<option>'+esc(v)+'</option>').join("")+'</select>'+
    '<select id="projects-area"><option value="">Todas las áreas</option>'+areas.map((v)=>'<option>'+esc(v)+'</option>').join("")+'</select>'+
    '</section><div class="projects-list-heading"><strong id="projects-count">'+projects.length+' proyectos</strong></div>'+
    '<div class="projects-grid">'+(projects.length?projects.map((p)=>projectCard(p,payload,false)).join(""):empty("No hay proyectos",""))+'</div>';
}
function renderRelations(payload) {
  const byId = new Map((payload.projects||[]).map((p)=>[p.id,p]));
  const rows = payload.relations || [];
  return '<div class="project-relations">'+(rows.length?rows.map((r)=>{
    const source = byId.get(r.sourceProjectId);
    const target = byId.get(r.target);
    return '<article><span class="relation-type">'+esc(words(r.type))+'</span><div><strong>'+esc(source?.name||r.sourceProjectId)+'</strong><span>→</span><strong>'+esc(target?.name||r.target)+'</strong></div><p>'+esc(r.description||"")+'</p></article>';
  }).join(""):empty("No hay relaciones documentadas",""))+'</div>';
}
function renderWorkspace(payload) {
  currentPayload = payload;
  const body = document.querySelector("#dialog-body");
  const content = currentTab === "all" ? renderAll(payload) : currentTab === "relations" ? renderRelations(payload) : renderSummary(payload);
  body.innerHTML = '<div class="projects-shell">'+
    '<header class="projects-hero"><div><small>Registro privado canónico</small><strong>Proyectos</strong><p>Estado, documentación, repositorios, relaciones y siguientes acciones en un único sitio.</p></div><span>'+Number(payload.summary?.active||0)+' activos</span></header>'+
    '<nav class="projects-tabs" aria-label="Secciones de Proyectos">'+
    '<button class="'+(currentTab==="summary"?'active':'')+'" data-project-tab="summary" type="button">Resumen</button>'+
    '<button class="'+(currentTab==="all"?'active':'')+'" data-project-tab="all" type="button">Todos</button>'+
    '<button class="'+(currentTab==="relations"?'active':'')+'" data-project-tab="relations" type="button">Relaciones</button>'+
    '</nav><div>'+content+'</div></div>';
  bindWorkspace(payload);
}
function renderDetail(project, payload) {
  const body = document.querySelector("#dialog-body");
  const doc = project.documentation || {};
  const relations = (payload.relations||[]).filter((r)=>r.sourceProjectId===project.id || r.target===project.id);
  const children = (payload.projects||[]).filter((x)=>x.parentId===project.id);
  const parent = (payload.projects||[]).find((x)=>x.id===project.parentId);
  const decisions = projectDecisions(project);
  body.innerHTML = '<button class="projects-back" type="button" data-projects-back>← Volver a Proyectos</button>'+
    '<section class="project-detail">'+
    '<header class="project-detail-head"><div><span class="project-area">'+esc(project.area||"Proyecto")+'</span><h3>'+esc(project.name)+'</h3>'+(project.alias?'<p>'+esc(project.alias)+'</p>':'')+'</div>'+
    '<div class="project-detail-chips"><span class="project-status status-'+esc(cssToken(project.status))+'">'+esc(words(project.status))+'</span>'+(project.readOnly?'<span class="project-readonly">Solo seguimiento</span>':'')+'</div></header>'+
    '<div class="project-detail-links">'+extLink("Repositorio",project.repoUrl)+extLink("Documentación",project.docsUrl,true)+extLink("Abrir web",project.webUrl)+((!project.repoUrl&&!project.docsUrl&&!project.webUrl)?'<span>Sin enlaces externos consolidados</span>':'')+'</div>'+
    '<div class="project-detail-grid">'+
      '<span><small>Tipo</small><strong>'+esc(project.type||"—")+'</strong></span>'+
      '<span><small>Prioridad</small><strong>'+esc(project.priority||"—")+'</strong></span>'+
      '<span><small>Documentación</small><strong>'+esc(project.docsStatus||"—")+'</strong></span>'+
      '<span><small>Responsable</small><strong>'+esc(project.owner||"—")+'</strong></span>'+
    '</div>'+
    (parent?'<div class="project-parent"><small>Forma parte de</small><button type="button" data-project-id="'+esc(parent.id)+'">'+esc(parent.name)+'</button></div>':'')+
    '<section class="project-doc">'+
      '<div><small>Visión</small><p>'+esc(doc.vision||project.summary||"Sin documentar")+'</p></div>'+
      '<div><small>Objetivo</small><p>'+esc(doc.objective||"Pendiente de documentar")+'</p></div>'+
      '<div><small>Alcance</small><p>'+esc(doc.scope||"Pendiente de documentar")+'</p></div>'+
      '<div><small>Estado actual</small><p>'+esc(doc.currentState||"Pendiente de documentar")+'</p></div>'+
      '<div><small>Arquitectura / fuentes</small><p>'+esc(doc.architecture||"Pendiente de documentar")+'</p></div>'+
      '<div><small>Reglas</small><p>'+esc(doc.rules||"Sin reglas específicas")+'</p></div>'+
    '</section>'+
    '<section class="project-next-action"><small>Siguiente acción</small><strong>'+esc(project.nextAction||"Sin siguiente acción definida")+'</strong></section>'+
    ((doc.keyDocs||[]).length?'<section class="project-keydocs"><small>Documentos clave</small><div>'+doc.keyDocs.map((x)=>'<span>'+esc(x)+'</span>').join("")+'</div></section>':'')+
    (children.length?'<section class="project-children-detail"><small>Subproyectos</small><div>'+children.map((x)=>'<button type="button" data-project-id="'+esc(x.id)+'">'+esc(x.name)+' <span>'+esc(words(x.status))+'</span></button>').join("")+'</div></section>':'')+
    (decisions.length?'<section class="project-relations-detail"><small>Decisiones abiertas</small>'+decisions.map((decision)=>'<p><strong>'+esc(decision.title)+'</strong> · '+esc(decision.question||decision.nextAction||"Pendiente de resolver")+'</p>').join("")+'</section>':'')+
    (relations.length?'<section class="project-relations-detail"><small>Relaciones</small>'+relations.map((r)=>'<p><strong>'+esc(words(r.type))+'</strong> · '+esc(r.description||r.target)+'</p>').join("")+'</section>':'')+
    '</section>';
  body.querySelector("[data-projects-back]")?.addEventListener("click",()=>renderWorkspace(payload));
  body.querySelectorAll("[data-project-id]").forEach((b)=>b.addEventListener("click",()=>{const next=(payload.projects||[]).find((x)=>x.id===b.dataset.projectId);if(next)renderDetail(next,payload);}));
}
function bindWorkspace(payload) {
  const body = document.querySelector("#dialog-body");
  body.querySelectorAll("[data-project-tab]").forEach((b)=>b.addEventListener("click",()=>{currentTab=b.dataset.projectTab||"summary";renderWorkspace(payload);}));
  body.querySelectorAll("[data-project-id]").forEach((b)=>b.addEventListener("click",()=>{const p=(payload.projects||[]).find((x)=>x.id===b.dataset.projectId);if(p)renderDetail(p,payload);}));
  const apply = () => {
    const q = String(body.querySelector("#projects-search")?.value||"").trim().toLocaleLowerCase("es");
    const status = body.querySelector("#projects-status")?.value||"";
    const area = body.querySelector("#projects-area")?.value||"";
    let count = 0;
    body.querySelectorAll(".project-card").forEach((card)=>{
      const show=(!q||String(card.dataset.projectSearch||"").includes(q))&&(!status||card.dataset.projectStatus===status)&&(!area||card.dataset.projectArea===area);
      card.hidden=!show;if(show)count++;
    });
    const out=body.querySelector("#projects-count");if(out)out.textContent=count+(count===1?" proyecto":" proyectos");
  };
  ["#projects-search","#projects-status","#projects-area"].forEach((sel)=>{body.querySelector(sel)?.addEventListener("input",apply);body.querySelector(sel)?.addEventListener("change",apply);});
}
export async function openProjectsDetail(decisions) {
  currentDecisions = (Array.isArray(decisions) ? decisions : []).filter(function (item) { return item && item.status === "open" && item.areaId === "area-projects"; });
  const dialog = document.querySelector("#detail-dialog");
  if(!dialog) return;
  dialog.classList.remove("wealth-dialog","health-dialog","habits-dialog","important-events-dialog","budget-dialog","parents-dialog","electricity-dialog","pantry-dialog","objects-dialog");
  dialog.classList.add("projects-dialog");
  document.querySelector("#dialog-context").textContent = "Proyectos · registro privado";
  document.querySelector("#dialog-title").textContent = "Proyectos";
  document.querySelector("#dialog-body").innerHTML = '<p class="projects-loading">Cargando proyectos…</p>';
  if(!dialog.open) dialog.showModal();
  try {
    const response = await fetch("/api/projects",{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
    if(!response.ok) throw new Error("PROJECTS_"+response.status);
    currentTab="summary";
    renderWorkspace(await response.json());
  } catch(error) {
    console.warn("Projects load failed",error);
    document.querySelector("#dialog-body").innerHTML = '<div class="projects-empty"><strong>Proyectos no disponible</strong><p>No se ha podido leer el registro privado.</p><button id="projects-retry" type="button">Reintentar</button></div>';
    document.querySelector("#projects-retry")?.addEventListener("click",openProjectsDetail);
  }
}
