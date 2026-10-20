// Client view: populated only by protected same-origin API, NEVER from public Git.
// Lazy loading preserves the existing private Google Sheets link as fallback.
const keys=[
  ["v2","Logística V2"],["baseline","Frecuencia base"],
  ["interactions","Interacciones"],["memory","Memoria V1"],
  ["markov","Markov"],["persistence","Persistencia"]
];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=n=>(n*100).toLocaleString("es-ES",{minimumFractionDigits:1,maximumFractionDigits:1})+" %";
const pp=n=>n.toLocaleString("es-ES",{minimumFractionDigits:1,maximumFractionDigits:1})+" pp";

export function isPrivate2027Payload(data){
  if(!data||data.ok!==true||data.issued!==false||
     data.targetYear!==2027||data.models!==6||data.countries!==196||
     data.source!=="PRIVATE_GOOGLE_SHEETS"||!Array.isArray(data.rows)||data.rows.length!==196)return false;
  const seen=new Set();
  for(let i=0;i<data.rows.length;i++){
    const r=data.rows[i];
    if(!r||r.rank!==i+1||typeof r.name!=="string"||!r.name.trim()||
       seen.has(r.name.toLowerCase())||
       !keys.every(([key])=>typeof r[key]==="number"&&Number.isFinite(r[key])&&r[key]>=0&&r[key]<=1)||
       typeof r.baselineDiffPp!=="number"||typeof r.disagreementPp!=="number"||
       Math.abs(r.baselineDiffPp-100*(r.v2-r.baseline))>.011||
       Math.abs(r.disagreementPp-100*Math.abs(r.v2-r.interactions))>.011)return false;
    seen.add(r.name.toLowerCase());
  }
  return true;
}

export function renderPrivate2027Table(rows,{search="",sort="rank",model="v2"}={}){
  if(!Array.isArray(rows)||!keys.some(([key])=>key===model))return "";
  const norm=String(search).toLocaleLowerCase("es").trim().slice(0,90);
  const subset=rows.filter(r=>r.name.toLocaleLowerCase("es").includes(norm));
  if(sort==="alpha")subset.sort((a,b)=>a.name.localeCompare(b.name,"es"));
  else if(sort==="risk")subset.sort((a,b)=>b[model]-a[model]||a.rank-b.rank);
  else subset.sort((a,b)=>a.rank-b.rank);
  const visible=subset.slice(0,196);
  const body=visible.map(r=>"<tr><td>"+r.rank+"</td><td><strong>"+esc(r.name)+"</strong></td><td>"+
    pct(r[model])+"</td><td>"+pct(r.v2)+"</td><td>"+pct(r.baseline)+"</td><td>"+pp(r.baselineDiffPp)+
    "</td><td>"+pct(r.interactions)+"</td><td>"+pct(r.memory)+"</td><td>"+pct(r.markov)+
    "</td><td>"+pct(r.persistence)+"</td><td>"+pp(r.disagreementPp)+"</td></tr>").join("");
  return '<p class="subtext">Mostrando '+visible.length+' de 196 países · Riesgos exploratorios sin validación prospectiva</p>'+
    '<div class="scroll-x"><table><thead><tr><th>#</th><th>País</th><th>Modelo elegido</th><th>V2</th><th>Frecuencia</th><th>Dif. V2–base</th><th>Interacciones</th><th>Memoria</th><th>Markov</th><th>Persistencia</th><th>Desacuerdo</th></tr></thead><tbody>'+
    (body||'<tr><td colspan="11">Sin países que coincidan con la búsqueda.</td></tr>')+"</tbody></table></div>";
}

export function mountInlineShadow2027(container,{fetcher=fetch}={}){
  if(!container)return ()=>{};
  const trigger=container.querySelector("[data-shadow2027-load]");
  const host=container.querySelector("[data-shadow2027-content]");
  if(!trigger||!host)return ()=>{};
  let alive=true;
  const load=async()=>{
    trigger.disabled=true;host.textContent="Verificando acceso a los datos privados…";
    try{
      const response=await fetcher("/api/research-shadow2027",{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
      if(!response.ok)throw new Error("UNAVAILABLE");
      const data=await response.json();
      if(!isPrivate2027Payload(data))throw new Error("INVALID_SOURCE");
      if(!alive)return;
      host.innerHTML='<div class="filter-row"><label>Buscar país <input data-shadow2027-search type="search" placeholder="País…" autocomplete="off"></label>'+
        '<label>Orden <select data-shadow2027-sort><option value="rank">Ranking principal</option><option value="risk">Riesgo según modelo</option><option value="alpha">Alfabético</option></select></label>'+
        '<label>Modelo <select data-shadow2027-model>'+
        keys.map(([key,label])=>'<option value="'+esc(key)+'">'+esc(label)+'</option>').join("")+
        '</select></label></div><div data-shadow2027-results></div>';
      const search=host.querySelector("[data-shadow2027-search]");
      const sort=host.querySelector("[data-shadow2027-sort]");
      const model=host.querySelector("[data-shadow2027-model]");
      const results=host.querySelector("[data-shadow2027-results]");
      const render=()=>{if(alive)results.innerHTML=renderPrivate2027Table(data.rows,{search:search.value,sort:sort.value,model:model.value});};
      for(const c of [search,sort,model])c.addEventListener(c===search?"input":"change",render);
      render();
      trigger.hidden=true;
    }catch{
      if(alive){
        host.textContent="La vista integrada todavía no está autorizada o los datos no superan la validación. Utiliza mientras tanto el enlace a la hoja privada; no se mostrarán valores públicos ni simulados.";
        trigger.disabled=false;
      }
    }
  };
  trigger.addEventListener("click",load);
  return ()=>{alive=false;trigger.removeEventListener("click",load);};
}
