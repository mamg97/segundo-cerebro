// Timetable from canonical PLAN_HORA facts. No personal itineraries in the public repository.
const e=v=>String(v==null?"":v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const CLOCK=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function travelScheduleRows(groups) {
  const days=Array.isArray(groups?.days)?groups.days.filter(x=>DATE.test(x.date||"")):[];
  const slots=Array.isArray(groups?.slots)?groups.slots.filter(x=>DATE.test(x.date||"")&&CLOCK.test(x.time||"")):[];
  const byDate=new Map(days.map(d=>[d.date,d]));
  for(const s of slots)if(!byDate.has(s.date))byDate.set(s.date,{date:s.date,text:""});
  const ordered=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const base=["08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"];
  const times=[...new Set([...base,...slots.map(x=>x.time)])].sort();
  const grouped=new Map();
  for(const slot of slots){
    const key=slot.date+"|"+slot.time;
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(slot);
  }
  return {days:ordered,times,cells:grouped};
}
export function travelScheduleMarkup(groups,dayLabel) {
  const model=travelScheduleRows(groups);
  if(!model.days.length)return '<p class="trv-muted">Todavía no hay jornadas planificadas en Eventos.</p>';
  const titles='<tr><th scope="col" class="trv-time-axis">Hora</th>'+model.days.map((d,i)=>
    '<th scope="col"><span>DÍA '+(i+1)+'</span><strong>'+e(dayLabel(d.date))+'</strong></th>').join("")+'</tr>';
  const rows=model.times.map(time=>'<tr><th scope="row" class="trv-time-axis">'+e(time)+'</th>'+model.days.map(day=>{
    const items=model.cells.get(day.date+"|"+time)||[];
    return '<td>'+ (items.length?items.map(slot=>{
      const label=["CONFIRMADO","PENDIENTE","PROPUESTA"].includes(slot.status)?slot.status:"PROPUESTA";
      const category=["TRANSPORTE","TOUR","VISITA","OCIO","ALOJAMIENTO"].includes(slot.category)?slot.category:"ACTIVIDAD";
      return '<div class="trv-time-activity" data-state="'+e(label)+'"><span class="trv-time-category">'+e(category)+'</span><strong>'+e(slot.text)+'</strong><small>'+e(label==="PROPUESTA"?"ORIENTATIVO":label)+'</small></div>';
    }).join(""):'<span class="trv-time-empty" aria-label="Hora libre">·</span>')+'</td>';
  }).join("")+'</tr>').join("");
  const unassigned=model.days.map(day=>day.text?
    '<article><strong>'+e(dayLabel(day.date))+'</strong><p>'+e(day.text)+'</p></article>':"").join("");
  return '<div class="trv-timetable-scroll" tabindex="0" role="region" aria-label="Planning horario por días; desplázate horizontalmente si es necesario">'+
    '<table class="trv-timetable"><thead>'+titles+'</thead><tbody>'+rows+'</tbody></table></div>'+
    (unassigned?'<details class="trv-time-notes"><summary>Ver las notas completas por día</summary><div>'+unassigned+'</div></details>':"");
}
