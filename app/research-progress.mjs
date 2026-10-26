// Private live progress. Stage completion is never a probability of usefulness.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={COMPLETADA:'Verificada',PARCIAL:'En desarrollo',PREPARADO_NO_EMITIDO:'Preparada',BLOQUEADA:'Bloqueada',NO_INICIADA:'Pendiente'};
const done=p=>p.estado==='COMPLETADA'&&p.criterio_superado==='SI';
export function progressFacts(lab,now=new Date()){
  const source=lab?.progress;
  if(source?.status!=='ok')return null;
  const groups=new Map();
  for(const p of source.phases||[]){
    if(!p.fase_id||!p.dominio)continue;
    if(!groups.has(p.dominio))groups.set(p.dominio,[]);
    groups.get(p.dominio).push(p);
  }
  const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  const counts=[7,14].map(days=>(source.advances||[]).filter(a=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.fecha||''))return false;
    const time=Date.parse(a.fecha+'T00:00:00Z');
    return time>=today-days*86400000&&time<today;
  }).length);
  const upcoming=(lab?.predictions||[]).filter(p=>p.outcome===null&&/^EMITIDA/.test(p.status||'')&&Number.isFinite(Date.parse(p.resolutionAt))).sort((a,b)=>Date.parse(a.resolutionAt)-Date.parse(b.resolutionAt));
  return {groups:[...groups],counts,upcoming};
}
export function renderResearchProgress(lab,now=new Date()){
  const f=progressFacts(lab,now);
  if(!f)return '<section class="research-progress"><h2>Mapa de avance</h2><p>No se pudieron consultar las fases. Pulsa Actualizar para reintentar; ausencia de datos no significa ausencia de trabajo.</p></section>';
  const next=f.upcoming[0];
  return '<section class="research-progress" aria-label="Avance científico por área"><header><h2>De la idea a la evidencia</h2><p>Abre un área para ver qué está comprobado, qué la frena y cuál es su siguiente paso.</p></header>'+
    '<div class="progress-context"><p><strong>'+f.counts[0]+' avances en 7 días</strong><span>'+f.counts[1]+' en 14 días completos · actividad registrada, no modelos validados</span></p><p><strong>'+(next?'Próxima comprobación: '+esc(new Date(next.resolutionAt).toLocaleDateString('es-ES',{timeZone:'UTC'})):'Sin comprobación programada en el registro')+'</strong><span>'+(next?esc(next.phenomenon)+' · fecha prevista; confirmar publicación':'Los resultados futuros necesitan su propio calendario.')+'</span></p></div>'+
    '<div class="progress-legend"><span class="verified">Verificada</span><span class="working">En desarrollo</span><span class="blocked">Bloqueada</span><span>Pendiente / preparada</span></div>'+
    f.groups.map(([domain,phases])=>'<details class="progress-domain"><summary><span class="progress-domain-title">'+esc(domain)+'</span><span class="progress-stages" aria-hidden="true">'+phases.map(p=>'<i class="'+(done(p)?'verified':p.estado==='BLOQUEADA'?'blocked':p.estado==='PARCIAL'?'working':'pending')+'"></i>').join('')+'</span><span class="progress-count">'+phases.filter(done).length+' de '+phases.length+' etapas verificadas</span><span class="progress-open">Ver pasos</span></summary><ol>'+phases.map(p=>'<li><div><strong>'+esc(p.fase_madurez)+'</strong><span class="progress-state">'+esc(done(p)?states.COMPLETADA:p.estado==='COMPLETADA'?'Revisar evidencia':states[p.estado]||'Estado desconocido')+'</span></div><p>'+esc(p.resultado_acreditado)+'</p><dl><dt>Bloqueo</dt><dd>'+esc(p.bloqueo||'Sin bloqueo registrado')+'</dd><dt>Siguiente paso</dt><dd>'+esc(p.proxima_accion||'Pendiente de definir')+'</dd></dl></li>').join('')+'</ol></details>').join('')+
    '<p class="progress-footnote">Una etapa terminada no acredita utilidad predictiva. Para confiar en un modelo necesitamos resultados futuros, comparación con una referencia y un beneficio medible para una decisión concreta.</p></section>';
}
