// Research ideas are read only from the authenticated private /api/projects registry.
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
const allowedDoc = value => {
  if(typeof value!=="string")return null;
  try {
    const u=new URL(value);
    return u.protocol==="https:" && ["github.com","docs.google.com"].includes(u.hostname) ? u.href : null;
  }catch{return null;}
};
export function ideaGraph(state) {
  const projects=Array.isArray(state?.projects)?state.projects:[];
  const relations=Array.isArray(state?.relations)?state.relations:[];
  const branches=projects.filter(p=>p?.parentId==="prj-psicohistoria"&&p?.type==="Aplicación de investigación"&&p?.id&&p?.name);
  const ids=new Set(branches.map(x=>x.id));
  const lookup=new Map(projects.filter(p=>p?.id).map(p=>[p.id,p]));
  const edges=relations.filter(r=>r?.targetType==="PROYECTO"&&r?.type!=="SUBPROYECTO_DE" &&
    (ids.has(r.sourceProjectId)||ids.has(r.target))&&lookup.has(r.sourceProjectId)&&lookup.has(r.target));
  return {branches,edges,lookup};
}
export function renderIdeaNetwork(state){
  const {branches,edges,lookup}=ideaGraph(state);
  const intro='<div class="section-heading"><div><span class="eyebrow">LABORATORIO DE IDEAS</span>'+
    '<h2>Sinergias sin perder la psicohistoria</h2></div></div>'+
    '<p class="ideas-intro">V1 historia cuantitativa · V2 predicción · V3 simulación social · V4 rigor científico. Las aplicaciones aprovechan estos métodos, pero no heredan su validez. Solo se muestran líneas guardadas en el registro privado.</p>';
  if(!branches.length)return intro+'<section class="panel"><strong>Sin líneas de aplicación registradas</strong><p>Sincroniza Proyectos/Documentacion/Relaciones. No se generan proyectos ni resultados ficticios.</p></section>';
  const cards=branches.map(p=>{
    const doc=allowedDoc(p.docsUrl);
    return '<article class="ideas-card"><small>'+escapeHtml(p.status||"SIN ESTADO")+' · '+escapeHtml(p.docsStatus||"DOCUMENTACIÓN PENDIENTE")+'</small>'+
      '<h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.summary||"Sin descripción canónica")+'</p>'+
      '<p><strong>Siguiente:</strong> '+escapeHtml(p.nextAction||"Pendiente de registrar")+'</p>'+
      (doc?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(doc)+'">Protocolo y evidencia ↗</a>':"")+
      '</article>';
  }).join("");
  const synergy=edges.map(r=>'<li><strong>'+escapeHtml(lookup.get(r.sourceProjectId)?.name)+
     ' → '+escapeHtml(lookup.get(r.target)?.name)+'</strong> · '+escapeHtml(r.description||r.type)+'</li>').join("");
  return intro+'<div class="ideas-grid">'+cards+'</div>'+
   '<section class="panel ideas-synergy"><div class="panel-head"><h3>Conexiones registradas</h3><span>Solo relaciones de la fuente privada</span></div>'+
   (synergy?'<ul>'+synergy+'</ul>':'<p class="subtext">Aún no hay relaciones verificadas entre aplicaciones.</p>')+
   '<p class="legend-note">Una relación de investigación no constituye influencia causal, evidencia predictiva ni señal de inversión. Estados y textos proceden exclusivamente del catálogo privado.</p></section>';
}
