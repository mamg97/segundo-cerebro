// Wedding planner native tools and explicit outbound Bodas.net references.
import {weddingAssigneeLabel} from "./wedding-assignees.js?v=0.1.0";
import {seatingSummary,suggestWeddingSeating,roundSeats,ROUND_CAPACITIES} from "./wedding-seating.js?v=0.1.0";
// No scraping, partner API, embeds, personal records or external requests.
export const BODAS_LINKS=[
 ["Organizador Bodas.net","https://www.bodas.net/organizador-bodas","Planificador original y funciones de Bodas.net"],
 ["Fincas","https://www.bodas.net/bodas/banquetes/fincas","Fotos, reseñas, disponibilidad y contacto"],
 ["Catering","https://www.bodas.net/bodas/proveedores/catering","Catálogo y solicitudes de presupuesto"],
 ["Fotografía","https://www.bodas.net/bodas/proveedores/fotografos","Portfolio y opiniones"],
 ["Todos los proveedores","https://www.bodas.net/mis-proveedores-boda","Búsqueda y comunicación en Bodas.net"],
 ["Vestidos de novia","https://www.bodas.net/bodas/novias/talleres-de-novia","Ateliers, vestidos y pruebas"],
 ["Complementos","https://www.bodas.net/bodas/novias/complementos-novia","Accesorios y tiendas"],
 ["Ideas e inspiración","https://www.bodas.net/articulos","Consejos y tendencias"],
 ["Web de boda y RSVP público","https://www.bodas.net/web-boda","Página para invitados y confirmación online"],
 ["Comunidad","https://comunidad.bodas.net/","Debates y experiencias"],
 ["Sorteos de Bodas.net","https://www.bodas.net/sorteo","Condiciones y participación en su web"]
];
const ext=(url,label)=>'<a href="'+url+'" rel="noopener noreferrer" target="_blank">'+label+' ↗</a>';
const euros=c=>c==null?"—":new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(c/100);
const RSVP=[["pendiente","Pendiente"],["confirmado","Confirmado"],["rechazado","No asiste"]];
const MENUS=[["","Sin asignar"],["adulto","Adulto"],["infantil","Infantil"],["vegetariano","Vegetariano"],["vegano","Vegano"],["otro","Otro"]];
const SHAPES=[["redonda","Redonda"],["rectangular","Rectangular"],["presidencial","Presidencial"]];
const option=(options,value,esc)=>options.map(([id,label])=>'<option value="'+esc(id)+'" '+(id===value?"selected":"")+'>'+esc(label)+'</option>').join("");
const pick=(array,key)=>array.find(x=>x[0]===key)?.[1]||key;
export function weddingTaskItems(items){
 return items.filter(x=>x.category==="tareas"&&x.status!=="descartado")
  .sort((a,b)=>(a.status==="hecho")-(b.status==="hecho")||(a.dueDate||"9999").localeCompare(b.dueDate||"9999"));
}
export function weddingProviderItems(items){
 return items.filter(x=>x.category!=="tareas"&&x.category!=="invitados"&&(x.provider||x.category==="finca"||x.category==="catering"||x.category==="fotografia"||x.category==="musica")&&x.status!=="descartado");
}
export function renderAgenda(items,esc){
 const tasks=weddingTaskItems(items),done=tasks.filter(x=>x.status==="hecho").length;
 const progress=tasks.length?Math.round(done*100/tasks.length):0;
 return '<section class="wed-planner-panel"><div class="wed-planner-heading"><div><h3>Agenda y tareas</h3><small>'+done+' de '+tasks.length+' completadas · '+progress+'%</small></div>'+
 '<button class="wed-primary" type="button" data-wed-add-task>+ Nueva tarea</button></div>'+
 '<progress class="wed-task-progress" max="100" value="'+progress+'">'+progress+'%</progress>'+
 (tasks.length?'<div class="wed-task-list">'+tasks.map(t=>
  '<article class="wed-task-row"><button type="button" class="wed-task-check" data-wed-task-toggle="'+esc(t.id)+'" aria-label="'+(t.status==="hecho"?"Reabrir":"Completar")+' '+esc(t.title)+'" aria-pressed="'+(t.status==="hecho")+'">'+(t.status==="hecho"?"✓":"○")+'</button>'+
  '<div><strong class="'+(t.status==="hecho"?"wed-done":"")+'">'+esc(t.title)+'</strong>'+
  '<small>'+'Responsable: '+esc(weddingAssigneeLabel(t))+(t.dueDate?' · Vence: '+esc(t.dueDate):"")+(t.description?' · '+esc(t.description):"")+'</small></div>'+
  '<button type="button" data-wed-edit="'+esc(t.id)+'">Editar</button></article>').join("")+'</div>':
  '<div class="wed-planner-empty">Todavía no habéis registrado tareas. Podéis empezar con las próximas gestiones de la boda.</div>')+
 '<p class="wed-planner-foot">La agenda comparte las mismas tarjetas de tipo «Tareas» del Kanban, sin duplicaciones.</p></section>';
}
export function renderProviders(items,esc){
 const providers=weddingProviderItems(items);
 const header='<div class="wed-planner-heading"><div><h3>Proveedores y comparativa</h3><small>Vuestras opciones privadas con referencia a fichas originales</small></div>'+
 '<button type="button" class="wed-primary" data-wed-new-provider>+ Añadir proveedor</button></div>';
 return '<section class="wed-planner-panel">'+header+
 '<div class="wed-provider-directory">'+BODAS_LINKS.slice(1,5).map(([name,url])=>'<span>'+ext(url,esc(name))+'</span>').join("")+'</div>'+
 (providers.length?'<div class="wed-provider-scroll"><table class="wed-provider-table"><thead><tr><th>Proveedor / categoría</th><th>Estado</th><th>Estimado</th><th>Contratado</th><th>Pagado</th><th>Ficha</th><th></th></tr></thead><tbody>'+
 providers.map(p=>'<tr><td><strong>'+esc(p.provider||p.title)+'</strong><small>'+esc(p.title)+' · '+esc(p.category)+'</small></td><td>'+esc(p.status)+'</td>'+
 '<td>'+euros(p.estimateCents)+'</td><td>'+euros(p.contractedCents)+'</td><td>'+euros(p.paidCents)+'</td>'+
 '<td>'+(p.url?'<a target="_blank" rel="noopener noreferrer" href="'+esc(p.url)+'">Abrir ↗</a>':'Sin enlace')+'</td>'+
 '<td><button type="button" data-wed-edit="'+esc(p.id)+'">Editar</button></td></tr>').join("")+'</tbody></table></div>':
 '<div class="wed-planner-empty">No hay proveedores guardados todavía. Consultad Bodas.net y pegad el enlace de cada ficha en una tarjeta de Segundo Cerebro.</div>')+
 '<p class="wed-planner-foot">Las opiniones, fotografías, disponibilidad y precios publicados corresponden a Bodas.net; no se copian ni actualizan automáticamente.</p></section>';
}

