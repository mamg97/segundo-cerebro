// Saved private planning, separate from issued forecasts and evaluated results.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={PREPARACION:'Preparación',PUBLICACION_PREVISTA:'Publicación por confirmar',REVISION:'Revisión prevista',HORIZONTE:'Sin fecha de publicación',APLAZADA:'Línea aplazada'};
const states=new Set(['PREVISTO','OMITIDO','CERRADO','APLAZADO']);
function dateFact(item){
  const value=item.fecha_utc;
  if(item.precision_fecha==='INSTANTE'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/.test(value)){
    const time=Date.parse(value);
    if(!Number.isFinite(time)||new Date(time).toISOString().replace('.000Z','Z')!==value)return null;
    return {time,end:time,label:new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(time)+' · Madrid'};
  }
  if(item.precision_fecha==='MES'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)){
    const time=Date.parse(value+'-01T00:00:00Z');
    return {time,end:Date.UTC(Number(value.slice(0,4)),Number(value.slice(5)),1)-1,label:new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(time)};
  }
  if(item.precision_fecha==='DESDE_ANO'&&/^[2-9]\d{3}$/.test(value))return {time:Date.parse(value+'-01-01T00:00:00Z'),end:Infinity,label:'Desde '+value+' · fecha desconocida'};
  if(item.precision_fecha==='SIN_FECHA'&&value==='')return {time:Infinity,end:Infinity,label:'Sin fecha defendible'};
  return null;
}
export function scheduleFacts(lab,now=new Date()){
  const source=lab?.schedule;
  if(source?.status!=='ok'||!Array.isArray(source.entries))return null;
  const counts=new Map();
  for(const item of source.entries){if(item&&typeof item==='object')counts.set(item.plan_id,(counts.get(item.plan_id)||0)+1);}
  return source.entries.flatMap(item=>{
    if(!item||typeof item!=='object'||!/^[A-Z0-9-]{3,80}$/.test(item.plan_id||'')||counts.get(item.plan_id)!==1||!states.has(item.estado)||!Object.hasOwn(kinds,item.tipo)||
       !['dominio','titulo','condicion','limite_interpretacion','actualizado'].every(k=>typeof item[k]==='string'&&item[k].trim()&&item[k].length<=2000))return [];
    const date=dateFact(item);if(!date)return [];
    const overdue=item.estado==='PREVISTO'&&date.end<now.getTime();
    return [{...item,date,overdue,kind:kinds[item.tipo],evidence:/^https:\/\/[^\s]+$/.test(item.evidencia_url||'')?item.evidencia_url:null}];
  }).sort((a,b)=>a.date.time-b.date.time||a.plan_id.localeCompare(b.plan_id));
}
function row(item){
  const status=item.estado==='OMITIDO'?'Omitido':item.estado==='CERRADO'?'Registrado como cerrado':item.estado==='APLAZADO'?'Aplazado':item.overdue?'Fecha prevista superada · revisar':'Previsto';
  return '<li class="schedule-row"><div class="schedule-when"><strong>'+esc(item.date.label)+'</strong><span>'+esc(item.kind)+'</span></div><div class="schedule-what"><div class="schedule-row-heading"><h3>'+esc(item.titulo)+'</h3><span class="schedule-state'+(item.overdue?' needs-review':'')+'">'+esc(status)+'</span></div><p>'+esc(item.dominio)+'</p><details><summary>Condiciones y alcance</summary><p>'+esc(item.condicion)+'</p><p class="schedule-limit">'+esc(item.limite_interpretacion)+'</p>'+(item.evidence?'<a href="'+esc(item.evidence)+'" target="_blank" rel="noopener noreferrer">Ver el protocolo</a>':'')+'<p class="schedule-updated">Plan actualizado: '+esc(item.actualizado)+'</p></details></div></li>';
}
export function renderResearchSchedule(lab,now=new Date()){
  const items=scheduleFacts(lab,now);
  if(items===null)return '<section class="research-schedule"><h2>Próximos pasos y resultados</h2><p>El calendario no está disponible. Pulsa Actualizar para reintentar; las predicciones registradas se consultan por separado.</p></section>';
  if(!items.length)return '<section class="research-schedule"><h2>Próximos pasos y resultados</h2><p>No hay fechas válidas en el plan. Esto no confirma que una tarea haya terminado ni que el desarrollo esté parado.</p></section>';
  const near=items.filter(i=>i.precision_fecha==='INSTANTE'),later=items.filter(i=>i.precision_fecha!=='INSTANTE');
  return '<section class="research-schedule" aria-label="Calendario de investigación"><header><h2>Próximos pasos y resultados</h2><p>Preparar, publicar un dato y demostrar utilidad son hitos distintos. Abre cada paso para ver sus condiciones.</p></header><ol class="schedule-list">'+near.map(row).join('')+'</ol>'+(later.length?'<details class="schedule-horizons"><summary>Ver plazos de evaluación y líneas sin fecha</summary><ol class="schedule-list">'+later.map(row).join('')+'</ol></details>':'')+'<p class="schedule-footnote">Es un plan guardado, no el estado en tiempo real de las ejecuciones. Una fecha superada exige revisar el registro; no confirma emisión, omisión ni resultado. Ninguna fecha promete un modelo útil.</p></section>';
}
