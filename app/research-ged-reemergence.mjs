// Inspector GED retrospectivo (sin datos reales en Git).
export const GED_PREVIEW_SCHEMA='psychohistory.ged.incident_preview_batch.v1';

const SOURCE='https://ucdp.uu.se/downloads/ged/ged251-csv.zip';
const CODEBOOK='https://ucdp.uu.se/downloads/ged/ged251.pdf';
const MODELS=['global_reemergence','country_shrinkage','country_history','time_since_last_event'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unsigned=x=>Number.isSafeInteger(x)&&x>=0;
const digest=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const isoMonth=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x);
const mi=x=>Number(x.slice(0,4))*12+Number(x.slice(5,7))-1;
const validDate=x=>{
  if(typeof x!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(x))return false;
  const d=new Date(x+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;
};
const evidence=x=>typeof x==='string'&&/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(x);
function validEvent(e){
  if(!e||!unsigned(e.id)||e.id===0||!unsigned(e.cid)||e.cid===0||
     !validDate(e.date)||!text(e.country,120)||!e.country||
     !text(e.place,180)||!text(e.sideA,180)||!text(e.sideB,180)||
     !text(e.dyad,260)||!text(e.conflict,260)||!text(e.sourceDatesRaw,220)||
     !unsigned(e.best)||e.best<1||!unsigned(e.low)||!unsigned(e.high)||
     !unsigned(e.wherePrecision)||e.wherePrecision<1||e.wherePrecision>8||
     !unsigned(e.positiveWindowCount)||e.positiveWindowCount<1||
     !isoMonth(e.issueMonth)||!isoMonth(e.targetEndMonth)||!e.probabilities||
     Object.keys(e.probabilities).length!==4||MODELS.some(k=>
       typeof e.probabilities[k]!=='number'||!Number.isFinite(e.probabilities[k])||
       e.probabilities[k]<=0||e.probabilities[k]>=1))return false;
  const issued=mi(e.issueMonth),target=mi(e.targetEndMonth),observed=mi(e.date.slice(0,7));
  return target-issued===23&&issued<=observed&&observed<=target;
}
export function parseGedIncidentPreview(experiments=[]){
  const batches=[],rejected=[];
  for(const row of experiments){
    let d;try{d=JSON.parse(row?.notes??'');}catch{continue;}
    if(d?.schema!==GED_PREVIEW_SCHEMA)continue;
    if(row.status!=='RETROSPECTIVO_EXPLORATORIO'||d.gedEdition!=='25.1'||
       d.sourceUrl!==SOURCE||d.asOfVerified!==false||d.prospectiveEligible!==false||
       d.eventSpecificForecast!==false||d.sourceAvailabilityVerified!==false||
       d.horizonMonths!==24||!digest(d.gedZipSha256)||!digest(d.casebookSha256)||
       !unsigned(d.batchCount)||d.batchCount<1||d.batchCount>12||
       !unsigned(d.batchIndex)||d.batchIndex>=d.batchCount||
       !unsigned(d.totalEvents)||d.totalEvents<1||d.totalEvents>500||
       !unsigned(d.totalWindowLinks)||d.totalWindowLinks<d.totalEvents||
       !unsigned(d.archiveTotalEvents)||d.archiveTotalEvents<d.totalEvents||
       !unsigned(d.archiveTotalWindowLinks)||d.archiveTotalWindowLinks<d.totalWindowLinks||
       !Array.isArray(d.events)||d.events.length<1||d.events.length>30||
       !evidence(row.evidence)){rejected.push(row.id);continue;}
    batches.push({...d,evidence:row.evidence,rowId:row.id});
  }
  if(!batches.length)return {ready:false,cases:[],rejected};
  const ref=batches[0],ids=new Set(),slots=new Set(),cases=[];
  let valid=batches.length===ref.batchCount && rejected.length===0;
  for(const b of batches){
    if(b.batchCount!==ref.batchCount||b.totalEvents!==ref.totalEvents||
       b.totalWindowLinks!==ref.totalWindowLinks||
       b.archiveTotalEvents!==ref.archiveTotalEvents||b.archiveTotalWindowLinks!==ref.archiveTotalWindowLinks||
       b.gedZipSha256!==ref.gedZipSha256||b.casebookSha256!==ref.casebookSha256||
       b.evidence!==ref.evidence||slots.has(b.batchIndex))valid=false;
    slots.add(b.batchIndex);
    for(const e of b.events){
      if(!validEvent(e)||ids.has(e.id))valid=false;
      ids.add(e.id);cases.push(e);
    }
  }
  if(slots.size!==ref.batchCount||cases.length!==ref.totalEvents||
     cases.reduce((s,e)=>s+(unsigned(e.positiveWindowCount)?e.positiveWindowCount:0),0)!==ref.totalWindowLinks)valid=false;
  return valid?{ready:true,cases:cases.sort((a,b)=>b.date.localeCompare(a.date)||a.id-b.id),
    totalWindowLinks:ref.totalWindowLinks,archiveTotalEvents:ref.archiveTotalEvents,
    archiveTotalWindowLinks:ref.archiveTotalWindowLinks,evidence:ref.evidence,rejected}:
    {ready:false,cases:[],rejected:[...rejected,...batches.map(b=>b.rowId)]};
}

const pct=p=>(p*100).toFixed(2)+' %';
const names={global_reemergence:'Frecuencia global',country_shrinkage:'País regularizado',
  country_history:'Historial país',time_since_last_event:'Recencia'};
export function gedIncidentPreviewPanel(experiments=[]){
  const data=parseGedIncidentPreview(experiments);
  if(!data.ready)return '';
  const cases=data.cases;
  const countries=[...new Set(cases.map(c=>c.country))].sort();
  const years=[...new Set(cases.map(c=>c.date.slice(0,4)))].sort().reverse();
  const options=xs=>xs.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
  const cards=cases.map(c=>
    '<article class="ged-preview-event" data-ged-preview-event data-country="'+esc(c.country)+
    '" data-year="'+esc(c.date.slice(0,4))+'"><details><summary><time>'+esc(c.date)+'</time> '+
    '<strong>'+esc(c.country)+' · '+esc(c.place)+'</strong>'+
    '<small>'+c.positiveWindowCount+' ventanas vinculadas</small></summary>'+
    '<div class="ged-preview-details"><p><b>Hecho UCDP:</b> '+esc(c.conflict)+
    ' · '+esc(c.dyad)+'</p><p>Actores: '+esc(c.sideA)+' / '+esc(c.sideB)+'</p>'+
    '<p>Muertes estimadas: '+c.best+' (low '+c.low+', high '+c.high+') · GED #'+c.id+
    ' · precisión de localización '+c.wherePrecision+'</p>'+
    '<p><b>Una ventana retrospectiva ilustrativa:</b> emisión hipotética '+
    esc(c.issueMonth)+' → final '+esc(c.targetEndMonth)+'. Son probabilidades de '+
    '<b>≥1 incidente durante los 24 meses</b>, no del suceso concreto.</p>'+
    '<dl class="ged-preview-probs">'+MODELS.map(k=>'<div><dt>'+names[k]+
    '</dt><dd>'+pct(c.probabilities[k])+'</dd></div>').join('')+'</dl>'+
    '<small>Fuentes publicadas: '+esc(c.sourceDatesRaw)+'; estas fechas no verifican '+
    'la disponibilidad histórica de la versión UCDP.</small></div></details></article>').join('');
  return '<section class="panel ged-preview-panel" aria-label="Inspector histórico GED">'+
    '<div class="panel-head"><h3>Incidentes GED documentados · Archivo histórico</h3>'+
    '<span>Retrospectivo, no prospectivo</span></div>'+
    '<p class="chart-note">'+(cases.length===data.archiveTotalEvents&&data.totalWindowLinks===data.archiveTotalWindowLinks?'Archivo documental completo: ':'Vista documental parcial: ')+cases.length+' de '+data.archiveTotalEvents+' sucesos únicos del archivo; '+
    data.totalWindowLinks+' de '+data.archiveTotalWindowLinks+' vínculos país-horizonte (solapados); no son predicciones '+
    'independientes ni guerras o invasiones identificadas.</p>'+
    '<div class="ged-preview-filters"><label>País<select data-ged-preview-country>'+
    '<option value="all">Todos</option>'+options(countries)+'</select></label>'+
    '<label>Año<select data-ged-preview-year><option value="all">Todos</option>'+
    options(years)+'</select></label><span role="status" data-ged-preview-visible>'+
    cases.length+' incidentes</span></div><div class="ged-preview-list">'+cards+'</div>'+
    '<p class="chart-note">UCDP GED 25.1 revisada; as-of y emisión independiente no verificados. '+
    '<a href="'+CODEBOOK+'" target="_blank" rel="noopener noreferrer">Codebook ↗</a> · '+
    '<a href="'+esc(data.evidence)+'" target="_blank" rel="noopener noreferrer">Informe privado ↗</a>.</p></section>';
}
