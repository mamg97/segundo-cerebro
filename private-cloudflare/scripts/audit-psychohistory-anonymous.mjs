// Read-only anonymous smoke audit for a PRIVATE Cloudflare application.
// NEVER include cookies, Access JWTs, service tokens or production payloads.
// Fetch headers/status only; neither consume nor print response bodies.
export const HOST="https://segundo-cerebro.mamg97.workers.dev";
export const CHECKS=Object.freeze([
  {key:"lab_api",path:"/api/research-lab"},
  {key:"shadow_2027_api",path:"/api/research-shadow2027"},
  {key:"private_lab_html",path:"/app/research-lab.html?view=shadow2027"},
]);

function allowedRedirect(location, origin){
  if(typeof location!=="string"||!location||location.length>4096)return false;
  try {
    const target=new URL(location,origin);
    if(target.protocol!=="https:"||target.username||target.password)return false;
    const host=target.hostname.toLowerCase();
    // Cloudflare team login URL or Access login route on the app hostname.
    return (host.endsWith(".cloudflareaccess.com") &&
            /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(host)) ||
           (host===new URL(origin).hostname &&
            target.pathname.startsWith("/cdn-cgi/access/"));
  } catch {return false;}
}

export function classifyAnonymousResponse(status,location,origin=HOST){
  if(status===401||status===403)return "BLOCKED";
  if([301,302,303,307,308].includes(status)&&allowedRedirect(location,origin))return "BLOCKED";
  if(status===200||status===206||status===204)return "EXPOSED";
  return "INCONCLUSIVE";
}

export async function auditAnonymousAccess({fetcher=fetch,baseUrl=HOST}={}){
  const origin=new URL(baseUrl);
  if(origin.protocol!=="https:"||origin.hostname!=="segundo-cerebro.mamg97.workers.dev"||
     origin.pathname!=="/"||origin.search||origin.hash||origin.username||origin.password)
    throw new Error("UNTRUSTED_AUDIT_HOST");
  const rows=[];
  for(const item of CHECKS){
    let status=null,result="INCONCLUSIVE";
    try{
      const response=await fetcher(baseUrl+item.path,{
        method:"GET",redirect:"manual",cache:"no-store",
        headers:{Accept:item.key==="private_lab_html"?"text/html":"application/json",
          "Cache-Control":"no-cache"},
        signal:AbortSignal.timeout(12000),
      });
      status=response.status;
      result=classifyAnonymousResponse(status,response.headers.get("location"),baseUrl);
      await response.body?.cancel();
    }catch{
      // Do not treat a DNS/transport failure as a security success.
      result="INCONCLUSIVE";
    }
    rows.push({key:item.key,status,result});
  }
  return {schema:"psychohistory.anonymous_access_audit.v1",
    checked:rows.length,authenticated_requests_sent:0,
    response_bodies_read_or_logged:false,
    results:rows,
    anonymous_access_denied_everywhere:rows.every(x=>x.result==="BLOCKED"),
    interpretation:"An anonymous denial is a necessary production condition, NOT proof of authenticated access, source integrity, or Zero Trust policy correctness."};
}

if(import.meta.url===new URL("file://"+process.argv[1]).href){
  const report=await auditAnonymousAccess();
  // Never log response bodies, sensitive headers, Access tokens or query strings.
  for(const r of report.results){
    console.log("ANONYMOUS_"+r.key.toUpperCase()+"="+r.result+
      " STATUS="+(Number.isInteger(r.status)?r.status:"TRANSPORT_ERROR"));
  }
  console.log("ANONYMOUS_ACCESS_DENIED_EVERYWHERE="+report.anonymous_access_denied_everywhere);
  if(!report.anonymous_access_denied_everywhere)process.exitCode=1;
}
