import test from "node:test";
import assert from "node:assert/strict";
import {parseChallenge,summarizeChallenges,probeAnonymousChallenges,
        correlateWithApps,auditLoginFingerprint} from "./audit-psychohistory-access-challenge.mjs";

const app="https://segundo-cerebro.mamg97.workers.dev";
const aud="a".repeat(64);
const account="b".repeat(32);
const token="synthetic-read-token-not-real";
function redirect(id=aud){
  return app+"/cdn-cgi/access/login/"+id+"?redirect_url=%2F";
}
test("Access redirect must be HTTPS and remain on known hosts",()=>{
  assert.equal(parseChallenge(302,redirect()).audHint,aud);
  assert.equal(parseChallenge(302,"https://fiction-team.cloudflareaccess.com/cdn-cgi/access/login/"+aud).teamHint,
    "fiction-team.cloudflareaccess.com");
  assert.equal(parseChallenge(302,app+"/cdn-cgi/access/login/my.domain.workers.dev").audHint,null);
  for(const value of [
    "https://evil.invalid/cdn-cgi/access/login/"+aud,
    "http://fiction-team.cloudflareaccess.com/cdn-cgi/access/login/"+aud,
    app+"/not-access/"+aud,
    app.replace("https://","https://user:pass@")+"/cdn-cgi/access/login/"+aud,
  ]) assert.equal(parseChallenge(302,value).protected,false);
  assert.equal(parseChallenge(200,redirect()).protected,false);
});
test("only three matching full-length hints can be correlated",()=>{
  const one=parseChallenge(302,redirect());
  assert.equal(summarizeChallenges([one,one,one]).candidateAud,aud);
  assert.equal(summarizeChallenges([one,one,parseChallenge(302,redirect("b".repeat(64)))]).candidateAud,null);
  assert.equal(summarizeChallenges([one,one,parseChallenge(302,app+"/cdn-cgi/access/login")]).candidateAud,null);
});
test("real-route probe is body-blind and includes no user session credentials",async()=>{
  const calls=[];
  const probe=await probeAnonymousChallenges({fetcher:async(url,opts)=>{
    calls.push({url,opts});
    return {status:302,headers:new Headers({location:redirect()}),body:{cancel:async()=>{}}};
  }});
  assert.equal(probe.audienceHintStatus,"CONSISTENT");
  assert.equal(calls.length,3);
  for(const {opts} of calls){
    assert.equal(opts.redirect,"manual");
    assert.equal(opts.headers.Authorization,undefined);
    assert.equal(opts.headers.Cookie,undefined);
    assert.equal(opts.credentials,undefined);
  }
});
test("missing and dangerous response never produces positive match",async()=>{
  const out=await auditLoginFingerprint({fetcher:async()=>({status:200,headers:new Headers(),
    body:{cancel:async()=>{}}})});
  assert.equal(out.allRoutesRedirectToAccess,false);
  assert.equal(out.appCorrelation,"NOT_EVALUABLE");
  assert.equal(out.shadow2027Unlocked,false);
});
test("app lookup accepts only one exact Audience from official read API",async()=>{
  let count=0;
  const fetcher=async(url,opts)=>{
    if(url.startsWith("https://api.cloudflare.com")){
      count++;
      assert.equal(opts.method,"GET");
      assert.equal(opts.redirect,"error");
      assert.ok(url.includes("aud="));
      return Response.json({success:true,result:[{type:"self_hosted",aud}],
        result_info:{total_pages:1}});
    }
    return {status:302,headers:new Headers({location:redirect()}),body:{cancel:async()=>{}}};
  };
  const out=await auditLoginFingerprint({accountId:account,apiToken:token,fetcher});
  assert.equal(count,1);
  assert.equal(out.appCorrelation,"UNIQUE_AUD_HINT_MATCH");
  assert.equal(out.shadow2027Unlocked,false);
  assert.doesNotMatch(JSON.stringify(out),new RegExp(aud));
});
test("missing API permission is a blocker and no credentials are logged",async()=>{
  const r=await correlateWithApps({accountId:account,apiToken:token,candidateAud:aud,
    fetcher:async()=>new Response("",{status:403})});
  assert.equal(r,"READ_SCOPE_DENIED");
  assert.equal(await correlateWithApps({candidateAud:aud}),"NOT_EVALUABLE");
});
test("ambiguous, incomplete and unknown applications are not certified",async()=>{
  const apps=[
    [{type:"self_hosted",aud},{type:"self_hosted",aud}],
    [{type:"self_hosted",aud:"c".repeat(64)}],
  ];
  for(let i=0;i<apps.length;i++){
    const actual=await correlateWithApps({accountId:account,apiToken:token,candidateAud:aud,
      fetcher:async()=>Response.json({success:true,result:apps[i]})});
    assert.equal(actual,i===0?"AMBIGUOUS":"NOT_FOUND");
  }
  const paged=await correlateWithApps({accountId:account,apiToken:token,candidateAud:aud,
    fetcher:async()=>Response.json({success:true,result:apps[0],result_info:{total_pages:4}})});
  assert.equal(paged,"AMBIGUOUS_PAGINATION");
});
test("DNS / transport ambiguity is never treated as Access protection",async()=>{
  const out=await auditLoginFingerprint({fetcher:async()=>{throw Error("synthetic unavailable")}});
  assert.equal(out.allRoutesRedirectToAccess,false);
  assert.equal(out.shadow2027Unlocked,false);
});
