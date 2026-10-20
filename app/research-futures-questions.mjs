// All selectable questions derive from the SAME four-state distribution.
const STATES=[
 {title:'00 · Bajo → bajo',detail:'Año anterior <25 · actual <25'},
 {title:'01 · Entrada',detail:'Año anterior <25 · actual ≥25'},
 {title:'10 · Salida',detail:'Año anterior ≥25 · actual <25'},
 {title:'11 · Persistencia',detail:'Año anterior ≥25 · actual ≥25'}
];
const QUESTIONS=Object.freeze([
 {id:'atleast25',option:'¿Habrá ≥25 muertes estatales?',question:year=>'¿Se registrarán 25 o más muertes relacionadas con violencia estatal durante '+year+'?',matched:[1,3],yes:'≥25 muertes',no:'<25 muertes'},
 {id:'below25',option:'¿Habrá menos de 25 muertes estatales?',question:year=>'¿Se registrarán menos de 25 muertes relacionadas con violencia estatal durante '+year+'?',matched:[0,2],yes:'<25 muertes',no:'≥25 muertes'},
 {id:'entry',option:'¿Se entrará en el episodio agregado?',question:year=>'¿Se pasará de menos de 25 muertes estatales en '+(year-1)+' a 25 o más en '+year+'?',matched:[1],yes:'Entrada (01)',no:'Otros estados'},
 {id:'exit',option:'¿Se saldrá del episodio agregado?',question:year=>'¿Se pasará de 25 o más muertes estatales en '+(year-1)+' a menos de 25 en '+year+'?',matched:[2],yes:'Salida (10)',no:'Otros estados'},
 {id:'persistence',option:'¿Persistirá el episodio agregado?',question:year=>'¿Se registrarán al menos 25 muertes estatales tanto en '+(year-1)+' como en '+year+'?',matched:[3],yes:'Persistencia (11)',no:'Otros estados'},
 {id:'stable_low',option:'¿Seguirá por debajo del umbral?',question:year=>'¿Se registrarán menos de 25 muertes estatales tanto en '+(year-1)+' como en '+year+'?',matched:[0],yes:'Bajo → bajo (00)',no:'Otros estados'}
]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const supportedQuestionIds=Object.freeze(QUESTIONS.map(q=>q.id));
export function resolveQuestion(id){return QUESTIONS.find(q=>q.id===id)||QUESTIONS[0];}
export function questionSummary(masses,year,id='atleast25'){
 if(!Number.isInteger(year)||!Array.isArray(masses)||masses.length!==4||
 masses.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)||
 Math.abs(masses.reduce((a,b)=>a+b,0)-1)>1e-7)return null;
 const q=resolveQuestion(id),answer=q.matched.reduce((sum,i)=>sum+masses[i],0);
 return {id:q.id,question:q.question(year),yes:q.yes,no:q.no,answer,complement:1-answer,matched:[...q.matched]};
}
export function questionSelect(current='atleast25'){
 const selected=resolveQuestion(current);
 return '<label class="future-question-select"><span>¿QUÉ QUIERES PREDECIR?</span><select name="prediction-question" aria-label="Seleccionar pregunta del árbol">'+
 '<optgroup label="Calculable con el modelo actual">'+QUESTIONS.map(q=>
 '<option value="'+q.id+'"'+(q.id===selected.id?' selected':'')+'>'+esc(q.option)+'</option>').join('')+
 '</optgroup><optgroup label="En investigación · sin probabilidades estimadas">'+
 '<option disabled>Inicio de una guerra nueva</option><option disabled>Decisiones políticas y reuniones</option>'+
 '<option disabled>Mercados y empresas afectadas</option></optgroup></select></label>';
}
export function futureNodeRail(id='atleast25'){
 const q=resolveQuestion(id);
 return '<aside class="future-node-rail" aria-label="Significado de las cuatro filas de nodos">'+
 '<h4>Significado de cada nodo</h4>'+
 STATES.map((s,i)=>'<div class="future-rail-state future-rail-'+i+(q.matched.includes(i)?' is-answer':'')+
 '" data-state="'+i+'"><strong>'+esc(s.title)+'</strong><small>'+esc(s.detail)+'</small>'+
 (q.matched.includes(i)?'<em>Responde SÍ</em>':'')+'</div>').join('')+'</aside>';
}
