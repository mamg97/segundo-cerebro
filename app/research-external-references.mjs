// Published third-party outlooks, never own issuance or evaluation evidence.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const month=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(v||'')?Number(v.slice(0,4))*12+Number(v.slice(5))-1:null;
const label=v=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(v+'-01T00:00:00Z'));
function privateSheet(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname==='docs.google.com'&&/^\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit$/.test(u.pathname)&&[...u.searchParams].every(([k,v])=>k==='gid'&&/^\d+$/.test(v))&&(!u.hash||/^#gid=\d+$/.test(u.hash))?u.href:null;}catch{return null;}
}
export function externalViewsReference(experiments){
 const candidates=(experiments||[]).filter(e=>e.id==='views-external-monthly-20261028');
 if(candidates.length!==1)return null;
 const e=candidates[0];let d;
 try{d=JSON.parse(e.notes);}catch{return null;}
 if(!d||d.schema!=='psychohistory.external_views_monthly_readonly.v1'||d.status!=='EXTERNAL_PUBLISHED_FORECAST_NOT_PSICOHISTORIA'||e.status!=='REFERENCIA_EXTERNA'||
 d.ourForecastIssued!==false||d.windowAggregateConflictProbabilityAvailable!==false||d.annualUcdpTargetComparable!==false||
 !Number.isInteger(d.countries)||d.countries<1||d.countries>250||!Array.isArray(d.forecastMonths)||d.forecastMonths.length!==3||
 !/^fatalities003_20\d{2}_(0[1-9]|1[0-2])_t01$/.test(d.release||''))return null;
 const input=d.release.slice(14,21).replace('_','-');
 if(d.inputThrough!==input||month(input)===null)return null;
 const months=d.forecastMonths.map(month);
 if(months.some(x=>x===null)||months[0]<=month(input)||months[1]!==months[0]+1||months[2]!==months[1]+1)return null;
 const evidence=privateSheet(e.evidence);if(!evidence)return null;
 return {...d,evidence};
}
export function renderExternalReferences(lab){
 const d=externalViewsReference(lab?.experiments);if(!d)return '';
 return '<section class="external-reference" aria-label="Referencia externa VIEWS"><h2>Consulta mensual de VIEWS</h2><p>'+d.countries+' países · '+esc(label(d.forecastMonths[0]))+' a '+esc(label(d.forecastMonths[2]))+'. Datos de entrada hasta '+esc(label(d.inputThrough))+'.</p><p>Pronósticos publicados por un modelo externo. No son predicciones propias ni demuestran la precisión de Psicohistoria; el objetivo mensual es distinto al de la cohorte anual.</p><a href="'+esc(d.evidence)+'" target="_blank" rel="noopener noreferrer">Abrir tabla privada por país y mes</a></section>';
}
