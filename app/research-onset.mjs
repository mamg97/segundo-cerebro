// Private, strictly exploratory UCDP Onset country-year report summaries.
// No data constants, no external I/O, no claims of prospective skill.
export const ONSET_SCHEMA = 'psychohistory.onset.summary.v1';
const KINDS = new Set(['intrastate_country','interstate_country']);
const LABELS = Object.freeze({
  intrastate_country:'Inicio o reanudación de conflicto interno',
  interstate_country:'Inicio o reanudación de conflicto interestatal'
});
const validNumber = x => typeof x==='number' && Number.isFinite(x);
const probability = x => validNumber(x) && x>=0 && x<=1;
const score = x => validNumber(x) && x>=0 && x<1;
const hash = x => typeof x==='string' && /^[a-f0-9]{64}$/.test(x);
function validPartition(p, name){
  if (!p || p.name!==name || !Array.isArray(p.years) || p.years.length!==2 ||
      p.years[0] !== (name==='validation'?2010:2016) || p.years[1] !== (name==='validation'?2015:2024) ||
      !Number.isInteger(p.n) || p.n<1 || !Number.isInteger(p.events) || p.events<0 || p.events>p.n ||
      !Number.isInteger(p.excluded) || p.excluded<0 ||
      !score(p.baselineBrier) || !score(p.countryBrier) ||
      !validNumber(p.countrySkill) || p.countrySkill>1 ||
      !probability(p.averagePrecision) || !probability(p.baselineAveragePrecision) ||
      !probability(p.topDecileRecall) || !validNumber(p.topDecileLift) || p.topDecileLift<0 ||
      !validNumber(p.logLoss) || p.logLoss<0 || !validNumber(p.baselineLogLoss) || p.baselineLogLoss<0 ||
      !Array.isArray(p.skillInterval95) || p.skillInterval95.length!==2 ||
      !p.skillInterval95.every(validNumber) || p.skillInterval95[0]>p.skillInterval95[1] ||
      !Array.isArray(p.annual) || p.annual.length!==p.years[1]-p.years[0]+1) return false;
  const n=p.annual.reduce((a,y)=>a+y.n,0),ev=p.annual.reduce((a,y)=>a+y.events,0);
  if (n!==p.n || ev!==p.events || p.annual.some((y,i)=>
      y.year!==p.years[0]+i || !Number.isInteger(y.n) || y.n<1 ||
      !Number.isInteger(y.events) || y.events<0 || y.events>y.n))return false;
  return Math.abs((1-p.countryBrier/p.baselineBrier)-p.countrySkill) <= 1e-7;
}
export function parseOnsetSummaries(experiments=[]){
  const accepted=[],rejected=[];
  for(const row of experiments){
    let d;try{d=JSON.parse(row.notes);}catch{continue;}
    if(d?.schema!==ONSET_SCHEMA)continue;
    const valid = row.status === 'RETROSPECTIVO_EXPLORATORIO' &&
      d.datasetVersion==='25.1' && d.target==='onset1' &&
      KINDS.has(d.kind) && d.runType==='retrospective_revised_release_exploratory' &&
      d.sourceAsOfVerified===false && d.prospectiveEligible===false &&
      d.sourceIndependentShaPinning===false && hash(d.sourceSha256) &&
      d.models?.length===2 && d.models[0]==='global_frequency' && d.models[1]==='country_shrinkage' &&
      d.informationLagYears===2 && d.historyYears===5 &&
      validPartition(d.validation,'validation') && validPartition(d.test,'test') &&
      typeof row.evidence==='string' && /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view$/.test(row.evidence);
    if(!valid){rejected.push(row.id);continue;}
    accepted.push({...d, evidence:row.evidence, rowId:row.id, label:LABELS[d.kind]});
  }
  const byKind=new Map();
  for(const r of accepted)if(!byKind.has(r.kind))byKind.set(r.kind,r);
  return {accepted:[...byKind.values()],rejected};
}
const format=(v,n=3)=>v.toLocaleString('es-ES',{minimumFractionDigits:n,maximumFractionDigits:n});
const pct=(v,n=1)=>format(v*100,n)+' %';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/**
 * Observed country-year onsets by calendar year. These bars are POST-HOC labels
 * from UCDP 25.1; no prospective forecasts, no event names, no model fitting.
 * Only accepted private summaries reach this function in the normal UI.
 */
