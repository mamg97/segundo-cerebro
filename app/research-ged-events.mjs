// Read-only GED incident context for positive UCDP Onset country-year cases.
// Source 25.1 is retrospectively revised. Matching country/year ≠ causal onset.
// Operational cases/actors remain exclusively in the private canonical Sheet.
export const GED_BATCH_SCHEMA = 'psychohistory.onset.ged_context_batch.v1';
const SOURCE_URL = 'https://ucdp.uu.se/downloads/ged/ged251-csv.zip';
// Published source archive hash recorded during verified official GED 25.1 retrieval.
const OFFICIAL_GED_SHA256 = 'e256f1fb20a579d8b2f910e5bae212f486d3002adaa2e4359ace740c737da05d';
const KINDS = new Set(['intrastate_country','interstate_country']);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sha = s => typeof s==='string' && /^[a-f0-9]{64}$/.test(s);
const bounded = (s,max) => typeof s==='string' && s.length<=max;
const uint = (n,max=Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(n) && !Number.isNaN(n) && n>=0 && n<=max;
const date = s => {
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+'T00:00:00.000Z');
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0,10)===s;
};
const keyOf=c=>[c.kind,c.countryId,c.year].join(':');

function validIncident(e, caseRow) {
  if(!e||!uint(e.gedEventId)||e.gedEventId===0 || e.countryId!==caseRow.countryId ||
    e.year!==caseRow.year || e.violenceType!==1 ||
    !date(e.dateStart)||!date(e.dateEnd)||e.dateStart>e.dateEnd ||
    Number(e.dateEnd.slice(0,4))!==e.year ||
    !uint(e.datePrecision,10)||e.datePrecision<1 ||
    !uint(e.locationPrecision,10)||e.locationPrecision<1 ||
    !bounded(e.location,180)||!bounded(e.dyad,260)||!bounded(e.conflict,260) ||
    !uint(e.bestDeaths)||!uint(e.lowDeaths)||!uint(e.highDeaths) ||
    typeof e.latitude!=='number'||!Number.isFinite(e.latitude)||Math.abs(e.latitude)>90 ||
    typeof e.longitude!=='number'||!Number.isFinite(e.longitude)||Math.abs(e.longitude)>180) return false;
  return true;
}
function validCase(c,bookCases) {
  if(!c||!KINDS.has(c.kind)||!uint(c.countryId)||c.countryId===0||
    !uint(c.year,2024)||c.year<2016||c.onset!==1 ||
    !uint(c.stateBasedEventsWithinBorders,500_000) ||
    c.matchingRelation!=='same_country_id_and_calendar_year_only'||
    c.eventSelection!=='top_3_by_best_reported_deaths_not_onset_attribution'||
    !Array.isArray(c.examples)||c.examples.length>3 ||
    c.examples.length>c.stateBasedEventsWithinBorders ||
    !bookCases.has(keyOf(c)))return false;
  const identities=new Set();
  for(const event of c.examples) {
    if(!validIncident(event,c)||identities.has(event.gedEventId))return false;
    identities.add(event.gedEventId);
  }
  for(let i=1;i<c.examples.length;i++) {
    const last=c.examples[i-1],now=c.examples[i];
    if(last.bestDeaths<now.bestDeaths)return false;
  }
  return true;
}

