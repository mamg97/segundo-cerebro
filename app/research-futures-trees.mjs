const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Only validated private catalogs generate tree choices; no invented annual origins.
export function predictionTreeIndex(catalogs,selectedId){
 if(!Array.isArray(catalogs))return '';
 const valid=catalogs.filter(c=>c&&typeof c.id==='string'&&Number.isInteger(c.origin)&&Number.isInteger(c.cutoff)&&
  c.cutoff===c.origin-2&&Number.isInteger(c.maxHorizon)&&c.maxHorizon>0&&Array.isArray(c.countries)&&c.countries.length>0);
 if(!valid.length)return '';
 const cards=[...valid].sort((a,b)=>a.origin-b.origin||a.id.localeCompare(b.id)).map(c=>{
  const current=c.id===selectedId,end=c.origin+c.maxHorizon-1;
  return '<button type="button" class="future-tree-card'+(current?' active':'')+
   '" data-ftree="'+esc(c.id)+'" aria-pressed="'+current+'" aria-label="Abrir árbol retrospectivo '+c.origin+'">'+
   '<small>ÁRBOL '+c.origin+(current?' · EN PANTALLA':'')+'</small><strong>'+c.cutoff+' → '+end+
   '</strong><span>Información hasta '+c.cutoff+' · '+c.maxHorizon+' años objetivo</span></button>';
 }).join('');
 return '<section class="future-tree-index" aria-label="Árboles retrospectivos disponibles">'+
 '<div class="future-tree-index-head"><h3>Un árbol por predicción registrada</h3>'+
 '<p>Elige un origen. Dentro del árbol verás todos los años; solo cambia el detalle inspeccionado.</p></div>'+
 '<div class="future-tree-cards">'+cards+'</div><p class="future-tree-index-note">'+
 'Solo se muestran orígenes del registro privado, sin inventar emisiones intermedias.</p></section>';
}
export function predictionYearStrip(result,focus){
 const m=result?.maxHorizon;
 if(!Number.isInteger(result?.cutoff)||!Number.isInteger(result?.origin)||!Number.isInteger(m)||m<1||
  result.origin!==result.cutoff+2||!Number.isInteger(focus)||focus<1||focus>m)return '';
 let s='<span class="future-year-static"><strong>'+result.cutoff+'</strong><small>último dato</small></span>'+
 '<span class="future-year-static"><strong>'+(result.origin-1)+'</strong><small>puente no observado</small></span>';
 for(let h=1;h<=m;h++){
  const chosen=h===focus;
  s+='<button type="button" class="future-year-select'+(chosen?' active':'')+
   '" data-fyear="'+h+'" aria-pressed="'+chosen+'" aria-label="Inspeccionar '+(result.origin+h-1)+'">'+
   '<strong>'+(result.origin+h-1)+'</strong><small>'+(chosen?'inspeccionado':'proyección')+'</small></button>';
 }
 return '<nav class="future-year-strip" aria-label="Todos los años continuos del árbol">'+s+'</nav>';
}
