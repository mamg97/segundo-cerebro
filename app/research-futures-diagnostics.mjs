// AV-076. Pure retrospective forecast diagnostics. Outcome data is read ONLY
// after scoring; it never enters the transition matrix or predictions.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=p=>(100*p).toLocaleString('es-ES',{maximumFractionDigits:2})+' %';
const STATES=['00 · Bajo → bajo','01 · Entrada','10 · Salida','11 · Persistencia'];
const finite=p=>typeof p==='number'&&Number.isFinite(p);
export function diagnoseRetrospectivePath(result,model='markov'){
 if(result?.runType!=='retrospective_revised_release' ||
    !Array.isArray(result.snapshots)||!Array.isArray(result.caseEvaluations)||
    !result.caseEvaluations.length||typeof model!=='string')return null;
 const rows=[], briers=new Map();
 for(const sample of result.caseEvaluations){
  if(!sample?.available)continue;
  const idx=sample.horizon-1,distribution=result.snapshots[idx]?.distribution;
  const y=sample.actualState,score=sample.models?.[model];
  if(!Number.isInteger(y)||y<0||y>3||!Array.isArray(distribution)||distribution.length!==4||
      distribution.some(x=>!finite(x)||x<0||x>1)||
      Math.abs(distribution.reduce((a,b)=>a+b,0)-1)>1e-7||
      !Number.isInteger(sample.endYear)||!finite(score?.probabilityActual)||
      !finite(score?.brier)||Math.abs(score.probabilityActual-distribution[y])>1e-7)continue;
  const modal=distribution.indexOf(Math.max(...distribution));
  rows.push({year:sample.endYear,actual:y,modal,
    probabilityActual:distribution[y],probabilityModal:distribution[modal],
    brier:score.brier,match:modal===y});
  for(const [id,item] of Object.entries(sample.models||{})){
   if(!finite(item?.brier)||item.brier<0||item.brier>2)continue;
   const list=briers.get(id)||[];list.push(item.brier);briers.set(id,list);
  }
 }
 if(!rows.length)return null;
 rows.sort((a,b)=>a.year-b.year);
 const failed=rows.filter(x=>!x.match),average=rows.reduce((a,b)=>a+b.brier,0)/rows.length;
 const alternatives=[...briers.entries()].filter(([,v])=>v.length===rows.length)
    .map(([id,v])=>({id,meanBrier:v.reduce((a,b)=>a+b,0)/v.length}))
    .sort((a,b)=>a.meanBrier-b.meanBrier||a.id.localeCompare(b.id));
 return {yearStart:rows[0].year,yearEnd:rows.at(-1).year,n:rows.length,
  failed,matched:rows.length-failed.length,firstMiss:failed[0]??null,
  rows,meanBrier:average,alternatives,
  target:'state_based_four_states',method:'retrospective_revised_release_single_country',
  temporalAsOfVerified:false,prospectiveSkillProven:false,usesOutcomesForModelFit:false};
}
export function retrospectivePathDiagnosticPanel(result,model){
 const d=diagnoseRetrospectivePath(result,model);
 if(!d)return '';
 const message=d.failed.length?
  d.failed.length+' de '+d.n+' años con estado modal distinto del registrado'+
    ' · primera divergencia '+d.firstMiss.year:
  'Sin divergencias modales en '+d.n+' años evaluables';
 const mismatches=d.failed.slice(0,5).map(x=>'<tr><th scope="row">'+x.year+'</th><td>'+esc(STATES[x.actual])+
    '</td><td>'+esc(STATES[x.modal])+'</td><td>'+pct(x.probabilityActual)+'</td></tr>').join('');
 const allModels=d.alternatives.map(m=>'<span>'+esc(m.id)+': '+
    m.meanBrier.toLocaleString('es-ES',{maximumFractionDigits:4})+'</span>').join(' · ');
 return '<details class="future-retrospective-diagnostic"><summary><strong>Diagnóstico de desviaciones</strong> · '+
     esc(message)+'</summary>'+
     (d.failed.length?'<div class="future-retrospective-diagnostic-scroll"><table><thead><tr><th>Año</th><th>Estado real</th><th>Nodo modal</th><th>Prob. asignada al real</th></tr></thead>'+
      '<tbody>'+mismatches+'</tbody></table></div>'+
      (d.failed.length>5?'<p>Otros '+(d.failed.length-5)+' años con divergencias, no mostrados aquí.</p>':''):
      '<p>El estado modal coincidió con el observado en todos los años evaluables; esto no prueba calibración ni habilidad futura.</p>')+
     '<p><strong>Error Brier medio de este caso ('+d.n+' años):</strong> '+
       d.meanBrier.toLocaleString('es-ES',{maximumFractionDigits:4})+
       '. Referencias calculadas sobre los mismos años: '+allModels+'.</p>'+
     '<p class="chart-note">Diagnóstico ex post: los años comparten una misma trayectoria, no son '+d.n+
       ' experimentos independientes. El modelo usa probabilidades fijas; la observación posterior solo sirve para evaluar. '+
       'La edición histórica está revisada y no acredita disponibilidad as-of. Una coincidencia modal no certifica pronóstico.</p>'+
     '</details>';
}
