const SHEET_TITLE = "SEGUNDO CEREBRO - PROYECTOS";
const SOURCE_KEY = "PROJECTS_SHEET_ID";
const CACHE_MS = 30_000;
let cache = { value:null, expiresAt:0, spreadsheetId:null, spreadsheetIdExpiresAt:0, sourceMissingUntil:0 };

export function hasProjectsGoogleConfig(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}
function table(values=[]){
  if(!values.length) return [];
  const headers=values[0].map(v=>String(v??"").trim());
  return values.slice(1).filter(r=>r.some(v=>v!==""&&v!==null&&v!==undefined))
    .map(r=>Object.fromEntries(headers.map((h,i)=>[h,r?.[i]??null])));
}
function list(v){ return v==null||v===""?[]:String(v).split(/[|;]/).map(x=>x.trim()).filter(Boolean); }
function bool(v){ return ["1","true","sí","si","yes"].includes(String(v??"").trim().toLowerCase()); }
function cleanUrl(v){ const s=String(v??"").trim(); return /^https:\/\/[^ ]+$/i.test(s)?s:null; }

async function readRegistry(env,token){
  if(!env.FINANCE_SHEET_ID) return null;
  const range=encodeURIComponent("IntegracionesPrivadas!A1:B50");
  const url="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(String(env.FINANCE_SHEET_ID).trim())+"/values/"+range+"?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  try{
    const r=await fetch(url,{headers:{Authorization:"Bearer "+token}});
    if(!r.ok) return null;
    const rows=(await r.json())?.values||[];
    const found=rows.find(row=>String(row?.[0]||"").trim()===SOURCE_KEY);
    const id=String(found?.[1]||"").trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(id)?id:null;
  }catch{return null;}
}
async function resolveId(env,token){
  if(env.PROJECTS_SHEET_ID) return String(env.PROJECTS_SHEET_ID).trim();
  if(cache.spreadsheetId&&cache.spreadsheetIdExpiresAt>Date.now()) return cache.spreadsheetId;
  if(cache.sourceMissingUntil>Date.now()) return null;
  const registered=await readRegistry(env,token);
  if(registered){ cache.spreadsheetId=registered; cache.spreadsheetIdExpiresAt=Date.now()+10*60_000; return registered; }
  const q=new URLSearchParams({q:"name = '"+SHEET_TITLE+"' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",fields:"files(id,name,modifiedTime)",orderBy:"modifiedTime desc",pageSize:"10"});
  const r=await fetch("https://www.googleapis.com/drive/v3/files?"+q,{headers:{Authorization:"Bearer "+token}});
  if(!r.ok) throw new Error("GOOGLE_DRIVE_"+r.status);
  const files=(await r.json())?.files||[];
  const found=files.find(x=>x?.name===SHEET_TITLE);
  if(!found?.id){ cache.sourceMissingUntil=Date.now()+5*60_000; return null; }
  cache.spreadsheetId=found.id; cache.spreadsheetIdExpiresAt=Date.now()+10*60_000; return found.id;
}
async function readRows(id,token,tab,range){
  const encoded=encodeURIComponent(tab+"!"+range);
  const url="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+"/values/"+encoded+"?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const r=await fetch(url,{headers:{Authorization:"Bearer "+token}});
  if(!r.ok) throw new Error("GOOGLE_SHEETS_"+r.status+"_"+tab);
  return table((await r.json())?.values||[]);
}
function empty(){
  return { summary:null, projects:[], relations:[], source:{kind:"private-sheet",name:SHEET_TITLE,available:false,contractVersion:"0.1"} };
}
function build(projectRows,docRows,relationRows){
  const docs=new Map(docRows.map(x=>[String(x.project_id||"").trim(),x]));
  const projects=projectRows.map(row=>{
    const id=String(row.project_id||"").trim();
    const doc=docs.get(id)||{};
    return {
      id,
      name:row.nombre||null,
      alias:row.alias||null,
      parentId:row.parent_id||null,
      area:row.area||null,
      type:row.tipo||null,
      status:row.estado||"PENDIENTE",
      priority:row.prioridad||"MEDIA",
      summary:row.resumen||null,
      owner:row.owner_funcional||null,
      repoUrl:cleanUrl(row.repo_url),
      docsUrl:cleanUrl(row.docs_url),
      webUrl:cleanUrl(row.web_url),
      docsStatus:row.docs_status||"PENDIENTE",
      nextAction:row.next_action||null,
      relatedDomains:list(row.related_domains),
      readOnly:bool(row.read_only),
      sensitivity:row.sensitivity||"CONFIDENCIAL",
      updatedAt:row.updated_at||null,
      documentation:{
        vision:doc.vision||null, objective:doc.objetivo||null, scope:doc.alcance||null,
        currentState:doc.estado_actual||null, architecture:doc.arquitectura_o_fuentes||null,
        keyDocs:list(doc.documentos_clave), milestones:list(doc.proximos_hitos),
        rules:doc.reglas||null, notes:doc.notas||null
      }
    };
  }).filter(x=>x.id&&x.name);
  const relations=relationRows.map(r=>({
    sourceProjectId:r.source_project_id||null, type:r.relation_type||null,
    targetType:r.target_type||null, target:r.target_id_or_name||null, description:r.description||null
  })).filter(x=>x.sourceProjectId&&x.target);
  const topLevel=projects.filter(x=>!x.parentId);
  const active=projects.filter(x=>x.status==="ACTIVO").length;
  const paused=projects.filter(x=>x.status==="PAUSADO").length;
  const pendingDocs=projects.filter(x=>x.docsStatus!=="COMPLETA").length;
  return {
    summary:{total:projects.length,topLevel:topLevel.length,active,paused,pendingDocs,updatedAt:projects.map(x=>x.updatedAt).filter(Boolean).sort().at(-1)||null},
    projects,relations,
    source:{kind:"private-sheet",name:SHEET_TITLE,available:true,contractVersion:"0.1"}
  };
}
export async function fetchProjectsSummary(env,getGoogleAccessToken){
  if(!hasProjectsGoogleConfig(env)) return {status:"not-configured",value:empty()};
  if(cache.value&&cache.expiresAt>Date.now()) return {status:"ok-cache",value:cache.value};
  const token=await getGoogleAccessToken(env);
  const id=await resolveId(env,token);
  if(!id) return {status:"source-pending",value:empty()};
  const [projects,docs,relations]=await Promise.all([
    readRows(id,token,"Proyectos","A1:Z1000"),
    readRows(id,token,"Documentacion","A1:Z1000"),
    readRows(id,token,"Relaciones","A1:Z1000")
  ]);
  const value=build(projects,docs,relations);
  cache.value=value; cache.expiresAt=Date.now()+CACHE_MS;
  return {status:"ok-live",value};
}