export const WEDDING_GUEST_GROUPS=[
 ["pareja","Invitados Andrea y Miguel"],
 ["padres_miguel","Invitados padres Miguel"],
 ["padres_andrea","Invitados padres Andrea"],
 ["opcionales","Invitados opcionales"]
];
export function guestGroupId(groupName){
 return WEDDING_GUEST_GROUPS.some(([id])=>id===groupName)?groupName:null;
}
function guestForm(item,tables,esc){
 const current=item||{},editing=!!item;
 const legacy=current.groupName&&!guestGroupId(current.groupName)?
  '<option value="'+esc(current.groupName)+'" selected>Sin clasificar · '+esc(current.groupName)+'</option>':"";
 return '<form class="wed-guest-form wed-guest-detail" id="wed-guest-form"><div class="wed-guest-detail-heading"><h4>'+(editing?"Ficha de invitado":"Añadir invitado")+'</h4>'+
 '<button type="button" data-wed-cancel-guest aria-label="Cerrar ficha de invitado">✕ Cerrar</button></div>'+
 '<div class="wed-planner-fields">'+
 '<label>Nombre *<input name="name" required maxlength="180" value="'+esc(current.name||"")+'"></label>'+
 '<label>Lista<select name="groupName" required>'+legacy+
 WEDDING_GUEST_GROUPS.map(([id,name])=>'<option value="'+id+'" '+(current.groupName===id?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label>'+
 '<label>Asistencia<select name="rsvp">'+option(RSVP,current.rsvp||"pendiente",esc)+'</select></label>'+
 '<label>Menú<select name="menu">'+option(MENUS,current.menu||"",esc)+'</select></label>'+
 '<label>Mesa<select name="tableId"><option value="">Sin asignar</option>'+tables.map(t=>'<option value="'+esc(t.id)+'" '+(current.tableId===t.id?"selected":"")+'>'+esc(t.name)+' · '+t.seated+'/'+t.capacity+'</option>').join("")+'</select></label>'+
 '<label>Email<input name="email" type="email" maxlength="254" value="'+esc(current.email||"")+'"></label>'+
 '<label>Teléfono<input name="phone" type="tel" maxlength="40" value="'+esc(current.phone||"")+'"></label>'+
 '<label class="wide">Alergias o necesidades alimentarias<textarea name="dietaryNotes" maxlength="500" rows="2">'+esc(current.dietaryNotes||"")+'</textarea></label>'+
 '<label class="wide">Notas<textarea name="notes" maxlength="1000" rows="2">'+esc(current.notes||"")+'</textarea></label></div>'+
 '<div class="wed-planner-form-actions"><button type="submit" class="wed-primary">Guardar cambios</button>'+
 (editing?'<button type="button" data-wed-delete-guest="'+esc(current.id)+'">Eliminar invitado</button>':"")+'</div></form>';
}
function compactGuestRow(guest,esc){
 const info=guest.rsvp==="confirmado"?"Confirmado":guest.rsvp==="rechazado"?"No asiste":"";
 return '<li class="wed-guest-name-row"><button type="button" data-wed-edit-guest="'+esc(guest.id)+'" aria-label="Abrir ficha de '+esc(guest.name)+'">'+
 '<span class="wed-guest-name">'+esc(guest.name)+'</span>'+
 (info?'<span class="wed-guest-rsvp" data-rsvp="'+esc(guest.rsvp)+'">'+info+'</span>':"")+
 '<span class="wed-guest-chevron" aria-hidden="true">›</span></button></li>';
}
export function renderGuests(guests,tables,editing,esc){
 const accepted=guests.filter(g=>g.rsvp==="confirmado").length;
 const optional=guests.filter(g=>g.groupName==="opcionales").length;
 const legacy=guests.filter(g=>!guestGroupId(g.groupName));
 const current=editing&&editing!=="new"?guests.find(g=>g.id===editing):null;
 return '<section class="wed-planner-panel wed-guest-board"><div class="wed-planner-heading"><div>'+
 '<h3>Lista de invitados</h3><small>'+guests.length+' nombres · '+optional+' opcionales · '+accepted+' confirmados · pulsa un nombre para completar sus datos</small></div></div>'+
 (editing?guestForm(current,tables,esc):"")+
 '<div class="wed-guest-columns">'+WEDDING_GUEST_GROUPS.map(([id,title])=>{
  const people=guests.filter(g=>g.groupName===id);
  return '<section class="wed-guest-column" aria-label="'+esc(title)+'"><div class="wed-guest-column-head"><h4>'+esc(title)+'</h4>'+
  '<span>'+people.length+'</span></div>'+
  '<form class="wed-guest-quick-add" data-wed-quick-add="'+id+'"><label class="wed-sr-only" for="wed-guest-input-'+id+'">Nombre para '+esc(title)+'</label>'+
  '<input id="wed-guest-input-'+id+'" name="name" maxlength="180" autocomplete="off" required placeholder="Escribe un nombre…" aria-label="Nombre para '+esc(title)+'">'+
  '<button type="submit" aria-label="Añadir a '+esc(title)+'">+ Añadir</button></form>'+
  '<ul class="wed-guest-names">'+(people.length?people.map(g=>compactGuestRow(g,esc)).join(""):
   '<li class="wed-guest-blank">Todavía no hay nombres</li>')+'</ul></section>';
 }).join("")+'</div>'+
 (legacy.length?'<div class="wed-guest-unclassified"><div><strong>'+legacy.length+' sin clasificar</strong>'+
 '<small>Ya estaban guardados con otros grupos. Pulsa cada nombre para elegir una de las cuatro listas, sin perder información.</small></div>'+
 '<ul class="wed-guest-names">'+legacy.map(g=>compactGuestRow(g,esc)).join("")+'</ul></div>':"")+
 '<p class="wed-planner-foot">Añade un nombre con «Añadir» o Intro. La lista de opcionales sirve para personas todavía por decidir; puedes moverlas a otra lista desde su ficha. Esta información es privada.</p></section>';
}
function seatDiagram(capacity,occupied=0,shape="redonda",small=false){
 const total=Math.max(0,Math.min(30,Number(capacity)||0));
 const count=Math.min(total,30);
 return '<div class="wed-seat-diagram'+(small?' wed-seat-diagram-mini':'')+'" role="img" '+
 'aria-label="'+(shape==="presidencial"?"Mesa presidencial":shape==="rectangular"?"Mesa rectangular":"Mesa redonda")+
 ' de '+total+' plazas, '+occupied+' ocupadas">'+
 '<div class="wed-seat-center wed-seat-'+(shape==="presidencial"?"presidencial":shape==="rectangular"?"rectangular":"redonda")+'">'+
 '<strong>'+total+'</strong><small>plazas</small></div>'+
 roundSeats(count,occupied).map(seat=>'<span class="wed-seat-dot'+(seat.occupied?' is-occupied':'')+
 '" style="left:'+seat.x.toFixed(2)+'%;top:'+seat.y.toFixed(2)+'%" aria-hidden="true"></span>').join("")+'</div>';
}
function tableForm(item,esc){
 const t=item||{};
 return '<form id="wed-table-form" class="wed-guest-form wed-table-form" data-wed-table-new="'+(!item)+'"><h4>'+(item?"Editar mesa":"Nueva mesa")+'</h4>'+
 '<div class="wed-planner-fields">'+
 '<label>Nombre *<input name="name" maxlength="180" required placeholder="Mesa 1" value="'+esc(t.name||"")+'"></label>'+
 '<label>Formato<select name="shape">'+option(SHAPES,t.shape||"redonda",esc)+'</select></label>'+
 '<label>Capacidad (1–30)<input name="capacity" id="wed-table-capacity" type="number" min="1" max="30" step="1" required value="'+(t.capacity||(t.shape==="presidencial"?6:12))+'"></label></div>'+
 '<div class="wed-capacity-preset"><span>Plazas habituales</span><div>'+
 ROUND_CAPACITIES.map(n=>'<button type="button" data-wed-capacity="'+n+'" aria-pressed="'+((t.capacity||(t.shape==="presidencial"?6:12))===n)+'">'+n+'</button>').join("")+
 '</div><small>Puedes escribir cualquier otra capacidad de 1 a 30.</small></div>'+
 '<div class="wed-planner-form-actions"><button class="wed-primary" type="submit">Guardar mesa</button><button type="button" data-wed-cancel-table>Cancelar</button>'+
 (item?'<button type="button" data-wed-delete-table="'+esc(item.id)+'">Eliminar</button>':"")+'</div></form>';
}
// Stable, illustrative order; persisted assignment is the table ID, not a seat number.
// One circular tabletop with a uniform radial crown of clickable circular seats.
// This is a view only; seatIndex in D1 remains the canonical chair identity.
// Each chair belongs to a dedicated, non-intercepting orbit positioned
// relative to the table footprint, independent of generic button layout/CSS.
// Canonical seatIndex determines the chair identity; existing assignments stay intact.
function namedSeatDiagram(table,occupants,esc){
 const total=Math.max(1,Math.min(30,Number(table.capacity)||12));
 const byName=[...occupants].sort((a,b)=>a.name.localeCompare(b.name,"es")||String(a.id).localeCompare(String(b.id)));
 const occupantsBySeat=Array(total).fill(null),unplaced=[];
 for(const guest of byName){
  const i=guest.seatIndex;
  if(Number.isInteger(i)&&i>=0&&i<total&&!occupantsBySeat[i])occupantsBySeat[i]=guest;
  else unplaced.push(guest);
 }
 for(const guest of unplaced){
  const next=occupantsBySeat.indexOf(null);
  if(next!==-1)occupantsBySeat[next]=guest;
 }
 const shortName=name=>{
  const parts=name.trim().split(/\s+/);
  return parts.length>1?parts[0]+" "+parts[parts.length-1].slice(0,1)+".":parts[0];
 };
 const diameter=total<=12?38:total<=18?30:total<=24?24:20;
 const orbitRadius=104; // All six presidential chairs are placed on one concentric 268px footprint.
 const angleStep=2*Math.PI/total;
 const circles=Array.from({length:total},(_,index)=>{
  const guest=occupantsBySeat[index];
  const angle=-Math.PI/2+index*angleStep;
  const left=(134+orbitRadius*Math.cos(angle)).toFixed(2);
  const top=(134+orbitRadius*Math.sin(angle)).toFixed(2);
  // Inline pixel geometry prevents legacy percent-based positioning and global
  // styles from moving assigned seats outside their own tabletop.
  const position='position:absolute!important;left:'+left+'px!important;top:'+top+
   'px!important;transform:translate(-50%,-50%)!important;'+
   'width:'+diameter+'px!important;height:'+diameter+'px!important;'+
   'display:flex!important;border-radius:50%!important;pointer-events:auto';
  if(!guest)return '<button type="button" class="wed-named-seat is-empty" data-wed-seat-add="'+esc(table.id)+'" '+
   'data-wed-seat-index="'+index+'" style="'+position+'" title="Plaza '+(index+1)+' libre · Añadir invitado" '+
   'aria-label="Añadir invitado en plaza '+(index+1)+' de '+esc(table.name)+'">'+
   '<span class="wed-seat-avatar" aria-hidden="true">+</span><span class="wed-seat-name" aria-hidden="true">Libre</span></button>';
  return '<button type="button" class="wed-named-seat is-filled" data-wed-seat-detail="'+esc(guest.id)+
   '" data-wed-seat-index="'+index+'" style="'+position+'" title="'+esc(guest.name)+'" aria-label="Editar '+esc(guest.name)+'">'+
   '<span class="wed-seat-avatar" aria-hidden="true">'+esc(guest.name.trim().slice(0,1).toLocaleUpperCase("es"))+'</span>'+
   '<span class="wed-seat-name" aria-hidden="true">'+esc(shortName(guest.name))+'</span></button>';
 }).join("");
 return '<div class="wed-named-table" role="group" style="position:relative!important;width:268px!important;height:268px!important;overflow:visible!important" aria-label="'+esc(table.name)+
 ': '+byName.length+' de '+total+' plazas ocupadas">'+
 '<button type="button" class="wed-named-table-center" data-wed-edit-table="'+esc(table.id)+
 '" aria-label="Editar '+esc(table.name)+'" title="Editar '+esc(table.name)+'">'+
 '<strong>'+esc(table.name)+'</strong><small>'+byName.length+'/'+total+' plazas</small></button>'+
 '<div class="wed-floor-seat-ring" data-wed-seat-ring-version="3" role="group" aria-label="Plazas de '+esc(table.name)+'" '+
 'style="position:absolute!important;left:0!important;top:0!important;width:268px!important;height:268px!important;overflow:visible!important;pointer-events:none">'+
 circles+'</div></div>';
}
function tableGuestPicker(table,guests,esc,chosenSeatIndex=null){
 const available=guests.filter(g=>!g.tableId&&g.rsvp!=="rechazado")
  .sort((a,b)=>a.name.localeCompare(b.name,"es"));
 const full=guests.filter(g=>g.tableId===table.id).length>=table.capacity;
 return '<section class="wed-table-picker" data-wed-table-picker="'+esc(table.id)+'" aria-label="Añadir personas a '+esc(table.name)+'">'+
 '<h5>Añadir personas a '+esc(table.name)+
 (Number.isInteger(chosenSeatIndex)?' · Plaza '+(chosenSeatIndex+1):'')+'</h5>'+
 '<form data-wed-place-existing="'+esc(table.id)+'" class="wed-table-picker-form">'+
 '<label>Selecciona un invitado de vuestras listas'+
 '<select name="guestId" required '+(!available.length||full?'disabled':'')+'>'+
 '<option value="">Elige un nombre…</option>'+available.map(g=>
 '<option value="'+esc(g.id)+'">'+esc(g.name)+' · '+esc(WEDDING_GUEST_GROUPS.find(([key])=>key===g.groupName)?.[1]||g.groupName||"Sin clasificar")+'</option>').join("")+
 '</select></label>'+
 '<button type="submit" class="wed-primary" '+(!available.length||full?'disabled':'')+'>Sentar en esta mesa</button></form>'+
 (!available.length?'<p>Los invitados ya están asignados o aún no hay nombres disponibles.</p>':'')+
 '<form data-wed-add-table-guest="'+esc(table.id)+'" class="wed-table-picker-form">'+
 '<label>O añade una persona nueva<input name="name" maxlength="180" required placeholder="Nombre del invitado" '+(full?'disabled':'')+'></label>'+
 '<label>Lista<select name="groupName" '+(full?'disabled':'')+'>'+WEDDING_GUEST_GROUPS.map(([key,label])=>
 '<option value="'+key+'">'+esc(label)+'</option>').join("")+'</select></label>'+
 '<button type="submit" class="wed-primary" '+(full?'disabled':'')+'>Crear y sentar</button></form>'+
 '<small>Los invitados nuevos quedan con asistencia «Pendiente». Podréis confirmarlos después en su ficha.</small>'+
 (full?'<p class="wed-seat-full">Mesa completa. Amplía su capacidad o libera una plaza.</p>':"")+
 '</section>';
}
function metric(label,value){
 return '<div class="wed-seating-metric"><strong>'+value+'</strong><span>'+label+'</span></div>';
}
function layoutPreview(option,index){
 const cap=option.capacity,rounds=option.rounds;
 const diagramCount=Math.min(rounds,12);
 return '<article class="wed-seating-option">'+
 '<header><strong>Opción '+(index+1)+'</strong><span>Redondas de '+cap+'</span></header>'+
 '<div class="wed-seating-option-visual">'+
 (option.presidential?'<div class="wed-seating-mini-unit">'+seatDiagram(option.presidentSeats,0,"presidencial",true)+'<small>Presidencial</small></div>':"")+
 Array.from({length:diagramCount},()=>'<div class="wed-seating-mini-unit">'+seatDiagram(cap,0,"redonda",true)+'</div>').join("")+
 (rounds>diagramCount?'<strong class="wed-extra-tables">+'+(rounds-diagramCount)+' mesas</strong>':"")+'</div>'+
 '<div class="wed-seating-option-meta"><strong>'+option.tableCount+' mesas</strong>'+
 '<span>'+option.seats+' plazas</span><span>'+option.free+' libres</span></div>'+
 '<p>Configuración orientativa para '+option.confirmed+' confirmados; no asigna ni modifica mesas.</p></article>';
}
// Legacy broken drag sessions could save (0,0), leaving the entire card
// outside the visible floor. Treat unusable edge coordinates as not placed.
// Valid user positions remain unchanged; merely rendering never writes to D1.
export function tableFloorPosition(table,index,count){
 const columns=Math.min(4,Math.max(1,count));
 const rows=Math.ceil(count/columns);
 const fallbackX=100*((index%columns)+0.5)/columns;
 const fallbackY=100*(Math.floor(index/columns)+0.5)/rows;
 const x=table.positionX,y=table.positionY;
 // A legacy client may have saved a wrong center and still returned success.
 // positionVerified=false is set for all pre-migration tables. Only an explicit
 // drag or Center action in the fixed client upgrades that layout record.
 const valid=table.positionVerified!==false&&
  typeof x==="number"&&Number.isFinite(x)&&
  typeof y==="number"&&Number.isFinite(y)&&x>2&&x<98&&y>2&&y<98;
 return valid?{x,y}:{x:fallbackX,y:fallbackY};
}
export function renderTables(guests,tables,editing,esc,selectedId=null,chosenSeatIndex=null,floorExpanded=false){
 const summary=seatingSummary(guests,tables);
 const options=suggestWeddingSeating(guests,tables);
 const selected=tables.find(t=>t.id===selectedId)||tables[0]||null;
 const selectedGuests=selected?guests.filter(g=>g.tableId===selected.id):[];
 const columns=Math.min(4,Math.max(1,tables.length));
 const rows=Math.max(1,Math.ceil(tables.length/columns));
 const height=rows*360;
 return '<section class="wed-planner-panel wed-seating-workspace">'+
 '<div class="wed-planner-heading"><div><h3>Organizador de mesas</h3>'+
 '<small>'+summary.seated+'/'+summary.confirmed+' confirmados ubicados · '+summary.tables+' mesas creadas</small></div>'+
 '</div>'+
 '<div class="wed-seating-summary" aria-label="Resumen de distribución">'+
 metric("Confirmados",summary.confirmed)+metric("Sin mesa",summary.unseated.length)+
 metric("Plazas creadas",summary.seats)+metric("Plazas libres",summary.free)+
 metric("Pendientes",summary.pending)+metric("Opcionales",summary.optional)+'</div>'+
 (editing?tableForm(editing==="new"?null:tables.find(t=>t.id===editing),esc):"")+
 '<section class="wed-seating-block wed-floor-section">'+
 '<div class="wed-floor-shell'+(floorExpanded?' is-expanded':'')+'" data-wed-floor-shell>'+
 '<div class="wed-seating-block-title wed-floor-heading"><div class="wed-floor-title">'+
 '<h4 id="wed-floor-title">Plano de mesas</h4>'+
 '<small>Pulsa una plaza o una persona para editar · Arrastra desde «Mover»</small></div>'+
 '<div class="wed-floor-actions">'+
 (selected?'<button class="wed-floor-reset" type="button" data-wed-center-table="'+esc(selected.id)+'" title="Dejar la mesa seleccionada en el centro">Centrar mesa</button>':'')+
 '<button type="button" class="wed-floor-icon" data-wed-new-table title="Nueva mesa" aria-label="Nueva mesa">+</button>'+
 '<button type="button" class="wed-floor-icon" data-wed-floor-expand aria-expanded="'+(floorExpanded?'true':'false')+
 '" title="'+(floorExpanded?'Cerrar pantalla completa':'Ver plano a pantalla completa')+
 '" aria-label="'+(floorExpanded?'Cerrar pantalla completa':'Ampliar plano a pantalla completa')+
 '">'+(floorExpanded?'×':'⛶')+'</button></div></div>'+
 (tables.length?'<div class="wed-floor-scroll" tabindex="0" style="display:block;height:'+height+'px;min-height:'+height+'px" aria-label="Plano de mesas; desplázate horizontalmente si es necesario">'+
 '<div class="wed-floor-plan" data-wed-floor-plan data-wed-table-count="'+tables.length+'" style="display:grid;--wed-floor-columns:'+columns+';height:'+height+'px;min-height:'+height+'px">'+
 tables.map((t,index)=>{
  const occupants=guests.filter(g=>g.tableId===t.id);
  const pos=tableFloorPosition(t,index,tables.length);
  return '<article class="wed-floor-table'+(selected?.id===t.id?' is-selected':'')+
   '" data-wed-floor-table="'+esc(t.id)+'" data-wed-position-x="'+pos.x.toFixed(3)+'" data-wed-position-y="'+pos.y.toFixed(3)+'" tabindex="0" style="position:relative;left:auto;top:auto;transform:none" '+
   'aria-label="'+esc(t.name)+': '+occupants.length+' de '+t.capacity+' plazas. Pulsa para seleccionar; arrastra para mover">'+
   '<button type="button" class="wed-floor-grip" data-wed-floor-grip aria-label="Arrastrar '+esc(t.name)+'" title="Mantén pulsado y arrastra para mover">⠿ Mover</button>'+
   namedSeatDiagram(t,occupants,esc)+
   '</article>';
 }).join("")+'</div></div>'+
 '<p class="wed-planner-foot">La distribución y los asientos se guardan de forma privada. Pulsa una silla libre para asignar un invitado.</p>':
 '<p class="wed-planner-empty">Todavía no hay mesas. Pulsa + para crear la primera.</p>')+
 '</div>'+
 (selected?'<article class="wed-seating-card wed-seating-details" data-wed-selected-details="'+esc(selected.id)+'">'+
 '<div class="wed-seating-head"><strong>'+esc(selected.name)+'</strong>'+
 '<span>'+esc(pick(SHAPES,selected.shape))+' · '+selectedGuests.length+'/'+selected.capacity+'</span>'+
 '<button type="button" data-wed-toggle-table-picker="'+esc(selected.id)+'" aria-expanded="false">+ Añadir invitados</button>'+
 '<button type="button" data-wed-center-table="'+esc(selected.id)+'" title="Guardar la mesa en el centro del plano">Centrar mesa</button>'+
 '<button type="button" data-wed-edit-table="'+esc(selected.id)+'">Editar mesa</button></div>'+
 '<div class="wed-seat-caption">'+selectedGuests.filter(g=>g.rsvp==="confirmado"&&g.groupName!=="opcionales").length+
 ' confirmados · '+Math.max(0,selected.capacity-selectedGuests.length)+' libres</div>'+
 tableGuestPicker(selected,guests,esc,chosenSeatIndex)+
 '<div class="wed-seating-guests">'+(selectedGuests.length?selectedGuests.map(g=>
 '<div class="wed-seated-guest"><button type="button" data-wed-seat-detail="'+esc(g.id)+'">'+esc(g.name)+'</button>'+
 '<button type="button" data-wed-unseat-guest="'+esc(g.id)+'" title="Quitar de esta mesa">Quitar</button></div>').join(""):
 '<small>No hay personas sentadas. Pulsa «+ Añadir invitados».</small>')+'</div></article>':"")+'</section>'+
 '<section class="wed-seating-block"><div class="wed-seating-block-title"><h4>Confirmados sin mesa</h4>'+
 '<small>'+summary.unseated.length+' personas pendientes de ubicar</small></div>'+
 (summary.unseated.length?'<div class="wed-unseated-list">'+summary.unseated.map(g=>
 '<button type="button" data-wed-seat-guest="'+esc(g.id)+'">'+esc(g.name)+' <span>Asignar mesa ›</span></button>').join("")+'</div>':
 '<p class="wed-planner-empty">No hay invitados confirmados sin mesa.</p>')+'</section>'+
 '<section class="wed-seating-block"><div class="wed-seating-block-title"><h4>Distribuciones sugeridas</h4>'+
 '<small>Simulaciones con mesas de 6, 8, 10 o 12 plazas</small></div>'+
 (options.length?'<div class="wed-seating-options">'+options.map(layoutPreview).join("")+'</div>':
 '<p class="wed-planner-empty">En cuanto marquéis invitados como confirmados, aparecerán alternativas de distribución.</p>')+
 '<p class="wed-planner-foot">Estas propuestas son orientativas: no crean ni mueven mesas, no asignan invitados ni modifican la información guardada.</p></section>'+
 '</section>';
}
export function renderBodasDirectory(esc){
 return '<section class="wed-planner-panel"><h3>Recursos oficiales de Bodas.net</h3><p>La planificación se guarda en Segundo Cerebro; el directorio, las opiniones y los servicios de terceros se consultan en su plataforma original.</p>'+
 '<div class="wed-external-grid">'+BODAS_LINKS.map(([name,url,desc])=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer" class="wed-external-card"><strong>'+esc(name)+' ↗</strong><small>'+esc(desc)+'</small></a>').join("")+'</div>'+
 '<p class="wed-planner-foot">Sin API oficial conectada, no podemos importar chats, favoritos, confirmaciones ni datos de Bodas.net. Sus sorteos y beneficios se gestionan exclusivamente allí.</p></section>';
}
