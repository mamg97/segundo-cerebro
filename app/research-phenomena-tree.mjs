// Taxonomy of scientific FORECAST OBJECTIVES, not six compatible states.
// Each branch consumes only independently admitted, PRIVATE experiment envelopes.
// A branch can be explored without a current-year forecast or prospective issuance.
import {parseOnsetSummaries, onsetSummaryPanel} from './research-onset.mjs?v=0.5.13';
import {parseGedIncidentPreview, gedIncidentPreviewPanel} from './research-ged-reemergence.mjs?v=0.5.13';

export const FUTURE_PHENOMENA = Object.freeze([
  {id:'aggregate',short:'Violencia estatal',title:'Violencia estatal agregada',
    time:'País · año',source:'UCDP OrganizedViolenceCY 26.1',
    target:'Superar 25 muertes estatales anuales y transiciones entre cuatro estados'},
  {id:'intrastate',short:'Conflicto interno',title:'Inicio o reanudación interna',
    time:'País · año',source:'UCDP Onset 25.1',
    target:'Inicio o reanudación de conflicto intraestatal según UCDP Onset'},
  {id:'interstate',short:'Entre Estados',title:'Inicio o reanudación interestatal',
    time:'País · año',source:'UCDP Onset 25.1',
    target:'Inicio o reanudación de conflicto interestatal según UCDP Onset'},
  {id:'reemergence',short:'Reaparición',title:'Reaparición de violencia localizada',
    time:'País · ventana de 24 meses',source:'UCDP GED 25.1',
    target:'Al menos un incidente GED durante una ventana de 24 meses; no el incidente concreto'},
  {id:'cohort2027',short:'Cohorte 2027',title:'Cohorte anual calculada para 2027',
    time:'País · año 2027',source:'UCDP OrganizedViolenceCY 26.1',
    target:'Superar 25 muertes estatales durante 2027; seis modelos archivados'},
  {id:'expansion',short:'Otros fenómenos',title:'Expansión a otros fenómenos colectivos',
    time:'Por definir',source:'Fuentes aún no admitidas',
    target:'Demografía, economía y cambios sociales: sin objetivo ni forecast validado'},
]);

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeDrive=s=>typeof s==='string' && /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view(?:\?[^<>"]*)?$/.test(s) ? s : null;
const parsedNotes=s=>{try{return JSON.parse(s);}catch{return null;}};
const labels=Object.freeze({
  retrospective:'RETROSPECTIVO · NO EMITIDO',
  experimental:'EXPLORATORIO · NO EMITIDO',
  unissued:'2027 CALCULADO · NO EMITIDO',
  unavailable:'SIN DATOS ADMITIDOS',
  planned:'PENDIENTE DE MODELO',
});
const descriptions=Object.freeze({
  aggregate:'Árbol probabilístico histórico real. Cuatro estados país-año y una transición anual. No predice guerras concretas.',
  intrastate:'Modelo distinto del árbol de violencia agregada. Historial UCDP Onset revisado: no hay alerta actual ni probabilidad prospectiva.',
  interstate:'Modelo distinto del conflicto interno; tampoco representa la probabilidad de una invasión concreta.',
  reemergence:'Ventanas de 24 meses e incidentes históricos usados como contexto; sus porcentajes NO estiman el incidente documentado.',
  cohort2027:'Los seis modelos fueron calculados y archivados en privado. No hay emisión independiente ni desenlace 2027.',
  expansion:'No se extrapolan las probabilidades de violencia a mercados, economía, demografía o transformaciones sociales.',
});
export const validPhenomenon=id=>FUTURE_PHENOMENA.some(p=>p.id===id);

export function private2027Entry(experiments=[]) {
  if (!Array.isArray(experiments))return null;
  for (const item of experiments) {
    if (item?.status!=='SHADOW_NO_EMITIDO')continue;
    const d=parsedNotes(item.notes);
    if (d?.schema!=='psychohistory.private_2027_risk_observatory.v1' ||
        d.targetYear!==2027 || d.countries!==196 || d.models!==6 ||
        d.forecastIssued!==false || d.prospectiveEligible!==false ||
        d.outcomesKnown!==false || d.asOfVerified!==false)continue;
    const link=safeDrive(item.evidence);
    if (link)return {url:link,year:2027,countries:196,models:6};
  }
  return null;
}

export function phenomenaAvailability(experiments=[],hasAnnualTree=false) {
  const onset=parseOnsetSummaries(experiments).accepted;
  const ged=parseGedIncidentPreview(experiments);
  return {
    aggregate:hasAnnualTree?'retrospective':'unavailable',
    intrastate:onset.some(x=>x.kind==='intrastate_country')?'retrospective':'unavailable',
    interstate:onset.some(x=>x.kind==='interstate_country')?'retrospective':'unavailable',
    reemergence:ged.ready?'experimental':'unavailable',
    cohort2027:private2027Entry(experiments)?'unissued':'unavailable',
    expansion:'planned',
  };
}

export function phenomenaTree(experiments=[],selected='aggregate',hasAnnualTree=false) {
  const statuses=phenomenaAvailability(experiments,hasAnnualTree);
  return '<section class="panel phenomena-tree" aria-label="Árbol de tipos de predicciones">' +
    '<div class="phenomena-tree-heading"><div><span class="eyebrow">PSICOHISTORIA / ÁRBOL DE FENÓMENOS</span>' +
    '<h2>¿Qué futuro queremos explorar?</h2><p>Selecciona una rama. Cada objetivo tiene sus propias fuentes, horizonte y validación.</p></div>' +
    '<span class="phenomena-tree-root">PSICOHISTORIA<span>6 ramas de investigación</span></span></div>' +
    '<div class="phenomena-tree-grid" role="group" aria-label="Seleccionar fenómeno">' +
    FUTURE_PHENOMENA.map((b,index)=>{
      const status=statuses[b.id],active=b.id===selected;
      return '<button type="button" data-phenomenon="'+b.id+'" class="phenomena-tree-branch'+(active?' active':'')+
        '" aria-pressed="'+active+'" aria-label="'+esc(b.title)+': '+esc(labels[status])+'">' +
        '<span class="phenomena-branch-index">'+String(index+1).padStart(2,'0')+'</span>' +
        '<strong>'+esc(b.short)+'</strong><span class="phenomena-branch-status" data-evidence="'+status+'">'+esc(labels[status])+'</span>' +
        '<small>'+esc(b.time)+'</small></button>';
    }).join('') + '</div>' +
    '<p class="phenomena-tree-disclaimer">Las ramas no comparten una misma probabilidad. Los resultados retrospectivos, los archivos sin emisión y las hipótesis futuras están separados deliberadamente.</p></section>';
}

export function phenomenonDetails(experiments=[],selected='aggregate') {
  const branch=FUTURE_PHENOMENA.find(b=>b.id===selected);
  if (!branch || selected==='aggregate')return '';
  const status=phenomenaAvailability(experiments,true)[selected];
  const intro='<section class="panel phenomena-branch-detail" aria-label="Fenómeno seleccionado">' +
    '<span class="eyebrow">RAMA '+esc(branch.id)+' · '+esc(labels[status])+'</span>' +
    '<h2>'+esc(branch.title)+'</h2><p>'+esc(descriptions[selected])+'</p>' +
    '<dl><div><dt>Variable objetivo</dt><dd>'+esc(branch.target)+'</dd></div>' +
    '<div><dt>Horizonte</dt><dd>'+esc(branch.time)+'</dd></div>' +
    '<div><dt>Fuente</dt><dd>'+esc(branch.source)+'</dd></div></dl>' +
    '<p class="phenomena-data-warning">Ninguna rama tiene habilidad prospectiva demostrada ni autoriza decisiones operativas.</p></section>';
  if (selected==='intrastate' || selected==='interstate') {
    const kind=selected==='intrastate'?'intrastate_country':'interstate_country';
    const panel=onsetSummaryPanel(experiments,kind);
    return intro+(panel || '<section class="panel phenomena-no-data"><h3>No hay evaluación admisible de esta rama</h3><p>Sin probabilidades reales verificadas para este objetivo; no se generan datos simulados.</p></section>');
  }
  if (selected==='reemergence')return intro+(gedIncidentPreviewPanel(experiments) ||
    '<section class="panel phenomena-no-data"><h3>Inspección GED no disponible</h3><p>El lector exige todos los lotes privados coherentes. No se muestra una probabilidad parcial.</p></section>');
  if (selected==='cohort2027') {
    const record=private2027Entry(experiments);
    return intro+'<section class="panel phenomena-cohort"><h3>Pronósticos anuales archivados</h3>' +
      (record ? '<p>196 países · seis modelos · cohorte no emitida. El archivo privado permite comparar países; NO es el árbol histórico ni un resultado de 2027.</p>'+
      '<a href="'+esc(record.url)+'" target="_blank" rel="noopener noreferrer">Abrir observatorio privado 2027 ↗</a>':
      '<p>El registro privado no ha entregado un observatorio autorizado con su evidencia completa. No se carga una muestra pública como sustitución.</p>')+
      '<p class="chart-note">La cohorte no incluye desenlaces, no tiene sello temporal independiente de emisión y no es puntuable prospectivamente.</p></section>';
  }
  return intro+'<section class="panel phenomena-no-data"><h3>Sin predicciones para esta rama</h3>'+
    '<p>Primero se define la variable objetivo, el horizonte y el benchmark; después se admiten datos disponibles en la fecha de emisión y se evalúa fuera de muestra. La bolsa permanece aplazada.</p></section>';
}
