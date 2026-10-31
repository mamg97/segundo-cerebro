// Private, data-driven web traffic dashboard; site names and paths come ONLY from the private API.
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fnum=new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
const num=v=>v===null||v===undefined||v===""?null:Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
export const displayCount=v=>num(v)===null?"—":fnum.format(num(v));
export function sumKnown(rows,key){
  const values=rows.map(row=>num(row?.[key])).filter(v=>v!==null);
  return values.length?values.reduce((a,b)=>a+b,0):null;
}
const dateISO=date=>date.toISOString().slice(0,10);
const startDate=(days)=>{const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-days+1);return dateISO(d)};
export function computeTraffic(payload,days=30){
  const sites=Array.isArray(payload?.sites)?payload.sites:[];
  const daily=Array.isArray(payload?.daily)?payload.daily:[];
  const limit=startDate(days);
  const relevant=daily.filter(r=>typeof r?.day==="string"&&r.day>=limit);
  const bySite=sites.map(site=>{
    const rows=relevant.filter(r=>r.siteId===site.id);
    const latest=rows.slice().sort((a,b)=>b.day.localeCompare(a.day))[0]||null;
    return {...site,rows,latest,visits:sumKnown(rows,"visits"),pageViews:sumKnown(rows,"pageViews")};
  });
  const views=sumKnown(relevant,"pageViews"),visits=sumKnown(relevant,"visits");
  return {sites:bySite,daily:relevant,views,visits,days};
}
async function requestTraffic(url,body=null){
  const response=await fetch(url,{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",
    headers:body?{Accept:"application/json","Content-Type":"application/json"}:{Accept:"application/json"},
    ...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok || !payload?.ok)throw Error(payload?.code||"REQUEST_FAILED");
  return payload;
}
const insightCard=(label,v,sub="")=>'<article class="site-traffic-kpi"><span>'+escapeHtml(label)+'</span><strong>'+displayCount(v)+'</strong><small>'+escapeHtml(sub)+'</small></article>';
function chartMarkup(model){
  const allDays=[...new Set(model.daily.map(x=>x.day))].sort();
  if(!allDays.length)return '<p class="site-traffic-empty">Todavía no hay datos de visitas. No interpretamos la ausencia de registros como cero visitas.</p>';
  const bars=allDays.map(day=>({day,value:sumKnown(model.daily.filter(r=>r.day===day),"pageViews")}));
  const max=Math.max(1,...bars.map(r=>r.value??0));
  return '<div class="site-traffic-chart" role="img" aria-label="Páginas vistas diarias de los sitios registrados">' +
    bars.map(({day,value})=>'<div class="site-traffic-bar" title="'+escapeHtml(day)+': '+escapeHtml(displayCount(value))+' páginas vistas"><div style="height:'+Math.round(100*(value??0)/max)+'%" class="'+(value===null?"unknown":"")+'"></div><small>'+escapeHtml(day.slice(5))+'</small></div>').join("")+
    '</div>';
}
function rowMarkup(site){
  return '<tr><th scope="row">'+escapeHtml(site.label)+'</th><td class="site-traffic-nums">'+displayCount(site.visits)+'</td><td class="site-traffic-nums">'+displayCount(site.pageViews)+'</td><td>'+escapeHtml(site.latest?.day||"Sin datos")+'</td><td><code>'+escapeHtml(site.pathPrefix)+'</code></td></tr>';
}
function setMessage(root,msg,kind="info"){let el=root.querySelector("#site-traffic-message");if(el){el.textContent=msg;el.dataset.kind=kind}}
function render(root,payload,days=30){
  const model=computeTraffic(payload,days);
  root.innerHTML='<div class="site-traffic-shell">'+
    '<header class="site-traffic-header"><div><small>Panel privado · tráfico web</small><h3>Analítica de sitios</h3><p>Consultamos únicamente registros contrastados. El origen y las rutas están configurados en la base privada.</p></div><label>Periodo <select id="site-traffic-period"><option value="7"'+(days===7?" selected":"")+'>7 días</option><option value="30"'+(days===30?" selected":"")+'>30 días</option><option value="90"'+(days===90?" selected":"")+'>90 días</option></select></label></header>'+
    '<div class="site-traffic-kpis">'+insightCard("Visitas",model.visits,"Total de sitios registrados")+
    insightCard("Páginas vistas",model.views,"No son personas únicas")+
    insightCard("Sitios monitorizados",model.sites.length,"Con configuración privada")+'</div>'+
    '<section class="site-traffic-panel"><div class="site-traffic-subhead"><h4>Evolución de páginas vistas</h4><span>'+days+' días</span></div>'+chartMarkup(model)+'</section>'+
    '<section class="site-traffic-panel"><div class="site-traffic-subhead"><h4>Comparativa por sitio</h4><span>Sin muestras ficticias</span></div>'+
    (model.sites.length?'<div class="site-traffic-scroll"><table><thead><tr><th>Sitio</th><th>Visitas</th><th>Páginas vistas</th><th>Último dato</th><th>Ruta</th></tr></thead><tbody>'+model.sites.map(rowMarkup).join("")+'</tbody></table></div>':
      '<p class="site-traffic-empty">Aún no hay sitios configurados. Añádelos a continuación; sus nombres y URLs no se publican en GitHub.</p>')+
    '</section>'+
    '<details class="site-traffic-editor"><summary>Configurar sitios y registrar datos</summary>'+
    '<div class="site-traffic-forms"><form id="site-traffic-site-form"><strong>Añadir sitio</strong><label>Nombre<input name="label" maxlength="90" placeholder="Nombre privado del producto" required></label><label>Ruta del proyecto<input name="pathPrefix" placeholder="/ejemplo/" pattern="/[A-Za-z0-9_-]+/" required></label><button type="submit">Guardar sitio</button></form>'+
    '<form id="site-traffic-data-form"><strong>Registrar cifras verificadas</strong><label>Sitio<select name="siteId" required><option value="">Seleccionar</option>'+model.sites.map(s=>'<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.label)+'</option>').join("")+'</select></label>'+
    '<label>Fecha<input name="day" type="date" required></label><label>Visitas<input name="visits" type="number" min="0" step="1" placeholder="Si no consta, dejar vacío"></label><label>Páginas vistas<input name="pageViews" type="number" min="0" step="1" placeholder="Si no consta, dejar vacío"></label>'+
    '<button type="submit"'+(!model.sites.length?" disabled":"")+'>Guardar medición</button></form></div></details>'+
    '<p id="site-traffic-message" class="site-traffic-message" role="status"></p>'+
    '<p class="site-traffic-note">Fuente: registros privados introducidos tras consultar el proveedor. No existe conexión automática autorizada, no se almacenan datos de usuarios y las fechas sin lectura se muestran como ausencia de datos, nunca como ceros.</p></div>';
  root.querySelector("#site-traffic-period")?.addEventListener("change",e=>render(root,payload,Number(e.target.value)||30));
  const add=root.querySelector("#site-traffic-site-form");
  add?.addEventListener("submit",async e=>{
    e.preventDefault();const data=new FormData(add);const button=add.querySelector("button");button.disabled=true;
    try {
      await requestTraffic("/api/web-traffic",{type:"site",label:String(data.get("label")||""),pathPrefix:String(data.get("pathPrefix")||"")});
      await renderSiteTraffic(root,days);
    } catch {setMessage(root,"No se ha podido guardar el sitio. Comprueba los campos y vuelve a intentarlo.","error");button.disabled=false;}
  });
  const form=root.querySelector("#site-traffic-data-form");
  form?.addEventListener("submit",async e=>{
    e.preventDefault();const data=new FormData(form);
    const visits=data.get("visits"),pageViews=data.get("pageViews");
    if(visits==="" && pageViews===""){setMessage(root,"Introduce al menos una cifra comprobada.","error");return}
    const submit=form.querySelector("button");submit.disabled=true;
    try {
      await requestTraffic("/api/web-traffic",{type:"daily",siteId:data.get("siteId"),day:data.get("day"),
        visits:visits===""?null:Number(visits),pageViews:pageViews===""?null:Number(pageViews)});
      await renderSiteTraffic(root,days);
    } catch {setMessage(root,"No se ha podido guardar la medición. No se ha cambiado ninguna cifra.","error");submit.disabled=false;}
  });
}
export async function renderSiteTraffic(root,days=30){
  if(!root)return;
  root.textContent="Cargando analítica privada…";
  try {const payload=await requestTraffic("/api/web-traffic?days=90");render(root,payload,days);}
  catch {
    root.innerHTML='<div class="site-traffic-empty" role="alert"><strong>No disponible</strong><p>La base privada de analítica todavía no está operativa o ha fallado su lectura. No tenemos cifras contrastadas para mostrar.</p><button type="button" id="site-traffic-retry">Reintentar</button></div>';
    root.querySelector("#site-traffic-retry")?.addEventListener("click",()=>void renderSiteTraffic(root,days));
  }
}
