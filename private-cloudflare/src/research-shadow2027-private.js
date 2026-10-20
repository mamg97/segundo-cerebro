// Private Sheets 2027 observations: NO public country rows or fallback examples.
// Must be called ONLY AFTER the route's independent Cloudflare Access JWT check.
// All data is derived from the exact matching private PsicoExperimentos record.
import { googleReadFetch } from "./google-read.js";
import { fetchPsychohistoryLab } from "./projects.js";

const EXPERIMENT_ID="ucdp261-2027-mobile-private-ranking-20261020";
const SOURCE_VERSION="UCDP OrganizedViolenceCY 26.1";
const EXPECTED_COLS=[
  "#","País","V2 logística","Frecuencia base","Diferencia (pp)",
  "Interacciones","V1 memoria","Markov","Persistencia","Desacuerdo (pp)"
];
const fProb=[2,3,5,6,7,8];

export function parsePrivate2027Evidence(experiments){
  if(!Array.isArray(experiments))return null;
  const rows=experiments.filter(e=>e?.id===EXPERIMENT_ID);
  if(rows.length!==1)return null;
  const r=rows[0];
  if(r.track!=="V2"||r.status!=="SHADOW_NO_EMITIDO"||
    r.metric!=="paises_ranqueados_sin_emision"||r.value!==196||
    r.datasetVersion!==SOURCE_VERSION)return null;
  try{
    const u=new URL(r.evidence);
    if(u.protocol!=="https:"||u.hostname!=="docs.google.com"||
      u.username||u.password||u.port||u.search||
      (u.hash&&!/^#gid=\d+$/.test(u.hash)))return null;
    const m=u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})\/edit\/?$/);
    return m?m[1]:null;
  }catch{return null;}
}

export function validate2027Rows(values){
  if(!Array.isArray(values)||values.length!==197||!Array.isArray(values[0])||
    EXPECTED_COLS.some((v,i)=>values[0][i]!==v))throw new Error("SHADOW_SCHEMA_MISMATCH");
  const result=[],names=new Set();
  let prev=Infinity;
  for(let i=1;i<values.length;i++){
    const row=values[i];
    if(!Array.isArray(row)||row.length!==10)throw new Error("SHADOW_ROW_MISSING");
    const rank=Number(row[0]),name=String(row[1]??"").trim();
    if(!name||name.length>160||names.has(name.toLocaleLowerCase("und"))||
      !Number.isInteger(rank)||rank!==i)throw new Error("SHADOW_IDENTITY_INVALID");
    names.add(name.toLocaleLowerCase("und"));
    for(const j of fProb){
      const p=Number(row[j]);
      if(row[j]===""||row[j]===null||!Number.isFinite(p)||p<0||p>1)
        throw new Error("SHADOW_PROBABILITY_INVALID");
    }
    const pp=Number(row[4]),dis=Number(row[9]);
    if(!Number.isFinite(pp)||!Number.isFinite(dis)||
      Math.abs(pp-100*(Number(row[2])-Number(row[3])))>.011 ||
      Math.abs(dis-100*Math.abs(Number(row[2])-Number(row[5])))>.011)
      throw new Error("SHADOW_DERIVED_VALUES_INVALID");
    if(Number(row[2])>prev+1e-9)throw new Error("SHADOW_RANK_ORDER_INVALID");
    prev=Number(row[2]);
    result.push({
      rank,name,
      v2:Number(row[2]),baseline:Number(row[3]),baselineDiffPp:pp,
      interactions:Number(row[5]),memory:Number(row[6]),
      markov:Number(row[7]),persistence:Number(row[8]),disagreementPp:dis,
    });
  }
  return result;
}

export async function fetchPrivate2027Ranking(env,getGoogleAccessToken,{labReader=fetchPsychohistoryLab,googleFetch=googleReadFetch}={}){
  const lab=await labReader(env,getGoogleAccessToken);
  if(!["ok-live","ok-cache"].includes(lab?.status))throw new Error("SHADOW_REGISTRY_UNAVAILABLE");
  const spreadsheetId=parsePrivate2027Evidence(lab.experiments);
  if(!spreadsheetId)throw new Error("SHADOW_UNVERIFIED_SOURCE");
  const token=await getGoogleAccessToken(env);
  const range=encodeURIComponent("'Ranking 2027'!A1:J197");
  const url="https://sheets.googleapis.com/v4/spreadsheets/"+
    encodeURIComponent(spreadsheetId)+"/values/"+range+"?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const r=await googleFetch(url,{headers:{Authorization:"Bearer "+token},redirect:"error"});
  if(!r.ok)throw new Error("SHADOW_SOURCE_UNAVAILABLE");
  // Google Sheets range 197x10 numeric/country-name only; reject excessive response.
  const declared=Number(r.headers.get("content-length")||0);
  if(declared>250000)throw new Error("SHADOW_OVERSIZED");
  const body=await r.text();
  if(body.length>250000)throw new Error("SHADOW_OVERSIZED");
  const values=JSON.parse(body)?.values;
  const rows=validate2027Rows(values);
  return {ok:true,source:"PRIVATE_GOOGLE_SHEETS",targetYear:2027,issued:false,
    target:"at_least_25_state_based_deaths_entire_year",models:6,countries:196,
    caveat:"Exploratorio. Sin validación prospectiva; no predice guerras nuevas ni sirve para decisiones de seguridad.",
    rows};
}
