/**
 * AV-059: read-only discovery of the Zero Trust Access application covering
 * the PRIVATE Psychohistory Worker. No Access app data, audience tags,
 * application names, policy rules, auth domains, identities or tokens logged.
 *
 * This deliberately DOES NOT mutate Cloudflare or enable the 2027 data API.
 * All probe calls use GET and the exact Cloudflare API origin.
 */
const HOST="segundo-cerebro.mamg97.workers.dev";
const PATHS=["/api/research-lab","/api/research-shadow2027","/app/research-lab.html"];
const API="https://api.cloudflare.com/client/v4";
const VALID_HEX=/^[a-fA-F0-9]{32}$/;
const TEAM_RE=/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?\.cloudflareaccess\.com$/;
const AUD_RE=/^[a-zA-Z0-9_-]{8,160}$/;

function appPaths(app){
  // Cloudflare has deprecated self_hosted_domains in favour of destinations.
  // A nonempty destinations array takes precedence over all legacy fields.
  if(Array.isArray(app?.destinations)&&app.destinations.length){
    return app.destinations.filter(x=>x?.type==="public" &&
      !Array.isArray(x.overrides)&&typeof x.uri==="string").map(x=>x.uri);
  }
  const arr=[];
  if(typeof app?.domain==="string")arr.push(app.domain);
  if(Array.isArray(app?.self_hosted_domains)){
    for(const item of app.self_hosted_domains){
      if(typeof item?.domain==="string")arr.push(item.domain);
    }
  }
  return arr;
}
function coversPath(value,path){
  if(typeof value!=="string"||value.length>512)return false;
  const clean=value.replace(/^https:\/\//,"").replace(/\/$/,"");
  if(clean===HOST)return true;
  // Only a literal hostname and terminal path wildcard are permitted.
  if(clean.startsWith(HOST+"/")){
    const base="/"+clean.slice(HOST.length+1);
    if(base.endsWith("/*")){
      const prefix=base.slice(0,-2);
      return path===prefix||path.startsWith(prefix+"/");
    }
    if(base.includes("*"))return false;
    return path===base||path.startsWith(base.endsWith("/")?base:base+"/");
  }
  return false;
}
function workerDestinationCovers(app,workerId){
  if(typeof workerId!=="string"||!workerId)return false;
  return Array.isArray(app?.destinations)&&app.destinations.some(x=>
    x?.type==="worker"&&x.worker_id===workerId &&
    (!Array.isArray(x.overrides)||x.overrides.length===0));
}
export function findAppCoveringAllPaths(apps,{workerId=null}={}){
  if(!Array.isArray(apps))throw Error("BAD_APPS_LIST");
  return apps.filter(app=>app?.type==="self_hosted"&&
    (workerDestinationCovers(app,workerId)||
      PATHS.every(path=>appPaths(app).some(value=>coversPath(value,path)))));
}
function httpStatus(response){
  if(response.status===401||response.status===403)return "READ_SCOPE_DENIED";
  if(!response.ok)return "API_UNAVAILABLE";
  return "OK";
}
async function getJson(path,auth,{fetcher=fetch}={}){
  const r=await fetcher(API+path,{
    method:"GET",redirect:"error",
    headers:{Authorization:"Bearer "+auth,Accept:"application/json"},
    signal:AbortSignal.timeout(8000),
  });
  const state=httpStatus(r);
  if(state!=="OK")return {state};
  let p;
  try{p=await r.json();}catch{return {state:"INVALID_RESPONSE"};}
  if(p?.success!==true)return {state:"API_UNAVAILABLE"};
  return {state:"OK",result:p.result,result_info:p.result_info};
}
export async function auditAccessMetadata({accountId,apiToken,fetcher=fetch}={}){
  const out={
    schema:"psychohistory.access_metadata_readonly.v1",
    method:"GET_ONLY_NO_CONFIGURATION_CHANGES",
    appsApi:"NOT_CHECKED",organizationApi:"NOT_CHECKED",workersApi:"NOT_CHECKED",
    targetApp:"UNVERIFIED",audience:"UNVERIFIED",teamDomain:"UNVERIFIED",
    appCoverage:"UNVERIFIED",
    authenticatedUserTest:"NOT_PERFORMED",workerRouteConfigured:"NOT_CHECKED",
    configAutomaticallyWritten:false,tokenOrIdentifiersLogged:false,
    safeToEnablePrivate2027:false,
  };
  if(!VALID_HEX.test(String(accountId??""))||typeof apiToken!=="string"||apiToken.length<15){
    out.appsApi="CREDENTIALS_UNAVAILABLE";out.organizationApi="CREDENTIALS_UNAVAILABLE";
    return out;
  }
  // These are read-only operations. Classify denial explicitly without
  // outputting request/response contents or the Access application audience.
  let workerId=null;
  try{
    const worker=await getJson("/accounts/"+accountId+"/workers/workers?per_page=100&page=1",apiToken,{fetcher});
    out.workersApi=worker.state;
    if(worker.state==="OK"&&Array.isArray(worker.result)){
      const chosen=worker.result.filter(x=>x?.name==="segundo-cerebro");
      if(chosen.length===1&&typeof chosen[0].id==="string")workerId=chosen[0].id;
    }
  }catch{out.workersApi="API_UNAVAILABLE";}
  const pages=[];
  try{
    for(let page=1;page<=5;page++){
      const res=await getJson("/accounts/"+accountId+"/access/apps?per_page=100&page="+page,
        apiToken,{fetcher});
      out.appsApi=res.state;
      if(res.state!=="OK")break;
      if(!Array.isArray(res.result)){out.appsApi="INVALID_RESPONSE";break;}
      pages.push(...res.result);
      if(pages.length>500){out.appsApi="INVALID_RESPONSE";break;}
      const total=Number(res.result_info?.total_pages??page);
      if((Number.isSafeInteger(total)&&total<=page)||res.result.length<100)break;
    }
    if(out.appsApi==="OK"){
      const matches=findAppCoveringAllPaths(pages,{workerId});
      out.targetApp=matches.length===1?"UNIQUE":matches.length===0?"NONE":"AMBIGUOUS";
      if(matches.length===1){
        out.appCoverage=workerDestinationCovers(matches[0],workerId)?
          "WORKER_DESTINATION":"PUBLIC_HOSTNAME";
      }
      if(matches.length===1){
        out.audience=AUD_RE.test(String(matches[0].aud??""))?
          "VALID_SHAPE_NOT_EXPORTED":"MISSING_OR_INVALID";
      }
    }
  }catch{out.appsApi="API_UNAVAILABLE";}
  try{
    const org=await getJson("/accounts/"+accountId+"/access/organizations",apiToken,{fetcher});
    out.organizationApi=org.state;
    if(org.state==="OK"){
      out.teamDomain=TEAM_RE.test(String(org.result?.auth_domain??"").toLowerCase())?
        "VALID_SHAPE_NOT_EXPORTED":"MISSING_OR_INVALID";
    }
  }catch{out.organizationApi="API_UNAVAILABLE";}
  return out;
}
if(import.meta.url===new URL("file://"+process.argv[1]).href){
  const report=await auditAccessMetadata({
    accountId:process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken:process.env.CLOUDFLARE_ACCESS_READ_TOKEN||process.env.CLOUDFLARE_API_TOKEN,
  });
  // No raw JSON from the provider, not even on errors.
  for(const key of ["appsApi","organizationApi","workersApi","targetApp","appCoverage","audience","teamDomain",
    "authenticatedUserTest","workerRouteConfigured","safeToEnablePrivate2027"]){
    console.log(key.toUpperCase()+"="+report[key]);
  }
  // Permissions may be missing; not a CI failure for other parts of
  // Segundo Cerebro, but definitely NOT proof of Access configuration.
  if(report.appsApi==="OK"&&report.targetApp!=="UNIQUE")process.exitCode=2;
}
