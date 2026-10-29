// Generic private experiment view. Source observations and actual results stay outside Git.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
const text=s=>typeof s==='string'&&s.trim().length>0&&s.length<=500;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const fmt=(n,d=2)=>n.toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
export function lossDistributions(experiments=[]){
  const counts=new Map();
  for(const r of experiments)counts.set(r.id,(counts.get(r.id)||0)+1);
  const accepted=[];
  for(const r of experiments){
    let n;
    try{if(typeof r.notes!=='string'||r.notes.length>12000)continue;n=JSON.parse(r.notes);}catch{continue;}
    if(n?.schema!=='psychohistory.market-loss-distribution.v1'||n.runType!=='adaptive_historical_screen'||
      n.forecastIssued!==false||n.skillDemonstrated!==false||n.currentRiskEstimated!==false||
      n.horizonSessions!==20||n.target!=='MAX_CLOSE_LOSS_FROM_ORIGIN_WITHIN_20_SESSIONS'||
      !Number.isSafeInteger(n.n)||n.n<1||!text(r.id)||counts.get(r.id)!==1||!text(r.hypothesis)||
      !date(r.date)||!date(n.inputThrough)||n.inputThrough>r.date||!text(n.source)||!text(n.criterion)||
      !['rejected','screen_passed'].includes(n.decision)||r.metric!=='quantile_pinball'||
      !Array.isArray(n.methods)||n.methods.length!==2||
      !n.methods.every(m=>m&&text(m.label)&&m.quantiles&&['q90','q95'].every(key=>{
        const q=m.quantiles[key];
        return q&&score(q.pinball)&&Number.isSafeInteger(q.exceedances)&&q.exceedances>=0&&q.exceedances<=n.n;
      }))||n.methods[0].label===n.methods[1].label||
      r.value!==n.methods[0].quantiles.q90.pinball||r.baseline!==n.methods[1].quantiles.q90.pinball)continue;
    accepted.push({...n,id:r.id,title:r.hypothesis,date:r.date,evidence:/^https:\/\/github\.com\/mamg97\/segundo-cerebro\/pull\/\d+$/.test(r.evidence||'')?r.evidence:null});
  }
  return accepted.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
}
function bar(value,max,marker=null){
  return '<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect width="'+(max?100*value/max:0).toFixed(4)+'" height="10"/>'+
    (marker===null?'':'<line x1="'+(100*marker/max).toFixed(4)+'" x2="'+(100*marker/max).toFixed(4)+'" y1="0" y2="10"/>')+'</svg>';
}
function quantile(r,key,q){
  const errorMax=Math.max(...r.methods.map(m=>m.quantiles[key].pinball));
  const nominal=1-q;
  const coverageMax=Math.max(nominal,...r.methods.map(m=>m.quantiles[key].exceedances/r.n))*1.15;
  return '<section class="loss-quantile"><h4>Umbral del '+Math.round(q*100)+' %</h4>'+
    '<p>La pérdida estimada pretende cubrir el '+Math.round(q*100)+' % de los casos.</p>'+
    '<h5>Error del umbral · menor es mejor</h5><dl>'+r.methods.map((m,i)=>
      '<div class="loss-method loss-method-'+i+'"><dt>'+esc(m.label)+'</dt><dd>'+bar(m.quantiles[key].pinball,errorMax)+'<span>'+fmt(m.quantiles[key].pinball,6)+'</span></dd></div>').join('')+'</dl>'+
    '<h5>Casos que superaron la pérdida estimada</h5><p class="loss-marker">La marca vertical indica el '+Math.round(nominal*100)+' % nominal.</p><dl>'+r.methods.map((m,i)=>{
      const count=m.quantiles[key].exceedances,rate=count/r.n;
      return '<div class="loss-method loss-method-'+i+'"><dt>'+esc(m.label)+'</dt><dd>'+bar(rate,coverageMax,nominal)+'<span>'+fmt(rate*100,1)+' %</span></dd><small>'+count+' de '+r.n+' casos</small></div>';
    }).join('')+'</dl></section>';
}
function trial(r){
  return '<article class="loss-trial"><header><h3>'+esc(r.title)+'</h3><strong>'+ (r.decision==='rejected'?'Descartado por el criterio conjunto':'Pasa el filtro histórico; falta validación futura')+'</strong></header>'+
    '<p class="loss-boundary">Ensayo histórico. No estima el riesgo actual ni constituye una predicción emitida.</p><p class="loss-context">'+r.n+' ventanas pareadas · 20 sesiones · Datos hasta '+esc(r.inputThrough)+' · '+esc(r.source)+'</p>'+
    '<div class="loss-quantiles">'+quantile(r,'q90',.9)+quantile(r,'q95',.95)+'</div>'+
    '<p class="loss-criterion"><strong>Criterio previo:</strong> '+esc(r.criterion)+'</p>'+
    '<details><summary>Cómo leer esta comparación</summary><p>La pérdida se mide desde el cierre inicial hasta el peor cierre de las siguientes 20 sesiones. El error pinball penaliza un umbral que queda por encima o por debajo de la pérdida observada; no es una probabilidad ni una pérdida esperada.</p><p>La cobertura compara superaciones observadas con la frecuencia nominal. Acercarse a la marca en esta muestra no demuestra calibración futura. Cada gráfico tiene su escala; lee sus valores, no compares longitudes entre gráficos.</p><p>Historia revisada y exploratoria. No estima el riesgo actual ni constituye una predicción emitida. La decisión exige los dos umbrales; no se elige después el más favorable.</p></details>'+
    (r.evidence?'<a href="'+esc(r.evidence)+'" target="_blank" rel="noopener noreferrer">Ver método y comprobaciones</a>':'')+'</article>';
}
export function renderLossDistributions(lab,{limit=Infinity}={}){
  const all=lossDistributions(lab?.experiments||[]);
  if(!all.length)return '';
  return '<section class="loss-distributions" aria-label="Ensayos de pérdidas bursátiles"><h2>Riesgo bursátil: error y cobertura</h2><p>Dos métodos, las mismas ventanas históricas. La comparación comprueba cuánto falló cada umbral y con qué frecuencia se superó.</p>'+all.slice(0,limit).map(trial).join('')+'</section>';
}