// Exactly one consistent batch per sequential slot. A missing/tampered batch
// suppresses GED context entirely rather than showing a misleading sample.
export function parseGedContextBatches(experiments=[],verifiedCasebook=null) {
  if(!verifiedCasebook?.cases?.length)return {accepted:[],rejected:[],ready:false};
  const originals=new Map(verifiedCasebook.cases.map(c=>[keyOf(c),c]));
  if(originals.size!==verifiedCasebook.cases.length)return {accepted:[],rejected:[],ready:false};
  const raw=[],rejected=[];
  for(const row of experiments) {
    let d;try {d=JSON.parse(row.notes);}catch{continue;}
    if(d?.schema!==GED_BATCH_SCHEMA)continue;
    const valid = row.status==='RETROSPECTIVO_EXPLORATORIO' &&
      d.datasetVersion==='25.1' && d.gedEdition==='25.1' &&
      d.onsetEdition==='25.1' && sha(d.gedZipSha256) && d.gedZipSha256===OFFICIAL_GED_SHA256 && d.gedSource===SOURCE_URL &&
      d.asOfVerified===false && d.prospectiveEligible===false &&
      d.notAnOnsetEventLink===true &&
      d.batchCount>=1 && uint(d.batchCount,40) && d.batchCount<=40 &&
      uint(d.batchIndex,39) && d.batchIndex<d.batchCount &&
      Array.isArray(d.cases) && d.cases.length>=1 && d.cases.length<=12 &&
      typeof row.evidence==='string' &&
      /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(row.evidence);
    if(!valid){rejected.push(row.id);continue;}
    raw.push({...d,rowId:row.id,evidence:row.evidence});
  }
  if(!raw.length)return {accepted:[],rejected,ready:false};
  const n=raw[0].batchCount,h=raw[0].gedZipSha256;
  const indices=new Set(),ids=new Set(),samples=[];
  let okay=raw.length===n;
  for(const batch of raw) {
    if(indices.has(batch.batchIndex)||batch.batchCount!==n||batch.gedZipSha256!==h)okay=false;
    indices.add(batch.batchIndex);
    for(const c of batch.cases) {
      const key=keyOf(c);
      if(ids.has(key)||!validCase(c,originals))okay=false;
      ids.add(key);
      samples.push(c);
    }
  }
  if(indices.size!==n||ids.size!==originals.size||
     [...originals.keys()].some(k=>!ids.has(k)))okay=false;
  return okay ?
    {accepted:samples,rejected,ready:true,evidence:raw[0].evidence,sha256:h} :
    {accepted:[],rejected:[...rejected,...raw.map(x=>x.rowId)],ready:false};
}
const int=n=>Number(n).toLocaleString('es-ES');
const place=x=>x.location ? esc(x.location) : 'Lugar sin nombre verificado';
export function gedCaseCell(caseData,context) {
  if(!context?.ready)return '<span class="future-ged-pending">Detalles GED: archivo por validar</span>';
  const matching=context.accepted.find(x=>keyOf(x)===keyOf(caseData));
  if(!matching)return '<span class="future-ged-pending">Sin enlace verificable al archivo GED</span>';
  const count=matching.stateBasedEventsWithinBorders;
  if(count===0)return '<span class="future-ged-empty">Sin incidentes estatales localizados dentro de este país-año en GED. '+
    'No implica ausencia de conflicto o de incidentes fuera de sus fronteras.</span>';
  const incident=matching.examples.map(e=>'<article class="future-ged-event">'+
    '<strong>'+esc(e.conflict || e.dyad || 'Incidente estatal GED')+'</strong>'+
    '<span>'+esc(e.dateStart)+(e.dateStart!==e.dateEnd?' a '+esc(e.dateEnd):'')+
    ' · '+place(e)+'</span>'+
    '<span>Actores/díada: '+esc(e.dyad || 'Sin díada indicada')+'</span>'+
    '<span>Muertes estimadas: '+int(e.bestDeaths)+' (mín. '+int(e.lowDeaths)+', máx. '+int(e.highDeaths)+')</span>'+
    '<small>GED #'+int(e.gedEventId)+' · Precisión de fecha '+e.datePrecision+
    ' · Precisión geográfica '+e.locationPrecision+'</small></article>').join('');
  return '<details class="future-ged-details"><summary>Inspeccionar '+int(count)+' incidente'+
    (count===1?'':'s')+' GED localizado'+(count===1?'':'s')+'</summary>'+
    '<div class="future-ged-incidents">'+incident+'</div>'+
    '<p class="chart-note">Se muestran hasta 3 incidentes con mayor estimación de muertes, no los primeros incidentes ni '+
    'los causantes del inicio. Un participante de un conflicto interestatal puede tener incidentes en otro país.</p></details>';
}
export function gedContextSummary(context) {
  if(!context?.ready)return '';
  const n=context.accepted.length;
  const m=context.accepted.filter(c=>c.stateBasedEventsWithinBorders>0).length;
  return '<p class="future-ged-status">Contexto GED 25.1 retrospectivo: '+m+' de '+n+
    ' casos con incidentes estatales localizados en el mismo país y año · '+
    '<a href="'+esc(context.evidence)+'" target="_blank" rel="noopener noreferrer">Fuente y auditoría privadas ↗</a>. '+
    'La coincidencia territorial/temporal no es atribución causal ni demuestra que el modelo pronosticara un suceso específico.</p>';
}
