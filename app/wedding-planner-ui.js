// Wedding planner native tools and explicit outbound Bodas.net references.
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
  '<small>'+(t.dueDate?'Vence: '+esc(t.dueDate)+' · ':'')+esc(t.description||"")+'</small></div>'+
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
function guestForm(item,tables,esc){
 const current=item||{},editing=!!item;
 return '<form class="wed-guest-form" id="wed-guest-form"><h4>'+(editing?"Editar invitado":"Añadir invitado")+'</h4>'+
 '<div class="wed-planner-fields">'+
 '<label>Nombre *<input name="name" required maxlength="180" value="'+esc(current.name||"")+'"></label>'+
 '<label>Grupo<input name="groupName" maxlength="90" placeholder="Familia, amigos…" value="'+esc(current.groupName||"")+'"></label>'+
 '<label>Asistencia<select name="rsvp">'+option(RSVP,current.rsvp||"pendiente",esc)+'</select></label>'+
 '<label>Menú<select name="menu">'+option(MENUS,current.menu||"",esc)+'</select></label>'+
 '<label>Mesa<select name="tableId"><option value="">Sin asignar</option>'+tables.map(t=>'<option value="'+esc(t.id)+'" '+(current.tableId===t.id?"selected":"")+'>'+esc(t.name)+' · '+t.seated+'/'+t.capacity+'</option>').join("")+'</select></label>'+
 '<label>Email<input name="email" type="email" maxlength="254" value="'+esc(current.email||"")+'"></label>'+
 '<label>Teléfono<input name="phone" type="tel" maxlength="40" value="'+esc(current.phone||"")+'"></label>'+
 '<label class="wide">Alergias o necesidades alimentarias<textarea name="dietaryNotes" maxlength="500" rows="2">'+esc(current.dietaryNotes||"")+'</textarea></label>'+
 '<label class="wide">Notas<textarea name="notes" maxlength="1000" rows="2">'+esc(current.notes||"")+'</textarea></label></div>'+
 '<div class="wed-planner-form-actions"><button type="submit" class="wed-primary">Guardar invitado</button><button type="button" data-wed-cancel-guest>Cancelar</button>'+
 (editing?'<button type="button" data-wed-delete-guest="'+esc(current.id)+'">Eliminar</button>':"")+'</div></form>';
}
export function renderGuests(guests,tables,editing,esc){
 const accepted=guests.filter(g=>g.rsvp==="confirmado").length,declined=guests.filter(g=>g.rsvp==="rechazado").length;
 const unseated=guests.filter(g=>g.rsvp==="confirmado"&&!g.tableId).length;
 return '<section class="wed-planner-panel"><div class="wed-planner-heading"><div><h3>Lista de invitados</h3><small>'+guests.length+' invitados · '+accepted+' confirmados · '+declined+' no asisten · '+unseated+' sin mesa</small></div>'+
 '<button type="button" class="wed-primary" data-wed-new-guest>+ Invitado</button></div>'+
 (editing?guestForm(editing==="new"?null:guests.find(g=>g.id===editing),tables,esc):"")+
 (guests.length?'<div class="wed-guest-scroll"><table class="wed-guest-table"><thead><tr><th>Nombre y grupo</th><th>Asistencia</th><th>Menú</th><th>Mesa</th><th>Notas alimentarias</th><th></th></tr></thead><tbody>'+
 guests.map(g=>'<tr><td><strong>'+esc(g.name)+'</strong><small>'+esc(g.groupName||"Sin grupo")+'</small></td>'+
 '<td>'+esc(pick(RSVP,g.rsvp))+'</td><td>'+esc(pick(MENUS,g.menu))+'</td>'+
 '<td><select data-wed-assign-seat="'+esc(g.id)+'" aria-label="Mesa de '+esc(g.name)+'" '+(g.rsvp==="rechazado"?"disabled":"")+'><option value="">Sin mesa</option>'+
 tables.map(t=>'<option value="'+esc(t.id)+'" '+(g.tableId===t.id?"selected":"")+'>'+esc(t.name)+' ('+t.seated+'/'+t.capacity+')</option>').join("")+'</select></td>'+
 '<td>'+esc(g.dietaryNotes||"—")+'</td><td><button data-wed-edit-guest="'+esc(g.id)+'" type="button">Editar</button></td></tr>').join("")+'</tbody></table></div>':
 '<div class="wed-planner-empty">Aún no hay invitados registrados.</div>')+
 '<p class="wed-planner-foot">La lista es privada y compartida entre usuarios autorizados. Las confirmaciones desde la web pública de Bodas.net no se sincronizan automáticamente.</p></section>';
}
function tableForm(item,esc){
 const t=item||{};
 return '<form id="wed-table-form" class="wed-guest-form"><h4>'+(item?"Editar mesa":"Nueva mesa")+'</h4><div class="wed-planner-fields">'+
 '<label>Nombre *<input name="name" maxlength="180" required placeholder="Mesa 1" value="'+esc(t.name||"")+'"></label>'+
 '<label>Capacidad (1-30)<input name="capacity" type="number" min="1" max="30" step="1" required value="'+(t.capacity||8)+'"></label>'+
 '<label>Formato<select name="shape">'+option(SHAPES,t.shape||"redonda",esc)+'</select></label></div>'+
 '<div class="wed-planner-form-actions"><button class="wed-primary" type="submit">Guardar mesa</button><button type="button" data-wed-cancel-table>Cancelar</button>'+
 (item?'<button type="button" data-wed-delete-table="'+esc(item.id)+'">Eliminar</button>':"")+'</div></form>';
}
export function renderTables(guests,tables,editing,esc){
 const confirmed=guests.filter(g=>g.rsvp==="confirmado"),seated=confirmed.filter(g=>g.tableId).length;
 return '<section class="wed-planner-panel"><div class="wed-planner-heading"><div><h3>Organizador de mesas</h3><small>'+tables.length+' mesas · '+seated+'/'+confirmed.length+' confirmados ubicados</small></div>'+
 '<button type="button" class="wed-primary" data-wed-new-table>+ Nueva mesa</button></div>'+
 (editing?tableForm(editing==="new"?null:tables.find(t=>t.id===editing),esc):"")+
 '<div class="wed-seating-grid">'+tables.map(t=>{
  const occupants=guests.filter(g=>g.tableId===t.id);
  return '<article class="wed-seating-card"><div class="wed-seating-head"><strong>'+esc(t.name)+'</strong><span>'+esc(pick(SHAPES,t.shape))+' · '+occupants.length+'/'+t.capacity+'</span><button type="button" data-wed-edit-table="'+esc(t.id)+'">Editar</button></div>'+
  '<div class="wed-seating-guests">'+(occupants.length?occupants.map(g=>'<span>'+esc(g.name)+'</span>').join(""):'<small>Sin personas asignadas</small>')+'</div></article>';
 }).join("")+'</div>'+
 '<p class="wed-planner-foot">Para asignar personas, utiliza el selector de mesa de «Invitados». No se asignan automáticamente invitados que hayan rechazado asistir. El aforo de cada mesa se valida al guardar.</p></section>';
}
export function renderBodasDirectory(esc){
 return '<section class="wed-planner-panel"><h3>Recursos oficiales de Bodas.net</h3><p>La planificación se guarda en Segundo Cerebro; el directorio, las opiniones y los servicios de terceros se consultan en su plataforma original.</p>'+
 '<div class="wed-external-grid">'+BODAS_LINKS.map(([name,url,desc])=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer" class="wed-external-card"><strong>'+esc(name)+' ↗</strong><small>'+esc(desc)+'</small></a>').join("")+'</div>'+
 '<p class="wed-planner-foot">Sin API oficial conectada, no podemos importar chats, favoritos, confirmaciones ni datos de Bodas.net. Sus sorteos y beneficios se gestionan exclusivamente allí.</p></section>';
}
