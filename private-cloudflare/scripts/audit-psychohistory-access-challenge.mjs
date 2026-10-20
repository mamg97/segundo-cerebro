/**
 * AV-060: uncredentialed challenge-to-Access-app read-only correlation.
 *
 * No JWT, cookie, country observation, token value, app AUD, login URL,
 * organization hostname or account ID is printed or saved.
 * Challenge headers are public untrusted hints, NEVER authentication proof.
 */
const ORIGIN="https://segundo-cerebro.mamg97.workers.dev";
const PATHS=[
 "/api/research-lab",
 "/api/research-shadow2027",
 "/app/research-lab.html?view=shadow2027",
];
const API="https://api.cloudflare.com/client/v4";
const AUD=/^[0-9a-f]{64}$/i;
const TEAM=/^[a-z0-9-]{1,63}\.cloudflareaccess\.com$/;
const ACCOUNT=/^[0-9a-f]{32}$/i;

export function parseChallenge(status,location){
  if(status!==302&&status!==303&&status!==307&&status!==308){
    return {protected:false,audHint:null,teamHint:null};
  }
  if(typeof location!=="string"||!location||location.length>4096)
    return {protected:false,audHint:null,teamHint:null};
  try{
    const u=new URL(location,ORIGIN);
    if(u.protocol!=="https:"||u.username||u.password)
      return {protected:false,audHint:null,teamHint:null};
    const allowed=u.hostname===new URL(ORIGIN).hostname||TEAM.test(u.hostname);
    if(!allowed||!u.pathname.startsWith("/cdn-cgi/access/"))
      return {protected:false,audHint:null,teamHint:null};
    const match=u.pathname.match(/^\/cdn-cgi\/access\/login\/([^/]+)\/?$/);
    const audHint=match&&AUD.test(match[1])?match[1].toLowerCase():null;
    return {protected:true,audHint,teamHint:TEAM.test(u.hostname)?u.hostname:null};
  }catch{return {protected:false,audHint:null,teamHint:null};}
}

export function summarizeChallenges(challenges){
  if(!Array.isArray(challenges)||challenges.length!==3)
    throw Error("INVALID_CHALLENGE_COUNT");
  const protectedCount=challenges.filter(x=>x.protected).length;
  const audienceHints=challenges.map(x=>x.audHint).filter(Boolean);
  const teamHints=challenges.map(x=>x.teamHint).filter(Boolean);
  const uniqAudience=new Set(audienceHints),uniqTeam=new Set(teamHints);
  return {
    allRoutesRedirectToAccess:protectedCount===3,
    audienceHintStatus:!audienceHints.length?"NOT_PRESENT":
      audienceHints.length<3?"PARTIAL":uniqAudience.size===1?"CONSISTENT":"CONFLICTING",
    teamHostHintStatus:!teamHints.length?"NOT_PRESENT":
      uniqTeam.size===1?"CONSISTENT":"CONFLICTING",
    // Not copied to status report. Must still compare this hint with the
    // provider's app list, and never unconditionally authorize the Worker.
    candidateAud:protectedCount===3&&audienceHints.length===3&&uniqAudience.size===1?
      audienceHints[0]:null,
  };
}

export async function probeAnonymousChallenges({fetcher=fetch}={}){
  const outcomes=[];
  for(const path of PATHS){
    try{
      const response=await fetcher(ORIGIN+path,{method:"GET",redirect:"manual",
        cache:"no-store",headers:{Accept:"text/html"},
        signal:AbortSignal.timeout(9000)});
      outcomes.push(parseChallenge(response.status,response.headers.get("location")));
      await response.body?.cancel();
    }catch{
      outcomes.push({protected:false,audHint:null,teamHint:null});
    }
  }
  return summarizeChallenges(outcomes);
}

export async function correlateWithApps({accountId,apiToken,candidateAud,fetcher=fetch}={}){
  if(!ACCOUNT.test(String(accountId??""))||typeof apiToken!=="string"||
     apiToken.length<15||!AUD.test(String(candidateAud??"")))
    return "NOT_EVALUABLE";
  try{
    const endpoint=API+"/accounts/"+accountId+"/access/apps?per_page=100&aud="+
      encodeURIComponent(candidateAud);
    const response=await fetcher(endpoint,{method:"GET",redirect:"error",
      headers:{Authorization:"Bearer "+apiToken,Accept:"application/json"},
      signal:AbortSignal.timeout(9000)});
    if(response.status===401||response.status===403)return "READ_SCOPE_DENIED";
    if(!response.ok)return "API_UNAVAILABLE";
    const body=await response.json();
    if(body?.success!==true||!Array.isArray(body.result))return "API_INVALID";
    const info=body.result_info||{};
    if(Number(info.total_pages||1)>1)return "AMBIGUOUS_PAGINATION";
    const matching=body.result.filter(app=>
      app?.type==="self_hosted"&&String(app?.aud??"").toLowerCase()===candidateAud);
    return matching.length===1?"UNIQUE_AUD_HINT_MATCH":
      matching.length>1?"AMBIGUOUS":"NOT_FOUND";
  }catch{return "API_UNAVAILABLE";}
}

export async function auditLoginFingerprint({accountId,apiToken,fetcher=fetch}={}){
  const challenge=await probeAnonymousChallenges({fetcher});
  const match=await correlateWithApps({
    accountId,apiToken,candidateAud:challenge.candidateAud,fetcher
  });
  return {
    schema:"psychohistory.access_challenge_correlation.v1",
    productionRoutesChecked:3,
    allRoutesRedirectToAccess:challenge.allRoutesRedirectToAccess,
    audienceHintStatus:challenge.audienceHintStatus,
    teamHostHintStatus:challenge.teamHostHintStatus,
    appCorrelation:match,
    productionJwtAcceptanceTest:"NOT_PERFORMED",
    organizationApiReadPermission:"NOT_CHANGED",
    credentialsOrIdsPrinted:false,
    accessConfigWritten:false,
    shadow2027Unlocked:false,
    conclusion:"HTTP redirect is an untrusted login challenge, not evidence of an authenticated session or a verified Worker audience.",
  };
}

const isCli=typeof process!=="undefined"&&process.argv[1]&&
  import.meta.url===new URL("file://"+process.argv[1]).href;
if(isCli){
  const report=await auditLoginFingerprint({
    accountId:process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken:process.env.CLOUDFLARE_ACCESS_READ_TOKEN||process.env.CLOUDFLARE_API_TOKEN,
  });
  for(const key of ["allRoutesRedirectToAccess","audienceHintStatus",
    "teamHostHintStatus","appCorrelation","productionJwtAcceptanceTest",
    "shadow2027Unlocked"]){
    console.log(key.toUpperCase()+"="+String(report[key]));
  }
  // An exposure is a hard failure, but a missing hint or read permission is
  // a diagnosed blocker, never an excuse to unlock the private API.
  if(!report.allRoutesRedirectToAccess)process.exitCode=1;
}
