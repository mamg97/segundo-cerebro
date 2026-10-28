// Paired historical comparisons from private PsicoExperimentos; no live data in Git.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validScore=(n,metric)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&(metric!=='brier'||n<=1);
const labels={brier:'Brier · menor es mejor',rmse:'RMSE en puntos porcentuales · menor es mejor'};
const fmt=n=>n.toLocaleString('es-ES',{minimumFractionDigits:3,maximumFractionDigits:6});
export function pairedEvaluations(experiments=[]){
  const counts=new Map();
  for(const r of experiments)counts.set(r.id,(counts.get(r.id)||0)+1);
  const accepted=[];
  for(const r of experiments){
    let n;
    try{if(typeof r.notes!=='string'||r.notes.length>12000)continue;n=JSON.parse(r.notes);}catch{continue;}
    if(n?.schema!=='psychohistory.paired-evaluation.v1'||n.runType!=='adaptive_historical_screen'||
      n.forecastIssued!==false||n.skillDemonstrated!==false||!r.id||counts.get(r.id)!==1||
      !labels[r.metric]||!validScore(r.value,r.metric)||!Number.isInteger(n.n)||n.n<1||
      !['rejected','screen_passed'].includes(n.decision)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')||
      !Array.isArray(n.references)||n.references.length<1||n.references.length>3||
      !n.references.every(x=>typeof x.label==='string'&&x.label.trim()&&validScore(x.value,r.metric))||
      r.baseline!==n.references[0].value||typeof n.criterion!=='string'||!n.criterion.trim())continue;
    const evidence=/^https:\/\//.test(r.evidence||'')?r.evidence:null;
    accepted.push({id:r.id,date:r.date,title:r.hypothesis,model:r.modelVersion,
      metric:r.metric,value:r.value,n:n.n,references:n.references,criterion:n.criterion,
      decision:n.decision,evidence});
  }
  return accepted.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
}
function comparison(r){
  const series=[{label:r.model||'Candidato',value:r.value,candidate:true},...r.references];
  const max=Math.max(...series.map(x=>x.value));
  return '<article class="paired-trial"><header><div><h3>'+esc(r.title)+'</h3><p>'+r.n+
    ' casos pareados · '+esc(r.date)+'</p></div><strong class="paired-decision">'+
    (r.decision==='rejected'?'Descartado':'Pasa el filtro exploratorio')+'</strong></header>'+
    '<p class="paired-unit">'+labels[r.metric]+'</p><dl class="paired-series">'+series.map(s=>
      '<div class="'+(s.candidate?'paired-candidate':'paired-reference')+'"><dt>'+esc(s.label)+
      '</dt><dd><svg class="paired-measure" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="'+
      (max?100*s.value/max:0).toFixed(4)+'" height="8" /></svg><span class="paired-number">'+fmt(s.value)+
      '</span></dd></div>').join('')+'</dl><p class="paired-criterion"><strong>Criterio previo:</strong> '+
      esc(r.criterion)+'</p>'+(r.evidence?'<a href="'+esc(r.evidence)+
      '" target="_blank" rel="noopener noreferrer">Ver el experimento completo</a>':'')+'</article>';
}
export function renderPairedEvaluations(lab,{limit=Infinity}={}){
  const all=pairedEvaluations(lab?.experiments||[]);
  if(!all.length)return '';
  const shown=all.slice(0,limit);
  return '<section class="paired-evaluations" aria-label="Ensayos históricos y referencias"><header><h2>Últimos ensayos, con su referencia</h2>'+
    '<p>El candidato y sus referencias se miden sobre los mismos casos de cada ensayo. Las barras comparan errores; una barra menor es mejor.</p></header>'+
    shown.map(comparison).join('')+'<p class="paired-caveat">Son ensayos exploratorios sobre historia conocida. Superar un filtro histórico no acredita utilidad predictiva; faltan resultados futuros y beneficio para una decisión concreta. No compares errores entre ensayos con muestras o métricas diferentes.</p>'+
    (shown.length<all.length?'<button type="button" class="brief-secondary" data-brief-go="science">Ver los '+all.length+' ensayos comparados</button>':'')+'</section>';
}
