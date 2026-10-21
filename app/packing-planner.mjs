// Compact read-only travel planning derived from canonical ListaPlanning.
const esc = (v) => String(v ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const PARTS = Object.freeze([
  ["mañana","Mañana"],["mediodía","Comida"],["tarde","Tarde"],["noche","Noche"],["sin_hora","Sin hora"]
]);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function packingPlanDays(startDate,endDate,maxDays=14) {
  const start=String(startDate||"").slice(0,10),end=String(endDate||"").slice(0,10);
  if(!ISO.test(start)||!ISO.test(end))return [];
  const from=Date.parse(start+"T12:00:00Z"),to=Date.parse(end+"T12:00:00Z");
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<from||to-from>=maxDays*86400000)return [];
  const days=[];
  for(let ms=from;ms<=to;ms+=86400000){
    const date=new Date(ms),key=date.toISOString().slice(0,10);
    const weekday=new Intl.DateTimeFormat("es-ES",{weekday:"short",timeZone:"UTC"}).format(date).replace(".","");
    days.push({key,label:weekday+" "+date.getUTCDate(),weekday});
  }
  return days;
}

export function packingPlanModel(list) {
  const days=packingPlanDays(list?.startDate,list?.endDate);
  const events=(list?.planning||[]).filter(x=>days.some(d=>d.key===x.date)).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0));
  return {days,events,parts:PARTS};
}

export function packingPlannerMarkup(list,objects=[]) {
  const {days,events,parts}=packingPlanModel(list);
  if(!days.length)return '<section class="packing-planning"><p>Planning sin fechas válidas.</p></section>';
  const names=new Map((objects||[]).map(x=>[String(x.id),String(x.name||"")]));
  const slot=(date,part)=>{
    const matches=events.filter(x=>x.date===date&&x.daypart===part);
    if(!matches.length)return '<div class="packing-plan-cell is-empty"><span>—</span></div>';
    return '<div class="packing-plan-cell">'+matches.map(x=>{
      const name=String(x.title||"Actividad");
      const garments=(x.objectIds||[]).map(id=>names.get(String(id))||"").filter(Boolean);
      const short=garments.slice(0,2).join(" · ");
      const more=garments.length>2?" +"+(garments.length-2):"";
      const type=/boda|preboda/i.test(name)?"is-formal":/teletrabajo/i.test(name)?"is-work":/cena|comida/i.test(name)?"is-outfit":"is-travel";
      return '<button type="button" class="packing-plan-event '+type+'" data-plan-event="'+esc(x.order)+'" aria-label="Ver prendas de '+esc(name)+'">'+
          '<strong>'+esc(name)+'</strong>'+
          (short?'<small>'+esc(short+more)+'</small>':"")+
          (x.garmentNotes?'<em>+ detalles de prendas</em>':"")+
        '</button>';
    }).join("")+'</div>';
  };
  const header='<div class="packing-plan-corner">Momento</div>'+days.map(x=>'<div class="packing-plan-day"><strong>'+esc(x.label)+'</strong><small>'+esc(x.key.slice(5).replace("-","/"))+'</small></div>').join("");
  const rows=parts.map(([part,label])=>'<div class="packing-plan-period">'+esc(label)+'</div>'+days.map(day=>slot(day.key,part)).join("")).join("");
  return '<section class="packing-planning" aria-label="Planning previsto del viaje">'+
    '<div class="packing-plan-heading"><div><small>PLAN DEL VIAJE</small><h4>Qué usar cada día</h4></div><span>Selecciona una actividad para ver todas las prendas</span></div>'+
    '<div class="packing-plan-scroll"><div class="packing-plan-grid" style="--packing-plan-days:'+days.length+'">'+header+rows+'</div></div>'+
    '<div class="packing-plan-focus" id="packing-plan-focus" aria-live="polite">Selecciona una actividad para ver su conjunto y los detalles previstos.</div>'+
  '</section>';
}
