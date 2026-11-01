// Wedding planner native tools and explicit outbound Bodas.net references.
import {weddingAssigneeLabel} from "./wedding-assignees.js?v=0.1.0";
import {seatingSummary,suggestWeddingSeating,roundSeats,ROUND_CAPACITIES} from "./wedding-seating.js?v=0.1.1";
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
// All geometry is generated inside ONE SVG. Each name is immediately adjacent
// to the corresponding numbered chair, joined by a line in the same viewBox.
// Table-to-table separation is guaranteed by a grid cell >= the SVG footprint.
function weddingSeatLayout(table,occupants){
 const capacity=Math.max(1,Math.min(30,Number(table.capacity)||12));
 const ordered=[...occupants].sort((a,b)=>a.name.localeCompare(b.name,"es")||String(a.id).localeCompare(String(b.id)));
 const seats=Array(capacity).fill(null),unplaced=[];
 for(const guest of ordered){
  const index=guest.seatIndex;
  if(Number.isInteger(index)&&index>=0&&index<capacity&&!seats[index])seats[index]=guest;
  else unplaced.push(guest);
 }
 for(const guest of unplaced){const index=seats.indexOf(null);if(index>=0)seats[index]=guest;}
 const wrapName=name=>{
  const words=String(name||"").trim().split(/\s+/).filter(Boolean);
  const rows=[];let row="";
  for(const word of words){
   if(row&&row.length+1+word.length>24){rows.push(row);row="";}
   row=row?row+" "+word:word;
   // Very long unbroken names must stay inside the 165px label.
   while(row.length>24){rows.push(row.slice(0,24));row=row.slice(24);}
  }
  if(row)rows.push(row);
  return rows.length?rows:[""];
 };
 const positions=seats.map((guest,index)=>{
  const angle=-Math.PI/2+2*Math.PI*index/capacity;
  const x=320+103*Math.cos(angle), y=103*Math.sin(angle);
  // Alternate exact top/bottom chairs for a balanced left/right distribution.
  const side=Math.cos(angle)<-1e-8?"left":Math.cos(angle)>1e-8?"right":(index%2?"left":"right");
  const lines=guest?wrapName(guest.name):[];
  const labelHeight=Math.max(28,lines.length*11+9);
  return {guest,index,x,y,side,lines,labelHeight};
 });
 const sides={
  left:positions.filter(p=>p.guest&&p.side==="left").sort((a,b)=>a.y-b.y),
  right:positions.filter(p=>p.guest&&p.side==="right").sort((a,b)=>a.y-b.y)
 };
 const sideHeight=list=>list.reduce((sum,p)=>sum+p.labelHeight,0)+Math.max(0,list.length-1)*5;
 const height=Math.max(330,Math.ceil(Math.max(sideHeight(sides.left),sideHeight(sides.right))+44));
 return {capacity,ordered,seats,positions,sides,height,centerY:height/2};
}
export function namedSeatDiagram(table,occupants,esc){
 const layout=weddingSeatLayout(table,occupants);
 const {capacity,ordered,positions,sides,height,centerY}=layout;
 const radius=capacity<=12?18:capacity<=18?15:capacity<=24?12:10;
 const centerName=String(table.name||"Mesa").trim();
 const nameParts=centerName.split(/\s+/);
 const first=nameParts.length===1?centerName:nameParts.slice(0,Math.ceil(nameParts.length/2)).join(" ");
 const second=nameParts.length===1?"":nameParts.slice(Math.ceil(nameParts.length/2)).join(" ");
 const cx=320,cy=centerY;
 const surface=table.shape==="rectangular"?
  '<rect x="'+(cx-69)+'" y="'+(cy-48)+'" width="138" height="96" rx="15" fill="#0c1c31" stroke="#59a7fc" stroke-width="2.5"/>':
  '<circle cx="'+cx+'" cy="'+cy+'" r="66" fill="#0c1c31" stroke="#59a7fc" stroke-width="2.5"/>';
 const tabletop='<g class="wed-svg-table" role="button" tabindex="0" data-wed-edit-table="'+esc(table.id)+
  '" aria-label="Editar '+esc(table.name)+'"><title>Editar '+esc(table.name)+'</title>'+
  surface+
  '<text class="wed-svg-table-label" x="'+cx+'" y="'+(cy-(second?7:1))+'" text-anchor="middle">'+esc(first.slice(0,23))+'</text>'+
  (second?'<text class="wed-svg-table-label" x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle">'+esc(second.slice(0,23))+'</text>':"")+
  '<text class="wed-svg-table-capacity" x="'+cx+'" y="'+(cy+(second?26:18))+'" text-anchor="middle">'+
  ordered.length+'/'+capacity+' plazas</text></g>';
 const chairMarkup=positions.map(p=>{
  const guest=p.guest;
  const x=p.x.toFixed(2),y=(cy+p.y).toFixed(2);
  const action=guest?'data-wed-seat-detail="'+esc(guest.id)+'"':
   'data-wed-seat-add="'+esc(table.id)+'" data-wed-seat-index="'+p.index+'"';
  const name=guest?guest.name:"Plaza "+(p.index+1)+" libre";
  return '<g class="wed-svg-chair '+(guest?'is-filled':'is-empty')+
   '" role="button" tabindex="0" '+action+' aria-label="'+esc(guest?"Editar "+name:"Añadir invitado en plaza "+(p.index+1)+" de "+table.name)+'">'+
   '<title>'+esc(name)+'</title><circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="'+
   (guest?'#59a7fc':'#0b1727')+'" stroke="#59a7fc" stroke-width="2"/>'+
   '<text x="'+x+'" y="'+y+'" dy="0.34em" text-anchor="middle" fill="'+
   (guest?'#ffffff':'#59a7fc')+'" font-size="'+(capacity>18?10:13)+
   '" font-weight="800">'+esc(guest?String(p.index+1):"+")+'</text></g>';
 }).join("");
 const paths=[],labels=[];
 // First clear the 103px chair orbit radially, then use one protected
 // left/right corridor. Direct diagonal lines are forbidden: they could
 // cut across other chairs when the name columns have different y positions.
 const radialDistance=150;
 const corridorX={left:183,right:457};
 const outerEdge={left:172,right:468};
 const nearSideX={left:8,right:468};
 const rounded=n=>Number(n.toFixed(2)).toString();
 for(const side of ["left","right"]){
  const list=sides[side];
  // Keep labels as close as possible to their own chair. Respect their real
  // line-wrapped height and a five-pixel gap instead of re-centering the list.
  const gap=5;
  const allocated=list.map(p=>{
   const ideal=cy+p.y-p.labelHeight/2;
   return {p,top:ideal};
  });
  for(let i=0;i<allocated.length;i++){
   const previous=allocated[i-1];
   if(previous)allocated[i].top=Math.max(allocated[i].top,previous.top+previous.p.labelHeight+gap);
  }
  if(allocated.length){
   const last=allocated[allocated.length-1];
   const excess=Math.max(0,last.top+last.p.labelHeight-(height-12));
   for(const item of allocated)item.top-=excess;
   if(allocated[0].top<12){
    const shift=12-allocated[0].top;
    for(const item of allocated)item.top+=shift;
   }
  }
  for(const {p,top} of allocated){
   const boxX=nearSideX[side],edge=outerEdge[side];
   const middle=top+p.labelHeight/2;
   const theta=-Math.PI/2+2*Math.PI*p.index/capacity;
   const cos=Math.cos(theta),sin=Math.sin(theta);
   const sourceX=320+(103+radius+3)*cos;
   const sourceY=cy+(103+radius+3)*sin;
   const outwardX=320+radialDistance*cos;
   const outwardY=cy+radialDistance*sin;
   const protectedX=corridorX[side];
   // The radial segment never enters any other chair, and the outer
   // corridor stays >=14px beyond all chair edges even for 12 seats.
   const route=[
    [sourceX,sourceY],
    [outwardX,outwardY],
    [protectedX,outwardY],
    [protectedX,middle],
    [edge,middle]
   ].map(([x,y])=>rounded(x)+' '+rounded(y)).join(' L');
   paths.push('<path class="wed-seat-association-line" data-wed-line-seat="'+p.index+
    '" d="M'+route+'"/>');
   labels.push('<g class="wed-seat-attached-name" role="button" tabindex="0" data-wed-seat-detail="'+
    esc(p.guest.id)+'" aria-label="Plaza '+(p.index+1)+': '+esc(p.guest.name)+'">'+
    '<title>'+esc(p.guest.name)+'</title><rect x="'+boxX+'" y="'+rounded(top)+
    '" width="164" height="'+p.labelHeight+'" rx="7"/>'+
    '<circle class="wed-seat-attached-number" cx="'+(boxX+13)+'" cy="'+rounded(middle)+'" r="9"/>'+
    '<text class="wed-seat-attached-index" x="'+(boxX+13)+'" y="'+rounded(middle+3)+
    '" text-anchor="middle">'+(p.index+1)+'</text>'+
    p.lines.map((line,i)=>'<text class="wed-seat-attached-text" x="'+(boxX+27)+
      '" y="'+rounded(top+(p.labelHeight-p.lines.length*11)/2+9+i*11)+'">'+esc(line)+'</text>').join("")+
    '</g>');
  }
 }
 return '<div class="wed-svg-table-wrap" data-wed-table-diagram-version="8" role="group" '+
  'aria-label="'+esc(table.name)+': '+ordered.length+' de '+capacity+' plazas ocupadas">'+
  '<svg class="wed-floor-seat-svg wed-seat-associated-svg" xmlns="http://www.w3.org/2000/svg" '+
  'viewBox="0 0 640 '+height+'" width="640" height="'+height+
  '" aria-label="'+esc(table.name)+': asientos y nombres unidos por líneas" '+
  'style="display:block;width:640px;height:'+height+'px;max-width:none;overflow:visible">'+
  '<g class="wed-seat-association-lines" aria-hidden="true">'+paths.join("")+'</g>'+
  tabletop+chairMarkup+'<g class="wed-seat-attached-labels">'+labels.join("")+'</g></svg></div>';
}
function tableGuestPicker(table,guests,esc,chosenSeatIndex=null){
 const available=guests.filter(g=>!g.tableId&&g.rsvp!=="rechazado")
  .sort((a,b)=>a.name.localeCompare(b.name,"es"));
 const full=guests.filter(g=>g.tableId===table.id).length>=table.capacity;
 return '<section class="wed-table-picker" data-wed-table-picker="'+esc(table.id)+'" aria-label="Añadir personas a '+esc(table.name)+'">'+
 '<h5>Añadir personas a '+esc(table.name)+
 (Number.isInteger(chosenSeatIndex)?' · Plaza '+(chosenSeatIndex+1):'')+'</h5>'+
 '<form data-wed-place-existing="'+esc(table.id)+'" class="wed-table-picker-form">'+
 '<label>Buscar invitado disponible<input type="search" data-wed-guest-search autocomplete="off" placeholder="Escribe nombre o apellidos…" '+(!available.length||full?'disabled':'')+'></label>'+
 '<label>Selecciona un invitado de vuestras listas'+
 '<select name="guestId" required '+(!available.length||full?'disabled':'')+'>'+
 '<option value="">Elige un nombre…</option>'+available.map(g=>
 '<option value="'+esc(g.id)+'">'+esc(g.name)+' · '+esc(WEDDING_GUEST_GROUPS.find(([key])=>key===g.groupName)?.[1]||g.groupName||"Sin clasificar")+'</option>').join("")+
 '</select></label>'+
 '<small class="wed-guest-search-status" data-wed-guest-search-status aria-live="polite">'+(available.length?available.length+' invitados disponibles':'No hay invitados disponibles')+'</small>'+
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
 const columns=Math.min(4,Math.max(1,tables.length));
 const rows=Math.max(1,Math.ceil(tables.length/columns));
 const maxDiagramHeight=Math.max(300,...tables.map(t=>
  weddingSeatLayout(t,guests.filter(g=>g.tableId===t.id)).height));
 const rowHeight=Math.max(390,maxDiagramHeight+48);
 const height=rows*rowHeight;
 const canvasWidth=Math.max(3600,columns*780);
 const canvasHeight=Math.max(3600,rows*rowHeight+320);
 const dynamicRowHeight='--wed-floor-row-height:'+rowHeight+'px;--wed-floor-rows:'+rows+
  ';--wed-canvas-width:'+canvasWidth+'px;--wed-canvas-height:'+canvasHeight+'px;';
 return '<section class="wed-planner-panel wed-seating-workspace">'+
 '<div class="wed-planner-heading"><div><h3>Organizador de mesas</h3>'+
 '<small>'+summary.seated+'/'+summary.confirmed+' confirmados ubicados · '+summary.tables+' mesas creadas</small></div>'+
 '</div>'+
 '<div class="wed-seating-summary" aria-label="Resumen de distribución">'+
 metric("Confirmados",summary.confirmed)+metric("Sin mesa",summary.unseatedAll.length)+
 metric("Plazas creadas",summary.seats)+metric("Plazas libres",summary.free)+
 metric("Pendientes",summary.pending)+metric("Opcionales",summary.optional)+'</div>'+
 (editing?tableForm(editing==="new"?null:tables.find(t=>t.id===editing),esc):"")+
 '<div class="wed-top-planning" data-wed-planning-overview>'+
 '<section class="wed-seating-block wed-pending-top" aria-label="Invitados pendientes de asignar">'+
 '<div class="wed-seating-block-title"><h4>Invitados sin mesa</h4>'+
 '<small>'+summary.unseatedAll.length+' por ubicar · '+summary.unseatedConfirmed.length+' confirmados · '+
 summary.unseatedPending.length+' pendientes · '+summary.unseatedOptional.length+' opcionales</small></div>'+
 (summary.unseatedAll.length?'<div class="wed-unseated-list">'+
 summary.unseatedAll.slice().sort((a,b)=>a.name.localeCompare(b.name,"es")).map(g=>
 '<button type="button" data-wed-seat-guest="'+esc(g.id)+'" title="Asignar mesa a '+esc(g.name)+'">'+
 esc(g.name)+' <span>'+esc(g.groupName==="opcionales"?"Opcional":g.rsvp==="confirmado"?"Confirmado":"Pendiente")+' · Asignar ›</span></button>').join("")+'</div>':
 '<p class="wed-overview-empty">Todos los invitados no rechazados tienen mesa asignada.</p>')+
 (summary.unseatedDeclined.length?'<small class="wed-overview-note">'+summary.unseatedDeclined.length+
 (summary.unseatedDeclined.length===1?' invitado rechazado sin mesa':' invitados rechazados sin mesa')+
 ' (no necesitan plaza).</small>':'')+
 '<small class="wed-overview-note">Asistencia pendiente y mesa sin asignar son situaciones diferentes.</small>'+
 '</section>'+
 '<section class="wed-seating-block wed-suggestions-top"><div class="wed-seating-block-title">'+
 '<h4>Distribuciones sugeridas</h4><small>Simulaciones para confirmados; no modifican las mesas</small></div>'+
 (options.length?'<div class="wed-seating-options">'+options.map(layoutPreview).join("")+'</div>':
 '<p class="wed-overview-empty">Sin confirmaciones todavía. Cuando las registréis aparecerán alternativas.</p>')+
 '</section></div>'+
 '<section class="wed-seating-block wed-floor-section">'+
 '<div class="wed-floor-shell'+(floorExpanded?' is-expanded':'')+'" data-wed-floor-shell>'+
 '<div class="wed-seating-block-title wed-floor-heading"><div class="wed-floor-title">'+
 '<h4 id="wed-floor-title">Plano de mesas</h4>'+
 '<small>El nombre aparece junto a su asiento · Arrastra desde «Mover»</small></div>'+
 '<div class="wed-floor-actions">'+
 '<div class="wed-floor-zoom" role="group" aria-label="Zoom del plano">'+
 '<button type="button" data-wed-zoom-out aria-label="Reducir plano" title="Alejar">−</button>'+
 '<button type="button" data-wed-zoom-reset aria-label="Restablecer escala al 100%" title="100%">100%</button>'+
 '<button type="button" data-wed-zoom-in aria-label="Ampliar plano" title="Acercar">+</button>'+
 '<button type="button" data-wed-zoom-fit title="Ajustar todas las mesas al ancho">Ajustar</button></div>'+
 (selected?'<button class="wed-floor-reset" type="button" data-wed-center-table="'+esc(selected.id)+'" title="Dejar la mesa seleccionada en el centro">Centrar mesa</button>':'')+
 '<button type="button" class="wed-floor-icon" data-wed-new-table title="Nueva mesa" aria-label="Nueva mesa">+</button>'+
 '<button type="button" class="wed-floor-icon" data-wed-floor-expand aria-expanded="'+(floorExpanded?'true':'false')+
 '" title="'+(floorExpanded?'Cerrar pantalla completa':'Ver plano a pantalla completa')+
 '" aria-label="'+(floorExpanded?'Cerrar pantalla completa':'Ampliar plano a pantalla completa')+
 '">'+(floorExpanded?'×':'⛶')+'</button></div></div>'+ '<small class="wed-floor-save-status" data-wed-floor-save-status aria-live="polite"></small>'+
 (tables.length?'<div class="wed-floor-scroll" tabindex="0" style="display:block;height:'+height+'px;min-height:'+height+'px" aria-label="Plano de mesas; arrastra el fondo para moverte en horizontal y vertical">'+
 '<div class="wed-floor-plan" data-wed-floor-plan data-wed-table-count="'+tables.length+'" style="display:grid;--wed-floor-columns:'+columns+';'+dynamicRowHeight+'height:'+height+'px;min-height:'+height+'px">'+
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
 '</section>';
}
export function renderBodasDirectory(esc){
 return '<section class="wed-planner-panel"><h3>Recursos oficiales de Bodas.net</h3><p>La planificación se guarda en Segundo Cerebro; el directorio, las opiniones y los servicios de terceros se consultan en su plataforma original.</p>'+
 '<div class="wed-external-grid">'+BODAS_LINKS.map(([name,url,desc])=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer" class="wed-external-card"><strong>'+esc(name)+' ↗</strong><small>'+esc(desc)+'</small></a>').join("")+'</div>'+
 '<p class="wed-planner-foot">Sin API oficial conectada, no podemos importar chats, favoritos, confirmaciones ni datos de Bodas.net. Sus sorteos y beneficios se gestionan exclusivamente allí.</p></section>';
}