export function onsetObservedAnnualChart(summaries=[]){
  const variants=['intrastate_country','interstate_country'];
  const available=variants.map(kind=>summaries.find(x=>x.kind===kind)).filter(Boolean);
  if (!available.length || available.some(x=>!validPartition(x.test,'test')))return '';
  const colors=['#66c6ea','#f0a264'];
  const maxCount=Math.max(1,...available.flatMap(v=>v.test.annual.map(y=>y.events)));
  const W=900,H=245,baseY=195,topY=45,yearWidth=88,yearStart=76,barWidth=15;
  let svg='<svg role="img" aria-label="Inicios o reanudaciones de conflicto observados cada año de 2016 a 2024" viewBox="0 0 '+W+' '+H+'">';
  svg+='<line x1="48" y1="'+baseY+'" x2="878" y2="'+baseY+'" stroke="#49647a" stroke-width="1"/>';
  for(let i=0;i<9;i++){
    const year=2016+i,center=yearStart+yearWidth*i;
    svg+='<text x="'+center+'" y="222" text-anchor="middle" fill="#a1c4da" font-size="12">'+year+'</text>';
    available.forEach((dataset,index)=>{
      const events=dataset.test.annual[i].events,n=dataset.test.annual[i].n;
      const h=Math.max(events>0?3:0,Math.round(events/maxCount*(baseY-topY)));
      const offset=available.length===1?-barWidth/2:(index===0?-barWidth-3:3);
      const x=center+offset,y=baseY-h;
      svg+='<rect x="'+x+'" y="'+y+'" width="'+barWidth+'" height="'+h+'" rx="3" fill="'+colors[variants.indexOf(dataset.kind)]+'">'+
        '<title>'+esc(year+' · '+LABELS[dataset.kind]+': '+events+' de '+n+' países observados ('+pct(events/n,2)+')')+'</title></rect>';
      svg+='<text x="'+(x+barWidth/2)+'" y="'+Math.max(28,y-8)+'" text-anchor="middle" fill="'+colors[variants.indexOf(dataset.kind)]+'" font-size="12" font-weight="600">'+events+'</text>';
    });
  }
  svg+='</svg>';
  const legend=available.map(d=>'<span class="future-onset-legend"><i style="background:'+colors[variants.indexOf(d.kind)]+'"></i>'+esc(LABELS[d.kind])+'</span>').join('');
  return '<div class="future-onset-timeline"><div class="future-onset-chart-head"><strong>Acontecimientos observados por año</strong>'+
    '<span>Cada caso es un país con al menos un inicio o reanudación durante ese año</span></div>'+
    '<div class="future-onset-legend-row">'+legend+'</div>'+
    '<div class="future-onset-chart-scroll">'+svg+'</div>'+
    '<p class="chart-note">Conteos retrospectivos reales del objetivo <code>onset1</code> en las cohortes elegibles del test; cada país-año se cuenta como máximo una vez. No representan guerras independientes, fechas exactas ni predicciones emitidas entonces. Los denominadores varían por año.</p></div>';
}
export function onsetSummaryPanel(experiments=[]){
  const parsed=parseOnsetSummaries(experiments);
  if(!parsed.accepted.length)return '';
  const rows=parsed.accepted.map(d=>{
    const t=d.test,positive=t.countrySkill>0;
    return '<article class="future-onset-report"><div class="future-onset-report-title"><strong>'+
      esc(d.label)+'</strong><span>UCDP Onset 25.1 · País-año</span></div>'+
      '<div class="future-onset-metrics"><div><small>Casos evaluados</small><b>'+
      t.n.toLocaleString('es-ES')+'</b></div><div><small>Inicios observados</small><b>'+
      t.events.toLocaleString('es-ES')+'</b></div><div><small>Mejora Brier vs frecuencia global</small>'+
      '<b class="'+(positive?'future-skill-pos':'future-skill-neg')+'">'+pct(t.countrySkill,2)+'</b></div>'+
      '<div><small>AP: modelo por país</small><b>'+pct(t.averagePrecision,2)+'</b></div></div>'+
      '<p class="future-onset-band">Intervalo exploratorio por bloques anuales (95 %): '+
      pct(t.skillInterval95[0],2)+' a '+pct(t.skillInterval95[1],2)+
      '. Captura de inicios en el 10 % de mayor riesgo: '+pct(t.topDecileRecall,1)+'.</p>'+
      '<a href="'+esc(d.evidence)+'" target="_blank" rel="noopener noreferrer">Informe completo privado ↗</a></article>';
  });
  return '<section class="panel future-onset-science" aria-label="Resultados de inicio de conflictos UCDP">'+
    '<div class="panel-head"><h3>Inicios de conflictos · primer contraste con hechos históricos</h3>'+
    '<span>2016–2024 · Retrospectivo revisado</span></div>'+
    onsetObservedAnnualChart(parsed.accepted)+'<div class="future-onset-reports">'+rows.join('')+'</div>'+
    '<p class="future-epistemic">Se muestran resultados de los dos baselines registrados, no probabilidades de una invasión, '+
    'un conflicto concreto o el año actual. La fuente 25.1 es retrospectivamente revisada y su disponibilidad original '+
    'as-of no está acreditada; el intervalo representa variación por bloques de años, no un test de eficacia prospectiva.</p>'+
    (parsed.rejected.length?'<p class="future-epistemic">Informes inconsistentes excluidos: '+parsed.rejected.length+'.</p>':'')+
    '</section>';
}
